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
