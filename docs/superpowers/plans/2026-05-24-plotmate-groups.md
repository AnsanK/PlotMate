# PlotMate Group Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** 우패널의 Group 1 / Group 2 워크플로 구현. 중앙 카드 multi-select 후 Add → group으로 이동(drawnIds에서 사라짐, List에서도 사라짐). Group 내부 multi-select → Delete → drawnIds로 복원(List + 중앙 차트 자동 재등장).

**Architecture:**
- reducer 확장: state slice 4개(`group1Ids`, `group2Ids`, `selectedInGroup1Ids`, `selectedInGroup2Ids` + `lastClickedInGroupId`) + 5개 액션 (`addToGroup` / `toggleInGroup` / `rangeInGroup` / `clearGroupSelection` / `deleteFromGroup`).
- invariant: `drawnIds`, `group1Ids`, `group2Ids` 세 집합은 서로 disjoint. MsrList는 두 group에 있는 항목을 검색에서도 제외.
- RightPanel은 client component. 그룹 카드 내부 List와 동일 표시 규칙 (`[P{n}] {name} {±r}`).

**Tech Stack:** 기존 (Zustand + Tailwind + lucide). 새 deps 없음.

**Spec reference:** [docs/superpowers/specs/2026-05-23-plotmate-ui-design.md](../specs/2026-05-23-plotmate-ui-design.md) — § 4.2 (List 필터), § 6 (그룹), § 7 (상태 모델), § 10 (엣지 케이스)

**Prerequisite:** Plan #4 + Draw replace fix + 4-col grid 완료 (29 commits, `..3ae7b9e`).

---

## File Structure

| 경로 | 책임 |
|---|---|
| `src/lib/selection/reducer.ts` | (full replace) group state + 5 actions |
| `src/lib/selection/reducer.test.ts` | (append) 12+ group action tests |
| `src/lib/store/selection-store.ts` | (full replace) group slice 초기화 |
| `src/components/panels/msr-list.tsx` | (modify) filter에 group 제외 추가 |
| `src/components/panels/right-panel.tsx` | (full replace) client, 카드 내부 multi-select, Add/Delete |

---

## Task 1: Reducer 확장 + group action TDD

**Files:**
- Modify (full replace): `src/lib/selection/reducer.ts`
- Modify (append): `src/lib/selection/reducer.test.ts`

- [ ] **Step 1.1: 새 테스트 작성 (append to file end)**

