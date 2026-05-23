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
