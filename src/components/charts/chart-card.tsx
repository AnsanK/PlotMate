"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Chip, MsrItem } from "@/types/dataset";
import type { ToolMode } from "@/lib/selection/reducer";
import { useSelectionStore } from "@/lib/store/selection-store";
import { linearRegression } from "@/lib/stats/regression";
import { sampleIndices } from "@/lib/stats/downsample";
import { cn } from "@/lib/utils";
import { Plot } from "@/components/charts/plotly-loader";
import { useInViewport } from "@/lib/hooks/use-in-viewport";
import type { Data, Layout } from "plotly.js";

const SAMPLE_LIMIT = 500;

interface ChartCardProps {
  msr: MsrItem;
  chips: Chip[];
  orderedDrawnIds: string[];
}

export function ChartCard({ msr, chips, orderedDrawnIds }: ChartCardProps) {
  const selectedChartIds = useSelectionStore((s) => s.selectedChartIds);
  const dispatch = useSelectionStore((s) => s.dispatch);
  const globallyDeleted = useSelectionStore((s) => s.globallyDeletedChipIds);
  const perChartDeletedMap = useSelectionStore((s) => s.perChartDeletedChipIds);
  const toolMode: ToolMode = useSelectionStore((s) => s.toolMode);
  const isSelected = selectedChartIds.has(msr.name);
  const { ref, inViewport } = useInViewport<HTMLDivElement>();

  const excludedXys = useMemo(() => {
    const merged = new Set<string>(globallyDeleted);
    const own = perChartDeletedMap.get(msr.name);
    if (own) for (const id of own) merged.add(id);
    return merged;
  }, [globallyDeleted, perChartDeletedMap, msr.name]);

  const { xs, ys, totalN, plottedChips } = useMemo(() => {
    const validChips = chips.filter((c) => !excludedXys.has(c.xy));
    const sampled = sampleIndices(validChips.length, SAMPLE_LIMIT);
    const _xs: number[] = [];
    const _ys: number[] = [];
    const _plotted: typeof chips = [];
    for (const i of sampled) {
      const chip = validChips[i];
      const v = msr.values[chip.xy];
      if (v === undefined || v === null || Number.isNaN(v)) continue;
      _xs.push(chip.cd);
      _ys.push(v);
      _plotted.push(chip);
    }
    return { xs: _xs, ys: _ys, totalN: validChips.length, plottedChips: _plotted };
  }, [chips, msr, excludedXys]);

  const reg = useMemo(() => linearRegression(xs, ys), [xs, ys]);

  const trendline = useMemo(() => {
    if (xs.length < 2 || Number.isNaN(reg.slope)) return null;
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    return {
      x: [xMin, xMax],
      y: [reg.slope * xMin + reg.intercept, reg.slope * xMax + reg.intercept],
    };
  }, [xs, reg]);

  const data: Data[] = useMemo(() => {
    const traces: Data[] = [
      {
        type: "scatter",
        mode: "markers",
        x: xs,
        y: ys,
        marker: { size: 5, color: "rgb(63, 63, 70)" },
        hovertemplate: "CD=%{x}<br>val=%{y}<extra></extra>",
        name: msr.name,
      },
    ];
    if (trendline) {
      traces.push({
        type: "scatter",
        mode: "lines",
        x: trendline.x,
        y: trendline.y,
        line: { color: "rgb(124, 58, 237)", width: 1.5, dash: "dash" },
        hoverinfo: "skip",
        showlegend: false,
      });
    }
    return traces;
  }, [xs, ys, trendline, msr.name]);

  const layout: Partial<Layout> = useMemo(
    () => ({
      autosize: true,
      margin: { l: 28, r: 8, t: 6, b: 22 },
      showlegend: false,
      xaxis: {
        title: { text: "CD", font: { size: 9 } },
        tickfont: { size: 8 },
        gridcolor: "rgba(0,0,0,0.05)",
        zeroline: false,
      },
      yaxis: {
        tickfont: { size: 8 },
        gridcolor: "rgba(0,0,0,0.05)",
        zeroline: false,
      },
      dragmode: toolMode === "idle" ? false : "select",
      hoverlabel: { font: { size: 10 } },
    }),
    [toolMode],
  );

  const corrText =
    (reg.r >= 0 ? "+" : "") +
    (Number.isNaN(reg.r) ? "—" : reg.r.toFixed(3));

  function handleSelect(e: { shiftKey: boolean }) {
    if (e.shiftKey) {
      dispatch({ type: "rangeChart", id: msr.name, orderedIds: orderedDrawnIds });
    } else {
      dispatch({ type: "toggleChart", id: msr.name, orderedIds: orderedDrawnIds });
    }
  }

  const graphDivRef = useRef<HTMLElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragEndRef = useRef<{ x: number; y: number } | null>(null);

  const handleInitialized = useCallback(
    (_figure: unknown, gd: HTMLElement) => {
      graphDivRef.current = gd;
      dispatch({ type: "setChartReady", id: msr.name, ready: true });

      const onDown = (e: MouseEvent) => {
        dragStartRef.current = { x: e.clientX, y: e.clientY };
      };
      const onUp = (e: MouseEvent) => {
        dragEndRef.current = { x: e.clientX, y: e.clientY };
      };
      gd.addEventListener("mousedown", onDown);
      gd.addEventListener("mouseup", onUp);
      (gd as HTMLElement & { __plotmateCleanup?: () => void }).__plotmateCleanup = () => {
        gd.removeEventListener("mousedown", onDown);
        gd.removeEventListener("mouseup", onUp);
      };
    },
    [msr.name, dispatch],
  );

  // Read tool mode via store.getState() inside callback to avoid stale closure
  // (react-plotly may keep an initial-mount handler reference and not re-wire
  // when our memoized callback identity changes).
  const handleSelected = useCallback(
    (
      event:
        | {
            points?: { pointIndex?: number; pointNumber?: number }[];
            range?: { x: number[]; y: number[] };
          }
        | undefined,
    ) => {
      const currentMode = useSelectionStore.getState().toolMode;
      if (currentMode === "idle") return;

      if (currentMode === "zoom") {
        const start = dragStartRef.current;
        const end = dragEndRef.current;
        if (!start || !end || !event?.range) return;

        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const isZoomIn = dx > 0 && dy > 0;

        const Plotly = (
          window as {
            Plotly?: {
              relayout: (gd: HTMLElement, layout: Record<string, unknown>) => void;
            };
          }
        ).Plotly;
        const gd = graphDivRef.current;
        if (!Plotly || !gd) return;

        if (isZoomIn) {
          Plotly.relayout(gd, {
            "xaxis.range": event.range.x,
            "yaxis.range": event.range.y,
          });
        } else {
          Plotly.relayout(gd, {
            "xaxis.autorange": true,
            "yaxis.autorange": true,
          });
        }
        return;
      }

      if (!event?.points || event.points.length === 0) return;

      const chipIds = new Set<string>();
      for (const p of event.points) {
        const idx = p.pointIndex ?? p.pointNumber;
        if (idx === undefined) continue;
        const chip = plottedChips[idx];
        if (chip) chipIds.add(chip.xy);
      }
      if (chipIds.size === 0) return;

      dispatch({ type: "setBoxSelection", msrName: msr.name, chipIds });
      if (currentMode === "delete") {
        dispatch({ type: "deletePerChart" });
      } else if (currentMode === "deleteAll") {
        dispatch({ type: "deleteGlobal" });
      }

      // Clear the lingering selection box drawn by Plotly so the user sees
      // the deletion immediately rather than the stale rectangle.
      const Plotly = (
        window as {
          Plotly?: {
            relayout: (gd: HTMLElement, layout: Record<string, unknown>) => void;
          };
        }
      ).Plotly;
      const gd = graphDivRef.current;
      if (Plotly && gd) {
        Plotly.relayout(gd, { selections: [] });
      }
    },
    [dispatch, msr.name, plottedChips],
  );

  // Force Plotly to re-apply dragmode when toolMode changes -- react-plotly's
  // own diff doesn't always re-call relayout on layout-object identity change.
  useEffect(() => {
    const Plotly = (
      window as {
        Plotly?: {
          relayout: (gd: HTMLElement, layout: Record<string, unknown>) => void;
        };
      }
    ).Plotly;
    const gd = graphDivRef.current;
    if (!Plotly || !gd) return;
    Plotly.relayout(gd, {
      dragmode: toolMode === "idle" ? false : "select",
    });
  }, [toolMode]);

  useEffect(() => {
    return () => {
      dispatch({ type: "setChartReady", id: msr.name, ready: false });
      const gd = graphDivRef.current as
        | (HTMLElement & { __plotmateCleanup?: () => void })
        | null;
      gd?.__plotmateCleanup?.();
    };
  }, [msr.name, dispatch]);

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={handleSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleSelect(e);
        }
      }}
      className={cn(
        "flex min-h-0 cursor-pointer flex-col gap-1 rounded-md border bg-card p-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-selection-strong",
        isSelected
          ? "border-selection-strong ring-2 ring-selection-strong"
          : "border-border hover:border-selection-strong/60",
      )}
    >
      <header className="flex shrink-0 items-center justify-between text-[10px] text-muted-foreground">
        <span className="font-medium text-foreground">{msr.name}</span>
        <span className="font-semibold tabular-nums text-selection-fg">
          r={corrText} · n={reg.n}
          {totalN > reg.n && (
            <span className="text-muted-foreground/70"> of {totalN}</span>
          )}
        </span>
      </header>
      <div className="min-h-0 flex-1">
        {inViewport ? (
          <Plot
            data={data}
            layout={layout}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: "100%" }}
            useResizeHandler
            onInitialized={handleInitialized}
            onSelected={handleSelected}
          />
        ) : (
          <div className="h-full w-full animate-pulse rounded bg-muted/60" />
        )}
      </div>
    </div>
  );
}