Append to `src/lib/selection/reducer.test.ts`:
```typescript
describe("group workflow (addToGroup / deleteFromGroup / toggleInGroup / rangeInGroup / clearGroupSelection)", () => {
  const initialGroups: SelectionState = {
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
  };

  describe("addToGroup", () => {
    it("moves selectedChartIds into group1 and removes from drawnIds + selectedChartIds", () => {
      const state: SelectionState = {
        ...initialGroups,
        drawnIds: new Set(["a", "b", "c"]),
        selectedChartIds: new Set(["a", "c"]),
        lastClickedChartId: "c",
      };
      const next = applyAction(state, { type: "addToGroup", group: 1 });
      expect([...next.group1Ids].sort()).toEqual(["a", "c"]);
      expect([...next.drawnIds]).toEqual(["b"]);
      expect(next.selectedChartIds.size).toBe(0);
      expect(next.lastClickedChartId).toBeNull();
    });

    it("moves selectedChartIds into group2 without touching group1", () => {
      const state: SelectionState = {
        ...initialGroups,
        drawnIds: new Set(["x", "y"]),
        selectedChartIds: new Set(["x"]),
        group1Ids: new Set(["z"]),
      };
      const next = applyAction(state, { type: "addToGroup", group: 2 });
      expect([...next.group2Ids]).toEqual(["x"]);
      expect([...next.group1Ids]).toEqual(["z"]);
      expect([...next.drawnIds]).toEqual(["y"]);
    });

    it("is a no-op when selectedChartIds is empty", () => {
      const state: SelectionState = {
        ...initialGroups,
        drawnIds: new Set(["a"]),
        group1Ids: new Set(["b"]),
      };
      const next = applyAction(state, { type: "addToGroup", group: 1 });
      expect([...next.group1Ids]).toEqual(["b"]);
      expect([...next.drawnIds]).toEqual(["a"]);
    });
  });

  describe("toggleInGroup", () => {
    it("toggles in group1 selection", () => {
      const state: SelectionState = {
        ...initialGroups,
        group1Ids: new Set(["a", "b"]),
      };
      const next1 = applyAction(state, {
        type: "toggleInGroup",
        group: 1,
        id: "a",
        orderedIds: ["a", "b"],
      });
      expect([...next1.selectedInGroup1Ids]).toEqual(["a"]);
      expect(next1.lastClickedInGroup1Id).toBe("a");

      const next2 = applyAction(next1, {
        type: "toggleInGroup",
        group: 1,
        id: "a",
        orderedIds: ["a", "b"],
      });
      expect(next2.selectedInGroup1Ids.size).toBe(0);
    });

    it("group1 and group2 selections are independent", () => {
      const state: SelectionState = {
        ...initialGroups,
        group1Ids: new Set(["a"]),
        group2Ids: new Set(["b"]),
        selectedInGroup1Ids: new Set(["a"]),
      };
      const next = applyAction(state, {
        type: "toggleInGroup",
        group: 2,
        id: "b",
        orderedIds: ["b"],
      });
      expect([...next.selectedInGroup1Ids]).toEqual(["a"]);
      expect([...next.selectedInGroup2Ids]).toEqual(["b"]);
    });
  });

  describe("rangeInGroup", () => {
    it("selects range in group1 based on lastClickedInGroup1Id", () => {
      const state: SelectionState = {
        ...initialGroups,
        group1Ids: new Set(["a", "b", "c", "d"]),
        selectedInGroup1Ids: new Set(["a"]),
        lastClickedInGroup1Id: "a",
      };
      const next = applyAction(state, {
        type: "rangeInGroup",
        group: 1,
        id: "c",
        orderedIds: ["a", "b", "c", "d"],
      });
      expect([...next.selectedInGroup1Ids].sort()).toEqual(["a", "b", "c"]);
    });

    it("falls back to single select when lastClickedInGroup1Id is null", () => {
      const state: SelectionState = {
        ...initialGroups,
        group1Ids: new Set(["a", "b", "c"]),
      };
      const next = applyAction(state, {
        type: "rangeInGroup",
        group: 1,
        id: "b",
        orderedIds: ["a", "b", "c"],
      });
      expect([...next.selectedInGroup1Ids]).toEqual(["b"]);
      expect(next.lastClickedInGroup1Id).toBe("b");
    });
  });

  describe("clearGroupSelection", () => {
    it("clears only the specified group's selection", () => {
      const state: SelectionState = {
        ...initialGroups,
        selectedInGroup1Ids: new Set(["a", "b"]),
        selectedInGroup2Ids: new Set(["c"]),
        lastClickedInGroup1Id: "b",
      };
      const next = applyAction(state, { type: "clearGroupSelection", group: 1 });
      expect(next.selectedInGroup1Ids.size).toBe(0);
      expect(next.lastClickedInGroup1Id).toBeNull();
      expect([...next.selectedInGroup2Ids]).toEqual(["c"]);
    });
  });

  describe("deleteFromGroup", () => {
    it("moves selected group1 items back into drawnIds and removes from group1", () => {
      const state: SelectionState = {
        ...initialGroups,
        group1Ids: new Set(["a", "b", "c"]),
        selectedInGroup1Ids: new Set(["a", "c"]),
        lastClickedInGroup1Id: "c",
        drawnIds: new Set(["d"]),
      };
      const next = applyAction(state, { type: "deleteFromGroup", group: 1 });
      expect([...next.group1Ids]).toEqual(["b"]);
      expect([...next.drawnIds].sort()).toEqual(["a", "c", "d"]);
      expect(next.selectedInGroup1Ids.size).toBe(0);
      expect(next.lastClickedInGroup1Id).toBeNull();
    });

    it("is a no-op when nothing selected in the group", () => {
      const state: SelectionState = {
        ...initialGroups,
        group1Ids: new Set(["a", "b"]),
        drawnIds: new Set(["x"]),
      };
      const next = applyAction(state, { type: "deleteFromGroup", group: 1 });
      expect([...next.group1Ids].sort()).toEqual(["a", "b"]);
      expect([...next.drawnIds]).toEqual(["x"]);
    });
  });

  describe("draw action does not touch group items", () => {
    it("preserves group1/group2 when draw replaces drawnIds", () => {
      const state: SelectionState = {
        ...initialGroups,
        selectedIds: new Set(["new1", "new2"]),
        drawnIds: new Set(["old1"]),
        group1Ids: new Set(["g1a", "g1b"]),
        group2Ids: new Set(["g2a"]),
      };
      const next = applyAction(state, { type: "draw" });
      expect([...next.drawnIds].sort()).toEqual(["new1", "new2"]);
      expect([...next.group1Ids].sort()).toEqual(["g1a", "g1b"]);
      expect([...next.group2Ids]).toEqual(["g2a"]);
    });
  });
});
```

