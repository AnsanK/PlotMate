# PlotMate Chart Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 중앙 차트 그리드 구현 — drawnIds 구독해 3×3 grid로 차트 카드 렌더, 각 카드는 Plotly scattergl (X=CD, Y=MSR) + 추세선 + 통계 헤더 + toolbar. 카드 multi-select(Add 후보 marking)까지.

**Architecture:**
- Plotly는 무거운 client-only 라이브러리 → `react-plotly.js`를 dynamic import로 wrapping해 client component만 import.
- 회귀 계산은 Sensorpia [regression.ts](C:/Users/KTY/Desktop/Claude/Claude%20host/sensorpia/src/lib/charts/regression.ts) 패턴 차용 → PlotMate에 simplified linear regression util (TDD).
- ChartCard는 단일 책임: props로 받은 (X, Y) 점 배열 + 추세선/통계 표시 + 점 삭제/Undo/Reset toolbar 자체 관리.
- ChartGridArea는 store의 drawnIds + dataset을 join해서 ChartCard들에게 props 전달. 카드 multi-select(`selectedChartIds`) state 추가.

**Tech Stack:** plotly.js@3.5 + react-plotly.js (이미 설치 X, 새로 추가) / dynamic import / Vitest unit tests for regression util.

**Spec reference:** [docs/superpowers/specs/2026-05-23-plotmate-ui-design.md](../specs/2026-05-23-plotmate-ui-design.md) — § 5 (중앙), § 5.2 (차트 카드), § 5.3 (toolbar), § 10 (Drawn 항목 재선택)

**Prerequisite:** Plan #3 완료 (commits `..ffc04d4`). `drawnIds` Set state, selection store + reducer 동작 중.

---

## File Structure

| 경로 | 책임 |
|---|---|
| `package.json` | `plotly.js-dist-min`, `react-plotly.js`, `@types/react-plotly.js` 추가 |
| `src/lib/stats/regression.ts` | linear regression (slope/intercept/r²) pure function |
| `src/lib/stats/regression.test.ts` | regression 유닛 테스트 |
| `src/lib/selection/reducer.ts` | (modify) chart card multi-select 액션 (`toggleChart`, `rangeChart`, `clearChartSelection`) + `selectedChartIds` state |
| `src/lib/selection/reducer.test.ts` | (modify) chart selection 액션 테스트 |
| `src/lib/store/selection-store.ts` | (modify) `selectedChartIds` 노출 |
| `src/components/charts/plotly-loader.tsx` | react-plotly.js dynamic import wrapper (client) |
| `src/components/charts/chart-card.tsx` | 단일 차트 카드 (헤더 + Plotly + toolbar) |
| `src/components/charts/chart-toolbar.tsx` | 추세선 toggle / Reset / 점 삭제 / Undo / 통계 |
| `src/components/panels/chart-grid-area.tsx` | (full replace) drawnIds 구독 + 3×3 grid |

---

## Task 1: 회귀 통계 util (TDD)

**Files:**
- Create: `src/lib/stats/regression.ts`
- Create: `src/lib/stats/regression.test.ts`

- [ ] **Step 1.1: failing test 작성**

