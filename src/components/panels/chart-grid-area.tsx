"use client";

import { useMemo } from "react";
import type { DataSet } from "@/types/dataset";
import { useSelectionStore } from "@/lib/store/selection-store";
import { ChartCard } from "@/components/charts/chart-card";

interface ChartGridAreaProps {
  dataset: DataSet;
}

export function ChartGridArea({ dataset }: ChartGridAreaProps) {
  const drawnIds = useSelectionStore((s) => s.drawnIds);
  const selectedChartIds = useSelectionStore((s) => s.selectedChartIds);

  const drawnItems = useMemo(
    () => dataset.msrItems.filter((it) => drawnIds.has(it.name)),
    [dataset.msrItems, drawnIds],
  );
  const orderedDrawnIds = useMemo(
    () => drawnItems.map((it) => it.name),
    [drawnItems],
  );

  if (drawnItems.length === 0) {
    return (
      <section className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-3 py-2 text-xs text-muted-foreground">
          <span>0 charts shown</span>
          <span className="text-[10px]">
            select MSR items in the left panel and press Draw
          </span>
        </header>
        <div className="flex flex-1 items-center justify-center p-6 text-xs text-muted-foreground">
          dataset ready: {dataset.chips.length} chips · {dataset.msrItems.length}{" "}
          MSR items
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-3 py-2 text-xs text-muted-foreground">
        <span>
          {drawnItems.length} chart{drawnItems.length > 1 ? "s" : ""} shown
          {selectedChartIds.size > 0 && (
            <>
              {" · "}
              <span className="text-selection-fg">
                {selectedChartIds.size} selected
              </span>
            </>
          )}
        </span>
        <span className="text-[10px]">scroll ↓ for more</span>
      </header>
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid auto-rows-[180px] grid-cols-3 gap-2">
          {drawnItems.map((item) => (
            <ChartCard
              key={item.name}
              msr={item}
              chips={dataset.chips}
              orderedDrawnIds={orderedDrawnIds}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
