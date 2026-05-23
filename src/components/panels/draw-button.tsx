"use client";

import { useSelectionStore } from "@/lib/store/selection-store";

export function DrawButton() {
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const dispatch = useSelectionStore((s) => s.dispatch);

  const count = selectedIds.size;
  const disabled = count === 0;

  return (
    <button
      type="button"
      onClick={() => dispatch({ type: "draw" })}
      disabled={disabled}
      className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
    >
      Draw Selected ({count})
    </button>
  );
}
