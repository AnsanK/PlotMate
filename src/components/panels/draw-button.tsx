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
