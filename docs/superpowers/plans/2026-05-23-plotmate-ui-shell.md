# PlotMate UI Shell & Design Tokens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sensorpia 디자인 토큰(oklch 무채색 + violet 액센트 + radius 0.625rem)을 적용한 3-pane 레이아웃 shell을 구축한다. 좌/중/우 패널은 빈 placeholder, 다크모드 토글 동작, page.tsx가 AppShell을 렌더하고 dataset을 prop으로 전달한다.

**Architecture:** shadcn 베이스 (cn util + components.json) → globals.css에 Sensorpia oklch 토큰 이식 → next-themes ThemeProvider로 다크모드 지원 → 3-pane shell 컴포넌트 (LeftPanel/ChartGridArea/RightPanel placeholder) → AppShell이 dataset prop을 패널로 전달. Plan #3 이후로 각 패널의 실제 기능 추가.

**Tech Stack:** clsx + tailwind-merge + class-variance-authority (cn util) / tw-animate-css / next-themes / lucide-react / Tailwind v4 oklch 토큰.

**Spec reference:** [docs/superpowers/specs/2026-05-23-plotmate-ui-design.md](../specs/2026-05-23-plotmate-ui-design.md) — § 2 (디자인 토큰), § 3 (전체 레이아웃), § 9 (다크모드)

**Prerequisite:** Plan #1 완료 (commits `af9a88a..3f16fb6`, `getDataset()` available)

---

## File Structure

| 경로 | 책임 |
|---|---|
| `package.json` | deps 추가 (clsx, tailwind-merge, cva, tw-animate-css, next-themes, lucide-react) |
| `components.json` | shadcn config (zinc base, RSC, @/ alias) |
| `src/lib/utils.ts` | `cn()` 유틸 (clsx + twMerge) |
| `src/app/globals.css` | Sensorpia oklch 토큰 이식 (라이트/다크 페어) |
| `src/components/theme-provider.tsx` | next-themes wrapper ("use client") |
| `src/app/layout.tsx` | Geist 폰트 + ThemeProvider + metadata 갱신 |
| `src/components/panels/left-panel.tsx` | 좌패널 placeholder (검색 + List + Draw + ThemeToggle 자리) |
| `src/components/panels/chart-grid-area.tsx` | 중앙 placeholder (그리드 영역) |
| `src/components/panels/right-panel.tsx` | 우패널 placeholder (Group 1/2 + Add/Delete) |
| `src/components/theme-toggle.tsx` | Light/Dark 토글 ("use client") |
| `src/components/app-shell.tsx` | 3-pane 레이아웃 컴포넌트 |
| `src/app/page.tsx` | AppShell 렌더링 + dataset prop |

---

## Task 1: Deps + cn util + components.json

**Files:**
- Modify: `package.json` (deps)
- Create: `src/lib/utils.ts`
- Create: `components.json`

- [ ] **Step 1.1: 필수 deps 설치**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm add clsx tailwind-merge class-variance-authority tw-animate-css next-themes lucide-react
```

Expected: `package.json`의 `dependencies`에 6개 패키지 추가, `pnpm-lock.yaml` 업데이트.

- [ ] **Step 1.2: `cn` 유틸 작성**

Create: `src/lib/utils.ts`
```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 1.3: shadcn config 작성**

Create: `components.json`
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 1.4: type check + build 확인**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm exec tsc --noEmit && pnpm build
```

Expected: TS 에러 없음, 빌드 성공.

- [ ] **Step 1.5: commit**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add package.json pnpm-lock.yaml src/lib/utils.ts components.json && git commit -m "chore(ui): add shadcn base deps + cn util + components.json"
```

---

## Task 2: 디자인 토큰 (globals.css)

**Files:**
- Modify: `src/app/globals.css` (전체 교체)

- [ ] **Step 2.1: Sensorpia oklch 토큰 이식**

Replace entire content of `src/app/globals.css`:
```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
}

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --radius: 0.625rem;
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground antialiased;
  }
  html {
    @apply font-sans;
  }
}
```

- [ ] **Step 2.2: build 확인**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm build`

Expected: 빌드 성공 (Tailwind v4가 oklch 토큰을 정상 인식).

- [ ] **Step 2.3: commit**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/app/globals.css && git commit -m "feat(ui): port Sensorpia oklch design tokens (zinc + radius 0.625rem)"
```

---

## Task 3: ThemeProvider + layout.tsx

**Files:**
- Create: `src/components/theme-provider.tsx`
- Modify: `src/app/layout.tsx` (전체 교체)