Also update top-level `initial` const at top of file (add 6 new fields):
```typescript
const initial: SelectionState = {
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
};
```

- [ ] **Step 1.2: fail 확인**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm test src/lib/selection/reducer.test.ts`

Expected: 새 11+ tests FAIL (type errors).

- [ ] **Step 1.3: reducer 전체 교체**

Replace **entire** content of `src/lib/selection/reducer.ts`:
```typescript
export interface SelectionState {
  selectedIds: Set<string>;
  drawnIds: Set<string>;
  lastClickedId: string | null;
  selectedChartIds: Set<string>;
  lastClickedChartId: string | null;
  group1Ids: Set<string>;
  group2Ids: Set<string>;
  selectedInGroup1Ids: Set<string>;
  selectedInGroup2Ids: Set<string>;
  lastClickedInGroup1Id: string | null;
  lastClickedInGroup2Id: string | null;
}

export type GroupNumber = 1 | 2;

export type SelectionAction =
  | { type: "selectOnly"; id: string; orderedIds: string[] }
  | { type: "toggle"; id: string; orderedIds: string[] }
  | { type: "range"; id: string; orderedIds: string[] }
  | { type: "clearSelection" }
  | { type: "draw" }
  | { type: "setDrawn"; id: string; drawn: boolean }
  | { type: "toggleChart"; id: string; orderedIds: string[] }
  | { type: "rangeChart"; id: string; orderedIds: string[] }
  | { type: "clearChartSelection" }
  | { type: "addToGroup"; group: GroupNumber }
  | { type: "toggleInGroup"; group: GroupNumber; id: string; orderedIds: string[] }
  | { type: "rangeInGroup"; group: GroupNumber; id: string; orderedIds: string[] }
  | { type: "clearGroupSelection"; group: GroupNumber }
  | { type: "deleteFromGroup"; group: GroupNumber };

function groupKeys(group: GroupNumber) {
  return group === 1
    ? { ids: "group1Ids" as const, sel: "selectedInGroup1Ids" as const, last: "lastClickedInGroup1Id" as const }
    : { ids: "group2Ids" as const, sel: "selectedInGroup2Ids" as const, last: "lastClickedInGroup2Id" as const };
}

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
      if (state.selectedIds.size === 0) return state;
      return {
        ...state,
        drawnIds: new Set(state.selectedIds),
        selectedIds: new Set(),
        lastClickedId: null,
        selectedChartIds: new Set(),
        lastClickedChartId: null,
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

    case "addToGroup": {
      if (state.selectedChartIds.size === 0) return state;
      const k = groupKeys(action.group);
      const nextGroup = new Set(state[k.ids]);
      const nextDrawn = new Set(state.drawnIds);
      for (const id of state.selectedChartIds) {
        nextGroup.add(id);
        nextDrawn.delete(id);
      }
      return {
        ...state,
        [k.ids]: nextGroup,
        drawnIds: nextDrawn,
        selectedChartIds: new Set(),
        lastClickedChartId: null,
      };
    }

    case "toggleInGroup": {
      const k = groupKeys(action.group);
      const next = new Set(state[k.sel]);
      if (next.has(action.id)) next.delete(action.id);
      else next.add(action.id);
      return { ...state, [k.sel]: next, [k.last]: action.id };
    }

    case "rangeInGroup": {
      const k = groupKeys(action.group);
      const lastId = state[k.last];
      if (lastId === null) {
        return {
          ...state,
          [k.sel]: new Set([action.id]),
          [k.last]: action.id,
        };
      }
      const from = action.orderedIds.indexOf(lastId);
      const to = action.orderedIds.indexOf(action.id);
      if (from < 0 || to < 0) return state;
      const [lo, hi] = from <= to ? [from, to] : [to, from];
      const slice = action.orderedIds.slice(lo, hi + 1);
      const next = new Set(state[k.sel]);
      for (const id of slice) next.add(id);
      return { ...state, [k.sel]: next, [k.last]: action.id };
    }

    case "clearGroupSelection": {
      const k = groupKeys(action.group);
      return { ...state, [k.sel]: new Set(), [k.last]: null };
    }

    case "deleteFromGroup": {
      const k = groupKeys(action.group);
      const sel = state[k.sel];
      if (sel.size === 0) return state;
      const nextGroup = new Set(state[k.ids]);
      const nextDrawn = new Set(state.drawnIds);
      for (const id of sel) {
        nextGroup.delete(id);
        nextDrawn.add(id);
      }
      return {
        ...state,
        [k.ids]: nextGroup,
        drawnIds: nextDrawn,
        [k.sel]: new Set(),
        [k.last]: null,
      };
    }
  }
}
```

- [ ] **Step 1.4: pass + 회귀**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm test`

