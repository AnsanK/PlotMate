# PlotMate Toolbar Mode Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** ChartToolbar를 *모드 토글* 패턴으로 재설계. 5개 버튼 — 삭제(모드) / 전체삭제(모드) / Zoom in/out(모드) / 되돌리기(즉시) / 초기화(즉시). 활성 모드에서 drag = 그 액션 실행. Zoom 모드는 drag 방향(우하=in, 좌상=out)으로 in/out 결정. 이전 Shift+drag handler는 제거.

**Architecture:**
- store에 새 slice `toolMode: 'idle' | 'delete' | 'deleteAll' | 'zoom'` 추가.
- ChartCard의 `layout.dragmode`를 `toolMode`에 따라 동적: idle → `false`, 그 외 → `"select"` (box 영역 받기 위해).
- ChartCard의 onSelected callback이 `toolMode` 분기:
  - `delete` → `dispatch({ type: "setBoxSelection", ... })` + 즉시 `dispatch({ type: "deletePerChart" })`
  - `deleteAll` → setBoxSelection + 즉시 `deleteGlobal`
  - `zoom` → mousedown/mouseup 좌표 추적 → 방향에 따라 zoom in (Plotly.relayout to range) / zoom out (range 2배 확장)
- ChartToolbar에 5 버튼. 모드 버튼은 active 시 violet ring. 같은 모드 재클릭 = idle.
- 이전 Shift+drag JS handler 제거 — 모드 토글로 단순화.

**Tech Stack:** 기존 (Plotly + Zustand + Tailwind). 새 deps 없음.

**Prerequisite:** Plan #7 완료 (47 commits, `..946a421`).

---

## File Structure

| 경로 | 책임 |
|---|---|
| `src/lib/selection/reducer.ts` | (modify) `toolMode` field + `setToolMode` action |
| `src/lib/selection/reducer.test.ts` | (append) 3 toolMode tests |
| `src/lib/store/selection-store.ts` | (modify) toolMode init + dispatch |
| `src/components/charts/chart-toolbar.tsx` | (full replace) 5 버튼, mode toggle UI |
| `src/components/charts/chart-card.tsx` | (modify) Shift+drag 제거, toolMode 기반 dragmode + onSelected 분기 |

---

## Task 1: toolMode slice (reducer + TDD)

**Files:**
- Modify: `src/lib/selection/reducer.ts`
- Modify: `src/lib/selection/reducer.test.ts`

- [ ] **Step 1.1: 모든 literal SelectionState에 `toolMode` 추가**

각 literal `SelectionState` 객체에 한 줄 추가:
```typescript
toolMode: "idle",
```

`initial`, `initialChart`, `initialGroups`, `initialReady`, `initDel` 모두 갱신.

- [ ] **Step 1.2: 새 describe append**

```typescript
describe("toolMode (setToolMode)", () => {
  const initMode: SelectionState = {
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
    toolMode: "idle",
  };

  it("setToolMode switches to the given mode", () => {
    const next = applyAction(initMode, { type: "setToolMode", mode: "delete" });
    expect(next.toolMode).toBe("delete");
  });

  it("setToolMode to the same mode toggles back to idle", () => {
    const state: SelectionState = { ...initMode, toolMode: "delete" };
    const next = applyAction(state, { type: "setToolMode", mode: "delete" });
    expect(next.toolMode).toBe("idle");
  });

  it("setToolMode clears currentBoxSelection (switching contexts)", () => {
    const state: SelectionState = {
      ...initMode,
      toolMode: "delete",
      currentBoxSelection: { msrName: "MSR0009", chipIds: new Set(["a"]) },
    };
    const next = applyAction(state, { type: "setToolMode", mode: "zoom" });
    expect(next.toolMode).toBe("zoom");
    expect(next.currentBoxSelection).toBeNull();
  });
});
```

- [ ] **Step 1.3: fail 확인**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm test src/lib/selection/reducer.test.ts`

Expected: 3 new tests FAIL + 기존 tests 일부 type error (toolMode 누락).

- [ ] **Step 1.4: reducer 수정**

(a) `SelectionState` interface 끝에 추가:
```typescript
  toolMode: ToolMode;
