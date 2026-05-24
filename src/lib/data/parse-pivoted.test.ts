import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { parsePivoted } from './parse-pivoted';

const fixturePath = path.resolve(
  process.cwd(),
  'dummy_data/raw_data_pivoted.xlsx'
);

describe('parsePivoted', () => {
  it('returns 100 MSR items', () => {
    const items = parsePivoted(fixturePath);
    expect(items).toHaveLength(100);
  });

  it('first item is MSR0001 with priority 1 and r ≈ +0.92', () => {
    const items = parsePivoted(fixturePath);
    expect(items[0].name).toBe('MSR0001');
    expect(items[0].priority).toBe(1);
    expect(items[0].correlation).toBeCloseTo(0.92, 1);
  });

  it('priorities cover 1..100 uniquely', () => {
    const items = parsePivoted(fixturePath);
    const priorities = items.map((i) => i.priority).sort((a, b) => a - b);
    expect(priorities).toEqual(
      Array.from({ length: 100 }, (_, i) => i + 1)
    );
  });

  it('each item has 3000 chip values', () => {
    const items = parsePivoted(fixturePath);
    for (const item of items) {
      expect(Object.keys(item.values)).toHaveLength(3000);
    }
  });

  it('MSR0002 has negative correlation (linear signal)', () => {
    const items = parsePivoted(fixturePath);
    const m = items.find((i) => i.name === 'MSR0002');
    expect(m).toBeDefined();
    expect(m!.correlation).toBeLessThan(0);
  });

  it('values use X_Y format keys spanning 100_200..159_249', () => {
    const items = parsePivoted(fixturePath);
    const firstKeys = Object.keys(items[0].values);
    expect(firstKeys).toContain('100_200');
    expect(firstKeys).toContain('159_249');
  });
});
