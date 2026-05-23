import type { DataSet } from "@/types/dataset";

interface ChartGridAreaProps {
  dataset: DataSet;
}

export function ChartGridArea({ dataset }: ChartGridAreaProps) {
  return (
    <section className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-3 py-2 text-xs text-muted-foreground">
        <span>0 charts shown</span>
        <span className="text-[10px]">chart grid area · placeholder</span>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-1 p-3 text-xs text-muted-foreground">
        <p>Select MSR items in the left panel and press Draw.</p>
        <p className="text-[10px] opacity-60">
          dataset ready: {dataset.chips.length} chips · {dataset.msrItems.length} MSR items
        </p>
      </div>
    </section>
  );
}
