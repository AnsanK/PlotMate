# PlotMate Left Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 좌패널의 실제 기능 구현 — 검색 필터, Priority 정렬 List, multi-select(Ctrl/Shift), Draw 버튼(Enter/더블클릭), drawn 상태 시각 구분, Selection 액센트 디자인 토큰. Zustand 상태 store로 selection·drawn·search query 관리.

**Architecture:**
- `globals.css`에 violet 액센트 토큰 `--selection-bg`/`--selection-fg`/`--selection-strong` 추가 (라이트/다크 페어). spec § 2 + § 4.2의 violet 강조 색을 의미 기반 토큰화.
- Zustand store (`src/lib/store/selection-store.ts`)가 클라이언트 상태(`selectedIds`, `drawnIds`, `searchQuery`)와 액션(toggle/range/draw 등)을 관리. 순수 reducer 로직은 별도 함수로 분리해 유닛 테스트.
- 좌패널 일부 컴포넌트는 `"use client"` (검색·List·Draw — 사용자 상호작용 필요). LeftPanel도 client 컴포넌트로 전환하되 dataset prop은 RSC `AppShell`이 server에서 받아 props로 내려줌.
- TDD: store reducer + filter 로직만 유닛 테스트. UI 컴포넌트 자체 테스트는 후속 plan에서 testing-library 도입 시 추가.

**Tech Stack:** Zustand (이미 설치돼 있지 않음 → 새로 추가) / Vitest unit / Tailwind oklch tokens / next/lucide-react / @/ alias.

**Spec reference:** [docs/superpowers/specs/2026-05-23-plotmate-ui-design.md](../specs/2026-05-23-plotmate-ui-design.md) — § 2 (디자인 토큰), § 4 (좌패널), § 7 (상태 모델), § 8 (단축키), § 10 (엣지 케이스 일부)

**Prerequisite:** Plan #2 완료 (commits `6dfe711..431052f`). `getDataset()` server module + 3-pane AppShell + 디자인 토큰 + 다크모드 토글 wiring 동작.

---

## File Structure

| 경로 | 책임 |
|---|---|
| `package.json` | `zustand` deps 추가 |
| `src/app/globals.css` | violet 액센트 토큰 3쌍 (라이트/다크 페어) 추가 |
| `src/lib/selection/reducer.ts` | 순수 reducer 함수 (toggle/range/select-only/clear/setDrawn). 테스트 대상 |
| `src/lib/selection/reducer.test.ts` | reducer 유닛 테스트 |
| `src/lib/selection/filter.ts` | search query 매칭 함수 (case-insensitive substring). 테스트 대상 |
| `src/lib/selection/filter.test.ts` | filter 유닛 테스트 |
| `src/lib/store/selection-store.ts` | Zustand store (reducer + filter 활용, client) |
| `src/components/panels/search-bar.tsx` | 검색 입력 (client) |
| `src/components/panels/msr-list.tsx` | Priority 정렬 List + 시각 상태 (client) |
| `src/components/panels/draw-button.tsx` | Draw 버튼 + 단축키 (client) |
| `src/components/panels/left-panel.tsx` | client 컴포넌트로 전환, 위 세 컴포넌트 통합 |
| (modify) `src/components/app-shell.tsx` | LeftPanel에 `msrItems`, `chips` 전달 명확화 (필요시) |

---

## Task 1: Violet accent tokens + selection reducer (TDD)

**Files:**
- Modify: `src/app/globals.css` (토큰 추가)
- Create: `src/lib/selection/reducer.ts`
- Create: `src/lib/selection/reducer.test.ts`
- Modify: `package.json` (zustand)

- [ ] **Step 1.1: zustand 설치**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm add zustand
```

Expected: `package.json` dependencies에 `zustand` 추가.

- [ ] **Step 1.2: globals.css에 violet selection 토큰 추가**

Modify `src/app/globals.css` — 다음 변경 3곳:

**(a) `@theme inline { ... }` 블록 안 마지막에 (radius 위 또는 뒤) 추가:**
```css
  --color-selection-bg: var(--selection-bg);
  --color-selection-fg: var(--selection-fg);
  --color-selection-strong: var(--selection-strong);
