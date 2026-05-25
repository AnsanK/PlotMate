"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Chip, MsrItem } from "@/types/dataset";
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
      dragmode: "zoom",
      hoverlabel: { font: { size: 10 } },
    }),
    [],
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

  const handleInitialized = useCallback(
    (_figure: unknown, gd: HTMLElement) => {
      graphDivRef.current = gd;
      dispatch({ type: "setChartReady", id: msr.name, ready: true });

      // Shift+drag → dynamic relayout to box select; mouseup restores zoom.
      // window.Plotly is exposed globally by plotly.js when react-plotly.js loads it.
      const getPlotly = (): { relayout: (gd: HTMLElement, layout: Record<string, unknown>) => void } | undefined =>
        (window as unknown as { Plotly?: { relayout: (gd: HTMLElement, layout: Record<string, unknown>) => void } }).Plotly;
      const onDown = (e: MouseEvent) => {
        const Plotly = getPlotly();
        if (!Plotly) return;
        if (e.shiftKey) {
          Plotly.relayout(gd, { dragmode: "select" });
        }
      };
      const onUp = () => {
        const Plotly = getPlotly();
        if (!Plotly) return;
        Plotly.relayout(gd, { dragmode: "zoom" });
      };
      gd.addEventListener("mousedown", onDown);
      window.addEventListener("mouseup", onUp);
      // Stash cleanup on the graphDiv so the unmount effect can run it.
      (gd as HTMLElement & { __plotmateCleanup?: () => void }).__plotmateCleanup = () => {
        gd.removeEventListener("mousedown", onDown);
        window.removeEventListener("mouseup", onUp);
      };
    },
    [msr.name, dispatch],
  );

  const handleSelected = useCallback(
    (event: { points?: { pointIndex: number }[] } | undefined) => {
      if (!event?.points || event.points.length === 0) {
        dispatch({ type: "setBoxSelection", msrName: msr.name, chipIds: new Set() });
        return;
      }
      const chipIds = new Set<string>();
      for (const p of event.points) {
        const chip = plottedChips[p.pointIndex];
        if (chip) chipIds.add(chip.xy);
      }
      dispatch({ type: "setBoxSelection", msrName: msr.name, chipIds });
    },
    [dispatch, msr.name, plottedChips],
  );

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
