import type { DataSet } from "@/types/dataset";
import { LeftPanel } from "@/components/panels/left-panel";
import { ChartGridArea } from "@/components/panels/chart-grid-area";
import { RightPanel } from "@/components/panels/right-panel";

interface AppShellProps {
  dataset: DataSet;
}

export function AppShell({ dataset }: AppShellProps) {
  return (
    <div className="flex h-screen gap-2.5 bg-muted/40 p-3">
      <LeftPanel dataset={dataset} />
      <ChartGridArea dataset={dataset} />
      <RightPanel dataset={dataset} />
    </div>
  );
}
