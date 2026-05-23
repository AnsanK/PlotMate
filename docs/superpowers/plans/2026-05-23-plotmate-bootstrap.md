# PlotMate Bootstrap & Data Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Next.js 16 프로젝트를 PlotMate 디렉토리에 부트스트랩하고, `dummy_data/raw_data_chips.xlsx`와 `raw_data_pivoted.xlsx`를 파싱해 `{chips, msrItems}` 정형 데이터로 노출한다. 임시 페이지에서 로딩 결과를 시각 검증한다.

**Architecture:** 데이터 파싱은 server-only Node 모듈 (`fs.readFileSync` + `xlsx`). 두 파일을 각각 파싱 → 통합 → Next.js RSC가 첫 페이지 렌더 시 server에서 한 번 호출. 1 캐싱 (process-level). 데이터 로딩은 entry adapter 인터페이스 뒤에서 동작해 추후 Sensorpia push 방식으로 교체 가능하도록 설계.

**Tech Stack:** Next.js 16.2 + React 19 + TypeScript / Tailwind v4 / xlsx (SheetJS) / Vitest + happy-dom / pnpm.

**Spec reference:** [docs/superpowers/specs/2026-05-23-plotmate-ui-design.md](../specs/2026-05-23-plotmate-ui-design.md)

---

## File Structure

| 경로 | 책임 |
|---|---|
| `package.json`, `tsconfig.json`, `next.config.ts` | Next.js 부트스트랩 (create-next-app 생성) |
| `vitest.config.ts` | Vitest 설정 (node env) |
| `src/types/dataset.ts` | `Chip`, `MsrItem`, `DataSet` 타입 정의 |
| `src/lib/data/parse-chips.ts` | chips xlsx 파서 (pure function, fs 의존) |
| `src/lib/data/parse-chips.test.ts` | 위 테스트 (dummy_data 사용) |
| `src/lib/data/parse-pivoted.ts` | pivoted xlsx 파서 |
| `src/lib/data/parse-pivoted.test.ts` | 위 테스트 |
| `src/lib/data/load-dataset.ts` | 두 파서를 묶어 `DataSet` 반환 |
| `src/lib/data/load-dataset.test.ts` | 통합 일관성 (xy 키 매칭) 테스트 |
| `src/lib/server/dataset.ts` | server-only 모듈, default 경로 + process 캐싱 |
| `src/app/page.tsx` | RSC에서 dataset 로드 + JSON 시각 검증 (임시) |

---

## Task 1: Project bootstrap

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `src/app/*` (create-next-app 자동 생성)

- [ ] **Step 1.1: 현재 working directory 확인**

Run:
```bash
pwd
ls -la c:/Users/KTY/Desktop/Claude/PlotMate
```

Expected: `pwd`는 PlotMate 또는 상위. `ls`에 `dummy_data/`, `docs/`, `.superpowers/` 존재. `package.json`은 **없어야** 함 (만약 있으면 진행 멈추고 사용자에게 알림).

- [ ] **Step 1.2: Next.js 16 프로젝트 init (현재 디렉토리에)**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --turbopack --use-pnpm --import-alias "@/*"
```

Expected: 디렉토리에 `package.json`, `tsconfig.json`, `next.config.ts`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `postcss.config.mjs`, `eslint.config.mjs` 생성. 기존 `dummy_data/`, `docs/`, `.superpowers/`는 그대로. `create-next-app`이 git init도 자동 수행.

If create-next-app은 빈 디렉토리 아니라 거부 시: `--use-pnpm` 옆에 `--reset-config`는 옵션 아님. 대신 `package.json`이 이미 있는지 확인 (Step 1.1) — 없으면 정상 진행될 것. 그래도 거부 시 `--skip-install` 추가 후 deps 수동 설치.

- [ ] **Step 1.3: 추가 deps 설치 (xlsx + Vitest)**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm add xlsx && pnpm add -D vitest @vitest/ui @types/node
```

Expected: `package.json`의 `dependencies`에 `xlsx` 추가, `devDependencies`에 `vitest`, `@vitest/ui`, `@types/node` 추가. 설치 완료 후 `pnpm-lock.yaml` 업데이트.

- [ ] **Step 1.4: Vitest 설정 파일 작성**

Create: `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 1.5: package.json scripts 추가**

Modify: `package.json` — `scripts` 객체에 추가:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest --ui"
```