```

**(b) `:root { ... }` 블록 안 마지막에 (--radius 위에) 추가:**
```css
  --selection-bg: oklch(0.96 0.03 295);     /* light violet-50 */
  --selection-fg: oklch(0.50 0.22 295);     /* light violet-600 */
  --selection-strong: oklch(0.58 0.23 295); /* light violet-500 */
```

**(c) `.dark { ... }` 블록 안 마지막에 추가:**
```css
  --selection-bg: oklch(0.30 0.10 295 / 30%); /* dark violet bg with alpha */
  --selection-fg: oklch(0.75 0.18 295);       /* dark violet-400 */
  --selection-strong: oklch(0.65 0.22 295);   /* dark violet-500 */
```

이 토큰들은 Tailwind v4 `@theme inline` 매핑으로 `bg-selection-bg`, `text-selection-fg`, `bg-selection-strong` 같은 클래스 자동 생성.

- [ ] **Step 1.3: reducer 유닛 테스트 작성 (failing)**

Create: `src/lib/selection/reducer.test.ts`
```typescript
import { describe, it, expect } from "vitest";
import { applyAction, type SelectionState } from "./reducer";

const initial: SelectionState = {
  selectedIds: new Set<string>(),
  drawnIds: new Set<string>(),
  lastClickedId: null,
};

describe("selection reducer", () => {
  describe("selectOnly", () => {
    it("clears previous selection and selects only the clicked id", () => {
      const state: SelectionState = {
        ...initial,
        selectedIds: new Set(["a", "b"]),
      };
      const next = applyAction(state, {
        type: "selectOnly",
        id: "c",
        orderedIds: ["a", "b", "c"],
      });
      expect([...next.selectedIds]).toEqual(["c"]);
      expect(next.lastClickedId).toBe("c");
    });
  });

  describe("toggle (Ctrl+click)", () => {
    it("adds id when not selected", () => {
      const state: SelectionState = { ...initial, selectedIds: new Set(["a"]) };
      const next = applyAction(state, {
        type: "toggle",
        id: "b",
        orderedIds: ["a", "b"],
      });
      expect([...next.selectedIds].sort()).toEqual(["a", "b"]);
      expect(next.lastClickedId).toBe("b");
    });

    it("removes id when already selected", () => {
      const state: SelectionState = {
        ...initial,
        selectedIds: new Set(["a", "b"]),
      };
      const next = applyAction(state, {
        type: "toggle",
        id: "b",
        orderedIds: ["a", "b"],
      });
      expect([...next.selectedIds]).toEqual(["a"]);
    });
  });

  describe("range (Shift+click)", () => {
    it("selects all ids between lastClickedId and current (inclusive)", () => {
      const state: SelectionState = {
        ...initial,
        selectedIds: new Set(["a"]),
        lastClickedId: "a",
      };
      const next = applyAction(state, {
        type: "range",
        id: "d",
        orderedIds: ["a", "b", "c", "d", "e"],
      });
      expect([...next.selectedIds].sort()).toEqual(["a", "b", "c", "d"]);
    });

    it("works in reverse direction", () => {
      const state: SelectionState = {
        ...initial,
        selectedIds: new Set(["d"]),
        lastClickedId: "d",
      };
      const next = applyAction(state, {
        type: "range",
        id: "a",
        orderedIds: ["a", "b", "c", "d", "e"],
      });
      expect([...next.selectedIds].sort()).toEqual(["a", "b", "c", "d"]);
    });

    it("falls back to selectOnly when lastClickedId is null", () => {
      const state: SelectionState = initial;
      const next = applyAction(state, {
        type: "range",
        id: "c",
        orderedIds: ["a", "b", "c"],
      });
      expect([...next.selectedIds]).toEqual(["c"]);
    });
  });

  describe("clearSelection (Esc)", () => {
    it("clears selection but keeps drawn", () => {
      const state: SelectionState = {
        selectedIds: new Set(["a", "b"]),
        drawnIds: new Set(["c"]),
        lastClickedId: "b",
      };
      const next = applyAction(state, { type: "clearSelection" });
      expect(next.selectedIds.size).toBe(0);
      expect([...next.drawnIds]).toEqual(["c"]);
      expect(next.lastClickedId).toBeNull();
    });
  });

  describe("draw (push selected → drawn, skip already-drawn)", () => {
    it("adds non-drawn selected ids to drawnIds, drops them from selectedIds", () => {
      const state: SelectionState = {
        selectedIds: new Set(["a", "b", "c"]),
        drawnIds: new Set(["b"]), // b already drawn
        lastClickedId: "c",
      };
      const next = applyAction(state, { type: "draw" });
      expect([...next.drawnIds].sort()).toEqual(["a", "b", "c"]);
      expect(next.selectedIds.size).toBe(0);
    });

    it("is a no-op when nothing selected", () => {
      const state: SelectionState = {
        ...initial,
        drawnIds: new Set(["x"]),
      };
      const next = applyAction(state, { type: "draw" });
      expect([...next.drawnIds]).toEqual(["x"]);
      expect(next.selectedIds.size).toBe(0);
    });
  });

  describe("setDrawn (programmatic, e.g., Group Delete returns item)", () => {
    it("adds an id to drawnIds (idempotent)", () => {
      const state: SelectionState = {
        ...initial,
        drawnIds: new Set(["a"]),
      };
      const next = applyAction(state, { type: "setDrawn", id: "b", drawn: true });
      expect([...next.drawnIds].sort()).toEqual(["a", "b"]);
    });

    it("removes an id from drawnIds", () => {
      const state: SelectionState = {
        ...initial,
        drawnIds: new Set(["a", "b"]),
      };
      const next = applyAction(state, { type: "setDrawn", id: "a", drawn: false });
      expect([...next.drawnIds]).toEqual(["b"]);
    });
  });
});
```

- [ ] **Step 1.4: 테스트 실행 → fail 확인**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm test src/lib/selection/reducer.test.ts`