Expected: 43 (P1~P4) + 11 (new group) = 54 tests PASS.

- [ ] **Step 1.5: commit**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/lib/selection && git commit -m "feat(selection): add group state slice + add/delete/toggle/range group actions"
```

---

## Task 2: Store + MsrList filter 갱신

**Files:**
- Modify (full replace): `src/lib/store/selection-store.ts`
- Modify: `src/components/panels/msr-list.tsx` (filter에 group 제외 추가)

- [ ] **Step 2.1: store 전체 교체**

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
  group1Ids: new Set<string>(),
  group2Ids: new Set<string>(),
  selectedInGroup1Ids: new Set<string>(),
  selectedInGroup2Ids: new Set<string>(),
  lastClickedInGroup1Id: null,
  lastClickedInGroup2Id: null,
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
          group1Ids: state.group1Ids,
          group2Ids: state.group2Ids,
          selectedInGroup1Ids: state.selectedInGroup1Ids,
          selectedInGroup2Ids: state.selectedInGroup2Ids,
          lastClickedInGroup1Id: state.lastClickedInGroup1Id,
          lastClickedInGroup2Id: state.lastClickedInGroup2Id,
        },
        action,
      );
      return next;
    }),
}));
```

- [ ] **Step 2.2: MsrList filter 갱신**

Read `src/components/panels/msr-list.tsx`. Add group exclusion to filter.

Specific changes:

(a) Add two more selectors near the top of the component:
```typescript
const group1Ids = useSelectionStore((s) => s.group1Ids);
const group2Ids = useSelectionStore((s) => s.group2Ids);
```

(b) Replace the existing `filtered` useMemo:
```typescript
const filtered = useMemo(
  () =>
    items.filter(
      (it) =>
        matchesQuery(it.name, searchQuery) &&
        !group1Ids.has(it.name) &&
        !group2Ids.has(it.name),
    ),
  [items, searchQuery, group1Ids, group2Ids],
);
```

(c) When filtered is empty, distinguish "검색 결과 없음" vs "모든 항목이 채택됨":
```typescript
if (filtered.length === 0) {
  const allGroupedCount = group1Ids.size + group2Ids.size;
  const allInGroups = allGroupedCount === items.length;
  return (
    <div className="flex flex-1 items-center justify-center rounded-lg border border-border bg-card text-xs text-muted-foreground">
      {allInGroups ? "모든 항목이 채택됨" : "검색 결과 없음"}
    </div>
  );
}
```

- [ ] **Step 2.3: type check + build + test**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm exec tsc --noEmit && pnpm build && pnpm test`

Expected: clean. 54/54 PASS (회귀).

- [ ] **Step 2.4: commit**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/lib/store/selection-store.ts src/components/panels/msr-list.tsx && git commit -m "feat(left-panel): exclude group items from MsrList + distinguish 'all grouped' empty state"
```

---

## Task 3: RightPanel 전체 재작성 (client, 카드 내부 multi-select, Add/Delete)

**Files:**
- Modify (full replace): `src/components/panels/right-panel.tsx`

- [ ] **Step 3.1: RightPanel 전체 교체**