Create `src/lib/stats/regression.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { linearRegression } from "./regression";

describe("linearRegression", () => {
  it("returns slope=1, intercept=0 for identity y=x", () => {
    const res = linearRegression([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
    expect(res.slope).toBeCloseTo(1, 6);
    expect(res.intercept).toBeCloseTo(0, 6);
    expect(res.r).toBeCloseTo(1, 6);
    expect(res.r2).toBeCloseTo(1, 6);
    expect(res.n).toBe(5);
  });

  it("returns slope=2, intercept=1 for y=2x+1", () => {
    const res = linearRegression([0, 1, 2, 3], [1, 3, 5, 7]);
    expect(res.slope).toBeCloseTo(2, 6);
    expect(res.intercept).toBeCloseTo(1, 6);
    expect(res.r).toBeCloseTo(1, 6);
  });

  it("returns negative slope and r for y=-x", () => {
    const res = linearRegression([1, 2, 3, 4, 5], [5, 4, 3, 2, 1]);
    expect(res.slope).toBeCloseTo(-1, 6);
    expect(res.r).toBeCloseTo(-1, 6);
    expect(res.r2).toBeCloseTo(1, 6);
  });

  it("returns r close to expected for noisy data", () => {
    // y = x + small noise → r 약 0.97 정도
    const xs = [1, 2, 3, 4, 5, 6, 7, 8];
    const ys = [1.2, 1.9, 3.1, 3.8, 5.2, 5.9, 7.1, 7.8];
    const res = linearRegression(xs, ys);
    expect(res.r).toBeGreaterThan(0.97);
    expect(res.r).toBeLessThan(1.0);
  });

  it("returns NaN-safe defaults for n<2", () => {
    const res = linearRegression([1], [1]);
    expect(res.n).toBe(1);
    expect(Number.isNaN(res.slope)).toBe(true);
    expect(Number.isNaN(res.r)).toBe(true);
  });

  it("returns NaN-safe defaults for empty arrays", () => {
    const res = linearRegression([], []);
    expect(res.n).toBe(0);
    expect(Number.isNaN(res.r)).toBe(true);
  });

  it("throws if xs and ys lengths differ", () => {
    expect(() => linearRegression([1, 2], [1, 2, 3])).toThrow();
  });

  it("computes correct line endpoints for plotting", () => {
    // y = 2x + 1, xs range [0, 10]
    const res = linearRegression([0, 10], [1, 21]);
    const xMin = 0;
    const xMax = 10;
    const yAtXMin = res.slope * xMin + res.intercept;
    const yAtXMax = res.slope * xMax + res.intercept;
    expect(yAtXMin).toBeCloseTo(1, 6);
    expect(yAtXMax).toBeCloseTo(21, 6);
  });
});
```

- [ ] **Step 1.2: fail 확인**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm test src/lib/stats/regression.test.ts`

Expected: All FAIL ("Cannot find module './regression'").

- [ ] **Step 1.3: 구현**

Create `src/lib/stats/regression.ts`:
```typescript
export interface RegressionResult {
  slope: number;
  intercept: number;
  r: number;       // Pearson correlation
  r2: number;      // coefficient of determination
  n: number;
}

const NAN_RESULT = (n: number): RegressionResult => ({
  slope: Number.NaN,
  intercept: Number.NaN,
  r: Number.NaN,
  r2: Number.NaN,
  n,
});

export function linearRegression(xs: number[], ys: number[]): RegressionResult {
  if (xs.length !== ys.length) {
    throw new Error("linearRegression: xs and ys must have the same length");
  }
  const n = xs.length;
  if (n < 2) return NAN_RESULT(n);

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let sumDxDy = 0;
  let sumDx2 = 0;
  let sumDy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    sumDxDy += dx * dy;
    sumDx2 += dx * dx;
    sumDy2 += dy * dy;
  }

  if (sumDx2 === 0 || sumDy2 === 0) return NAN_RESULT(n);

  const slope = sumDxDy / sumDx2;
  const intercept = meanY - slope * meanX;
  const r = sumDxDy / Math.sqrt(sumDx2 * sumDy2);
  const r2 = r * r;

  return { slope, intercept, r, r2, n };
}
```

- [ ] **Step 1.4: pass 확인 + 전체 회귀**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm test`

Expected: 29 + 8 = 37 tests PASS.

