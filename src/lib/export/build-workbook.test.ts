import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { buildExportWorkbook } from "./build-workbook";
import type { DataSet } from "@/types/dataset";

function makeDataset(): DataSet {
  return {
    chips: [
      { lotId: "ABCDE", wf: 13, id: 100000, chipX: 100, chipY: 200, xy: "100_200", cd: 50.0 },
      { lotId: "ABCDE", wf: 13, id: 100000, chipX: 100, chipY: 201, xy: "100_201", cd: 50.2 },
      { lotId: "ABCDE", wf: 13, id: 100000, chipX: 101, chipY: 200, xy: "101_200", cd: 52.1 },
    ],
    msrItems: [
      { name: "MSR0001", priority: 1, correlation: 0.9, values: { "100_200": 11, "100_201": 12, "101_200": 13 } },
      { name: "MSR0002", priority: 2, correlation: -0.7, values: { "100_200": 21, "100_201": 22, "101_200": 23 } },
      { name: "MSR0003", priority: 3, correlation: 0.05, values: { "100_200": 31, "100_201": 32, "101_200": 33 } },
    ],
  };
}

describe("buildExportWorkbook", () => {
  it("creates 3 sheets named Raw / Insights / Essential", () => {
    const wb = buildExportWorkbook(makeDataset(), new Set(), new Set(), {
      global: new Set(),
      perChart: new Map(),
    });
    expect(wb.SheetNames).toEqual(["Raw", "Insights", "Essential"]);
  });

  it("Raw sheet has chip rows with metadata + all MSR values", () => {
    const wb = buildExportWorkbook(makeDataset(), new Set(), new Set(), {
      global: new Set(),
      perChart: new Map(),
    });
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets.Raw, {
      defval: null,
    });
    expect(rows).toHaveLength(3);
    expect(rows[0].Lotid5).toBe("ABCDE");
    expect(rows[0].WF).toBe(13);
    expect(rows[0].ID).toBe(100000);
    expect(rows[0].Chip_X).toBe(100);
    expect(rows[0].Chip_Y).toBe(200);
    expect(rows[0].X_Y).toBe("100_200");
    expect(rows[0].CD).toBe(50.0);
    expect(rows[0].MSR0001).toBe(11);
    expect(rows[0].MSR0002).toBe(21);
    expect(rows[0].MSR0003).toBe(31);
  });

  it("Raw sheet ignores deletions (always full dataset)", () => {
    const wb = buildExportWorkbook(
      makeDataset(),
      new Set(),
      new Set(),
      {
        global: new Set(["100_200"]),
        perChart: new Map([["MSR0001", new Set(["100_201"])]]),
      },
    );
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets.Raw, {
      defval: null,
    });
    expect(rows).toHaveLength(3);
    expect(rows[0].MSR0001).toBe(11);
    expect(rows[1].MSR0001).toBe(12);
  });

  it("Insights sheet has only selected MSR rows with chip-xy columns", () => {
    const wb = buildExportWorkbook(
      makeDataset(),
      new Set(["MSR0001", "MSR0003"]),
      new Set(),
      { global: new Set(), perChart: new Map() },
    );
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      wb.Sheets.Insights,
      { defval: null },
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]["MSR Item"]).toBe("MSR0001");
    expect(rows[0]["Priority"]).toBe(1);
    expect(rows[0]["상관계수"]).toBe(0.9);
    expect(rows[0]["100_200"]).toBe(11);
    expect(rows[0]["100_201"]).toBe(12);
    expect(rows[0]["101_200"]).toBe(13);
    expect(rows[1]["MSR Item"]).toBe("MSR0003");
  });

  it("Insights sheet leaves globally-deleted chip cells empty", () => {
    const wb = buildExportWorkbook(
      makeDataset(),
      new Set(["MSR0001"]),
      new Set(),
      {
        global: new Set(["100_201"]),
        perChart: new Map(),
      },
    );
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      wb.Sheets.Insights,
      { defval: null, raw: true },
    );
    expect(rows[0]["100_200"]).toBe(11);
    expect(rows[0]["100_201"]).toBeNull();
    expect(rows[0]["101_200"]).toBe(13);
  });

  it("Insights sheet applies per-chart delete only to that MSR", () => {
    const wb = buildExportWorkbook(
      makeDataset(),
      new Set(["MSR0001", "MSR0002"]),
      new Set(),
      {
        global: new Set(),
        perChart: new Map([["MSR0001", new Set(["100_200"])]]),
      },
    );
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      wb.Sheets.Insights,
      { defval: null, raw: true },
    );
    const msr1 = rows.find((r) => r["MSR Item"] === "MSR0001")!;
    const msr2 = rows.find((r) => r["MSR Item"] === "MSR0002")!;
    expect(msr1["100_200"]).toBeNull();
    expect(msr2["100_200"]).toBe(21);
  });

  it("Essential sheet uses the same rules as Insights", () => {
    const wb = buildExportWorkbook(
      makeDataset(),
      new Set(),
      new Set(["MSR0003"]),
      {
        global: new Set(["100_200"]),
        perChart: new Map(),
      },
    );
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      wb.Sheets.Essential,
      { defval: null, raw: true },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]["MSR Item"]).toBe("MSR0003");
    expect(rows[0]["100_200"]).toBeNull();
    expect(rows[0]["100_201"]).toBe(32);
  });

  it("Empty Insights/Essential groups produce header-only sheets", () => {
    const wb = buildExportWorkbook(makeDataset(), new Set(), new Set(), {
      global: new Set(),
      perChart: new Map(),
    });
    const insightsRows = XLSX.utils.sheet_to_json(wb.Sheets.Insights);
    const essentialRows = XLSX.utils.sheet_to_json(wb.Sheets.Essential);
    expect(insightsRows).toHaveLength(0);
    expect(essentialRows).toHaveLength(0);
  });
});
