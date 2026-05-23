---
title: PlotMate UI/UX Design Spec
date: 2026-05-23
status: draft
scope: UI/UX only — data model, storage, transport는 명시적으로 out of scope
---

# PlotMate UI/UX Design Spec

## 1. 목적 & Scope

PlotMate는 반도체 wafer raw data에서 **CD ↔ MSR 상관계수(Priority) 기반으로 차트를 자동 큐레이션**하는 로컬 웹 툴이다. 한 wafer는 수백~수천 chip, 각 chip은 수천 MSR item을 가져 raw 컬럼만 ~2000개. 사람이 모든 조합을 시각화·검토하는 건 불가능 → Priority 정렬 + 다중 채택 워크플로가 핵심.

본 spec은 **UI/UX 디자인 결정만** 다룬다. 명시적 out of scope:

- 데이터 모델/스키마 (기존 `dummy_data/` 기준)
- 저장소 (SQLite vs DuckDB vs in-memory)
- 데이터 로딩 entry point
- Sensorpia ↔ PlotMate 통신 프로토콜
- 백엔드 API 설계

## 2. 디자인 톤 & 토큰

**기준**: [Sensorpia](C:/Users/KTY/Desktop/Claude/Claude%20host/sensorpia/) 디자인 톤 동일성 유지 (선택 결과: **Direction A — Pure Sensorpia**).

