# PlotMate Performance + Loading UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** 3000+ chip × 다중 차트 환경에서 (1) 첫 페이지 로드 시 frozen 인상 제거, (2) Draw 시 즉시 시각 반응 + 점진 진행 카운트, (3) viewport 밖 카드는 mount 안 함 → scattergl 안전 복귀, (4) 다운샘플링 임계치로 미래 데이터 확장 대비.

**Architecture:**
- `app/loading.tsx` Suspense fallback으로 첫 페이지 dataset 파싱 동안 3-pane skeleton 표시
- `Plot` dynamic import의 loading fallback을 회색 pulse skeleton (헤더는 즉시 보이고 본문만 placeholder)
- store에 `readyChartIds: Set<string>` slice 추가 → ChartCard가 Plotly `onInitialized` 콜백으로 ready 신호 → ChartGridArea 헤더에 진행 카운트
- `useInViewport` IntersectionObserver hook으로 ChartCard 자체를 lazy mount → 동시 활성 Plotly instance를 viewport 안 ~6개로 제한 → `scattergl` 안전하게 복귀
- `sampleChips` util: chips.length > 임계치(default 1500)이면 random sample, 차트 헤더에 `n=3000 (1500 shown)` 표시

**Tech Stack:** Next.js Suspense + Tailwind animate-pulse + IntersectionObserver API + Plotly `onInitialized` / `scattergl` / fixed Math.random seed for sample reproducibility.

**Spec reference:** [docs/superpowers/specs/2026-05-23-plotmate-ui-design.md](../specs/2026-05-23-plotmate-ui-design.md) — § 5 (중앙 차트), § 10 (엣지: 로딩 중 skeleton)

**Prerequisite:** Plan #5 + 100 MSR 데이터 확장 완료 (34 commits, `..38e89c8`).

---

## File Structure

| 경로 | 책임 |
|---|---|
| `src/app/loading.tsx` | (create) Suspense fallback — 3-pane shell skeleton |
| `src/components/charts/plotly-loader.tsx` | (modify) loading fallback을 pulse skeleton으로 |
| `src/lib/selection/reducer.ts` | (modify) `setChartReady` action + `readyChartIds` slice |
| `src/lib/selection/reducer.test.ts` | (append) ready slice 4 tests |
| `src/lib/store/selection-store.ts` | (modify) readyChartIds init |
| `src/components/charts/chart-card.tsx` | (modify) onInitialized 콜백 + scattergl 복귀 |
| `src/components/panels/chart-grid-area.tsx` | (modify) 헤더 카운트 |
| `src/lib/hooks/use-in-viewport.ts` | (create) IntersectionObserver hook |
| `src/components/charts/chart-card.tsx` | (modify) useInViewport로 lazy mount + 자체 skeleton |
| `src/lib/stats/downsample.ts` | (create) random sample util |
| `src/lib/stats/downsample.test.ts` | (create) 5 TDD tests |

---

## Task 1: app/loading.tsx + plotly-loader skeleton

**Files:**
- Create: `src/app/loading.tsx`
- Modify (full replace): `src/components/charts/plotly-loader.tsx`

- [ ] **Step 1.1: app/loading.tsx 작성 (3-pane shell skeleton)**

Create: `src/app/loading.tsx`
```typescript
export default function Loading() {
  return (
    <div className="flex h-screen gap-2.5 bg-muted/40 p-3">
      {/* 좌패널 skeleton */}
      <aside className="flex w-[175px] shrink-0 flex-col gap-1.5">
        <div className="h-8 rounded-lg bg-card animate-pulse" />
        <div className="flex-1 rounded-lg bg-card animate-pulse" />
        <div className="h-7 rounded-md bg-card animate-pulse" />
        <div className="h-10 rounded-xl bg-primary/30 animate-pulse" />
      </aside>
      {/* 중앙 skeleton */}
      <section className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="h-3 w-32 rounded bg-muted animate-pulse" />
          <div className="h-3 w-24 rounded bg-muted animate-pulse" />
        </header>
        <div className="flex flex-1 items-center justify-center p-6 text-xs text-muted-foreground">
          데이터 로드 중…
        </div>
      </section>
      {/* 우패널 skeleton */}
      <aside className="flex w-[140px] shrink-0 flex-col gap-2">
        <div className="flex-1 rounded-lg bg-card animate-pulse" />
        <div className="flex-1 rounded-lg bg-card animate-pulse" />
      </aside>
    </div>
  );
}
```

- [ ] **Step 1.2: plotly-loader.tsx의 fallback을 pulse skeleton으로**

