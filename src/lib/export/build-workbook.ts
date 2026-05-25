import * as XLSX from "xlsx";
import type { DataSet } from "@/types/dataset";

export interface DeletedSnapshot {
  global: Set<string>;
  perChart: Map<string, Set<string>>;
}

export function buildExportWorkbook(
  dataset: DataSet,
  insightIds: Set<string>,
  essentialIds: Set<string>,
  deleted: DeletedSnapshot,
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // ---------- Sheet 1: Raw (long-format, deletions ignored) ----------
  const msrNames = dataset.msrItems.map((m) => m.name);
  const rawHeader = [
    "Lotid5",
    "WF",
    "ID",
    "Chip_X",
    "Chip_Y",
    "X_Y",
    "CD",
    ...msrNames,
  ];
  const rawRows: (string | number | null)[][] = [rawHeader];
  for (const chip of dataset.chips) {
    const row: (string | number | null)[] = [
      chip.lotId,
      chip.wf,
      chip.id,
      chip.chipX,
      chip.chipY,
      chip.xy,
      chip.cd,
    ];
    for (const msr of dataset.msrItems) {
      const v = msr.values[chip.xy];
      row.push(v ?? null);
    }
    rawRows.push(row);
  }
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(rawRows),
    "Raw",
  );

  // ---------- Sheet 2 & 3: Insights / Essential (pivoted with deletions) ----------
  const chipXys = dataset.chips.map((c) => c.xy);

  function buildGroupSheet(ids: Set<string>): XLSX.WorkSheet {
    const header = ["MSR Item", "Priority", "상관계수", ...chipXys];
    const rows: (string | number | null)[][] = [header];
    const items = dataset.msrItems.filter((m) => ids.has(m.name));
    for (const msr of items) {
      const perChart = deleted.perChart.get(msr.name) ?? new Set<string>();
      const row: (string | number | null)[] = [
        msr.name,
        msr.priority,
        msr.correlation,
      ];
      for (const xy of chipXys) {
        if (deleted.global.has(xy) || perChart.has(xy)) {
          row.push(null);
        } else {
          const v = msr.values[xy];
          row.push(v ?? null);
        }
      }
      rows.push(row);
    }
    return XLSX.utils.aoa_to_sheet(rows);
  }

  XLSX.utils.book_append_sheet(wb, buildGroupSheet(insightIds), "Insights");
  XLSX.utils.book_append_sheet(wb, buildGroupSheet(essentialIds), "Essential");

  return wb;
}
