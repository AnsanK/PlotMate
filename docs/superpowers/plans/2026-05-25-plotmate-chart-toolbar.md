# PlotMate Chart Toolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** 차트 카드에 outlier 제거(box select 후 삭제), 전체 차트에 동시 적용(전체삭제), 단계별 되돌리기, 모든 deleted 초기화 기능을 추가한다. UI는 ChartGridArea 헤더 우측에 4 버튼. Shift+drag = box select, plain drag = zoom. Group export 시 deleted 데이터가 실제 payload에서 제외되도록 데이터 모델 마련.

**Architecture:**
- store에 4 slice 추가: `globallyDeletedChipIds`, `perChartDeletedChipIds`, `currentBoxSelection`, `deleteHistory`. 원본 `chips` 배열은 불변, 차트 렌더 시 deleted union을 filter로 제외.
- 5 reducer actions: `setBoxSelection`, `deletePerChart`, `deleteGlobal`, `undoDelete`, `resetDelete`. TDD.
- ChartCard의 xs/ys useMemo에 deleted filter 추가 → 회귀 r·n 자동 재계산.
- ChartCard에 Shift+drag 동적 relayout (zoom ↔ select). 실패 시 헤더 mode toggle fallback.
- ChartGridArea 헤더 우측에 `[✂ 삭제][✂ 전체][↶ 되돌리기][↻ 초기화]` + 활성 차트 표시.
- deleted 상태는 새 Draw에도 영속 (B 선택), 명시적 초기화로만 reset.

**Tech Stack:** Plotly `onSelected` callback + `relayout` API / lucide-react 아이콘 (Scissors, ScissorsLineDashed, Undo2, RotateCcw) / Zustand store / Vitest reducer 테스트.

**Spec reference:** [docs/superpowers/specs/2026-05-23-plotmate-ui-design.md](../specs/2026-05-23-plotmate-ui-design.md) — § 5.3 차트 toolbar (점 삭제, Undo, Reset, 통계 모달은 별도 plan)

**User decisions:**
- Q1 = B (deleted 영속, 새 Draw에 유지)
- Q2 = C (Shift+drag = select, plain = zoom) with toggle fallback
- Q3 = A (deleted 점 완전 제거, 회귀 계산에서도 제외)

**Prerequisite:** Plan #6 완료 (43 commits, `..8e7b36a`).

---

## File Structure

| 경로 | 책임 |
|---|---|
| `src/lib/selection/reducer.ts` | (modify) 4 slice fields + 5 actions |
| `src/lib/selection/reducer.test.ts` | (append) ~12 tests for delete actions |
| `src/lib/store/selection-store.ts` | (modify) init + dispatch passthrough |
| `src/components/charts/chart-card.tsx` | (modify) deleted filter in xs/ys, Shift+drag handler, onSelected |
| `src/components/charts/chart-toolbar.tsx` | (create) 4 button row (헤더에 embed) |
| `src/components/panels/chart-grid-area.tsx` | (modify) 헤더에 active chart 표시 + Toolbar embed |

---

## Task 1: DeletedSlice reducer (TDD)

**Files:**
- Modify: `src/lib/selection/reducer.ts`
- Modify: `src/lib/selection/reducer.test.ts`

- [ ] **Step 1.1: 모든 literal `SelectionState` 갱신**

Top-level `initial` 및 다른 모든 literal에 4 필드 추가:
```typescript
globallyDeletedChipIds: new Set<string>(),
perChartDeletedChipIds: new Map<string, Set<string>>(),
currentBoxSelection: null,
deleteHistory: [],
```

- [ ] **Step 1.2: 새 describe block append**