| 토큰 | 값 | 비고 |
|---|---|---|
| 컬러 베이스 | `oklch` 무채색 (zinc 50~950) | 라이트/다크 모두 |
| 액센트 | violet (#7c3aed / oklch violet-600) | Sensorpia 로고/배지와 동일 |
| 다크모드 | `next-themes` 토글 | 좌패널 하단 |
| Radius | `--radius: 0.625rem` | sm/md/lg/xl 파생 |
| 타이포 | text-xs / text-sm, 컴팩트 | tracking-tight 헤더 |
| 폰트 | Geist (Sensorpia 동일) | sans + mono |
| Border | zinc-200 / zinc-800 | 라이트/다크 |
| Shadow | shadow-sm 기본 | primary 버튼만 그림자 |

**스택**: Next.js 16 + React 19 + TypeScript / Tailwind v4 + shadcn UI + lucide-react / Plotly.js v3.5 (scattergl 권장) / Zustand 상태.

## 3. 전체 레이아웃

3-pane flex 레이아웃 (`flex h-screen`, gap 10px, container padding 12px):

| 영역 | 너비 | 내용 |
|---|---|---|
| 좌패널 | 175px (flex-shrink-0) | 검색 + List + Draw 버튼 |
| 중앙 | flex:1 (~73%) | 3×3 차트 그리드 + 스크롤 |
| 우패널 | 140px (flex-shrink-0) | Group 1 + Group 2 |

좌·우 sticky width, 중앙만 가변. mockup 참고: `.superpowers/brainstorm/1000-1779524371/content/02-layout-revised.html`.

## 4. 좌패널

### 4.1 검색기
- 상단 input: `bg-zinc-100/zinc-800`, `border-zinc-200/zinc-700`, rounded-lg, padding `px-3 py-2`
- placeholder: `"search…"` + 좌측 lucide `Search` 아이콘 (size 11)
- **매칭 규칙**: case-insensitive, 부분 일치 (예: `ms0009` → `MSR0009`)
- 입력 시 실시간 필터링 (in-memory, debounce 불필요)
- 검색어 비었으면 전체 표시
- **검색 대상에서 제외**: Group 1·Group 2에 들어간 항목

### 4.2 MSR Item List
- **정렬**: Priority 오름차순 (= |r| 내림차순) **항상 고정**
- **한 행 표시**: `[P1] MSR0009  +0.918`
  - Priority: `text-zinc-400 text-[10px] font-medium`, 좌측
  - 이름: `text-zinc-700 dark:text-zinc-200`
  - r 값: `text-violet-600 dark:text-violet-400 font-semibold tabular-nums`, 우측 정렬, 부호 그대로
- **상호작용**:
  - Hover: `bg-zinc-50/zinc-800`
  - Selected (Draw 후보 marking): `bg-violet-50 dark:bg-violet-950/40`
  - Drawn (중앙에 차트 존재): 행 좌측에 작은 violet dot (`h-1.5 w-1.5 rounded-full bg-violet-500`). 행 배경은 idle과 동일
  - Selected + Drawn 동시 가능: dot + violet bg
- **클릭 정책**:
  - 단일 클릭: 다른 선택 해제하고 이 항목만 선택
  - Ctrl+클릭: 토글
  - Shift+클릭: 마지막 클릭 ~ 현재 사이 범위 토글
- **Group 이동**: 그룹에 들어간 항목은 List에서 사라짐 (검색에도 안 나옴). Delete 시 List(drawn) 상태로 복원.

### 4.3 Draw 버튼 (하단 sticky)
- `bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl py-2.5`, full width, font-semibold
- 라벨: `Draw Selected (N)` — N은 selected 카운트
- N=0 → disabled (`opacity-50 cursor-not-allowed`)
- 단축키:
  - List 포커스 시 `Enter` = Draw 트리거
  - List 행 더블클릭 = 그 한 항목만 빠른 Draw (multi-select 무시)
- 동작: Selected 중 아직 안 그려진 항목만 중앙 그리드에 카드 추가, Drawn 항목은 skip

## 5. 중앙 — 차트 그리드

### 5.1 컨테이너
- `bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden`
- **상단 헤더 row** (~28px): `{N} charts shown · {M} selected` (zinc-500) + 우측 `scroll for more` 힌트 (M=0이면 selected 부분 숨김)
- **본문**: CSS grid `grid-template-columns:repeat(3,1fr); grid-template-rows:repeat(3,1fr); gap:6px; padding:8px`
- 9개 초과 시 세로 스크롤, 우측에 얇은 스크롤바 (4px width, zinc-300/zinc-600)

### 5.2 차트 카드
- 컨테이너: `bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md p-2`
- **헤더 row** (~16px):
  - `{MSR이름} · r=+0.918 · n=18`
  - MSR 이름: `text-zinc-700 font-medium`
  - r 값: `text-violet-600 font-semibold tabular-nums`
  - n: `text-zinc-500`
- **차트 body**: Plotly `scattergl` (성능). X=CD, Y=MSR. 점 색 `zinc-700/zinc-300`. 추세선 default ON (violet, dashed).
- **Selected** (Add 후보 marking): `ring-2 ring-violet-500 border-violet-500`
- **카드 클릭 정책**:
  - 단일 클릭: 토글 (Ctrl 불필요 — 차트 영역 클릭은 본질적으로 multi-select 의도)
  - Shift+클릭: 카드 사이 범위 토글
  - 카드 내부 Plotly modebar 클릭은 select 트리거 X (이벤트 차단)

### 5.3 차트 카드 Toolbar
Sensorpia [ChartBlock](C:/Users/KTY/Desktop/Claude/Claude%20host/sensorpia/src/components/charts/ChartBlock.tsx) 패턴 차용. 카드 hover/focus 시 우상단에 표시:

| 버튼 | 동작 | 비고 |
|---|---|---|
| 추세선 toggle | 회귀 직선 on/off | default ON |
| 점 삭제 | lasso/click으로 outlier 제거 | 삭제된 점은 회색 처리 후 r·n 재계산 |
| Undo | 점 삭제 직전 상태 복원 | stack 기반 |
| Reset | 모든 점 삭제 + 줌 원복 | 확인 prompt 없음 |
| 통계 모달 | 회귀 통계 (r, r², slope, intercept, p-value, n) | Sensorpia `regression.ts` 재사용. 그룹 비교 통계(t-test 등)는 후속 spec |
| Plotly modebar | 줌·Pan·다운로드 | 기본 |

## 6. 우패널 — Group 1 / Group 2

**원칙**: 두 그룹은 **별개의 동등한 채택 묶음** (의미 구분 없음). 한 MSR Item은 동시에 두 그룹에 존재 불가 (mutually exclusive).

### 6.1 그룹 카드 구조
- 외곽: `bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2`, 두 그룹 세로 `flex:1`로 균등 분할, 사이 gap 8px
- **헤더 row**: `Group 1` (font-semibold text-zinc-900) + 우측에 카운트 (text-zinc-400 font-normal)
- **본문**:
  - 비었을 때: `border-dashed border-zinc-200/zinc-800` + 가운데 "empty" 텍스트 (zinc-400)
  - 항목 있을 때: List와 동일 표시 규칙 (`[P1] MSR0009  +0.918`), 동일한 클릭 정책 (Ctrl/Shift multi-select)
- **하단 버튼 row** (gap 4px):
  - **Add**: `bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 py-1.5 rounded-md font-medium`, flex:1
  - **Delete**: `bg-white dark:bg-transparent border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 py-1.5 rounded-md`, flex:1

### 6.2 동작
- **Add**: 중앙 그리드의 selected 차트들을 이 그룹으로 이동
  - 중앙 그리드에서 카드 제거
  - 좌측 List에서도 제거 (검색 결과에 안 나옴)
  - 그룹 내부에 행 추가
  - 한 차트는 한 그룹에만 속함 (§ 10 엣지 케이스 참조)
- **Delete**: 그룹 내부 selected 항목 제거 → **List(drawn) 상태로 복원**
  - 좌패널 List에 다시 등장 (Priority 위치 그대로)
  - 중앙 그리드에 차트도 자동 재생성 (이전 점 삭제 상태는 잃음 — 새로 그림)
  - Selected 0개일 때 Delete = 무동작

## 7. 상태 모델

각 MSR Item은 항상 4가지 영속 상태 중 **정확히 하나**:

```
List(idle) ──Draw──> List(drawn)
List(drawn) ──Add G1──> Group1
List(drawn) ──Add G2──> Group2
Group1 ──Delete──> List(drawn)   (List 복귀 + 중앙 차트 자동 재생성)
Group2 ──Delete──> List(drawn)
```

UI 일시적 marking (영속 X, 영속 상태와 직교):
- **selected** — List·중앙 카드·Group 내부 어디서든 multi-select marking. 각 영역별로 독립적 marking. Esc로 전체 해제.

## 8. 키보드 & 단축키

| 키 | 컨텍스트 | 동작 |
|---|---|---|
| Ctrl+클릭 | List · Group | 단일 항목 toggle |
| Shift+클릭 | List · 차트 카드 · Group | 범위 토글 |
| 단일 클릭 | 차트 카드 | toggle (Ctrl 없이) |
| Enter | List 포커스 | Selected Draw |
| 더블클릭 | List 행 | 단일 빠른 Draw |
| Esc | 전체 | 모든 selected 해제 |

## 9. 다크모드

Sensorpia [globals.css](C:/Users/KTY/Desktop/Claude/Claude%20host/sensorpia/src/app/globals.css)의 `oklch` 토큰 페어 차용. `next-themes` 기반, 좌패널 하단 Light/Dark 토글 (Sensorpia [NavSidebar](C:/Users/KTY/Desktop/Claude/Claude%20host/sensorpia/src/components/layout/NavSidebar.tsx) 패턴 동일).

다크모드 차트:
- 배경: `bg-zinc-950`
- 점: `zinc-300`
- 추세선: `violet-400`
- 격자: `zinc-800`

## 10. 엣지 케이스

| 케이스 | 동작 |
|---|---|
| 검색 결과 0개 | 중앙에 "검색 결과 없음" + zinc-400 메시지 (Sensorpia NavSidebar 빈 상태 패턴) |
| Selected 0개 + Draw 클릭 | 버튼 disabled, 클릭 무동작 |
| Drawn 항목 다시 Draw | 무동작 + 중앙의 해당 카드로 자동 스크롤 + 카드 short flash (200ms violet ring) |
| Group 비었는데 Delete | Delete 버튼 disabled |
| 데이터 로딩 중 | 좌·중·우 모두 skeleton placeholder |
| 데이터 로딩 실패 | 중앙에 에러 메시지 + Retry 버튼 |
| 한 MSR을 두 그룹에 동시 Add 시도 | 첫 Add 후 List에서 사라지므로 두 번째 Add 자체가 불가능 (자연스럽게 차단) |
| 9개 초과 차트 | 세로 스크롤, 헤더에 N count 동적 업데이트 |
| 모든 항목이 그룹에 들어감 | List는 비고 "모든 항목이 채택됨" 메시지 (zinc-400) |

## 11. 미결정 / 추후 결정

UI/UX 측면에선 결정 완료. 다음은 후속 spec에서 다룰 항목:

- **데이터 로딩 entry point** — 파일 업로드 / 사전 경로 / Sensorpia push 중 결정 필요. 첫 진입 시 `Loading…` placeholder + 추후 결정된 메커니즘으로 데이터 주입
- **Group 라벨 rename** — 현재 "Group 1", "Group 2" 고정. 사용자가 의미 부여하고 싶을 때 추가 (YAGNI)
- **차트 export** — Group의 채택 차트를 이미지/Excel로 export (최종 산출물 흐름)
- **wafer map 시각화** — chip_x/chip_y 좌표로 wafer overlay 차트 (PlotMate 메모리에 미결정 사항)
- **차트 그리드 size 옵션** — 3×3 외에 2×2 / 4×4 토글 (필요 시)
- **그룹 비교 통계** — 두 그룹 간 평균/분산 비교 (t-test, Cohen's d 등). Sensorpia `statistics.ts` 재사용 가능

## 12. 참고 자료

**Sensorpia 핵심 파일** (코드/패턴 재사용):
- 3-pane 레이아웃: [src/components/chat/ChatPage.tsx](C:/Users/KTY/Desktop/Claude/Claude%20host/sensorpia/src/components/chat/ChatPage.tsx)
- 사이드바 패턴: [src/components/layout/NavSidebar.tsx](C:/Users/KTY/Desktop/Claude/Claude%20host/sensorpia/src/components/layout/NavSidebar.tsx)
- 차트 래퍼: [src/components/charts/ChartBlock.tsx](C:/Users/KTY/Desktop/Claude/Claude%20host/sensorpia/src/components/charts/ChartBlock.tsx)
- 통계: [src/lib/charts/statistics.ts](C:/Users/KTY/Desktop/Claude/Claude%20host/sensorpia/src/lib/charts/statistics.ts), [regression.ts](C:/Users/KTY/Desktop/Claude/Claude%20host/sensorpia/src/lib/charts/regression.ts)
- 디자인 토큰: [src/app/globals.css](C:/Users/KTY/Desktop/Claude/Claude%20host/sensorpia/src/app/globals.css)

**PlotMate 더미 데이터**:
- [dummy_data/raw_data_chips.xlsx](../../../dummy_data/raw_data_chips.xlsx) — chip 메타 + CD
- [dummy_data/raw_data_pivoted.xlsx](../../../dummy_data/raw_data_pivoted.xlsx) — MSR × chip 피벗 + Priority

**시각 mockup**: `.superpowers/brainstorm/1000-1779524371/content/02-layout-revised.html`