Expected: 모든 테스트 FAIL ("Cannot find module './reducer'").

- [ ] **Step 1.5: reducer 구현**

Create: `src/lib/selection/reducer.ts`
```typescript
export interface SelectionState {
  selectedIds: Set<string>;
  drawnIds: Set<string>;
  lastClickedId: string | null;
}

export type SelectionAction =
  | { type: "selectOnly"; id: string; orderedIds: string[] }
  | { type: "toggle"; id: string; orderedIds: string[] }
  | { type: "range"; id: string; orderedIds: string[] }
  | { type: "clearSelection" }
  | { type: "draw" }
  | { type: "setDrawn"; id: string; drawn: boolean };

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
      const next = new Set(state.drawnIds);
      if (action.drawn) next.add(action.id);
      else next.delete(action.id);
      return { ...state, drawnIds: next };
    }
  }
}
```

- [ ] **Step 1.6: 테스트 재실행 → pass 확인**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm test src/lib/selection/reducer.test.ts`

Expected: 모든 reducer 테스트 PASS (10 tests).

- [ ] **Step 1.7: 전체 회귀 + build**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm test && pnpm build`

Expected: 14 (Plan #1) + 10 (reducer) = 24 tests PASS. build 성공 (새 oklch 토큰 정상 인식).

- [ ] **Step 1.8: commit**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/app/globals.css src/lib/selection package.json pnpm-lock.yaml && git commit -m "feat(selection): add violet selection tokens + reducer with TDD"
```

---

## Task 2: Search filter (TDD)

**Files:**
- Create: `src/lib/selection/filter.ts`
- Create: `src/lib/selection/filter.test.ts`

- [ ] **Step 2.1: filter 테스트 작성**

Create: `src/lib/selection/filter.test.ts`
```typescript
import { describe, it, expect } from "vitest";
import { matchesQuery } from "./filter";

describe("matchesQuery (case-insensitive substring)", () => {
  it("matches when query is a substring of name (case-insensitive)", () => {
    expect(matchesQuery("MSR0009", "msr0009")).toBe(true);
    expect(matchesQuery("MSR0009", "MS")).toBe(true);
    expect(matchesQuery("MSR0009", "0009")).toBe(true);
    expect(matchesQuery("MSR0009", "9")).toBe(true);
  });

  it("returns false when no substring match", () => {
    expect(matchesQuery("MSR0009", "abc")).toBe(false);
    expect(matchesQuery("MSR0009", "MSR1000")).toBe(false);
  });

  it("returns true for empty query (everything matches)", () => {
    expect(matchesQuery("MSR0009", "")).toBe(true);
    expect(matchesQuery("anything", "")).toBe(true);
  });

  it("trims whitespace from query", () => {
    expect(matchesQuery("MSR0009", "  msr  ")).toBe(true);
    expect(matchesQuery("MSR0009", "   ")).toBe(true); // empty after trim
  });
});
```

- [ ] **Step 2.2: fail 확인**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm test src/lib/selection/filter.test.ts`

Expected: 모든 테스트 FAIL.

- [ ] **Step 2.3: filter 구현**

Create: `src/lib/selection/filter.ts`
```typescript
export function matchesQuery(name: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return true;
  return name.toLowerCase().includes(q);
}
```

- [ ] **Step 2.4: pass 확인**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm test src/lib/selection/filter.test.ts`

Expected: 4 tests PASS.

- [ ] **Step 2.5: commit**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/lib/selection/filter.ts src/lib/selection/filter.test.ts && git commit -m "feat(selection): add matchesQuery (case-insensitive substring filter)"
```

---

## Task 3: Zustand store

**Files:**
- Create: `src/lib/store/selection-store.ts`

- [ ] **Step 3.1: Zustand store 작성**

Create: `src/lib/store/selection-store.ts`
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
  searchQuery: "",
  setSearchQuery: (q) => set({ searchQuery: q }),
  dispatch: (action) =>
    set((state) => {
      const next = applyAction(
        {
          selectedIds: state.selectedIds,
          drawnIds: state.drawnIds,
          lastClickedId: state.lastClickedId,
        },
        action,
      );
      return next;
    }),
}));
```

- [ ] **Step 3.2: type check + build**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm exec tsc --noEmit && pnpm build`

