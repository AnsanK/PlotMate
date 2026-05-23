import { parseChips } from './parse-chips';
import { parsePivoted } from './parse-pivoted';
import type { DataSet } from '@/types/dataset';

export interface LoadDatasetOptions {
  chipsPath: string;
  pivotedPath: string;
}

export function loadDataset(opts: LoadDatasetOptions): DataSet {
  const chips = parseChips(opts.chipsPath);
  const msrItems = parsePivoted(opts.pivotedPath).sort(
    (a, b) => a.priority - b.priority
  );
  return { chips, msrItems };
}