Replace **entire** content of `src/components/charts/plotly-loader.tsx`:
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
      <div className="h-full w-full animate-pulse rounded bg-muted/60" />
    ),
  },
);
```

- [ ] **Step 1.3: type check + build + dev server 시각 확인 가능 상태**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm exec tsc --noEmit && pnpm lint && pnpm build && pnpm test`

Expected: clean, 54/54 PASS (회귀, P5 기준 — readyChartIds 추가는 Task 2).

- [ ] **Step 1.4: commit**

```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/app/loading.tsx src/components/charts/plotly-loader.tsx && git commit -m "feat(loading): add app/loading.tsx + pulse skeleton for Plot fallback"
```

---

## Task 2: Store readyChartIds slice + setChartReady action (TDD)

**Files:**
- Modify: `src/lib/selection/reducer.ts` (1 action + 1 slice field 추가)
- Modify: `src/lib/selection/reducer.test.ts` (append 4 tests + update initial)
- Modify: `src/lib/store/selection-store.ts` (init readyChartIds)

- [ ] **Step 2.1: 테스트 작성 (append)**

`src/lib/selection/reducer.test.ts`의 top-level `initial` const에 한 줄 추가:
```typescript
const initial: SelectionState = {
  // ... 기존 11 fields ...
  readyChartIds: new Set<string>(),  // 추가
};
```

또 `initialChart`, `initialGroups` 등 다른 literal `SelectionState`에도 `readyChartIds: new Set<string>()` 추가.

파일 끝에 새 describe block append:
```typescript
describe("ready chart tracking (setChartReady)", () => {
  const initialReady: SelectionState = {
    selectedIds: new Set<string>(),
    drawnIds: new Set<string>(),
    lastClickedId: null,
    selectedChartIds: new Set<string>(),
    lastClickedChartId: null,
    group1Ids: new Set<string>(),
    group2Ids: new Set<string>(),
    selectedInGroup1Ids: new Set<string>(),
    selectedInGroup2Ids: new Set<string>(),
    lastClickedInGroup1Id: null,
    lastClickedInGroup2Id: null,
    readyChartIds: new Set<string>(),
  };

  it("setChartReady true adds id to readyChartIds", () => {
    const next = applyAction(initialReady, {
      type: "setChartReady",
      id: "MSR0009",
      ready: true,
    });
    expect([...next.readyChartIds]).toEqual(["MSR0009"]);
  });

  it("setChartReady false removes id from readyChartIds", () => {
    const state: SelectionState = {
      ...initialReady,
      readyChartIds: new Set(["MSR0009", "MSR0001"]),
    };
    const next = applyAction(state, {
      type: "setChartReady",
      id: "MSR0009",
      ready: false,
    });
    expect([...next.readyChartIds]).toEqual(["MSR0001"]);
  });

  it("draw clears readyChartIds (all cards re-mount with new data)", () => {
    const state: SelectionState = {
      ...initialReady,
      selectedIds: new Set(["new1"]),
      readyChartIds: new Set(["old1", "old2"]),
    };
    const next = applyAction(state, { type: "draw" });
    expect(next.readyChartIds.size).toBe(0);
  });

  it("setDrawn(drawn=false) removes id from readyChartIds", () => {
    const state: SelectionState = {
      ...initialReady,
      drawnIds: new Set(["MSR0009"]),
      readyChartIds: new Set(["MSR0009"]),
    };
    const next = applyAction(state, {
      type: "setDrawn",
      id: "MSR0009",
      drawn: false,
    });
    expect(next.readyChartIds.size).toBe(0);
  });
});
```

- [ ] **Step 2.2: fail 확인**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm test src/lib/selection/reducer.test.ts`

Expected: 4 new tests FAIL + 기존 tests 일부 type error.

- [ ] **Step 2.3: reducer 수정**

`src/lib/selection/reducer.ts`:

(a) `SelectionState` interface 끝에 추가:
```typescript
  readyChartIds: Set<string>;
```

(b) `SelectionAction` union 끝에 추가:
```typescript
  | { type: "setChartReady"; id: string; ready: boolean };
```

(c) `draw` case에서 `readyChartIds: new Set()` 추가 (모든 카드 새로 mount):
```typescript
    case "draw": {
      if (state.selectedIds.size === 0) return state;
      return {
        ...state,
        drawnIds: new Set(state.selectedIds),
        selectedIds: new Set(),
        lastClickedId: null,
        selectedChartIds: new Set(),
        lastClickedChartId: null,
        readyChartIds: new Set(),  // 추가
      };
    }