Create new tests at end of `reducer.test.ts`:
```typescript
describe("delete workflow (setBoxSelection / deletePerChart / deleteGlobal / undoDelete / resetDelete)", () => {
  const initDel: SelectionState = {
    selectedIds: new Set(),
    drawnIds: new Set(),
    lastClickedId: null,
    selectedChartIds: new Set(),
    lastClickedChartId: null,
    group1Ids: new Set(),
    group2Ids: new Set(),
    selectedInGroup1Ids: new Set(),
    selectedInGroup2Ids: new Set(),
    lastClickedInGroup1Id: null,
    lastClickedInGroup2Id: null,
    readyChartIds: new Set(),
    globallyDeletedChipIds: new Set(),
    perChartDeletedChipIds: new Map(),
    currentBoxSelection: null,
    deleteHistory: [],
  };

  describe("setBoxSelection", () => {
    it("stores current box selection", () => {
      const next = applyAction(initDel, {
        type: "setBoxSelection",
        msrName: "MSR0009",
        chipIds: new Set(["100_200", "101_200"]),
      });
      expect(next.currentBoxSelection).not.toBeNull();
      expect(next.currentBoxSelection!.msrName).toBe("MSR0009");
      expect([...next.currentBoxSelection!.chipIds].sort()).toEqual(["100_200", "101_200"]);
    });

    it("replaces previous box selection from another chart", () => {
      const state: SelectionState = {
        ...initDel,
        currentBoxSelection: { msrName: "MSR0001", chipIds: new Set(["x"]) },
      };
      const next = applyAction(state, {
        type: "setBoxSelection",
        msrName: "MSR0002",
        chipIds: new Set(["y"]),
      });
      expect(next.currentBoxSelection!.msrName).toBe("MSR0002");
      expect([...next.currentBoxSelection!.chipIds]).toEqual(["y"]);
    });

    it("setBoxSelection with empty chipIds clears selection", () => {
      const state: SelectionState = {
        ...initDel,
        currentBoxSelection: { msrName: "MSR0001", chipIds: new Set(["x"]) },
      };
      const next = applyAction(state, {
        type: "setBoxSelection",
        msrName: "MSR0001",
        chipIds: new Set(),
      });
      expect(next.currentBoxSelection).toBeNull();
    });
  });

  describe("deletePerChart", () => {
    it("adds box selection chipIds to perChartDeletedChipIds for that MSR", () => {
      const state: SelectionState = {
        ...initDel,
        currentBoxSelection: { msrName: "MSR0009", chipIds: new Set(["a", "b"]) },
      };
      const next = applyAction(state, { type: "deletePerChart" });
      expect([...next.perChartDeletedChipIds.get("MSR0009")!].sort()).toEqual(["a", "b"]);
      expect(next.currentBoxSelection).toBeNull();
      expect(next.deleteHistory).toHaveLength(1);
      expect(next.deleteHistory[0]).toEqual({
        kind: "perChart",
        msrName: "MSR0009",
        chipIds: ["a", "b"],
      });
    });

    it("merges with existing perChartDeletedChipIds for same MSR", () => {
      const state: SelectionState = {
        ...initDel,
        perChartDeletedChipIds: new Map([["MSR0009", new Set(["x"])]]),
        currentBoxSelection: { msrName: "MSR0009", chipIds: new Set(["y", "z"]) },
      };
      const next = applyAction(state, { type: "deletePerChart" });
      expect([...next.perChartDeletedChipIds.get("MSR0009")!].sort()).toEqual(["x", "y", "z"]);
    });

    it("is no-op when currentBoxSelection is null", () => {
      const next = applyAction(initDel, { type: "deletePerChart" });
      expect(next).toBe(initDel);
    });
  });

  describe("deleteGlobal", () => {
    it("adds box selection chipIds to globallyDeletedChipIds", () => {
      const state: SelectionState = {
        ...initDel,
        currentBoxSelection: { msrName: "MSR0009", chipIds: new Set(["a", "b"]) },
      };
      const next = applyAction(state, { type: "deleteGlobal" });
      expect([...next.globallyDeletedChipIds].sort()).toEqual(["a", "b"]);
      expect(next.currentBoxSelection).toBeNull();
      expect(next.deleteHistory).toHaveLength(1);
      expect(next.deleteHistory[0]).toEqual({
        kind: "global",
        chipIds: ["a", "b"],
      });
    });

    it("is no-op when currentBoxSelection is null", () => {
      const next = applyAction(initDel, { type: "deleteGlobal" });
      expect(next).toBe(initDel);
    });
  });

  describe("undoDelete", () => {
    it("undoes most recent perChart delete", () => {
      const state: SelectionState = {
        ...initDel,
        perChartDeletedChipIds: new Map([["MSR0009", new Set(["a", "b", "old"])]]),
        deleteHistory: [
          { kind: "perChart", msrName: "MSR0009", chipIds: ["a", "b"] },
        ],
      };
      const next = applyAction(state, { type: "undoDelete" });
      expect([...next.perChartDeletedChipIds.get("MSR0009")!]).toEqual(["old"]);
      expect(next.deleteHistory).toHaveLength(0);
    });

    it("undoes most recent global delete", () => {
      const state: SelectionState = {
        ...initDel,
        globallyDeletedChipIds: new Set(["a", "b", "old"]),
        deleteHistory: [
          { kind: "global", chipIds: ["a", "b"] },
        ],
      };
      const next = applyAction(state, { type: "undoDelete" });
      expect([...next.globallyDeletedChipIds].sort()).toEqual(["old"]);
      expect(next.deleteHistory).toHaveLength(0);
    });

    it("is no-op when history is empty", () => {
      const next = applyAction(initDel, { type: "undoDelete" });
      expect(next).toBe(initDel);
    });

    it("removes the MSR key entirely if perChart set becomes empty", () => {
      const state: SelectionState = {
        ...initDel,
        perChartDeletedChipIds: new Map([["MSR0009", new Set(["a"])]]),
        deleteHistory: [
          { kind: "perChart", msrName: "MSR0009", chipIds: ["a"] },
        ],
      };
      const next = applyAction(state, { type: "undoDelete" });
      expect(next.perChartDeletedChipIds.has("MSR0009")).toBe(false);
    });
  });

  describe("resetDelete", () => {
    it("clears all delete state", () => {
      const state: SelectionState = {
        ...initDel,
        globallyDeletedChipIds: new Set(["a"]),
        perChartDeletedChipIds: new Map([["MSR0009", new Set(["b"])]]),
        currentBoxSelection: { msrName: "MSR0009", chipIds: new Set(["c"]) },
        deleteHistory: [{ kind: "global", chipIds: ["a"] }],
      };
      const next = applyAction(state, { type: "resetDelete" });
      expect(next.globallyDeletedChipIds.size).toBe(0);
      expect(next.perChartDeletedChipIds.size).toBe(0);
      expect(next.currentBoxSelection).toBeNull();
      expect(next.deleteHistory).toHaveLength(0);
    });
  });

  describe("draw action preserves deleted state (Q1=B)", () => {
    it("draw does not touch deleted slices", () => {
      const state: SelectionState = {
        ...initDel,
        selectedIds: new Set(["new"]),
        globallyDeletedChipIds: new Set(["a"]),
        perChartDeletedChipIds: new Map([["MSR0009", new Set(["b"])]]),
        deleteHistory: [{ kind: "global", chipIds: ["a"] }],
      };
      const next = applyAction(state, { type: "draw" });
      expect([...next.globallyDeletedChipIds]).toEqual(["a"]);
      expect([...next.perChartDeletedChipIds.get("MSR0009")!]).toEqual(["b"]);
      expect(next.deleteHistory).toHaveLength(1);
    });
  });
});
```

