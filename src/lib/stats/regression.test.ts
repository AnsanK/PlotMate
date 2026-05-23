import { describe, it, expect } from "vitest";
import { linearRegression } from "./regression";

describe("linearRegression", () => {
  it("returns slope=1, intercept=0 for identity y=x", () => {
    const res = linearRegression([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
    expect(res.slope).toBeCloseTo(1, 6);
    expect(res.intercept).toBeCloseTo(0, 6);
    expect(res.r).toBeCloseTo(1, 6);
    expect(res.r2).toBeCloseTo(1, 6);
    expect(res.n).toBe(5);
  });

  it("returns slope=2, intercept=1 for y=2x+1", () => {
    const res = linearRegression([0, 1, 2, 3], [1, 3, 5, 7]);
    expect(res.slope).toBeCloseTo(2, 6);
    expect(res.intercept).toBeCloseTo(1, 6);
    expect(res.r).toBeCloseTo(1, 6);
  });

  it("returns negative slope and r for y=-x", () => {
    const res = linearRegression([1, 2, 3, 4, 5], [5, 4, 3, 2, 1]);
    expect(res.slope).toBeCloseTo(-1, 6);
    expect(res.r).toBeCloseTo(-1, 6);
    expect(res.r2).toBeCloseTo(1, 6);
  });

  it("returns r close to expected for noisy data", () => {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8];
    const ys = [1.2, 1.9, 3.1, 3.8, 5.2, 5.9, 7.1, 7.8];
    const res = linearRegression(xs, ys);
    expect(res.r).toBeGreaterThan(0.97);
    expect(res.r).toBeLessThan(1.0);
  });

  it("returns NaN-safe defaults for n<2", () => {
    const res = linearRegression([1], [1]);
    expect(res.n).toBe(1);
    expect(Number.isNaN(res.slope)).toBe(true);
    expect(Number.isNaN(res.r)).toBe(true);
  });

  it("returns NaN-safe defaults for empty arrays", () => {
    const res = linearRegression([], []);
    expect(res.n).toBe(0);
    expect(Number.isNaN(res.r)).toBe(true);
  });

  it("throws if xs and ys lengths differ", () => {
    expect(() => linearRegression([1, 2], [1, 2, 3])).toThrow();
  });

  it("computes correct line endpoints for plotting", () => {
    const res = linearRegression([0, 10], [1, 21]);
    const xMin = 0;
    const xMax = 10;
    const yAtXMin = res.slope * xMin + res.intercept;
    const yAtXMax = res.slope * xMax + res.intercept;
    expect(yAtXMin).toBeCloseTo(1, 6);
    expect(yAtXMax).toBeCloseTo(21, 6);
  });
});