- [ ] **Step 3.1: ThemeProvider 작성**

Create: `src/components/theme-provider.tsx`
```typescript
"use client";

import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

- [ ] **Step 3.2: layout.tsx 전체 교체**

Replace entire content of `src/app/layout.tsx`:
```typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PlotMate",
  description: "Auto-curate scatter charts from wafer raw data by CD-MSR correlation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3.3: build 확인**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm build`

Expected: 빌드 성공. ThemeProvider client component 정상 컴파일.

- [ ] **Step 3.4: commit**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/components/theme-provider.tsx src/app/layout.tsx && git commit -m "feat(ui): add next-themes ThemeProvider + Geist fonts in root layout"
```

---

## Task 4: 패널 placeholder 컴포넌트

**Files:**
- Create: `src/components/panels/left-panel.tsx`
- Create: `src/components/panels/chart-grid-area.tsx`
- Create: `src/components/panels/right-panel.tsx`

- [ ] **Step 4.1: LeftPanel placeholder 작성**

Create: `src/components/panels/left-panel.tsx`
```typescript
import type { DataSet } from "@/types/dataset";
import { Search } from "lucide-react";

interface LeftPanelProps {
  dataset: DataSet;
}

export function LeftPanel({ dataset }: LeftPanelProps) {
  return (
    <aside className="flex w-[175px] shrink-0 flex-col gap-1.5">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
        <Search size={11} aria-hidden />
        <span>search…</span>
      </div>
      <div className="flex-1 overflow-hidden rounded-lg border border-border bg-card p-2 text-xs text-muted-foreground">
        MSR list placeholder · {dataset.msrItems.length} items
      </div>
      <button
        type="button"
        disabled
        className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        Draw Selected (0)
      </button>
    </aside>
  );
}
```

- [ ] **Step 4.2: ChartGridArea placeholder 작성**

Create: `src/components/panels/chart-grid-area.tsx`
```typescript
import type { DataSet } from "@/types/dataset";

interface ChartGridAreaProps {
  dataset: DataSet;
}