기존 scripts (`dev`, `build`, `start`, `lint`)는 유지.

- [ ] **Step 1.6: Vitest 동작 확인용 sanity test**

Create: `src/lib/sanity.test.ts`
```typescript
import { describe, it, expect } from 'vitest';

describe('sanity', () => {
  it('vitest is wired up', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm test`

Expected: 1 test passed. `sanity is wired up` 표시.

- [ ] **Step 1.7: production build 가능 확인 (자동)**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm build`

Expected: 빌드 성공 (Next.js 16 default 페이지가 정상 컴파일). `.next/` 디렉토리 생성. dev server 수동 확인은 task 6에서 사용자가 직접.

- [ ] **Step 1.8: .gitignore에 .superpowers/ 추가 + sanity test 삭제**

Modify: `.gitignore` — 마지막 줄에 추가:
```
# brainstorm session artifacts
.superpowers/
```

Delete: `src/lib/sanity.test.ts`

- [ ] **Step 1.9: 첫 commit**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add -A && git commit -m "chore: bootstrap Next.js 16 + xlsx + vitest"
```

Expected: 첫 commit. `git log --oneline`로 1 line 표시.

---

## Task 2: 데이터 타입 정의

**Files:**
- Create: `src/types/dataset.ts`

- [ ] **Step 2.1: 타입 정의 작성**

Create: `src/types/dataset.ts`
```typescript
export type ChipKey = string; // "X_Y" 형식, 예: "100_200"

export interface Chip {
  lotId: string;     // "ABCDE"
  wf: number;        // 13
  id: number;        // 100000 (wafer-level identifier)
  chipX: number;
  chipY: number;
  xy: ChipKey;       // `${chipX}_${chipY}`
  cd: number;        // CD 측정값 (nm)
}

export interface MsrItem {
  name: string;                          // "MSR0009"
  priority: number;                      // 1 = 가장 중요 (|r| 내림차순 rank)
  correlation: number;                   // -1..+1 (CD와의 Pearson r)
  values: Record<ChipKey, number>;       // chip xy → 측정값
}

export interface DataSet {
  chips: Chip[];
  msrItems: MsrItem[];
}
```

- [ ] **Step 2.2: type check**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm exec tsc --noEmit`

Expected: 에러 없음.

- [ ] **Step 2.3: commit**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/types/dataset.ts && git commit -m "feat(types): add Chip / MsrItem / DataSet types"
```

---

## Task 3: parseChips 함수 (TDD)

**Files:**
- Create: `src/lib/data/parse-chips.ts`
- Test: `src/lib/data/parse-chips.test.ts`

- [ ] **Step 3.1: failing test 작성**

Create: `src/lib/data/parse-chips.test.ts`
```typescript
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
```

- [ ] **Step 3.2: 테스트 실행 → fail 확인**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm test src/lib/data/parse-chips.test.ts`

Expected: 5 tests FAIL with "Failed to resolve import './parse-chips'" (module not found).

- [ ] **Step 3.3: parse-chips.ts 구현**

Create: `src/lib/data/parse-chips.ts`
```typescript
import * as XLSX from 'xlsx';
import { readFileSync } from 'node:fs';
import type { Chip } from '@/types/dataset';

interface RawChipRow {
  Lotid5: string;
  WF: number;
  ID: number;
  Chip_X: number;
  Chip_Y: number;
  X_Y: string;
  CD: number;
}

export function parseChips(filePath: string): Chip[] {
  const buf = readFileSync(filePath);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const firstSheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<RawChipRow>(firstSheet, {
    defval: null,
  });

  return rows.map((row) => ({
    lotId: String(row.Lotid5),
    wf: Number(row.WF),
    id: Number(row.ID),
    chipX: Number(row.Chip_X),
    chipY: Number(row.Chip_Y),
    xy: String(row.X_Y),
    cd: Number(row.CD),
  }));
}
```

- [ ] **Step 3.4: 테스트 실행 → pass 확인**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm test src/lib/data/parse-chips.test.ts`

Expected: 5 tests PASS.

- [ ] **Step 3.5: commit**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/lib/data/parse-chips.ts src/lib/data/parse-chips.test.ts && git commit -m "feat(data): add parseChips with dummy_data fixture tests"
```

---

## Task 4: parsePivoted 함수 (TDD)

**Files:**
- Create: `src/lib/data/parse-pivoted.ts`
- Test: `src/lib/data/parse-pivoted.test.ts`

- [ ] **Step 4.1: failing test 작성**

Create: `src/lib/data/parse-pivoted.test.ts`
```typescript
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
```

- [ ] **Step 4.2: 테스트 실행 → fail 확인**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm test src/lib/data/parse-pivoted.test.ts`

