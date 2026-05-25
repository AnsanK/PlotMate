# PlotMate

반도체 wafer raw data에서 **CD ↔ MSR 상관계수(Priority) 기반으로 차트를 자동 큐레이션**하는 로컬 웹 툴.

한 wafer는 수백~수천 chip, 각 chip은 수천 MSR item을 가져 raw 컬럼만 ~2000개. 사람이 모든 조합을 시각화·검토하는 건 불가능 → Priority 정렬 + 다중 채택 워크플로가 핵심.

## 핵심 워크플로

```
좌패널: 검색 + Priority 정렬 List + 다중 선택 + Draw
   ↓
중앙: 4×3 차트 그리드 (Plotly scatter + 추세선 + r/n)
   ↓ 차트 카드 클릭으로 multi-select
우패널: Insights (데이터 채택) / Essential (도메인 필수) → Add → Delete
   ↓ outlier 영역 drag → 삭제 / 전체삭제 / Zoom (toolbar)
Export: 3-sheet xlsx (Raw / Insights / Essential, deleted chip은 공란)
```

## 시작

```bash
pnpm install
pnpm dev
# http://localhost:3000
```

테스트 / 빌드 / lint:
```bash
pnpm test     # vitest run
pnpm build    # next build
pnpm lint     # eslint
```

## 스택

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind v4** + shadcn UI 베이스 + lucide-react
- **Plotly.js 3.5** + react-plotly.js (scatter, dynamic loader)
- **Zustand 5** (selection / drawn / groups / deleted slice)
- **xlsx** (SheetJS) — 데이터 파싱 + export workbook
- **Vitest** — reducer / filter / regression / downsample / export TDD

## 디렉토리

```
src/
├── app/                  # Next.js App Router (layout, page, loading)
├── components/
│   ├── app-shell.tsx     # 3-pane 컨테이너
│   ├── panels/           # LeftPanel / ChartGridArea / RightPanel + ExportButton
│   └── charts/           # ChartCard + ChartToolbar + plotly-loader
├── lib/
│   ├── data/             # parseChips / parsePivoted / loadDataset
│   ├── server/           # getDataset (server-only, cached)
│   ├── selection/        # reducer + filter (pure logic, TDD)
│   ├── store/            # Zustand store
│   ├── stats/            # linearRegression + downsample sampleIndices
│   ├── export/           # buildExportWorkbook (3-sheet xlsx)
│   └── hooks/            # useInViewport (IntersectionObserver)
├── types/                # Chip, MsrItem, DataSet
dummy_data/               # 3000 chip × 100 MSR fixture (xlsx)
docs/superpowers/         # specs + plans (작업 history)
```

## 데이터 모델

| 파일 | 내용 |
|---|---|
| `dummy_data/raw_data_chips.xlsx` | chip 메타 + CD (3000 chip × 7 컬럼) |
| `dummy_data/raw_data_pivoted.xlsx` | MSR × chip 피벗 (100 MSR × 3000 chip 값, Priority 정렬) |
| `dummy_data/raw_data_template.xlsx` | P1 원본 (참고용, 코드 미사용) |

데이터는 server-side `getDataset()` (`src/lib/server/dataset.ts`)에서 한 번 파싱 + 캐싱 후 RSC 통해 클라이언트 전달.

## 상태 모델

Zustand store(`src/lib/store/selection-store.ts`)의 주요 slice:

| Slice | 의미 |
|---|---|
| `selectedIds` / `lastClickedId` | List 다중 선택 marking |
| `drawnIds` | 중앙 차트로 그려진 항목 (Draw 시 selectedIds로 *교체*) |
| `selectedChartIds` / `lastClickedChartId` | 중앙 카드 multi-select |
| `group1Ids` / `group2Ids` | Insights / Essential 그룹 |
| `selectedInGroup1Ids` / `selectedInGroup2Ids` | 그룹 내 multi-select |
| `readyChartIds` | Plotly mount 완료 카드 |
| `toolMode` | `idle` / `delete` / `deleteAll` / `zoom` |
| `currentBoxSelection` / `globallyDeletedChipIds` / `perChartDeletedChipIds` / `deleteHistory` | toolbar 액션 상태 |

상태 전이는 `src/lib/selection/reducer.ts`의 pure `applyAction()`이 처리 (TDD, 89 tests).

## 작업 history

`docs/superpowers/specs/`에 UI/UX spec, `docs/superpowers/plans/`에 단계별 plan 문서. 8 plan으로 단계 빌드:

1. Bootstrap + 데이터 로딩
2. UI shell + Sensorpia 디자인 토큰
3. 좌패널 (검색 + List + Draw)
4. 중앙 차트 그리드 + Plotly
5. 우패널 그룹 워크플로
6. 성능 (skeleton + IntersectionObserver + 다운샘플링)
7. 차트 toolbar (삭제 / 전체삭제 / Zoom / 되돌리기 / 초기화)
8. 데이터 export

## 미정 사항 / 향후 작업

- **데이터 entry**: 현재 dummy_data 자동 로드. 최종 목표는 Sensorpia에서 push (프로토콜 미정 — REST / iframe / postMessage 검토)
- **다크모드 차트**: Plotly gridcolor 등 라이트 기준
- **그룹 라벨 rename** (현재 Insights / Essential 고정)
- **그룹 비교 통계** (t-test, Cohen's d) — Sensorpia statistics.ts 차용 후보