- [ ] **Step 1.5: commit**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/lib/stats && git commit -m "feat(stats): add linearRegression util with TDD"
```

---

## Task 2: 차트 selection 액션 (reducer 확장 + TDD)

**Files:**
- Modify: `src/lib/selection/reducer.ts`
- Modify: `src/lib/selection/reducer.test.ts`

- [ ] **Step 2.1: 추가 테스트 작성 (chart selection)**

Append to `src/lib/selection/reducer.test.ts` — describe 블록을 파일 맨 아래에 추가:
```typescript
describe("chart card selection (toggleChart / rangeChart / clearChartSelection)", () => {
  const initialChart: SelectionState = {
    selectedIds: new Set<string>(),
    drawnIds: new Set<string>(),
    lastClickedId: null,
    selectedChartIds: new Set<string>(),
    lastClickedChartId: null,
  };

  it("toggleChart adds id when not selected", () => {
    const next = applyAction(initialChart, {
      type: "toggleChart",
      id: "MSR0009",
      orderedIds: ["MSR0009", "MSR0018"],
    });
    expect([...next.selectedChartIds]).toEqual(["MSR0009"]);
    expect(next.lastClickedChartId).toBe("MSR0009");
  });

  it("toggleChart removes id when already selected", () => {
    const state: SelectionState = {
      ...initialChart,
      selectedChartIds: new Set(["MSR0009"]),
      lastClickedChartId: "MSR0009",
    };
    const next = applyAction(state, {
      type: "toggleChart",
      id: "MSR0009",
      orderedIds: ["MSR0009"],
    });
    expect(next.selectedChartIds.size).toBe(0);
  });

  it("rangeChart selects all between lastClickedChartId and current", () => {
    const state: SelectionState = {
      ...initialChart,
      selectedChartIds: new Set(["a"]),
      lastClickedChartId: "a",
    };
    const next = applyAction(state, {
      type: "rangeChart",
      id: "c",
      orderedIds: ["a", "b", "c", "d"],
    });
    expect([...next.selectedChartIds].sort()).toEqual(["a", "b", "c"]);
  });

  it("clearChartSelection clears chart selection only", () => {
    const state: SelectionState = {
      ...initialChart,
      selectedIds: new Set(["x"]),
      selectedChartIds: new Set(["MSR0009"]),
      lastClickedChartId: "MSR0009",
    };
    const next = applyAction(state, { type: "clearChartSelection" });
    expect(next.selectedChartIds.size).toBe(0);
    expect([...next.selectedIds]).toEqual(["x"]); // unchanged
  });

  it("setDrawn(drawn=false) removes from drawnIds AND from selectedChartIds", () => {
    const state: SelectionState = {
      ...initialChart,
      drawnIds: new Set(["MSR0009", "MSR0018"]),
      selectedChartIds: new Set(["MSR0009"]),
    };
    const next = applyAction(state, {
      type: "setDrawn",
      id: "MSR0009",
      drawn: false,
    });
    expect([...next.drawnIds]).toEqual(["MSR0018"]);
    expect(next.selectedChartIds.size).toBe(0);
  });
});
```

Also update test initial state — the existing `initial` constant at top now needs the new fields. Replace existing top-level `initial`:
```typescript
const initial: SelectionState = {
  selectedIds: new Set<string>(),
  drawnIds: new Set<string>(),
  lastClickedId: null,
  selectedChartIds: new Set<string>(),
  lastClickedChartId: null,
};
```

- [ ] **Step 2.2: fail 확인**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm test src/lib/selection/reducer.test.ts`

Expected: 새 5 tests FAIL (type errors — `selectedChartIds` missing), 기존 11 tests도 깨질 수 있음 (initial 형 변경).

- [ ] **Step 2.3: reducer 확장**

Replace **entire** content of `src/lib/selection/reducer.ts`:
```typescript
export interface SelectionState {
  selectedIds: Set<string>;
  drawnIds: Set<string>;
  lastClickedId: string | null;
  selectedChartIds: Set<string>;
  lastClickedChartId: string | null;
}

export type SelectionAction =
  | { type: "selectOnly"; id: string; orderedIds: string[] }
  | { type: "toggle"; id: string; orderedIds: string[] }
  | { type: "range"; id: string; orderedIds: string[] }
  | { type: "clearSelection" }
  | { type: "draw" }
  | { type: "setDrawn"; id: string; drawn: boolean }
  | { type: "toggleChart"; id: string; orderedIds: string[] }
  | { type: "rangeChart"; id: string; orderedIds: string[] }
  | { type: "clearChartSelection" };

export function applyAction(
  state: SelectionState,
  action: SelectionAction,
): SelectionState {
  switch (action.type) {
    case "selectOnly":
      return {
        ...state,
        selectedIds: new Set([action.id]),
        lastClickedId: action.id,
      };

    case "toggle": {
      const next = new Set(state.selectedIds);
      if (next.has(action.id)) next.delete(action.id);
      else next.add(action.id);
      return { ...state, selectedIds: next, lastClickedId: action.id };
    }

    case "range": {
      if (state.lastClickedId === null) {
        return {
          ...state,
          selectedIds: new Set([action.id]),
          lastClickedId: action.id,
        };
      }
      const from = action.orderedIds.indexOf(state.lastClickedId);
      const to = action.orderedIds.indexOf(action.id);
      if (from < 0 || to < 0) return state;
      const [lo, hi] = from <= to ? [from, to] : [to, from];
      const slice = action.orderedIds.slice(lo, hi + 1);
      const next = new Set(state.selectedIds);
      for (const id of slice) next.add(id);
      return { ...state, selectedIds: next, lastClickedId: action.id };
    }

    case "clearSelection":
      return { ...state, selectedIds: new Set(), lastClickedId: null };

    case "draw": {
      const nextDrawn = new Set(state.drawnIds);
      for (const id of state.selectedIds) nextDrawn.add(id);
      return {
        ...state,
        drawnIds: nextDrawn,
        selectedIds: new Set(),
        lastClickedId: null,
      };
    }

    case "setDrawn": {
      const nextDrawn = new Set(state.drawnIds);
      const nextChartSel = new Set(state.selectedChartIds);
      if (action.drawn) {
        nextDrawn.add(action.id);
      } else {
        nextDrawn.delete(action.id);
        nextChartSel.delete(action.id);
      }
      return {
        ...state,
        drawnIds: nextDrawn,
        selectedChartIds: nextChartSel,
      };
    }

    case "toggleChart": {
      const next = new Set(state.selectedChartIds);
      if (next.has(action.id)) next.delete(action.id);
      else next.add(action.id);
      return { ...state, selectedChartIds: next, lastClickedChartId: action.id };
    }

    case "rangeChart": {
      if (state.lastClickedChartId === null) {
        return {
          ...state,
          selectedChartIds: new Set([action.id]),
          lastClickedChartId: action.id,
        };
      }
      const from = action.orderedIds.indexOf(state.lastClickedChartId);
      const to = action.orderedIds.indexOf(action.id);
      if (from < 0 || to < 0) return state;
      const [lo, hi] = from <= to ? [from, to] : [to, from];
      const slice = action.orderedIds.slice(lo, hi + 1);
      const next = new Set(state.selectedChartIds);
      for (const id of slice) next.add(id);
      return { ...state, selectedChartIds: next, lastClickedChartId: action.id };
    }

    case "clearChartSelection":
      return { ...state, selectedChartIds: new Set(), lastClickedChartId: null };
  }
}
```