Expected: 6 tests FAIL with module not found.

- [ ] **Step 4.3: parse-pivoted.ts 구현**

Create: `src/lib/data/parse-pivoted.ts`
```typescript
import * as XLSX from 'xlsx';
import { readFileSync } from 'node:fs';
import type { ChipKey, MsrItem } from '@/types/dataset';

const META_COLUMNS = new Set(['MSR Item', 'Priority', '상관계수']);

export function parsePivoted(filePath: string): MsrItem[] {
  const buf = readFileSync(filePath);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const firstSheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
    defval: null,
  });

  return rows.map((row) => {
    const name = String(row['MSR Item']);
    const priority = Number(row['Priority']);
    const correlation = Number(row['상관계수']);
    const values: Record<ChipKey, number> = {};

    for (const [key, value] of Object.entries(row)) {
      if (META_COLUMNS.has(key)) continue;
      if (value === null || value === undefined) continue;
      values[key] = Number(value);
    }

    return { name, priority, correlation, values };
  });
}
```

- [ ] **Step 4.4: 테스트 실행 → pass 확인**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm test src/lib/data/parse-pivoted.test.ts`

Expected: 6 tests PASS.

- [ ] **Step 4.5: commit**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/lib/data/parse-pivoted.ts src/lib/data/parse-pivoted.test.ts && git commit -m "feat(data): add parsePivoted with dummy_data fixture tests"
```

---

## Task 5: loadDataset 통합 (TDD)

**Files:**
- Create: `src/lib/data/load-dataset.ts`
- Test: `src/lib/data/load-dataset.test.ts`

- [ ] **Step 5.1: failing test 작성**

Create: `src/lib/data/load-dataset.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { loadDataset } from './load-dataset';

const dummyDir = path.resolve(process.cwd(), 'dummy_data');

describe('loadDataset', () => {
  it('loads chips and msrItems together', () => {
    const ds = loadDataset({
      chipsPath: path.join(dummyDir, 'raw_data_chips.xlsx'),
      pivotedPath: path.join(dummyDir, 'raw_data_pivoted.xlsx'),
    });
    expect(ds.chips).toHaveLength(18);
    expect(ds.msrItems).toHaveLength(20);
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
```

- [ ] **Step 5.2: 테스트 실행 → fail 확인**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm test src/lib/data/load-dataset.test.ts`

Expected: 3 tests FAIL with module not found.

- [ ] **Step 5.3: load-dataset.ts 구현**

Create: `src/lib/data/load-dataset.ts`
```typescript
import { parseChips } from './parse-chips';
import { parsePivoted } from './parse-pivoted';
import type { DataSet } from '@/types/dataset';

export interface LoadDatasetOptions {
  chipsPath: string;
  pivotedPath: string;
}

export function loadDataset(opts: LoadDatasetOptions): DataSet {
  const chips = parseChips(opts.chipsPath);
  const msrItems = parsePivoted(opts.pivotedPath).sort(
    (a, b) => a.priority - b.priority
  );
  return { chips, msrItems };
}
```

- [ ] **Step 5.4: 테스트 실행 → pass 확인**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm test src/lib/data/load-dataset.test.ts`

Expected: 3 tests PASS.

- [ ] **Step 5.5: 전체 테스트 실행 (회귀 확인)**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm test`

Expected: 14 tests PASS (5 + 6 + 3).

- [ ] **Step 5.6: commit**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/lib/data/load-dataset.ts src/lib/data/load-dataset.test.ts && git commit -m "feat(data): add loadDataset with join consistency tests"
```

---

## Task 6: Server module + 첫 page 시각 검증

**Files:**
- Create: `src/lib/server/dataset.ts`
- Modify: `src/app/page.tsx`

- [ ] **Step 6.1: server-only dataset 모듈 작성**

