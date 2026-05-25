# PlotMate Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Insights/Essential 그룹의 채택 결과를 단일 xlsx 파일로 다운로드. 3 sheet 구조 (Raw long-format + Insights pivoted + Essential pivoted). Insights/Essential sheet의 deleted chip 셀은 공란. UI는 RightPanel 하단 (Essential 카드 아래) Export 버튼.

**Architecture:**
- `buildExportWorkbook(dataset, insightIds, essentialIds, deleted)` 순수 함수 — `XLSX.WorkBook` 반환. TDD.
- 3 sheet:
  - `Raw`: 한 행 = chip, 컬럼 = `Lotid5/WF/ID/Chip_X/Chip_Y/X_Y/CD/MSR0001~MSRxxxx`. dataset 전체. deleted 무시.
  - `Insights`: 한 행 = insights MSR, 컬럼 = `MSR Item/Priority/상관계수/chip_xy들`. deleted chip 셀 = 공란 (셀은 있되 값만 비움). Insights에 속하지 않은 MSR 제외.
  - `Essential`: 동일 구조.
- `<ExportButton />` client component: 클릭 시 `XLSX.write` → `Blob` → `<a download>` 트리거.
- RightPanel은 `flex-col`에 `<ExportButton />`을 third item으로 추가 → 두 카드 `flex-1`이 자연스럽게 같은 높이로 약간 줄어듦.

**Tech Stack:** xlsx (이미 설치) / Blob + createObjectURL (브라우저 표준).

**Prerequisite:** Insights/Essential 라벨링 commit `f24fb41`.

---

## File Structure

| 경로 | 책임 |
|---|---|
| `src/lib/export/build-workbook.ts` | pure xlsx WorkBook 생성 함수 |
| `src/lib/export/build-workbook.test.ts` | 6+ TDD 테스트 |
| `src/components/panels/export-button.tsx` | 클릭 → workbook 생성 → 다운로드 |
| `src/components/panels/right-panel.tsx` | (modify) ExportButton 추가, dataset prop은 이미 받음 |

---

## Task 1: buildExportWorkbook util (TDD)

**Files:**
- Create: `src/lib/export/build-workbook.ts`
- Create: `src/lib/export/build-workbook.test.ts`

- [ ] **Step 1.1: failing test 작성**

Create `src/lib/export/build-workbook.test.ts`:
```typescript
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
    expect(rows[0].MSR0001).toBe(11); // global delete ignored in Raw
    expect(rows[1].MSR0001).toBe(12); // per-chart delete ignored in Raw
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
    expect(rows[0]["100_201"]).toBeNull(); // globally deleted -> empty
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
    expect(msr1["100_200"]).toBeNull(); // per-chart delete on MSR0001
    expect(msr2["100_200"]).toBe(21); // not deleted on MSR0002
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
```

- [ ] **Step 1.2: fail 확인**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm test src/lib/export/build-workbook.test.ts`

Expected: All FAIL ("Cannot find module './build-workbook'").

- [ ] **Step 1.3: 구현**

Create `src/lib/export/build-workbook.ts`:
```typescript
import * as XLSX from "xlsx";
import type { DataSet } from "@/types/dataset";

export interface DeletedSnapshot {
  global: Set<string>;
  perChart: Map<string, Set<string>>;
}

export function buildExportWorkbook(
  dataset: DataSet,
  insightIds: Set<string>,
  essentialIds: Set<string>,
  deleted: DeletedSnapshot,
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // ---------- Sheet 1: Raw (long-format, deletions ignored) ----------
  const msrNames = dataset.msrItems.map((m) => m.name);
  const rawHeader = [
    "Lotid5",
    "WF",
    "ID",
    "Chip_X",
    "Chip_Y",
    "X_Y",
    "CD",
    ...msrNames,
  ];
  const rawRows: (string | number | null)[][] = [rawHeader];
  for (const chip of dataset.chips) {
    const row: (string | number | null)[] = [
      chip.lotId,
      chip.wf,
      chip.id,
      chip.chipX,
      chip.chipY,
      chip.xy,
      chip.cd,
    ];
    for (const msr of dataset.msrItems) {
      const v = msr.values[chip.xy];
      row.push(v ?? null);
    }
    rawRows.push(row);
  }
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(rawRows),
    "Raw",
  );

  // ---------- Sheet 2 & 3: Insights / Essential (pivoted with deletions) ----------
  const chipXys = dataset.chips.map((c) => c.xy);

  function buildGroupSheet(ids: Set<string>): XLSX.WorkSheet {
    const header = ["MSR Item", "Priority", "상관계수", ...chipXys];
    const rows: (string | number | null)[][] = [header];
    const items = dataset.msrItems.filter((m) => ids.has(m.name));
    for (const msr of items) {
      const perChart = deleted.perChart.get(msr.name) ?? new Set<string>();
      const row: (string | number | null)[] = [
        msr.name,
        msr.priority,
        msr.correlation,
      ];
      for (const xy of chipXys) {
        if (deleted.global.has(xy) || perChart.has(xy)) {
          row.push(null);
        } else {
          const v = msr.values[xy];
          row.push(v ?? null);
        }
      }
      rows.push(row);
    }
    return XLSX.utils.aoa_to_sheet(rows);
  }

  XLSX.utils.book_append_sheet(wb, buildGroupSheet(insightIds), "Insights");
  XLSX.utils.book_append_sheet(wb, buildGroupSheet(essentialIds), "Essential");

  return wb;
}
```

- [ ] **Step 1.4: pass + 회귀**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm exec tsc --noEmit && pnpm test`