- [ ] **Step 2.4: pass 확인 + 회귀**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm test`

Expected: 8 (regression) + 11 (selection orig) + 5 (chart selection) + 4 (filter) + 14 (data) = 42 tests PASS.

- [ ] **Step 2.5: commit**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/lib/selection && git commit -m "feat(selection): add chart-card selection actions (toggleChart/rangeChart/clear)"
```

---

## Task 3: Store 확장 + Plotly deps

**Files:**
- Modify: `src/lib/store/selection-store.ts`
- Modify: `package.json` (plotly deps)

- [ ] **Step 3.1: Plotly + react-plotly deps 설치**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm add plotly.js-dist-min react-plotly.js && pnpm add -D @types/plotly.js @types/react-plotly.js
```

Expected: `plotly.js-dist-min`, `react-plotly.js` 추가. types도 dev로.

- [ ] **Step 3.2: store 확장 (selectedChartIds 초기화)**

Replace **entire** content of `src/lib/store/selection-store.ts`:
```typescript
import { create } from "zustand";
import {
  applyAction,
  type SelectionAction,
  type SelectionState,
} from "@/lib/selection/reducer";

interface SelectionStore extends SelectionState {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  dispatch: (action: SelectionAction) => void;
}

export const useSelectionStore = create<SelectionStore>((set) => ({
  selectedIds: new Set<string>(),
  drawnIds: new Set<string>(),
  lastClickedId: null,
  selectedChartIds: new Set<string>(),
  lastClickedChartId: null,
  searchQuery: "",
  setSearchQuery: (q) => set({ searchQuery: q }),
  dispatch: (action) =>
    set((state) => {
      const next = applyAction(
        {
          selectedIds: state.selectedIds,
          drawnIds: state.drawnIds,
          lastClickedId: state.lastClickedId,
          selectedChartIds: state.selectedChartIds,
          lastClickedChartId: state.lastClickedChartId,
        },
        action,
      );
      return next;
    }),
}));
```

- [ ] **Step 3.3: type check + build**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm exec tsc --noEmit && pnpm build`

Expected: TS 에러 없음, 빌드 성공.

- [ ] **Step 3.4: commit**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add package.json pnpm-lock.yaml src/lib/store/selection-store.ts && git commit -m "chore(chart): add plotly deps + extend store with chart selection slice"
```

---

## Task 4: Plotly 동적 로더 + 단일 ChartCard

**Files:**
- Create: `src/components/charts/plotly-loader.tsx`
- Create: `src/components/charts/chart-card.tsx`

- [ ] **Step 4.1: Plotly 동적 로더 작성**

Create `src/components/charts/plotly-loader.tsx`:
```typescript
"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { PlotParams } from "react-plotly.js";

export const Plot: ComponentType<PlotParams> = dynamic(
  () => import("react-plotly.js"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
        loading chart…
      </div>
    ),
  },
);
```

- [ ] **Step 4.2: ChartCard 작성**

Create `src/components/charts/chart-card.tsx`:
```typescript
"use client";

