"use client";

import { useMemo } from "react";
import type { MsrItem } from "@/types/dataset";
import { useSelectionStore } from "@/lib/store/selection-store";
import { matchesQuery } from "@/lib/selection/filter";
import { cn } from "@/lib/utils";

interface MsrListProps {
  items: MsrItem[];
}

export function MsrList({ items }: MsrListProps) {
  const searchQuery = useSelectionStore((s) => s.searchQuery);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const drawnIds = useSelectionStore((s) => s.drawnIds);
  const dispatch = useSelectionStore((s) => s.dispatch);

  const filtered = useMemo(
    () => items.filter((it) => matchesQuery(it.name, searchQuery)),
    [items, searchQuery],
  );
  const orderedIds = useMemo(() => filtered.map((it) => it.name), [filtered]);

  if (filtered.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg border border-border bg-card text-xs text-muted-foreground">
        검색 결과 없음
      </div>
    );
  }

  return (
    <ul
      className="flex-1 overflow-y-auto rounded-lg border border-border bg-card p-1"
      tabIndex={0}
    >
      {filtered.map((item) => {
        const isSelected = selectedIds.has(item.name);
        const isDrawn = drawnIds.has(item.name);
        const corrText =
          (item.correlation >= 0 ? "+" : "") + item.correlation.toFixed(2);
        return (
          <li
            key={item.name}
            onClick={(e) => {
              if (e.shiftKey) {
                dispatch({ type: "range", id: item.name, orderedIds });
              } else if (e.ctrlKey || e.metaKey) {
                dispatch({ type: "toggle", id: item.name, orderedIds });
              } else {
                dispatch({ type: "selectOnly", id: item.name, orderedIds });
              }
            }}
            onDoubleClick={() => {
              dispatch({ type: "selectOnly", id: item.name, orderedIds });
              dispatch({ type: "draw" });
            }}
            className={cn(
              "group relative flex cursor-pointer items-center justify-between rounded px-2 py-1 text-xs transition-colors select-none",
              isSelected
                ? "bg-selection-bg text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-1.5 truncate">
              {isDrawn && (
                <span
                  aria-label="drawn"
                  className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-selection-strong"
                />
              )}
              <span className="text-[10px] text-muted-foreground/80">
                P{item.priority}
              </span>
              <span className="truncate">{item.name}</span>
            </span>
            <span
              className={cn(
                "shrink-0 font-semibold tabular-nums",
                isSelected ? "text-selection-fg" : "text-muted-foreground",
              )}
            >
              {corrText}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
