import { getDataset } from "@/lib/server/dataset";
import { AppShell } from "@/components/app-shell";

export default function Home() {
  const dataset = getDataset();
  return <AppShell dataset={dataset} />;
}