Expected: 89 tests PASS (81 prior + 8 new).

- [ ] **Step 1.5: commit**

```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/lib/export && git commit -m "feat(export): add buildExportWorkbook util — Raw + Insights + Essential sheets (TDD)"
```

---

## Task 2: ExportButton 컴포넌트 + download trigger

**Files:**
- Create: `src/components/panels/export-button.tsx`

- [ ] **Step 2.1: ExportButton 작성**

Create `src/components/panels/export-button.tsx`:
```typescript
"use client";

import { useCallback } from "react";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import type { DataSet } from "@/types/dataset";
import { useSelectionStore } from "@/lib/store/selection-store";
import { buildExportWorkbook } from "@/lib/export/build-workbook";

interface ExportButtonProps {
  dataset: DataSet;
}

export function ExportButton({ dataset }: ExportButtonProps) {
  const group1Ids = useSelectionStore((s) => s.group1Ids);
  const group2Ids = useSelectionStore((s) => s.group2Ids);
  const globallyDeleted = useSelectionStore((s) => s.globallyDeletedChipIds);
  const perChartDeleted = useSelectionStore((s) => s.perChartDeletedChipIds);

  const handleExport = useCallback(() => {
    const wb = buildExportWorkbook(dataset, group1Ids, group2Ids, {
      global: globallyDeleted,
      perChart: perChartDeleted,
    });
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    a.download = `plotmate-export-${ts}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [dataset, group1Ids, group2Ids, globallyDeleted, perChartDeleted]);

  return (
    <button
      type="button"
      onClick={handleExport}
      className="flex items-center justify-center gap-1.5 rounded-md bg-primary px-2 py-2 text-[11px] font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
    >
      <Download size={12} />
      <span>Export xlsx</span>
    </button>
  );
}
```

- [ ] **Step 2.2: type check + build**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm exec tsc --noEmit && pnpm lint && pnpm build`

Expected: clean.

- [ ] **Step 2.3: commit**

```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/components/panels/export-button.tsx && git commit -m "feat(export): add ExportButton that builds + downloads xlsx workbook"
```

---

## Task 3: RightPanel 통합 (Essential 아래 ExportButton)

**Files:**
- Modify: `src/components/panels/right-panel.tsx`

- [ ] **Step 3.1: ExportButton import + 배치**

Read `right-panel.tsx`. apply:

(a) import 추가:
```typescript
import { ExportButton } from "@/components/panels/export-button";
```

(b) RightPanel JSX의 두 GroupCard 다음에 ExportButton 추가:

기존:
```tsx
export function RightPanel({ dataset }: RightPanelProps) {
  return (
    <aside className="flex w-[140px] shrink-0 flex-col gap-2">
      <GroupCard group={1} dataset={dataset} />
      <GroupCard group={2} dataset={dataset} />
    </aside>
  );
}
```

새:
```tsx
export function RightPanel({ dataset }: RightPanelProps) {
  return (
    <aside className="flex w-[140px] shrink-0 flex-col gap-2">
      <GroupCard group={1} dataset={dataset} />
      <GroupCard group={2} dataset={dataset} />
      <ExportButton dataset={dataset} />
    </aside>
  );
}
```

두 GroupCard는 이미 `flex-1`이라 자동 균등 분할. ExportButton (fixed-height ~36px)이 third item으로 들어가면 카드 높이 자연 감소.

- [ ] **Step 3.2: 전체 검증**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm exec tsc --noEmit && pnpm lint && pnpm build && pnpm test`

Expected: clean, 89/89 PASS.

- [ ] **Step 3.3: commit**

```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/components/panels/right-panel.tsx && git commit -m "feat(right-panel): add ExportButton below Essential card"
```

---

## Acceptance Criteria

- [ ] `pnpm test` → 89/89 PASS (81 prior + 8 new)
- [ ] `pnpm build` → success
- [ ] `pnpm lint` → clean
- [ ] `git log` → 56+ commits (53 prior + 3 new)
- [ ] 시각 검증:
  1. RightPanel: Insights / Essential 카드 + 그 아래 `[⬇ Export xlsx]` 버튼. 두 카드 높이 같음 (약간 줄어듦)
  2. Insights/Essential 비어 있어도 Export 클릭 가능. 다운로드된 xlsx의 Insights/Essential sheet는 헤더만
  3. 카드 채운 후 Export → xlsx 파일에 3 sheet (Raw / Insights / Essential)
  4. 차트에서 chip 삭제 후 Export → Insights/Essential sheet의 해당 cell 공란, Raw sheet은 원본 그대로

---

## Next Plan Preview

**Plan #9 (선택)**: 다크모드 차트 색 fine-tune — Plotly gridcolor 등 다크 모드 대응.

또는 server-side push (Sensorpia 통신 entry) — spec § 11 미정 결정 필요.