import { useMemo } from "react";
import type { Chip, MsrItem } from "@/types/dataset";
import { useSelectionStore } from "@/lib/store/selection-store";
import { linearRegression } from "@/lib/stats/regression";
import { cn } from "@/lib/utils";
import { Plot } from "@/components/charts/plotly-loader";
import type { Data, Layout } from "plotly.js";

interface ChartCardProps {
  msr: MsrItem;
  chips: Chip[];
  orderedDrawnIds: string[];
}

export function ChartCard({ msr, chips, orderedDrawnIds }: ChartCardProps) {
  const selectedChartIds = useSelectionStore((s) => s.selectedChartIds);
  const dispatch = useSelectionStore((s) => s.dispatch);
  const isSelected = selectedChartIds.has(msr.name);

  const { xs, ys } = useMemo(() => {
    const _xs: number[] = [];
    const _ys: number[] = [];
    for (const chip of chips) {
      const v = msr.values[chip.xy];
      if (v === undefined || v === null || Number.isNaN(v)) continue;
      _xs.push(chip.cd);
      _ys.push(v);
    }
    return { xs: _xs, ys: _ys };
  }, [chips, msr]);

  const reg = useMemo(() => linearRegression(xs, ys), [xs, ys]);

  const trendline = useMemo(() => {
    if (xs.length < 2 || Number.isNaN(reg.slope)) return null;
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    return {
      x: [xMin, xMax],
      y: [reg.slope * xMin + reg.intercept, reg.slope * xMax + reg.intercept],
    };
  }, [xs, reg]);

  const data: Data[] = useMemo(() => {
    const traces: Data[] = [
      {
        type: "scattergl",
        mode: "markers",
        x: xs,
        y: ys,
        marker: { size: 5, color: "rgb(63, 63, 70)" },
        hovertemplate: "CD=%{x}<br>val=%{y}<extra></extra>",
        name: msr.name,
      },
    ];
    if (trendline) {
      traces.push({
        type: "scattergl",
        mode: "lines",
        x: trendline.x,
        y: trendline.y,
        line: { color: "rgb(124, 58, 237)", width: 1.5, dash: "dash" },
        hoverinfo: "skip",
        showlegend: false,
      });
    }
    return traces;
  }, [xs, ys, trendline, msr.name]);

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
      dragmode: false,
      hoverlabel: { font: { size: 10 } },
    }),
    [],
  );

  const corrText =
    (reg.r >= 0 ? "+" : "") +
    (Number.isNaN(reg.r) ? "—" : reg.r.toFixed(3));

  function handleSelect(e: { shiftKey: boolean }) {
    if (e.shiftKey) {
      dispatch({ type: "rangeChart", id: msr.name, orderedIds: orderedDrawnIds });
    } else {
      dispatch({ type: "toggleChart", id: msr.name, orderedIds: orderedDrawnIds });
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={handleSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleSelect(e);
        }
      }}
      className={cn(
        "flex min-h-0 cursor-pointer flex-col gap-1 rounded-md border bg-card p-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-selection-strong",
        isSelected
          ? "border-selection-strong ring-2 ring-selection-strong"
          : "border-border hover:border-selection-strong/60",
      )}
    >
      <header className="flex shrink-0 items-center justify-between text-[10px] text-muted-foreground">
        <span className="font-medium text-foreground">{msr.name}</span>
        <span className="font-semibold tabular-nums text-selection-fg">
          r={corrText} · n={reg.n}
        </span>
      </header>
      <div className="min-h-0 flex-1" onClick={(e) => e.stopPropagation()}>
        <Plot
          data={data}
          layout={layout}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: "100%", height: "100%" }}
          useResizeHandler
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4.3: type check + build**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm exec tsc --noEmit && pnpm build`

Expected: TS 에러 없음, 빌드 성공. plotly가 client-only이므로 SSR에서 제외.

If TS 에러 — `@types/plotly.js`나 `react-plotly.js`의 generic 인자 문제 가능성. 보고 fix.

- [ ] **Step 4.4: commit**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/components/charts && git commit -m "feat(charts): add Plotly dynamic loader + ChartCard with scatter + trendline"
```

---

## Task 5: ChartGridArea 통합 + 시각 검증

**Files:**
- Modify (full replace): `src/components/panels/chart-grid-area.tsx`

- [ ] **Step 5.1: ChartGridArea 전체 교체**