```

(d) `setDrawn` case에서 `nextReady.delete(action.id)` (drawn=false 시) 추가:
```typescript
    case "setDrawn": {
      const nextDrawn = new Set(state.drawnIds);
      const nextChartSel = new Set(state.selectedChartIds);
      const nextReady = new Set(state.readyChartIds);  // 추가
      if (action.drawn) {
        nextDrawn.add(action.id);
      } else {
        nextDrawn.delete(action.id);
        nextChartSel.delete(action.id);
        nextReady.delete(action.id);  // 추가
      }
      return {
        ...state,
        drawnIds: nextDrawn,
        selectedChartIds: nextChartSel,
        readyChartIds: nextReady,  // 추가
      };
    }
```

(e) 새 case 추가 (switch 끝부분에):
```typescript
    case "setChartReady": {
      const next = new Set(state.readyChartIds);
      if (action.ready) next.add(action.id);
      else next.delete(action.id);
      return { ...state, readyChartIds: next };
    }
```

- [ ] **Step 2.4: store 갱신**

`src/lib/store/selection-store.ts`에 `readyChartIds` 초기화 + dispatch 전달 추가:

initial state에 추가:
```typescript
  readyChartIds: new Set<string>(),
```

dispatch의 partial state 객체에도 추가:
```typescript
          readyChartIds: state.readyChartIds,
```

- [ ] **Step 2.5: pass + 회귀**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm exec tsc --noEmit && pnpm test`

Expected: 58 tests PASS (54 prior + 4 new).

- [ ] **Step 2.6: commit**

```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/lib/selection src/lib/store/selection-store.ts && git commit -m "feat(selection): add readyChartIds slice + setChartReady action (TDD)"
```

---

## Task 3: ChartCard onInitialized + ChartGridArea header counter

**Files:**
- Modify: `src/components/charts/chart-card.tsx` (Plot에 onInitialized)
- Modify: `src/components/panels/chart-grid-area.tsx` (헤더 카운트)

- [ ] **Step 3.1: ChartCard에서 onInitialized 콜백 dispatch**

Read `src/components/charts/chart-card.tsx`. 다음 변경:

(a) imports에 useEffect 없으면 추가 (이미 있을 듯)

(b) Plot 컴포넌트의 props에 추가:
```typescript
<Plot
  data={data}
  layout={layout}
  config={{ displayModeBar: false, responsive: true }}
  style={{ width: "100%", height: "100%" }}
  useResizeHandler
  onInitialized={() => dispatch({ type: "setChartReady", id: msr.name, ready: true })}
/>
```

(c) ChartCard unmount 시 ready 상태 정리 — useEffect cleanup으로:
```typescript
useEffect(() => {
  return () => {
    dispatch({ type: "setChartReady", id: msr.name, ready: false });
  };
}, [msr.name, dispatch]);
```

이 effect는 컴포넌트 전체 body에 한 번 추가 (return JSX 위).

- [ ] **Step 3.2: ChartGridArea 헤더 카운트**

Read `src/components/panels/chart-grid-area.tsx`. 다음 변경:

(a) `readyChartIds` selector 추가 (drawnIds, selectedChartIds 옆):
```typescript
const readyChartIds = useSelectionStore((s) => s.readyChartIds);
```

(b) drawnItems에서 ready count 계산 (useMemo 안 또는 즉시):
```typescript
const readyCount = drawnItems.filter((it) => readyChartIds.has(it.name)).length;
const renderingCount = drawnItems.length - readyCount;
```

(c) 헤더 span 텍스트 갱신 (현재 `{drawnItems.length} chart(s) shown` → 카운트 포함):
```typescript
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
```

- [ ] **Step 3.3: type check + build + test**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm exec tsc --noEmit && pnpm lint && pnpm build && pnpm test`

Expected: clean, 58/58 PASS.

- [ ] **Step 3.4: commit**

```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/components/charts/chart-card.tsx src/components/panels/chart-grid-area.tsx && git commit -m "feat(chart): track Plotly ready state + show progress count in grid header"
```

---

## Task 4: IntersectionObserver + lazy mount + scattergl 복귀

**Files:**
- Create: `src/lib/hooks/use-in-viewport.ts`
- Modify: `src/components/charts/chart-card.tsx` (lazy mount + scattergl)

- [ ] **Step 4.1: useInViewport hook 작성**

Create `src/lib/hooks/use-in-viewport.ts`:
```typescript
"use client";

import { useEffect, useRef, useState } from "react";

interface UseInViewportOptions {
  rootMargin?: string;
  threshold?: number;
}