- [ ] **Step 1.3: fail 확인**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm test src/lib/selection/reducer.test.ts`

Expected: 새 tests FAIL.

- [ ] **Step 1.4: reducer 수정**

`src/lib/selection/reducer.ts` 수정 4곳:

(a) `SelectionState` interface 끝에 추가:
```typescript
  globallyDeletedChipIds: Set<string>;
  perChartDeletedChipIds: Map<string, Set<string>>;
  currentBoxSelection: { msrName: string; chipIds: Set<string> } | null;
  deleteHistory: DeleteEvent[];
```

(b) 새 type export (interface 위 또는 아래):
```typescript
export type DeleteEvent =
  | { kind: "perChart"; msrName: string; chipIds: string[] }
  | { kind: "global"; chipIds: string[] };
```

(c) `SelectionAction` union 끝에 추가:
```typescript
  | { type: "setBoxSelection"; msrName: string; chipIds: Set<string> }
  | { type: "deletePerChart" }
  | { type: "deleteGlobal" }
  | { type: "undoDelete" }
  | { type: "resetDelete" };
```

(d) switch 끝에 새 5 cases:
```typescript
    case "setBoxSelection": {
      if (action.chipIds.size === 0) {
        return { ...state, currentBoxSelection: null };
      }
      return {
        ...state,
        currentBoxSelection: { msrName: action.msrName, chipIds: action.chipIds },
      };
    }

    case "deletePerChart": {
      if (!state.currentBoxSelection) return state;
      const { msrName, chipIds } = state.currentBoxSelection;
      const nextMap = new Map(state.perChartDeletedChipIds);
      const merged = new Set(nextMap.get(msrName) ?? []);
      for (const id of chipIds) merged.add(id);
      nextMap.set(msrName, merged);
      return {
        ...state,
        perChartDeletedChipIds: nextMap,
        currentBoxSelection: null,
        deleteHistory: [
          ...state.deleteHistory,
          { kind: "perChart", msrName, chipIds: [...chipIds] },
        ],
      };
    }

    case "deleteGlobal": {
      if (!state.currentBoxSelection) return state;
      const { chipIds } = state.currentBoxSelection;
      const nextGlobal = new Set(state.globallyDeletedChipIds);
      for (const id of chipIds) nextGlobal.add(id);
      return {
        ...state,
        globallyDeletedChipIds: nextGlobal,
        currentBoxSelection: null,
        deleteHistory: [
          ...state.deleteHistory,
          { kind: "global", chipIds: [...chipIds] },
        ],
      };
    }

    case "undoDelete": {
      if (state.deleteHistory.length === 0) return state;
      const last = state.deleteHistory[state.deleteHistory.length - 1];
      const nextHistory = state.deleteHistory.slice(0, -1);
      if (last.kind === "global") {
        const nextGlobal = new Set(state.globallyDeletedChipIds);
        for (const id of last.chipIds) nextGlobal.delete(id);
        return { ...state, globallyDeletedChipIds: nextGlobal, deleteHistory: nextHistory };
      } else {
        const nextMap = new Map(state.perChartDeletedChipIds);
        const set = new Set(nextMap.get(last.msrName) ?? []);
        for (const id of last.chipIds) set.delete(id);
        if (set.size === 0) nextMap.delete(last.msrName);
        else nextMap.set(last.msrName, set);
        return { ...state, perChartDeletedChipIds: nextMap, deleteHistory: nextHistory };
      }
    }

    case "resetDelete": {
      return {
        ...state,
        globallyDeletedChipIds: new Set(),
        perChartDeletedChipIds: new Map(),
        currentBoxSelection: null,
        deleteHistory: [],
      };
    }