```

(b) 새 type export (SelectionState 위 또는 SelectionAction 옆):
```typescript
export type ToolMode = "idle" | "delete" | "deleteAll" | "zoom";
```

(c) `SelectionAction` union 끝에 추가:
```typescript
  | { type: "setToolMode"; mode: ToolMode };
```

(d) switch 끝에 새 case:
```typescript
    case "setToolMode": {
      const newMode = state.toolMode === action.mode ? "idle" : action.mode;
      return {
        ...state,
        toolMode: newMode,
        currentBoxSelection: null,
      };
    }
```

- [ ] **Step 1.5: pass + 회귀 + store 수정**

`src/lib/store/selection-store.ts`:
- initial state에 `toolMode: "idle",` 추가
- dispatch의 partial state에 `toolMode: state.toolMode,` 추가

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm exec tsc --noEmit && pnpm test`

Expected: 81 tests PASS (78 prior + 3 new).

- [ ] **Step 1.6: commit**

```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/lib/selection src/lib/store/selection-store.ts && git commit -m "feat(selection): add toolMode slice + setToolMode action (idle/delete/deleteAll/zoom)"
```

---

## Task 2: ChartToolbar 5 버튼 + mode 토글 UI

**Files:**
- Modify (full replace): `src/components/charts/chart-toolbar.tsx`

- [ ] **Step 2.1: ChartToolbar 전체 교체**

Replace entire content of `src/components/charts/chart-toolbar.tsx`:
```typescript
"use client";

import { Scissors, ScissorsLineDashed, ZoomIn, Undo2, RotateCcw } from "lucide-react";
import { useSelectionStore } from "@/lib/store/selection-store";
import { cn } from "@/lib/utils";
import type { ToolMode } from "@/lib/selection/reducer";

export function ChartToolbar() {
  const toolMode = useSelectionStore((s) => s.toolMode);
  const deleteHistory = useSelectionStore((s) => s.deleteHistory);
  const globallyDeleted = useSelectionStore((s) => s.globallyDeletedChipIds);
  const perChartDeleted = useSelectionStore((s) => s.perChartDeletedChipIds);
  const dispatch = useSelectionStore((s) => s.dispatch);

  const canUndo = deleteHistory.length > 0;
  const canReset =
    globallyDeleted.size > 0 ||
    perChartDeleted.size > 0 ||
    deleteHistory.length > 0 ||
    toolMode !== "idle";

  return (
    <div className="flex items-center gap-1">
      <ModeButton
        label="삭제"
        icon={Scissors}
        mode="delete"
        currentMode={toolMode}
        onClick={() => dispatch({ type: "setToolMode", mode: "delete" })}
      />
      <ModeButton
        label="전체삭제"
        icon={ScissorsLineDashed}
        mode="deleteAll"
        currentMode={toolMode}
        onClick={() => dispatch({ type: "setToolMode", mode: "deleteAll" })}
      />
      <ModeButton
        label="Zoom"
        icon={ZoomIn}
        mode="zoom"
        currentMode={toolMode}
        onClick={() => dispatch({ type: "setToolMode", mode: "zoom" })}
      />
      <ActionButton
        label="되돌리기"
        icon={Undo2}
        disabled={!canUndo}
        onClick={() => dispatch({ type: "undoDelete" })}
      />
      <ActionButton
        label="초기화"
        icon={RotateCcw}
        disabled={!canReset}
        onClick={() => {
          dispatch({ type: "resetDelete" });
          dispatch({ type: "setToolMode", mode: "idle" });
        }}
      />
    </div>
  );
}

function ModeButton({
  label,
  icon: Icon,
  mode,
  currentMode,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  mode: ToolMode;
  currentMode: ToolMode;
  onClick: () => void;
}) {
  const active = currentMode === mode;
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${label} (drag로 영역 선택)`}
      className={cn(
        "flex items-center gap-1 rounded px-1.5 py-1 text-[10px] transition-colors",
        active
          ? "bg-selection-bg text-selection-fg ring-1 ring-selection-strong"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon size={11} />
      <span>{label}</span>
    </button>
  );
}

