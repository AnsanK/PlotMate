import * as XLSX from 'xlsx';
import { readFileSync } from 'node:fs';
import type { ChipKey, MsrItem } from '@/types/dataset';

const META_COLUMNS = new Set(['MSR Item', 'Priority', '상관계수']);

export function parsePivoted(filePath: string): MsrItem[] {
  const buf = readFileSync(filePath);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const firstSheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
    defval: null,
  });

  return rows.map((row) => {
    const name = String(row['MSR Item']);
    const priority = Number(row['Priority']);
    const correlation = Number(row['상관계수']);
    const values: Record<ChipKey, number> = {};

    for (const [key, value] of Object.entries(row)) {
      if (META_COLUMNS.has(key)) continue;
      if (value === null || value === undefined) continue;
      values[key] = Number(value);
    }

    return { name, priority, correlation, values };
  });
}
