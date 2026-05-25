"use client";

import { useMemo } from "react";
import type { DataSet } from "@/types/dataset";
import { useSelectionStore } from "@/lib/store/selection-store";
import { cn } from "@/lib/utils";
import type { GroupNumber } from "@/lib/selection/reducer";
import { ExportButton } from "@/components/panels/export-button";

interface RightPanelProps {
  dataset: DataSet;
}

export function RightPanel({ dataset }: RightPanelProps) {
  return (
    <aside className="flex w-[140px] shrink-0 flex-col gap-2">
      <GroupCard group={1} dataset={dataset} />
      <GroupCard group={2} dataset={dataset} />
      <ExportButton dataset={dataset} />
    </aside>
  );
}

interface GroupCardProps {
  group: GroupNumber;
  dataset: DataSet;
}

function GroupCard({ group, dataset }: GroupCardProps) {
  const ids = useSelectionStore((s) =>
    group === 1 ? s.group1Ids : s.group2Ids,
  );
  const selectedInGroup = useSelectionStore((s) =>
    group === 1 ? s.selectedInGroup1Ids : s.selectedInGroup2Ids,
  );
  const selectedChartIds = useSelectionStore((s) => s.selectedChartIds);
  const dispatch = useSelectionStore((s) => s.dispatch);

  const items = useMemo(
    () => dataset.msrItems.filter((it) => ids.has(it.name)),
    [dataset.msrItems, ids],
  );
  const orderedIds = useMemo(() => items.map((it) => it.name), [items]);

  const addDisabled = selectedChartIds.size === 0;
  const deleteDisabled = selectedInGroup.size === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5 rounded-lg border border-border bg-card p-2">
      <header className="flex items-center justify-between text-xs font-semibold text-foreground">
        <span>{group === 1 ? "Insights" : "Essential"}</span>
        <span className="text-[10px] font-normal text-muted-foreground">
          {ids.size}
        </span>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded border border-dashed border-border text-[10px] text-muted-foreground">
          empty
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto rounded border border-border bg-background p-0.5">
          {items.map((item) => {
            const isSel = selectedInGroup.has(item.name);
            const corrText =
              (item.correlation >= 0 ? "+" : "") + item.correlation.toFixed(2);
            return (
              <li
                key={item.name}
                onClick={(e) => {
                  if (e.shiftKey) {
                    dispatch({
                      type: "rangeInGroup",
                      group,
                      id: item.name,
                      orderedIds,
                    });
                  } else {
                    dispatch({
                      type: "toggleInGroup",
                      group,
                      id: item.name,
                      orderedIds,
                    });
                  }
                }}
                className={cn(
                  "flex cursor-pointer items-center justify-between rounded px-1.5 py-0.5 text-[10px] select-none",
                  isSel
                    ? "bg-selection-bg text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <span className="flex items-center gap-1 truncate">
                  <span className="text-muted-foreground/70">P{item.priority}</span>
                  <span className="truncate">{item.name}</span>
                </span>
                <span
                  className={cn(
                    "shrink-0 font-semibold tabular-nums",
                    isSel ? "text-selection-fg" : "text-muted-foreground",
                  )}
                >
                  {corrText}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => dispatch({ type: "addToGroup", group })}
          disabled={addDisabled}
          className="flex-1 rounded-md bg-primary px-2 py-1.5 text-[10px] font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add ({selectedChartIds.size})
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: "deleteFromGroup", group })}
          disabled={deleteDisabled}
          className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-[10px] text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          Delete ({selectedInGroup.size})
        </button>
      </div>
    </div>
  );
}
