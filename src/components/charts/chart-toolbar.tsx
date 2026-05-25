"use client";

import { Scissors, ScissorsLineDashed, Undo2, RotateCcw } from "lucide-react";
import { useSelectionStore } from "@/lib/store/selection-store";
import { cn } from "@/lib/utils";

export function ChartToolbar() {
  const currentBoxSelection = useSelectionStore((s) => s.currentBoxSelection);
  const deleteHistory = useSelectionStore((s) => s.deleteHistory);
  const globallyDeleted = useSelectionStore((s) => s.globallyDeletedChipIds);
  const perChartDeleted = useSelectionStore((s) => s.perChartDeletedChipIds);
  const dispatch = useSelectionStore((s) => s.dispatch);

  const hasSelection =
    currentBoxSelection !== null && currentBoxSelection.chipIds.size > 0;
  const canUndo = deleteHistory.length > 0;
  const canReset =
    globallyDeleted.size > 0 ||
    perChartDeleted.size > 0 ||
    deleteHistory.length > 0;

  return (
    <div className="flex items-center gap-1">
      {hasSelection && currentBoxSelection && (
        <span className="mr-2 text-[10px] text-selection-fg">
          {currentBoxSelection.msrName} · {currentBoxSelection.chipIds.size} points selected
        </span>
      )}
      <ToolButton
        label="삭제"
        icon={Scissors}
        disabled={!hasSelection}
        onClick={() => dispatch({ type: "deletePerChart" })}
      />
      <ToolButton
        label="전체삭제"
        icon={ScissorsLineDashed}
        disabled={!hasSelection}
        onClick={() => dispatch({ type: "deleteGlobal" })}
      />
      <ToolButton
        label="되돌리기"
        icon={Undo2}
        disabled={!canUndo}
        onClick={() => dispatch({ type: "undoDelete" })}
      />
      <ToolButton
        label="초기화"
        icon={RotateCcw}
        disabled={!canReset}
        onClick={() => dispatch({ type: "resetDelete" })}
      />
    </div>
  );
}

function ToolButton({
  label,
  icon: Icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        "flex items-center gap-1 rounded px-1.5 py-1 text-[10px] transition-colors",
        disabled
          ? "cursor-not-allowed text-muted-foreground/40"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon size={11} />
      <span>{label}</span>
    </button>
  );
}
