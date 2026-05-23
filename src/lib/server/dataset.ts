import 'server-only';
import path from 'node:path';
import { loadDataset } from '@/lib/data/load-dataset';
import type { DataSet } from '@/types/dataset';

const DEFAULT_CHIPS_PATH = path.join(
  process.cwd(),
  'dummy_data',
  'raw_data_chips.xlsx'
);
const DEFAULT_PIVOTED_PATH = path.join(
  process.cwd(),
  'dummy_data',
  'raw_data_pivoted.xlsx'
);

let cached: DataSet | null = null;

export function getDataset(): DataSet {
  if (cached) return cached;
  cached = loadDataset({
    chipsPath: DEFAULT_CHIPS_PATH,
    pivotedPath: DEFAULT_PIVOTED_PATH,
  });
  return cached;
}
