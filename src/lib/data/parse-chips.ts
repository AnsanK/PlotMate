import * as XLSX from 'xlsx';
import { readFileSync } from 'node:fs';
import type { Chip } from '@/types/dataset';

interface RawChipRow {
  Lotid5: string;
  WF: number;
  ID: number;
  Chip_X: number;
  Chip_Y: number;
  X_Y: string;
  CD: number;
}

export function parseChips(filePath: string): Chip[] {
  const buf = readFileSync(filePath);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const firstSheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<RawChipRow>(firstSheet, {
    defval: null,
  });

  return rows.map((row) => ({
    lotId: String(row.Lotid5),
    wf: Number(row.WF),
    id: Number(row.ID),
    chipX: Number(row.Chip_X),
    chipY: Number(row.Chip_Y),
    xy: String(row.X_Y),
    cd: Number(row.CD),
  }));
}
