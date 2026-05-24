import { describe, it, expect } from "vitest";
import { sampleIndices } from "./downsample";

describe("sampleIndices (deterministic random sample)", () => {
  it("returns all indices when n <= limit", () => {
    expect(sampleIndices(10, 100)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(sampleIndices(100, 100)).toHaveLength(100);
  });

  it("returns exactly `limit` indices when n > limit", () => {
    const idx = sampleIndices(3000, 1500);
    expect(idx).toHaveLength(1500);
  });

  it("returned indices are unique and within [0, n)", () => {
    const n = 5000;
    const idx = sampleIndices(n, 1500);
    const set = new Set(idx);
    expect(set.size).toBe(1500);
    for (const i of idx) {
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(n);
    }
  });

  it("indices are sorted ascending (preserves underlying order)", () => {
    const idx = sampleIndices(3000, 500);
    for (let i = 1; i < idx.length; i++) {
      expect(idx[i]).toBeGreaterThan(idx[i - 1]);
    }
  });

  it("is deterministic for the same (n, limit) pair", () => {
    const a = sampleIndices(3000, 1000);
    const b = sampleIndices(3000, 1000);
    expect(a).toEqual(b);
  });
});