export function useInViewport<T extends HTMLElement>(
  options: UseInViewportOptions = {},
): { ref: React.RefObject<T | null>; inViewport: boolean } {
  const ref = useRef<T | null>(null);
  const [inViewport, setInViewport] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setInViewport(true); // SSR/test fallback: assume visible
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setInViewport(entry.isIntersecting),
      {
        rootMargin: options.rootMargin ?? "200px",
        threshold: options.threshold ?? 0,
      },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [options.rootMargin, options.threshold]);

  return { ref, inViewport };
}
```

`rootMargin: "200px"` — 화면 위·아래 200px 여유 buffer로 mount 미리 시작 (사용자가 스크롤할 때 빈 카드 보이는 시간↓).

- [ ] **Step 4.2: ChartCard에서 useInViewport + scattergl 복귀**

`src/components/charts/chart-card.tsx` 수정:

(a) imports에 추가:
```typescript
import { useInViewport } from "@/lib/hooks/use-in-viewport";
```

(b) 컴포넌트 body 상단에 hook 호출:
```typescript
const { ref, inViewport } = useInViewport<HTMLDivElement>();
```

(c) outer `<div role="button">`에 `ref={ref}` 추가.

(d) Plot mount 조건부 — 본문 div 안에:
```typescript
<div className="min-h-0 flex-1">
  {inViewport ? (
    <Plot
      data={data}
      layout={layout}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%", height: "100%" }}
      useResizeHandler
      onInitialized={() => dispatch({ type: "setChartReady", id: msr.name, ready: true })}
    />
  ) : (
    <div className="h-full w-full animate-pulse rounded bg-muted/60" />
  )}
</div>
```

(e) data trace `type: "scatter"` → `type: "scattergl"` 두 군데 모두 변경:
```typescript
{
  type: "scattergl",  // (1) markers trace
  ...
},
// trendline
{
  type: "scattergl",  // (2) line trace
  ...
}
```

- [ ] **Step 4.3: 전체 검증**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm exec tsc --noEmit && pnpm lint && pnpm build && pnpm test`

Expected: clean, 58/58 PASS.

- [ ] **Step 4.4: commit**

```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/lib/hooks src/components/charts/chart-card.tsx && git commit -m "perf(chart): lazy-mount Plotly via IntersectionObserver + revert to scattergl

Viewport-only mount keeps live WebGL context count ~6-9 (matches grid
visible area), well under Chrome's ~16 limit. Off-screen cards show
animate-pulse skeleton until scrolled into view. With this gate in place,
scattergl is safe again -- GPU-accelerated rendering handles 3000+ points
per chart without DOM bloat."
```

---

## Task 5: 다운샘플링 util (TDD) + 통합 + 시각 검증

**Files:**
- Create: `src/lib/stats/downsample.ts`
- Create: `src/lib/stats/downsample.test.ts`
- Modify: `src/components/charts/chart-card.tsx` (sample 적용 + 헤더에 n 표시)

- [ ] **Step 5.1: downsample 테스트 작성**

Create `src/lib/stats/downsample.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { sampleIndices } from "./downsample";

describe("sampleIndices (deterministic random sample)", () => {
  it("returns all indices when n <= limit", () => {
    expect(sampleIndices(10, 100)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(sampleIndices(100, 100)).toHaveLength(100);
  });

  it("returns exactly `limit` indices when n > limit", () => {
    const idx = sampleIndices(3000, 1500);
    expect(idx).toHaveLength(1500);
  });

  it("returned indices are unique and within [0, n)", () => {
    const n = 5000;
    const idx = sampleIndices(n, 1500);
    const set = new Set(idx);
    expect(set.size).toBe(1500);
    for (const i of idx) {
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(n);
    }
  });

  it("indices are sorted ascending (preserves underlying order)", () => {
    const idx = sampleIndices(3000, 500);
    for (let i = 1; i < idx.length; i++) {
      expect(idx[i]).toBeGreaterThan(idx[i - 1]);
    }
  });

  it("is deterministic for the same (n, limit) pair", () => {
    const a = sampleIndices(3000, 1000);
    const b = sampleIndices(3000, 1000);
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 5.2: fail 확인**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm test src/lib/stats/downsample.test.ts`

Expected: All FAIL (module not found).

- [ ] **Step 5.3: downsample 구현**

