"use client";

import { useCallback } from "react";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import type { DataSet } from "@/types/dataset";
import { useSelectionStore } from "@/lib/store/selection-store";
import { buildExportWorkbook } from "@/lib/export/build-workbook";

interface ExportButtonProps {
  dataset: DataSet;
}

export function ExportButton({ dataset }: ExportButtonProps) {
  const group1Ids = useSelectionStore((s) => s.group1Ids);
  const group2Ids = useSelectionStore((s) => s.group2Ids);
  const globallyDeleted = useSelectionStore((s) => s.globallyDeletedChipIds);
  const perChartDeleted = useSelectionStore((s) => s.perChartDeletedChipIds);

  const handleExport = useCallback(() => {
    const wb = buildExportWorkbook(dataset, group1Ids, group2Ids, {
      global: globallyDeleted,
      perChart: perChartDeleted,
    });
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    a.download = `plotmate-export-${ts}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [dataset, group1Ids, group2Ids, globallyDeleted, perChartDeleted]);

  return (
    <button
      type="button"
      onClick={handleExport}
      className="flex items-center justify-center gap-1.5 rounded-md bg-primary px-2 py-2 text-[11px] font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
    >
      <Download size={12} />
      <span>Export xlsx</span>
    </button>
  );
}