```

- [ ] **Step 1.5: pass + 회귀**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm exec tsc --noEmit && pnpm test`

Expected: 76 tests PASS (64 prior + 12 new).

- [ ] **Step 1.6: commit**

```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/lib/selection && git commit -m "feat(selection): add delete slice + setBoxSelection/deletePerChart/deleteGlobal/undo/reset actions (TDD)"
```

---

## Task 2: Store extension

**Files:**
- Modify: `src/lib/store/selection-store.ts`

- [ ] **Step 2.1: store 갱신**

initial state에 추가:
```typescript
  globallyDeletedChipIds: new Set<string>(),
  perChartDeletedChipIds: new Map<string, Set<string>>(),
  currentBoxSelection: null,
  deleteHistory: [],
```

dispatch의 partial state에 동일 추가:
```typescript
          globallyDeletedChipIds: state.globallyDeletedChipIds,
          perChartDeletedChipIds: state.perChartDeletedChipIds,
          currentBoxSelection: state.currentBoxSelection,
          deleteHistory: state.deleteHistory,
```

- [ ] **Step 2.2: 검증 + commit**

```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm exec tsc --noEmit && pnpm test && git add src/lib/store/selection-store.ts && git commit -m "feat(store): plumb delete slices through Zustand store"
```

---

## Task 3: ChartCard deleted filtering

