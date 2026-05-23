import type { DataSet } from "@/types/dataset";
import { Search } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface LeftPanelProps {
  dataset: DataSet;
}

export function LeftPanel({ dataset }: LeftPanelProps) {
  return (
    <aside className="flex w-[175px] shrink-0 flex-col gap-1.5">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
        <Search size={11} aria-hidden />
        <span>search…</span>
      </div>
      <div className="flex-1 overflow-hidden rounded-lg border border-border bg-card p-2 text-xs text-muted-foreground">
        MSR list placeholder · {dataset.msrItems.length} items
      </div>
      <ThemeToggle />
      <button
        type="button"
        disabled
        className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        Draw Selected (0)
      </button>
    </aside>
  );
}