Replace **entire** content of `src/components/panels/right-panel.tsx`:
```typescript
"use client";

import { useMemo } from "react";
import type { DataSet } from "@/types/dataset";
import { useSelectionStore } from "@/lib/store/selection-store";
import { cn } from "@/lib/utils";
import type { GroupNumber } from "@/lib/selection/reducer";

interface RightPanelProps {
  dataset: DataSet;
}

export function RightPanel({ dataset }: RightPanelProps) {
  return (
    <aside className="flex w-[140px] shrink-0 flex-col gap-2">
      <GroupCard group={1} dataset={dataset} />
      <GroupCard group={2} dataset={dataset} />
    </aside>
  );
}

interface GroupCardProps {
  group: GroupNumber;
  dataset: DataSet;
}

function GroupCard({ group, dataset }: GroupCardProps) {
  const ids = useSelectionStore((s) =>
    group === 1 ? s.group1Ids : s.group2Ids,
  );
  const selectedInGroup = useSelectionStore((s) =>
    group === 1 ? s.selectedInGroup1Ids : s.selectedInGroup2Ids,
  );
  const selectedChartIds = useSelectionStore((s) => s.selectedChartIds);
  const dispatch = useSelectionStore((s) => s.dispatch);

  const items = useMemo(
    () => dataset.msrItems.filter((it) => ids.has(it.name)),
    [dataset.msrItems, ids],
  );
  const orderedIds = useMemo(() => items.map((it) => it.name), [items]);

  const addDisabled = selectedChartIds.size === 0;
  const deleteDisabled = selectedInGroup.size === 0;

  return (
    <div className="flex flex-1 flex-col gap-1.5 rounded-lg border border-border bg-card p-2 min-h-0">
      <header className="flex items-center justify-between text-xs font-semibold text-foreground">
        <span>Group {group}</span>
        <span className="text-[10px] font-normal text-muted-foreground">
          {ids.size}
        </span>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded border border-dashed border-border text-[10px] text-muted-foreground">
          empty
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto rounded border border-border bg-background p-0.5">
          {items.map((item) => {
            const isSel = selectedInGroup.has(item.name);
            const corrText =
              (item.correlation >= 0 ? "+" : "") + item.correlation.toFixed(2);
            return (
              <li
                key={item.name}
                onClick={(e) => {
                  if (e.shiftKey) {
                    dispatch({
                      type: "rangeInGroup",
                      group,
                      id: item.name,
                      orderedIds,
                    });
                  } else {
                    dispatch({
                      type: "toggleInGroup",
                      group,
                      id: item.name,
                      orderedIds,
                    });
                  }
                }}
                className={cn(
                  "flex cursor-pointer items-center justify-between rounded px-1.5 py-0.5 text-[10px] select-none",
                  isSel
                    ? "bg-selection-bg text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <span className="flex items-center gap-1 truncate">
                  <span className="text-muted-foreground/70">P{item.priority}</span>
                  <span className="truncate">{item.name}</span>
                </span>
                <span
                  className={cn(
                    "shrink-0 font-semibold tabular-nums",
                    isSel ? "text-selection-fg" : "text-muted-foreground",
                  )}
                >
                  {corrText}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => dispatch({ type: "addToGroup", group })}
          disabled={addDisabled}
          className="flex-1 rounded-md bg-primary px-2 py-1.5 text-[10px] font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add ({selectedChartIds.size})
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: "deleteFromGroup", group })}
          disabled={deleteDisabled}
          className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-[10px] text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          Delete ({selectedInGroup.size})
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3.2: AppShell에서 RightPanel에 dataset 전달**

Read `src/components/app-shell.tsx`. RightPanel은 이제 dataset prop을 받음. AppShell이 이미 dataset 변수 보유 → `<RightPanel />` → `<RightPanel dataset={dataset} />`로 변경.

If AppShell 코드가 `<RightPanel />` 이라면 다음으로 교체:
```typescript
<RightPanel dataset={dataset} />
```

- [ ] **Step 3.3: 전체 검증**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm exec tsc --noEmit && pnpm lint && pnpm build && pnpm test`

Expected: clean. 54/54 PASS.

- [ ] **Step 3.4: commit**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/components/panels/right-panel.tsx src/components/app-shell.tsx && git commit -m "feat(right-panel): wire Group cards with Add/Delete + internal multi-select"
```

---

## Acceptance Criteria

Plan #5 완료 시:

- [ ] `pnpm test` → 54/54 PASS
- [ ] `pnpm build` → 성공
- [ ] `pnpm lint` → clean
- [ ] `git log --oneline` → 32+ commits (29 prior + 3 new)
- [ ] `pnpm dev` 시각 검증:
  1. 좌패널 항목 선택 → Draw → 중앙 차트 표시
  2. 중앙 카드 1~2개 클릭 → violet ring
  3. Group 1의 `Add (2)` 버튼 클릭 → 중앙 카드 사라짐 + Group 1에 두 항목 표시
  4. 좌패널 List에 그 두 항목 더 이상 안 보임 (검색해도 안 나옴)
  5. Group 1에서 항목 클릭 (multi-select 가능, Ctrl/Shift) → `Delete (N)` 클릭 → 그 항목들 List에 다시 등장 + 중앙 차트도 자동 재그려짐 (drawnIds 추가)
  6. 빈 그룹은 `dashed border + "empty"` 표시
  7. 양쪽 그룹 동시 채택 무관: Group 1에 Add 후 selectedChartIds 비워지므로 Group 2 Add는 비활성

---

## Next Plan Preview

**Plan #6: 성능 확장 (Intersection Observer + scattergl 복귀 + 다운샘플링)**

- 카드를 viewport 안에 있을 때만 Plotly mount (IntersectionObserver)
- scattergl 복귀 (lazy mount로 WebGL context 한계 우회)
- chip > 임계치 (예: 1000) 시 자동 다운샘플링 + UI에 "n of N points shown" 표시

Plan #5 완료 후 작성 (실제 데이터 규모 확정 시 임계치 조정).