export function ChartGridArea({ dataset }: ChartGridAreaProps) {
  return (
    <section className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-3 py-2 text-xs text-muted-foreground">
        <span>0 charts shown</span>
        <span className="text-[10px]">chart grid area · placeholder</span>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-1 p-3 text-xs text-muted-foreground">
        <p>Select MSR items in the left panel and press Draw.</p>
        <p className="text-[10px] opacity-60">
          dataset ready: {dataset.chips.length} chips · {dataset.msrItems.length} MSR items
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 4.3: RightPanel placeholder 작성**

Create: `src/components/panels/right-panel.tsx`
```typescript
export function RightPanel() {
  return (
    <aside className="flex w-[140px] shrink-0 flex-col gap-2">
      {[1, 2].map((n) => (
        <div
          key={n}
          className="flex flex-1 flex-col gap-1.5 rounded-lg border border-border bg-card p-2"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-foreground">
            <span>Group {n}</span>
            <span className="text-[10px] font-normal text-muted-foreground">0</span>
          </div>
          <div className="flex flex-1 items-center justify-center rounded border border-dashed border-border text-[10px] text-muted-foreground">
            empty
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              disabled
              className="flex-1 rounded-md bg-primary px-2 py-1.5 text-[10px] font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add
            </button>
            <button
              type="button"
              disabled
              className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-[10px] text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </aside>
  );
}
```

- [ ] **Step 4.4: build 확인**

Run: `cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm build`

Expected: 빌드 성공. 모든 컴포넌트가 RSC로 컴파일.

- [ ] **Step 4.5: commit**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/components/panels && git commit -m "feat(ui): add LeftPanel / ChartGridArea / RightPanel placeholders"
```

---

## Task 5: AppShell + ThemeToggle + page.tsx 교체

**Files:**
- Create: `src/components/theme-toggle.tsx`
- Create: `src/components/app-shell.tsx`
- Modify: `src/components/panels/left-panel.tsx` (ThemeToggle 통합)
- Modify: `src/app/page.tsx` (AppShell 렌더링)

- [ ] **Step 5.1: ThemeToggle 작성**

Create: `src/components/theme-toggle.tsx`
```typescript
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="h-7 rounded-md border border-border bg-secondary" aria-hidden />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex items-center gap-1 rounded-md border border-border bg-secondary p-1">
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={cn(
          "flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-[10px] transition-colors",
          !isDark
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Sun size={10} aria-hidden />
        Light
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={cn(
          "flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-[10px] transition-colors",
          isDark
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Moon size={10} aria-hidden />
        Dark
      </button>
    </div>
  );
}
```

- [ ] **Step 5.2: LeftPanel에 ThemeToggle 통합 (Draw 버튼 위)**

Replace entire content of `src/components/panels/left-panel.tsx`:
```typescript
import type { DataSet } from "@/types/dataset";
import { Search } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface LeftPanelProps {
  dataset: DataSet;
}

export function LeftPanel({ dataset }: LeftPanelProps) {
  return (
    <aside className="flex w-[175px] shrink-0 flex-col gap-1.5">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
        <Search size={11} aria-hidden />
        <span>search…</span>
      </div>
      <div className="flex-1 overflow-hidden rounded-lg border border-border bg-card p-2 text-xs text-muted-foreground">
        MSR list placeholder · {dataset.msrItems.length} items
      </div>
      <ThemeToggle />
      <button
        type="button"
        disabled
        className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        Draw Selected (0)
      </button>
    </aside>
  );
}
```

- [ ] **Step 5.3: AppShell 작성**

Create: `src/components/app-shell.tsx`
```typescript
import type { DataSet } from "@/types/dataset";
import { LeftPanel } from "@/components/panels/left-panel";
import { ChartGridArea } from "@/components/panels/chart-grid-area";
import { RightPanel } from "@/components/panels/right-panel";

interface AppShellProps {
  dataset: DataSet;
}

export function AppShell({ dataset }: AppShellProps) {
  return (
    <div className="flex h-screen gap-2.5 bg-muted/40 p-3">
      <LeftPanel dataset={dataset} />
      <ChartGridArea dataset={dataset} />
      <RightPanel />
    </div>
  );
}
```

- [ ] **Step 5.4: page.tsx 교체 (verification page 제거 + AppShell)**

Replace entire content of `src/app/page.tsx`:
```typescript
import { getDataset } from "@/lib/server/dataset";
import { AppShell } from "@/components/app-shell";

export default function Home() {
  const dataset = getDataset();
  return <AppShell dataset={dataset} />;
}
```

- [ ] **Step 5.5: 전체 검증 — type + lint + build + 회귀 테스트**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && pnpm exec tsc --noEmit && pnpm lint && pnpm build && pnpm test
```

Expected:
- tsc: 에러 없음
- lint: 에러 없음
- build: 성공
- test: 14/14 PASS (회귀 — Plan #1의 데이터 layer 테스트)

- [ ] **Step 5.6: commit**

Run:
```bash
cd c:/Users/KTY/Desktop/Claude/PlotMate && git add src/components/theme-toggle.tsx src/components/app-shell.tsx src/components/panels/left-panel.tsx src/app/page.tsx && git commit -m "feat(ui): integrate AppShell with ThemeToggle in LeftPanel, replace page.tsx"
```

---

## Acceptance Criteria

Plan #2 완료 시점에 다음 모두 성립:

- [ ] `pnpm test` → 14/14 PASS (회귀)
- [ ] `pnpm build` → 빌드 성공
- [ ] `pnpm lint` → clean
- [ ] `git log --oneline` → 최소 12개 commit (Plan #1 7개 + Plan #2 5개)
- [ ] `pnpm dev` → `http://localhost:3000`에서:
  - 3-pane 레이아웃 (좌 175px · 중 가변 · 우 140px) 표시
  - 좌패널: 검색 placeholder + "MSR list placeholder · 20 items" + Theme toggle + 비활성 Draw 버튼
  - 중앙: "0 charts shown" 헤더 + "dataset ready: 18 chips · 20 MSR items" 메시지
  - 우패널: Group 1 / Group 2 (각각 empty dashed zone + 비활성 Add/Delete)
  - Light/Dark 토글이 실시간 동작, 모든 색상이 oklch 토큰을 따라감
  - 데이터 안 보이는 다크모드 이슈 없음 (모든 텍스트가 `text-foreground` / `text-muted-foreground` 사용)

---

## Next Plan Preview

**Plan #3: 좌패널 본격 구현 (검색 + List + Draw)**

- Zustand store (selectedIds, drawnIds, group assignments)
- `MsrList` 컴포넌트 (Priority 정렬, Ctrl/Shift multi-select, drawn dot 표시)
- `SearchBar` (case-insensitive 부분 일치 필터)
- `DrawButton` 동작 + 단축키 (Enter / 더블클릭)
- Vitest + @testing-library/react 셋업 (UI 테스트 추가)