function ActionButton({
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

`초기화`는 deleted reset + toolMode를 idle로 — clean slate.

- [ ] **Step 2.2: 검증 + commit**

```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm exec tsc --noEmit && pnpm lint && pnpm build && pnpm test && git add src/components/charts/chart-toolbar.tsx && git commit -m "feat(toolbar): redesign as 5-button mode toggle (delete/deleteAll/zoom + undo/reset)"
```

---

## Task 3: ChartCard — toolMode 기반 dragmode + onSelected 분기 (Shift+drag 제거)

**Files:**
- Modify: `src/components/charts/chart-card.tsx`

- [ ] **Step 3.1: 이전 Shift+drag handler 제거 + toolMode 기반 로직**

Read `chart-card.tsx`. 다음 변경:

(a) **imports 갱신** — useCallback, useEffect, useMemo, useRef 유지. lucide 추가 X. ToolMode import:
```typescript
import type { ToolMode } from "@/lib/selection/reducer";
```

(b) **selectors 추가** (다른 store selector 옆):
```typescript
const toolMode = useSelectionStore((s) => s.toolMode);
```

(c) **layout의 dragmode를 toolMode 기반으로**:

기존 `layout` useMemo의 `dragmode: "zoom",` (또는 false)를 다음과 같이 변경:
```typescript
const layout: Partial<Layout> = useMemo(
  () => ({
    autosize: true,
    margin: { l: 28, r: 8, t: 6, b: 22 },
    showlegend: false,
    xaxis: {
      title: { text: "CD", font: { size: 9 } },
      tickfont: { size: 8 },
      gridcolor: "rgba(0,0,0,0.05)",
      zeroline: false,
    },
    yaxis: {
      tickfont: { size: 8 },
      gridcolor: "rgba(0,0,0,0.05)",
      zeroline: false,
    },
    dragmode: toolMode === "idle" ? false : "select",
    hoverlabel: { font: { size: 10 } },
  }),
  [toolMode],
);
```

`useMemo` 의존성에 `toolMode` 추가. layout 변경 시 Plotly가 자동 react.

(d) **이전 handleInitialized의 Shift+drag handler 제거**. 단순화:
```typescript
const handleInitialized = useCallback(
  (_figure: unknown, gd: HTMLElement) => {
    graphDivRef.current = gd;
    dispatch({ type: "setChartReady", id: msr.name, ready: true });

    // Track mousedown/mouseup coords for zoom direction
    const onDown = (e: MouseEvent) => {
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: MouseEvent) => {
      dragEndRef.current = { x: e.clientX, y: e.clientY };
    };
    gd.addEventListener("mousedown", onDown);
    gd.addEventListener("mouseup", onUp);
    (gd as HTMLElement & { __plotmateCleanup?: () => void }).__plotmateCleanup = () => {
      gd.removeEventListener("mousedown", onDown);
      gd.removeEventListener("mouseup", onUp);
    };
  },
  [msr.name, dispatch],
);
```

(e) **dragStartRef, dragEndRef refs 추가** (graphDivRef 옆):
```typescript
const graphDivRef = useRef<HTMLElement | null>(null);
const dragStartRef = useRef<{ x: number; y: number } | null>(null);
const dragEndRef = useRef<{ x: number; y: number } | null>(null);
```

(f) **handleSelected — toolMode 기반 분기**:

기존 handleSelected를 다음으로 교체:
```typescript
const handleSelected = useCallback(
  (event: { points?: { pointIndex: number }[]; range?: { x: [number, number]; y: [number, number] } } | undefined) => {
    if (toolMode === "idle") return;

    if (toolMode === "zoom") {
      // Determine direction from raw drag coords
      const start = dragStartRef.current;
      const end = dragEndRef.current;
      if (!start || !end || !event?.range) return;

      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const isInDirection = dx > 0 && dy > 0; // 우하 drag = zoom in

      // @ts-expect-error window.Plotly is exposed by react-plotly.js
      const Plotly = (window as { Plotly?: { relayout: (gd: HTMLElement, layout: Record<string, unknown>) => void } }).Plotly;
      const gd = graphDivRef.current;
      if (!Plotly || !gd) return;

      if (isInDirection) {
        // Zoom in to the selected range
        Plotly.relayout(gd, {
          "xaxis.range": event.range.x,
          "yaxis.range": event.range.y,
        });
      } else {
        // Zoom out: expand current range by 2x (or use autoRange to reset)
        Plotly.relayout(gd, {
          "xaxis.autorange": true,
          "yaxis.autorange": true,
        });
      }
      return;
    }

    // delete / deleteAll modes
    if (!event?.points || event.points.length === 0) return;

    const chipIds = new Set<string>();
    for (const p of event.points) {
      const chip = plottedChips[p.pointIndex];
      if (chip) chipIds.add(chip.xy);
    }
    if (chipIds.size === 0) return;

    dispatch({ type: "setBoxSelection", msrName: msr.name, chipIds });
    if (toolMode === "delete") {
      dispatch({ type: "deletePerChart" });
    } else if (toolMode === "deleteAll") {
      dispatch({ type: "deleteGlobal" });
    }
  },
  [toolMode, dispatch, msr.name, plottedChips],
);
```

zoom out은 단순 autorange (reset). 의도(좌상 drag = 단계적 zoom out)는 더 복잡하므로 일단 autorange로 단순화 — 사용자 시각 검증 후 fine-tune.

(g) **Plot JSX는 그대로** (이미 onInitialized + onSelected). 변경 없음.

- [ ] **Step 3.2: 검증**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm exec tsc --noEmit && pnpm lint && pnpm build && pnpm test`

Expected: clean, 81/81 PASS.

- [ ] **Step 3.3: commit**

```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/components/charts/chart-card.tsx && git commit -m "feat(chart): toolMode-based dragmode + onSelected branches (delete/deleteAll/zoom)

Removes Shift+drag handler in favor of explicit mode toggle from ChartToolbar.
- toolMode 'idle': dragmode false (no drag interaction)
- toolMode 'delete'/'deleteAll'/'zoom': dragmode 'select' (drag = box)
- onSelected dispatches based on mode:
  - delete → setBoxSelection + deletePerChart
  - deleteAll → setBoxSelection + deleteGlobal
  - zoom → Plotly.relayout based on drag direction (우하=in, else=autorange reset)"
```

---

## Task 4: 통합 + 시각 검증

- [ ] **Step 4.1: 전체 검증**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm exec tsc --noEmit && pnpm lint && pnpm build && pnpm test`

Expected: 81/81 PASS, build clean.

- [ ] **Step 4.2: dev server hot reload + 사용자 시각 검증**

사용자가 브라우저에서:
1. "삭제" 버튼 클릭 → violet ring active
2. 차트에서 drag → 영역 즉시 삭제, r/n 갱신
3. "삭제" 재클릭 → idle (ring 사라짐)
4. "전체삭제" 클릭 → 차트 drag → 모든 차트에서 삭제
5. "Zoom" 클릭 → 차트에서 우하단 drag → zoom in; 좌상단 drag → autorange reset
6. "되돌리기" → 한 단계 undo
7. "초기화" → 모든 deleted reset + idle 복귀

Fallback 필요 시:
- Plotly가 dragmode 동적 변경 reactive 안 됨 → Plotly key prop으로 force remount, 또는 useEffect로 직접 relayout 호출

---

## Acceptance Criteria

- [ ] `pnpm test` → 81/81 PASS (78 prior + 3 new toolMode)
- [ ] `pnpm build` → success
- [ ] `pnpm lint` → clean
- [ ] `git log --oneline` → 50+ commits (47 prior + 3 new)
- [ ] 시각 검증 (위 Step 4.2)

---

## Next Plan Preview

**Plan #8: 데이터 export** — Group 1/2 채택 항목을 deleted union 제외한 데이터로 CSV/Excel 다운로드.
