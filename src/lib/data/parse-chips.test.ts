import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { parseChips } from './parse-chips';

const fixturePath = path.resolve(
  process.cwd(),
  'dummy_data/raw_data_chips.xlsx'
);

describe('parseChips', () => {
  it('returns 18 chips from dummy data', () => {
    const chips = parseChips(fixturePath);
    expect(chips).toHaveLength(18);
  });

  it('parses the first chip correctly', () => {
    const chips = parseChips(fixturePath);
    expect(chips[0]).toEqual({
      lotId: 'ABCDE',
      wf: 13,
      id: 100000,
      chipX: 100,
      chipY: 200,
      xy: '100_200',
      cd: 50,
    });
  });

  it('all chips have unique xy keys', () => {
    const chips = parseChips(fixturePath);
    const xys = new Set(chips.map((c) => c.xy));
    expect(xys.size).toBe(18);
  });

  it('all chips share ID 100000 (wafer-level identifier)', () => {
    const chips = parseChips(fixturePath);
    expect(new Set(chips.map((c) => c.id))).toEqual(new Set([100000]));
  });

  it('CD values span 50..60 nm range', () => {
    const chips = parseChips(fixturePath);
    const cds = chips.map((c) => c.cd);
    expect(Math.min(...cds)).toBe(50);
    expect(Math.max(...cds)).toBe(60);
  });
});
