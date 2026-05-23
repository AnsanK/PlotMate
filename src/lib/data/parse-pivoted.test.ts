import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { parsePivoted } from './parse-pivoted';

const fixturePath = path.resolve(
  process.cwd(),
  'dummy_data/raw_data_pivoted.xlsx'
);

describe('parsePivoted', () => {
  it('returns 20 MSR items', () => {
    const items = parsePivoted(fixturePath);
    expect(items).toHaveLength(20);
  });

  it('first item is MSR0009 with priority 1 and r≈+0.918', () => {
    const items = parsePivoted(fixturePath);
    expect(items[0].name).toBe('MSR0009');
    expect(items[0].priority).toBe(1);
    expect(items[0].correlation).toBeCloseTo(0.918, 2);
  });

  it('priorities cover 1..20 uniquely', () => {
    const items = parsePivoted(fixturePath);
    const priorities = items.map((i) => i.priority).sort((a, b) => a - b);
    expect(priorities).toEqual(
      Array.from({ length: 20 }, (_, i) => i + 1)
    );
  });

  it('each item has 18 chip values', () => {
    const items = parsePivoted(fixturePath);
    for (const item of items) {
      expect(Object.keys(item.values)).toHaveLength(18);
    }
  });

  it('MSR0002 has negative correlation', () => {
    const items = parsePivoted(fixturePath);
    const msr0002 = items.find((i) => i.name === 'MSR0002');
    expect(msr0002).toBeDefined();
    expect(msr0002!.correlation).toBeLessThan(0);
  });

  it('values use X_Y format keys (e.g. 100_200)', () => {
    const items = parsePivoted(fixturePath);
    const firstKeys = Object.keys(items[0].values);
    expect(firstKeys).toContain('100_200');
    expect(firstKeys).toContain('105_202');
  });
});
