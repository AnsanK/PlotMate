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
  }
}