**Files:**
- Modify: `src/components/charts/chart-card.tsx`

- [ ] **Step 3.1: deleted set selectors + filter logic**

Read `chart-card.tsx`. 다음 추가/수정:

(a) imports 위에 selectors 가져옴. 컴포넌트 body 상단에:
```typescript
const globallyDeleted = useSelectionStore((s) => s.globallyDeletedChipIds);
const perChartDeletedMap = useSelectionStore((s) => s.perChartDeletedChipIds);
```

(b) excluded set 계산 (useMemo):
```typescript
const excludedXys = useMemo(() => {
  const merged = new Set<string>(globallyDeleted);
  const own = perChartDeletedMap.get(msr.name);
  if (own) for (const id of own) merged.add(id);
  return merged;
}, [globallyDeleted, perChartDeletedMap, msr.name]);
```

(c) 기존 `xs/ys` useMemo 갱신 — filter 추가, sample은 *filter 후*에:
```typescript
const { xs, ys, totalN } = useMemo(() => {
  const validChips = chips.filter((c) => !excludedXys.has(c.xy));
  const sampled = sampleIndices(validChips.length, SAMPLE_LIMIT);
  const _xs: number[] = [];
  const _ys: number[] = [];
  for (const i of sampled) {
    const chip = validChips[i];
    const v = msr.values[chip.xy];
    if (v === undefined || v === null || Number.isNaN(v)) continue;
    _xs.push(chip.cd);
    _ys.push(v);
  }
  return { xs: _xs, ys: _ys, totalN: validChips.length };
}, [chips, msr, excludedXys]);
```

`totalN`은 이제 `validChips.length` (deleted 제외). 헤더의 `n=N of M`에서 M = validChips.length, N = sample되어 plot된 점 수. 사용자에게 "현재 분석 대상 chip 수"가 명확.

- [ ] **Step 3.2: 검증 + commit**

```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm exec tsc --noEmit && pnpm lint && pnpm build && pnpm test && git add src/components/charts/chart-card.tsx && git commit -m "feat(chart): exclude deleted chips from xs/ys and regression"
```

---

## Task 4: ChartCard Shift+drag box select

**Files:**
- Modify: `src/components/charts/chart-card.tsx`

- [ ] **Step 4.1: 매핑 — sampled point index → chip xy**

기존 `xs/ys` useMemo는 sample만 반환. box select 후 `pointIndex`를 chip xy로 매핑하려면 sample된 chips 배열도 노출.

useMemo 수정 — `validChips`의 `sampled` index 배열도 노출:
```typescript
const { xs, ys, totalN, plottedChips } = useMemo(() => {
  const validChips = chips.filter((c) => !excludedXys.has(c.xy));
  const sampled = sampleIndices(validChips.length, SAMPLE_LIMIT);
  const _xs: number[] = [];
  const _ys: number[] = [];
  const _plotted: Chip[] = [];
  for (const i of sampled) {
    const chip = validChips[i];
    const v = msr.values[chip.xy];
    if (v === undefined || v === null || Number.isNaN(v)) continue;
    _xs.push(chip.cd);
    _ys.push(v);
    _plotted.push(chip);
  }
  return { xs: _xs, ys: _ys, totalN: validChips.length, plottedChips: _plotted };
}, [chips, msr, excludedXys]);
```

`plottedChips[pointIndex].xy` 로 chip xy 매핑 가능.

- [ ] **Step 4.2: layout dragmode 변경 — 평소 zoom**

기존 `layout` useMemo:
```typescript
dragmode: false,
```
변경:
```typescript
dragmode: "zoom",
```

- [ ] **Step 4.3: Plot props — onSelected callback + Shift+drag handler**

