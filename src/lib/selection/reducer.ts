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
