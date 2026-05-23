import { describe, it, expect } from "vitest";
import { matchesQuery } from "./filter";

describe("matchesQuery (case-insensitive substring)", () => {
  it("matches when query is a substring of name (case-insensitive)", () => {
    expect(matchesQuery("MSR0009", "msr0009")).toBe(true);
    expect(matchesQuery("MSR0009", "MS")).toBe(true);
    expect(matchesQuery("MSR0009", "0009")).toBe(true);
    expect(matchesQuery("MSR0009", "9")).toBe(true);
  });

  it("returns false when no substring match", () => {
    expect(matchesQuery("MSR0009", "abc")).toBe(false);
    expect(matchesQuery("MSR0009", "MSR1000")).toBe(false);
  });

  it("returns true for empty query (everything matches)", () => {
    expect(matchesQuery("MSR0009", "")).toBe(true);
    expect(matchesQuery("anything", "")).toBe(true);
  });

  it("trims whitespace from query", () => {
    expect(matchesQuery("MSR0009", "  msr  ")).toBe(true);
    expect(matchesQuery("MSR0009", "   ")).toBe(true);
  });
});