Plot 컴포넌트:
```tsx
<Plot
  data={data}
  layout={layout}
  config={{ displayModeBar: false, responsive: true }}
  style={{ width: "100%", height: "100%" }}
  useResizeHandler
  onInitialized={(_, gd) => {
    dispatch({ type: "setChartReady", id: msr.name, ready: true });
    attachShiftDragHandler(gd, msr.name);
  }}
  onSelected={(event) => {
    if (!event?.points) {
      dispatch({ type: "setBoxSelection", msrName: msr.name, chipIds: new Set() });
      return;
    }
    const chipIds = new Set<string>();
    for (const p of event.points) {
      const chip = plottedChips[p.pointIndex as number];
      if (chip) chipIds.add(chip.xy);
    }
    dispatch({ type: "setBoxSelection", msrName: msr.name, chipIds });
  }}
/>
```

`attachShiftDragHandler` 정의 — 컴포넌트 안에 useCallback으로:
```typescript
const attachShiftDragHandler = useCallback((gd: HTMLElement, _msrName: string) => {
  // Track shift key state across mousedown
  const handler = (e: MouseEvent) => {
    if (e.shiftKey) {
      // 동적 relayout to select mode
      // @ts-expect-error Plotly global on graphDiv
      window.Plotly?.relayout(gd, { dragmode: "select" });
    } else {
      // @ts-expect-error
      window.Plotly?.relayout(gd, { dragmode: "zoom" });
    }
  };
  gd.addEventListener("mousedown", handler);
  // cleanup not strictly needed for graphDiv lifetime, but safe:
  return () => gd.removeEventListener("mousedown", handler);
}, []);
```

`window.Plotly`는 react-plotly.js가 global에 export. 만약 안 되면 import `Plotly from "plotly.js-dist-min"` 후 직접 호출.

- [ ] **Step 4.4: useCallback import 추가**

`import { useCallback, useEffect, useMemo } from "react";`

- [ ] **Step 4.5: dev 시각 검증 + fallback 판단**

Run dev server, 차트에서 Shift+drag로 box select 시도:
- 정상 작동: chipIds가 setBoxSelection으로 전달됨 (console.log로 확인 후 제거)
- 작동 안 함: **fallback 적용** — `dragmode: "select"` 고정 + 헤더에 "Mode: Select/Zoom" toggle button을 5번째로 추가

fallback 코드 (필요 시):
```typescript
dragmode: "select",
```
+ ChartGridArea 헤더에 toggle button 추가 (모든 차트에 영향).

- [ ] **Step 4.6: build + test + commit**

```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm exec tsc --noEmit && pnpm lint && pnpm build && pnpm test && git add src/components/charts/chart-card.tsx && git commit -m "feat(chart): Shift+drag box select via dynamic Plotly relayout + onSelected dispatch"
```

---

## Task 5: ChartToolbar + ChartGridArea 헤더 통합

**Files:**
- Create: `src/components/charts/chart-toolbar.tsx`
- Modify: `src/components/panels/chart-grid-area.tsx`

- [ ] **Step 5.1: ChartToolbar 컴포넌트**

