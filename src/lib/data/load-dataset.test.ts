import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { loadDataset } from './load-dataset';

const dummyDir = path.resolve(process.cwd(), 'dummy_data');

describe('loadDataset', () => {
  it('loads 3000 chips and 100 msrItems together', () => {
    const ds = loadDataset({
      chipsPath: path.join(dummyDir, 'raw_data_chips.xlsx'),
      pivotedPath: path.join(dummyDir, 'raw_data_pivoted.xlsx'),
    });
    expect(ds.chips).toHaveLength(3000);
    expect(ds.msrItems).toHaveLength(100);
  });

  it('every msrItem.values key matches some chip.xy (join consistency)', () => {
    const ds = loadDataset({
      chipsPath: path.join(dummyDir, 'raw_data_chips.xlsx'),
      pivotedPath: path.join(dummyDir, 'raw_data_pivoted.xlsx'),
    });
    const chipXys = new Set(ds.chips.map((c) => c.xy));
    for (const item of ds.msrItems) {
      const valueKeys = new Set(Object.keys(item.values));
      expect(valueKeys).toEqual(chipXys);
    }
  });

  it('msrItems are sorted by priority ascending', () => {
    const ds = loadDataset({
      chipsPath: path.join(dummyDir, 'raw_data_chips.xlsx'),
      pivotedPath: path.join(dummyDir, 'raw_data_pivoted.xlsx'),
    });
    const priorities = ds.msrItems.map((i) => i.priority);
    const sorted = [...priorities].sort((a, b) => a - b);
    expect(priorities).toEqual(sorted);
  });
});