Replace **entire** content of `src/components/panels/chart-grid-area.tsx`:
```typescript
"use client";

import { useMemo } from "react";
import type { DataSet } from "@/types/dataset";
import { useSelectionStore } from "@/lib/store/selection-store";
import { ChartCard } from "@/components/charts/chart-card";

interface ChartGridAreaProps {
  dataset: DataSet;
}

export function ChartGridArea({ dataset }: ChartGridAreaProps) {
  const drawnIds = useSelectionStore((s) => s.drawnIds);
  const selectedChartIds = useSelectionStore((s) => s.selectedChartIds);

  const drawnItems = useMemo(
    () => dataset.msrItems.filter((it) => drawnIds.has(it.name)),
    [dataset.msrItems, drawnIds],
  );
  const orderedDrawnIds = useMemo(
    () => drawnItems.map((it) => it.name),
    [drawnItems],
  );

  if (drawnItems.length === 0) {
    return (
      <section className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-3 py-2 text-xs text-muted-foreground">
          <span>0 charts shown</span>
          <span className="text-[10px]">
            select MSR items in the left panel and press Draw
          </span>
        </header>
        <div className="flex flex-1 items-center justify-center p-6 text-xs text-muted-foreground">
          dataset ready: {dataset.chips.length} chips · {dataset.msrItems.length}{" "}
          MSR items
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-3 py-2 text-xs text-muted-foreground">
        <span>
          {drawnItems.length} chart{drawnItems.length > 1 ? "s" : ""} shown
          {selectedChartIds.size > 0 && (
            <>
              {" · "}
              <span className="text-selection-fg">
                {selectedChartIds.size} selected
              </span>
            </>
          )}
        </span>
        <span className="text-[10px]">scroll ↓ for more</span>
      </header>
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid auto-rows-[180px] grid-cols-3 gap-2">
          {drawnItems.map((item) => (
            <ChartCard
              key={item.name}
              msr={item}
              chips={dataset.chips}
              orderedDrawnIds={orderedDrawnIds}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 5.2: 전체 검증**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm exec tsc --noEmit && pnpm lint && pnpm build && pnpm test
```

Expected:
- tsc clean
- lint clean (Plotly any 타입 등으로 warning 있으면 검토)
- build 성공
- 42/42 tests PASS

- [ ] **Step 5.3: dev server 수동 검증 (사용자)**

http://localhost:3000 새로고침. 시도:
- 좌패널에서 항목 클릭 → Draw → 중앙에 차트 카드 표시 (Plotly scatter + violet 추세선)
- 여러 개 선택 후 Draw → 3×3 그리드로 배치
- 9개 초과 시 세로 스크롤
- 차트 카드 클릭 → violet ring 강조 (Shift+클릭 = 범위)
- 다크 모드 전환 시 차트 영역 색 (gridcolor 등) 어색하면 후속 fix

- [ ] **Step 5.4: commit**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/components/panels/chart-grid-area.tsx && git commit -m "feat(chart-grid): wire ChartGridArea to drawnIds with 3-col grid + scroll"
```

---

## Acceptance Criteria

Plan #4 완료 시점:

- [ ] `pnpm test` → 42/42 PASS
- [ ] `pnpm build` → 성공
- [ ] `pnpm lint` → clean
- [ ] `git log --oneline` → 23+ commits (P1 7 + P2 5 + P3 6 + P4 5)
- [ ] `pnpm dev` 시각 검증:
  - 좌패널에서 MSR 선택 + Draw → 중앙에 Plotly scatter 차트 카드 즉시 표시
  - 카드 헤더: `MSR0009 · r=+0.918 · n=18` 같은 형식 (실제 회귀값)
  - 카드 본문: 점들(zinc-700) + 추세선(violet-dashed)
  - 카드 클릭 시 violet ring 강조 (재클릭으로 해제)
  - 9개 그릴 때 3×3 그리드 한 화면에 fit, 10개 이상 시 세로 스크롤

---

## Next Plan Preview

**Plan #5: 우패널 그룹 워크플로 + 엣지 케이스**

- Group 1 / Group 2 store slice 추가 (`group1Ids`, `group2Ids`)
- Add 액션: selectedChartIds → groupNIds, drawnIds에서도 제거
- Delete 액션: groupNIds 선택분 → drawnIds로 복원 (List 자동 재등장 + 카드 자동 재생성)
- 그룹 내부 multi-select (List/카드와 동일 패턴)
- 엣지 케이스: 모든 항목 그룹 이동 시 List 빈 메시지, "drawn 항목 재선택 시 자동 스크롤" 등

Plan #4 완료 후 작성.
