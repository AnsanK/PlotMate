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