Expected: TS 에러 없음, 빌드 성공.

- [ ] **Step 3.3: commit**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/lib/store/selection-store.ts && git commit -m "feat(store): add Zustand selection store wrapping reducer + search query"
```

---

## Task 4: SearchBar 컴포넌트

**Files:**
- Create: `src/components/panels/search-bar.tsx`

- [ ] **Step 4.1: SearchBar 작성**

Create: `src/components/panels/search-bar.tsx`
```typescript
"use client";

import { Search } from "lucide-react";
import { useSelectionStore } from "@/lib/store/selection-store";

export function SearchBar() {
  const searchQuery = useSelectionStore((s) => s.searchQuery);
  const setSearchQuery = useSelectionStore((s) => s.setSearchQuery);

  return (
    <label className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/40">
      <Search size={11} aria-hidden />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="search…"
        className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
    </label>
  );
}
```

- [ ] **Step 4.2: build 확인**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm build`

Expected: 빌드 성공.

- [ ] **Step 4.3: commit**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/components/panels/search-bar.tsx && git commit -m "feat(left-panel): add SearchBar bound to selection store"
```

---

## Task 5: MsrList 컴포넌트 (Priority 정렬 + multi-select + drawn dot)

**Files:**
- Create: `src/components/panels/msr-list.tsx`

- [ ] **Step 5.1: MsrList 작성**

Create: `src/components/panels/msr-list.tsx`
```typescript
"use client";