Create: `src/lib/server/dataset.ts`
```typescript
import 'server-only';
import path from 'node:path';
import { loadDataset } from '@/lib/data/load-dataset';
import type { DataSet } from '@/types/dataset';

const DEFAULT_CHIPS_PATH = path.join(
  process.cwd(),
  'dummy_data',
  'raw_data_chips.xlsx'
);
const DEFAULT_PIVOTED_PATH = path.join(
  process.cwd(),
  'dummy_data',
  'raw_data_pivoted.xlsx'
);

let cached: DataSet | null = null;

export function getDataset(): DataSet {
  if (cached) return cached;
  cached = loadDataset({
    chipsPath: DEFAULT_CHIPS_PATH,
    pivotedPath: DEFAULT_PIVOTED_PATH,
  });
  return cached;
}
```

- [ ] **Step 6.2: server-only 패키지 설치**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm add server-only`

Expected: `package.json` deps에 `server-only` 추가.

- [ ] **Step 6.3: 임시 page 작성 (시각 검증용)**

Modify: `src/app/page.tsx` — 전체 내용 교체:
```tsx
import { getDataset } from '@/lib/server/dataset';

export default function Home() {
  const ds = getDataset();
  const firstMsr = ds.msrItems[0];
  const firstChip = ds.chips[0];

  return (
    <main
      style={{
        padding: 24,
        fontFamily: 'ui-monospace, monospace',
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      <h1 style={{ fontSize: 18, marginBottom: 16 }}>
        PlotMate · data load test
      </h1>
      <p>chips loaded: <strong>{ds.chips.length}</strong> (expected 18)</p>
      <p>msrItems loaded: <strong>{ds.msrItems.length}</strong> (expected 20)</p>
      <h2 style={{ fontSize: 14, marginTop: 16 }}>First chip</h2>
      <pre style={{ background: '#f4f4f5', padding: 12, borderRadius: 6 }}>
        {JSON.stringify(firstChip, null, 2)}
      </pre>
      <h2 style={{ fontSize: 14, marginTop: 16 }}>
        Top-priority MSR item (Priority 1)
      </h2>
      <pre style={{ background: '#f4f4f5', padding: 12, borderRadius: 6 }}>
        {JSON.stringify(firstMsr, null, 2)}
      </pre>
    </main>
  );
}
```

- [ ] **Step 6.4: dev server 시작 + 브라우저 수동 검증**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm dev`

Expected: `http://localhost:3000` 열면:
- `chips loaded: 18 (expected 18)`
- `msrItems loaded: 20 (expected 20)`
- First chip JSON: `lotId: "ABCDE", wf: 13, id: 100000, chipX: 100, chipY: 200, xy: "100_200", cd: 50`
- Top-priority MSR JSON: `name: "MSR0009", priority: 1, correlation: ~0.918, values: { "100_200": ..., ... 18 keys ... }`

확인 후 Ctrl+C로 dev server 종료.

- [ ] **Step 6.5: build 확인 (production)**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm build`

Expected: 빌드 성공 (Type errors 없음, server-only 모듈이 정상 처리됨). `.next/` 생성.

- [ ] **Step 6.6: 전체 테스트 + lint 회귀**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm test && pnpm lint
```

Expected: 14 tests PASS. Lint 에러 없음 (또는 default Next.js lint 통과).

- [ ] **Step 6.7: commit**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/lib/server/dataset.ts src/app/page.tsx package.json pnpm-lock.yaml && git commit -m "feat(server): expose getDataset via RSC + visual verification page"
```

---

## Acceptance Criteria

Plan 완료 시점에 다음이 모두 성립:

- [ ] `pnpm test` → 14 tests PASS (parseChips 5 + parsePivoted 6 + loadDataset 3)
- [ ] `pnpm build` → 빌드 성공
- [ ] `pnpm dev` → `http://localhost:3000`에서 chips 18 / msrItems 20 / 첫 chip 및 첫 MSR 데이터 정상 표시
- [ ] `git log --oneline` → 최소 6개 commit (bootstrap, types, parseChips, parsePivoted, loadDataset, server+page)
- [ ] `.gitignore`에 `.superpowers/` 포함

---

## Next Plan Preview

**Plan #2: UI shell + 디자인 토큰**

- shadcn init (`pnpm dlx shadcn@latest init`)
- globals.css에 Sensorpia oklch 토큰 이식
- 3-pane 레이아웃 컴포넌트 (`<NavSidebar/>`, `<ChartGrid/>`, `<GroupPanel/>` 빈 shell)
- next-themes 다크모드 토글
- 시각 회귀 테스트 (선택)

Plan #1 완료 후 작성 예정.