Create `src/lib/stats/downsample.ts`:
```typescript
/**
 * Mulberry32 PRNG — deterministic, fast 32-bit seeded RNG.
 */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic random sample of indices from [0, n).
 * Returns `n` indices if `n <= limit`; otherwise exactly `limit` indices,
 * sorted ascending, unique. Seed is derived from `(n, limit)` for stability
 * across renders.
 */
export function sampleIndices(n: number, limit: number): number[] {
  if (n <= limit) {
    return Array.from({ length: n }, (_, i) => i);
  }
  const rng = mulberry32(n * 100003 + limit);
  // Reservoir-like Fisher-Yates partial shuffle on an index pool.
  const pool = Array.from({ length: n }, (_, i) => i);
  for (let i = 0; i < limit; i++) {
    const j = i + Math.floor(rng() * (n - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, limit).sort((a, b) => a - b);
}
```

- [ ] **Step 5.4: pass 확인**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm test src/lib/stats/downsample.test.ts`

Expected: 5 PASS.

- [ ] **Step 5.5: ChartCard에 sample 적용 + 헤더 갱신**

`src/components/charts/chart-card.tsx` 수정:

(a) import 추가:
```typescript
import { sampleIndices } from "@/lib/stats/downsample";

const SAMPLE_LIMIT = 1500;
```

(b) 기존 `xs/ys` useMemo 갱신 — sample 후 추출:
```typescript
const { xs, ys, totalN } = useMemo(() => {
  const sampled = sampleIndices(chips.length, SAMPLE_LIMIT);
  const _xs: number[] = [];
  const _ys: number[] = [];
  for (const i of sampled) {
    const chip = chips[i];
    const v = msr.values[chip.xy];
    if (v === undefined || v === null || Number.isNaN(v)) continue;
    _xs.push(chip.cd);
    _ys.push(v);
  }
  return { xs: _xs, ys: _ys, totalN: chips.length };
}, [chips, msr]);
```

(c) 회귀는 sample 이후 점에 대해 계산 (현재처럼). 단 헤더에 `n=1500 of 3000` 같이 두 수치 표기:
기존:
```typescript
r={corrText} · n={reg.n}
```
새 (sample했을 때만 ` of {totalN}` 표시):
```typescript
r={corrText} · n={reg.n}
{totalN > reg.n && (
  <span className="text-muted-foreground/70"> of {totalN}</span>
)}
```

- [ ] **Step 5.6: 전체 검증**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm exec tsc --noEmit && pnpm lint && pnpm build && pnpm test`

Expected: clean, 63/63 PASS (58 prior + 5 new).

- [ ] **Step 5.7: dev server 재시작 + 시각 검증 (사용자)**

dev server background에서 hot reload 처리. 만약 cache 문제면 controller가 재시작.

사용자에게 다음 측정 요청:
- 첫 페이지 로드 시 frozen vs 즉시 skeleton 보임
- Draw 시 카드 placeholder 즉시 표시 + 진행 카운트 갱신
- 스크롤 시 viewport 안 카드만 mount, 위아래 빈 카드는 skeleton
- WebGL context 한계로 깨지는 카드 없음 (12+ 시도)
- 헤더에 `n=1500 of 3000` 표시 확인

- [ ] **Step 5.8: commit**

```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/lib/stats src/components/charts/chart-card.tsx && git commit -m "perf(chart): random-sample chips above 1500 points + show 'n of N' in header"
```

---

## Acceptance Criteria

Plan #6 완료 시:

- [ ] `pnpm test` → 63/63 PASS (58 prior + 4 ready + 5 downsample = 67? — 실제로는 reducer ready 4 + downsample 5 = 9 추가, 54+9 = 63)
- [ ] `pnpm build` → 성공
- [ ] `pnpm lint` → clean
- [ ] `git log --oneline` → 39+ commits (34 prior + 5 new)
- [ ] `pnpm dev` 시각 검증:
  1. 첫 페이지 로드: 3-pane skeleton 즉시 표시 → 데이터 로드 후 실제 UI
  2. Draw 12개: 즉시 placeholder 카드 12개 + 헤더 `12 charts (0 ready, 12 rendering…)`
  3. 1초 후: ready count 증가
  4. 스크롤: viewport 밖 카드 unmount → 재진입 시 다시 mount (animate-pulse 잠시)
  5. 차트 깨짐 없음 (scattergl + lazy mount로 WebGL 한계 우회)
  6. 헤더에 `n=1500 of 3000` (3000 chip 환경) 또는 `n=3000` (1500 이하 chip 환경)

---

## Next Plan Preview

**Plan #7: 차트 카드 toolbar (spec § 5.3)**
- 점 삭제(outlier 제거) / Undo / Reset / 통계 모달 / 추세선 toggle
- Sensorpia ChartBlock 패턴 차용

Plan #6 완료 후 작성.
