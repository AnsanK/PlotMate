import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { parseChips } from './parse-chips';

const fixturePath = path.resolve(
  process.cwd(),
  'dummy_data/raw_data_chips.xlsx'
);

describe('parseChips', () => {
  it('returns 3000 chips from dummy data (60x50 grid)', () => {
    const chips = parseChips(fixturePath);
    expect(chips).toHaveLength(3000);
  });

  it('first chip has ABCDE/WF13/ID100000/(100,200) metadata', () => {
    const chips = parseChips(fixturePath);
    const first = chips[0];
    expect(first.lotId).toBe('ABCDE');
    expect(first.wf).toBe(13);
    expect(first.id).toBe(100000);
    expect(first.chipX).toBe(100);
    expect(first.chipY).toBe(200);
    expect(first.xy).toBe('100_200');
    // CD = base(50) + noise ≈ 50 ± few * 0.3
    expect(first.cd).toBeGreaterThan(48);
    expect(first.cd).toBeLessThan(52);
  });

  it('all chips have unique xy keys', () => {
    const chips = parseChips(fixturePath);
    const xys = new Set(chips.map((c) => c.xy));
    expect(xys.size).toBe(3000);
  });

  it('all chips share ID 100000 (wafer-level identifier)', () => {
    const chips = parseChips(fixturePath);
    expect(new Set(chips.map((c) => c.id))).toEqual(new Set([100000]));
  });

  it('CD values span approximately 49..61 nm (linear 50..60 + noise)', () => {
    const chips = parseChips(fixturePath);
    const cds = chips.map((c) => c.cd);
    expect(Math.min(...cds)).toBeGreaterThan(48);
    expect(Math.max(...cds)).toBeLessThan(62);
  });

  it('grid spans chip_x 100..159 and chip_y 200..249', () => {
    const chips = parseChips(fixturePath);
    const xs = new Set(chips.map((c) => c.chipX));
    const ys = new Set(chips.map((c) => c.chipY));
    expect(Math.min(...xs)).toBe(100);
    expect(Math.max(...xs)).toBe(159);
    expect(Math.min(...ys)).toBe(200);
    expect(Math.max(...ys)).toBe(249);
  });
});