import { useMemo } from "react";
import type { MsrItem } from "@/types/dataset";
import { useSelectionStore } from "@/lib/store/selection-store";
import { matchesQuery } from "@/lib/selection/filter";
import { cn } from "@/lib/utils";

interface MsrListProps {
  items: MsrItem[];
}

export function MsrList({ items }: MsrListProps) {
  const searchQuery = useSelectionStore((s) => s.searchQuery);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const drawnIds = useSelectionStore((s) => s.drawnIds);
  const dispatch = useSelectionStore((s) => s.dispatch);

  const filtered = useMemo(
    () => items.filter((it) => matchesQuery(it.name, searchQuery)),
    [items, searchQuery],
  );
  const orderedIds = useMemo(() => filtered.map((it) => it.name), [filtered]);

  if (filtered.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg border border-border bg-card text-xs text-muted-foreground">
        검색 결과 없음
      </div>
    );
  }

  return (
    <ul
      className="flex-1 overflow-y-auto rounded-lg border border-border bg-card p-1"
      tabIndex={0}
    >
      {filtered.map((item) => {
        const isSelected = selectedIds.has(item.name);
        const isDrawn = drawnIds.has(item.name);
        const corrText =
          (item.correlation >= 0 ? "+" : "") + item.correlation.toFixed(2);
        return (
          <li
            key={item.name}
            onClick={(e) => {
              if (e.shiftKey) {
                dispatch({ type: "range", id: item.name, orderedIds });
              } else if (e.ctrlKey || e.metaKey) {
                dispatch({ type: "toggle", id: item.name, orderedIds });
              } else {
                dispatch({ type: "selectOnly", id: item.name, orderedIds });
              }
            }}
            onDoubleClick={() => {
              dispatch({ type: "selectOnly", id: item.name, orderedIds });
              dispatch({ type: "draw" });
            }}
            className={cn(
              "group relative flex cursor-pointer items-center justify-between rounded px-2 py-1 text-xs transition-colors select-none",
              isSelected
                ? "bg-selection-bg text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-1.5 truncate">
              {isDrawn && (
                <span
                  aria-label="drawn"
                  className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-selection-strong"
                />
              )}
              <span className="text-[10px] text-muted-foreground/80">
                P{item.priority}
              </span>
              <span className="truncate">{item.name}</span>
            </span>
            <span
              className={cn(
                "shrink-0 font-semibold tabular-nums",
                isSelected ? "text-selection-fg" : "text-muted-foreground",
              )}
            >
              {corrText}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 5.2: build 확인**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm build`

Expected: 빌드 성공.

- [ ] **Step 5.3: commit**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/components/panels/msr-list.tsx && git commit -m "feat(left-panel): add MsrList with multi-select, drawn dot, search filter"
```

---

## Task 6: DrawButton + 단축키 + LeftPanel 통합

**Files:**
- Create: `src/components/panels/draw-button.tsx`
- Modify (full replace): `src/components/panels/left-panel.tsx`

- [ ] **Step 6.1: DrawButton 작성**

Create: `src/components/panels/draw-button.tsx`
```typescript
"use client";

import { useSelectionStore } from "@/lib/store/selection-store";

export function DrawButton() {
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const drawnIds = useSelectionStore((s) => s.drawnIds);
  const dispatch = useSelectionStore((s) => s.dispatch);

  const newSelectedCount = [...selectedIds].filter((id) => !drawnIds.has(id)).length;
  const disabled = newSelectedCount === 0;

  return (
    <button
      type="button"
      onClick={() => dispatch({ type: "draw" })}
      disabled={disabled}
      className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
    >
      Draw Selected ({newSelectedCount})
    </button>
  );
}
```

- [ ] **Step 6.2: LeftPanel 전체 교체 (client 컴포넌트로)**

Replace **entire** content of `src/components/panels/left-panel.tsx`:
```typescript
"use client";

import { useEffect } from "react";
import type { DataSet } from "@/types/dataset";
import { ThemeToggle } from "@/components/theme-toggle";
import { SearchBar } from "@/components/panels/search-bar";
import { MsrList } from "@/components/panels/msr-list";
import { DrawButton } from "@/components/panels/draw-button";
import { useSelectionStore } from "@/lib/store/selection-store";

interface LeftPanelProps {
  dataset: DataSet;
}

export function LeftPanel({ dataset }: LeftPanelProps) {
  const dispatch = useSelectionStore((s) => s.dispatch);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const drawnIds = useSelectionStore((s) => s.drawnIds);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        dispatch({ type: "clearSelection" });
        return;
      }
      if (e.key === "Enter") {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName.toLowerCase();
        if (tag === "input" || tag === "textarea") return;
        const hasNew = [...selectedIds].some((id) => !drawnIds.has(id));
        if (hasNew) dispatch({ type: "draw" });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, selectedIds, drawnIds]);

  return (
    <aside className="flex w-[175px] shrink-0 flex-col gap-1.5">
      <SearchBar />
      <MsrList items={dataset.msrItems} />
      <ThemeToggle />
      <DrawButton />
    </aside>
  );
}
```

- [ ] **Step 6.3: 전체 검증 — type + lint + build + 회귀**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm exec tsc --noEmit && pnpm lint && pnpm build && pnpm test
```

Expected:
- tsc: 에러 없음
- lint: clean
- build: 성공
- test: 24/24 PASS (14 데이터 + 10 reducer — Task 1, 4 filter — Task 2; 합 28)

조정: 정확히는 14 + 10 + 4 = **28 tests** (Plan #3 추가 분 14개). Final test 개수는 `pnpm test` 출력으로 확인.

- [ ] **Step 6.4: commit**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/components/panels/draw-button.tsx src/components/panels/left-panel.tsx && git commit -m "feat(left-panel): wire DrawButton + Esc/Enter shortcuts + client LeftPanel"
```

---

## Acceptance Criteria

Plan #3 완료 시점:

- [ ] `pnpm test` → 28/28 PASS (14 data + 10 reducer + 4 filter)
- [ ] `pnpm build` → 성공
- [ ] `pnpm lint` → clean
- [ ] `git log --oneline` → 최소 18개 commit (P1 7 + P2 5 + P3 6)
- [ ] `pnpm dev` 시각 검증 (http://localhost:3000):
  - 좌패널에 20개 MSR 항목 Priority 정렬로 표시 (`P1 MSR0009 +0.92`, `P2 MSR0018 +0.86`, ...)
  - 검색창에 "0009" 입력 시 MSR0009만 남음, 빈 검색 시 전체 표시, "abc" 같이 매칭 0 시 "검색 결과 없음"
  - 항목 단일 클릭 → 그 행만 선택 (violet 배경), 다른 선택 해제
  - Ctrl+클릭 → 토글 (이미 선택이면 해제, 아니면 추가)
  - Shift+클릭 → 마지막 클릭 ~ 현재 사이 범위 선택
  - Esc → 모든 선택 해제
  - Draw 버튼 라벨 `Draw Selected (N)` — 선택 카운트(아직 안 그린 것만)
  - Draw 클릭 또는 Enter → 선택 항목들이 drawn 상태로 (List 행에 작은 violet dot 표시) + 선택 해제
  - 더블클릭 → 그 한 항목만 즉시 draw
  - 이미 drawn 항목 재선택 후 Draw → drawn 그대로 유지 (중복 안 됨, 카운트에서 제외)
  - Light/Dark 토글 시 모든 violet 강조 색이 다크 페어로 전환

---

## Next Plan Preview

**Plan #4: 중앙 차트 그리드 + 카드 + Plotly 통합**

- Plotly.js scattergl 통합
- ChartGridArea가 drawnIds를 구독해 3×3 grid 렌더링
- 차트 카드 (헤더 `MSR · r=+0.918 · n=18` + scatter + 추세선)
- 카드 multi-select (Add 후보 marking)
- Sensorpia ChartBlock 패턴 차용 (점 삭제 / Undo / Reset / 통계 모달)

Plan #3 완료 후 작성.
