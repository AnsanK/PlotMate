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
