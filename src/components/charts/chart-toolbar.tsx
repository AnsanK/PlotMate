"use client";

import { Scissors, ScissorsLineDashed, ZoomIn, Undo2, RotateCcw } from "lucide-react";
import { useSelectionStore } from "@/lib/store/selection-store";
import { cn } from "@/lib/utils";
import type { ToolMode } from "@/lib/selection/reducer";

export function ChartToolbar() {
  const toolMode = useSelectionStore((s) => s.toolMode);
  const deleteHistory = useSelectionStore((s) => s.deleteHistory);
  const globallyDeleted = useSelectionStore((s) => s.globallyDeletedChipIds);
  const perChartDeleted = useSelectionStore((s) => s.perChartDeletedChipIds);
  const dispatch = useSelectionStore((s) => s.dispatch);

  const canUndo = deleteHistory.length > 0;
  const canReset =
    globallyDeleted.size > 0 ||
    perChartDeleted.size > 0 ||
    deleteHistory.length > 0 ||
    toolMode !== "idle";

  return (
    <div className="flex items-center gap-1">
      <ModeButton
        label="삭제"
        icon={Scissors}
        mode="delete"
        currentMode={toolMode}
        onClick={() => dispatch({ type: "setToolMode", mode: "delete" })}
      />
      <ModeButton
        label="전체삭제"
        icon={ScissorsLineDashed}
        mode="deleteAll"
        currentMode={toolMode}
        onClick={() => dispatch({ type: "setToolMode", mode: "deleteAll" })}
      />
      <ModeButton
        label="Zoom"
        icon={ZoomIn}
        mode="zoom"
        currentMode={toolMode}
        onClick={() => dispatch({ type: "setToolMode", mode: "zoom" })}
      />
      <ActionButton
        label="되돌리기"
        icon={Undo2}
        disabled={!canUndo}
        onClick={() => dispatch({ type: "undoDelete" })}
      />
      <ActionButton
        label="초기화"
        icon={RotateCcw}
        disabled={!canReset}
        onClick={() => {
          dispatch({ type: "resetDelete" });
          dispatch({ type: "setToolMode", mode: "idle" });
        }}
      />
    </div>
  );
}

function ModeButton({
  label,
  icon: Icon,
  mode,
  currentMode,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  mode: ToolMode;
  currentMode: ToolMode;
  onClick: () => void;
}) {
  const active = currentMode === mode;
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${label} (drag로 영역 선택)`}
      className={cn(
        "flex items-center gap-1 rounded px-1.5 py-1 text-[10px] transition-colors",
        active
          ? "bg-selection-bg text-selection-fg ring-1 ring-selection-strong"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon size={11} />
      <span>{label}</span>
    </button>
  );
}

function ActionButton({
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