Create `src/components/charts/chart-toolbar.tsx`:
```typescript
"use client";

import { Scissors, ScissorsLineDashed, Undo2, RotateCcw } from "lucide-react";
import { useSelectionStore } from "@/lib/store/selection-store";
import { cn } from "@/lib/utils";

export function ChartToolbar() {
  const currentBoxSelection = useSelectionStore((s) => s.currentBoxSelection);
  const deleteHistory = useSelectionStore((s) => s.deleteHistory);
  const globallyDeleted = useSelectionStore((s) => s.globallyDeletedChipIds);
  const perChartDeleted = useSelectionStore((s) => s.perChartDeletedChipIds);
  const dispatch = useSelectionStore((s) => s.dispatch);

  const hasSelection = currentBoxSelection !== null && currentBoxSelection.chipIds.size > 0;
  const canUndo = deleteHistory.length > 0;
  const canReset =
    globallyDeleted.size > 0 ||
    perChartDeleted.size > 0 ||
    deleteHistory.length > 0;

  return (
    <div className="flex items-center gap-1">
      {hasSelection && (
        <span className="mr-2 text-[10px] text-selection-fg">
          {currentBoxSelection.msrName} · {currentBoxSelection.chipIds.size} points selected
        </span>
      )}
      <ToolButton
        label="삭제"
        icon={Scissors}
        disabled={!hasSelection}
        onClick={() => dispatch({ type: "deletePerChart" })}
      />
      <ToolButton
        label="전체삭제"
        icon={ScissorsLineDashed}
        disabled={!hasSelection}
        onClick={() => dispatch({ type: "deleteGlobal" })}
      />
      <ToolButton
        label="되돌리기"
        icon={Undo2}
        disabled={!canUndo}
        onClick={() => dispatch({ type: "undoDelete" })}
      />
      <ToolButton
        label="초기화"
        icon={RotateCcw}
        disabled={!canReset}
        onClick={() => dispatch({ type: "resetDelete" })}
      />
    </div>
  );
}

function ToolButton({
  label,
  icon: Icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        "flex items-center gap-1 rounded px-1.5 py-1 text-[10px] transition-colors",
        disabled
          ? "cursor-not-allowed text-muted-foreground/40"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon size={11} />
      <span>{label}</span>
    </button>
  );
}
```

- [ ] **Step 5.2: ChartGridArea 헤더에 통합**

Read `chart-grid-area.tsx`. 헤더 우측 (`scroll ↓ for more` 자리) 를 ChartToolbar로 교체:

(a) import 추가:
```typescript
import { ChartToolbar } from "@/components/charts/chart-toolbar";
```

(b) 헤더의 우측 span을 ChartToolbar로 교체:
```tsx
<header className="flex items-center justify-between border-b border-border px-3 py-2 text-xs text-muted-foreground">
  <span>
    {drawnItems.length} chart{drawnItems.length > 1 ? "s" : ""}
    {renderingCount > 0 && (
      <span className="text-muted-foreground">
        {" "}({readyCount} ready, {renderingCount} rendering…)
      </span>
    )}
    {selectedChartIds.size > 0 && (
      <>
        {" · "}
        <span className="text-selection-fg">
          {selectedChartIds.size} selected
        </span>
      </>
    )}
  </span>
  <ChartToolbar />
</header>
```

- [ ] **Step 5.3: 전체 검증**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm exec tsc --noEmit && pnpm lint && pnpm build && pnpm test`

Expected: clean, 76/76 PASS.

- [ ] **Step 5.4: commit**

```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/components/charts/chart-toolbar.tsx src/components/panels/chart-grid-area.tsx && git commit -m "feat(toolbar): add ChartToolbar (delete/delete-all/undo/reset) to ChartGridArea header"
```

---

## Acceptance Criteria

Plan #7 완료 시:

- [ ] `pnpm test` → 76/76 PASS (64 prior + 12 new)
- [ ] `pnpm build` → 성공
- [ ] `pnpm lint` → clean
- [ ] `git log --oneline` → 48+ commits (43 prior + 5 new)
- [ ] `pnpm dev` 시각 검증:
  1. 차트 카드에서 Shift+drag → box select (또는 fallback toggle 모드에서 drag)
  2. 헤더에 `MSR0009 · 12 points selected` 표시
  3. `삭제` 클릭 → 그 차트의 12 chip 즉시 사라짐, r·n 헤더 갱신
  4. `전체삭제` 클릭 (다시 box select 후) → 모든 차트에서 그 chip들 사라짐
  5. `되돌리기` 클릭 → 가장 최근 삭제 단계 복원
  6. `초기화` 클릭 → 모든 deleted 사라지고 모든 차트 원본 복원
  7. 새 Draw → deleted 영속 유지 (Q1=B)

---

## Next Plan Preview

**Plan #8: 데이터 export**
- Group 1/2의 각 MSR에 대해 deleted 제외한 (chip xy, cd, msr value) 데이터를 CSV/Excel로 다운로드
- 사용자가 채택한 outlier-free 데이터를 외부로 가져가는 워크플로 종착점
