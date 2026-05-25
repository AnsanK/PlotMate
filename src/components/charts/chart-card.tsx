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

  const { xs, ys, totalN } = useMemo(() => {
    const validChips = chips.filter((c) => !excludedXys.has(c.xy));
    const sampled = sampleIndices(validChips.length, SAMPLE_LIMIT);
    const _xs: number[] = [];
    const _ys: number[] = [];
    for (const i of sampled) {
      const chip = validChips[i];
      const v = msr.values[chip.xy];
      if (v === undefined || v === null || Number.isNaN(v)) continue;
      _xs.push(chip.cd);
      _ys.push(v);
    }
    return { xs: _xs, ys: _ys, totalN: validChips.length };
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
    // When a tool mode is active, drag-release on the chart shouldn't be
    // interpreted as a card click (which would toggle chart-card selection).
    if (toolMode !== "idle") return;
    if (e.shiftKey) {
      dispatch({ type: "rangeChart", id: msr.name, orderedIds: orderedDrawnIds });
    } else {
      dispatch({ type: "toggleChart", id: msr.name, orderedIds: orderedDrawnIds });
    }
  }

  const graphDivRef = useRef<HTMLElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragEndRef = useRef<{ x: number; y: number } | null>(null);
  // Refs to current data so the raw Plotly listener (registered once in
  // handleInitialized) always sees fresh values without re-registering.
  const chipsRef = useRef(chips);
  useEffect(() => {
    chipsRef.current = chips;
  }, [chips]);
  const msrValuesRef = useRef(msr.values);
  useEffect(() => {
    msrValuesRef.current = msr.values;
  }, [msr.values]);
  const excludedXysRef = useRef(excludedXys);
  useEffect(() => {
    excludedXysRef.current = excludedXys;
  }, [excludedXys]);
  const msrNameRef = useRef(msr.name);
  useEffect(() => {
    msrNameRef.current = msr.name;
  }, [msr.name]);

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
      // capture phase + window-level mouseup so Plotly's own handlers don't
      // swallow our coords (capture fires before Plotly's bubble handler;
      // mouseup is bound to window so a release outside the chart still
      // registers an end coord).
      gd.addEventListener("mousedown", onDown, { capture: true });
      window.addEventListener("mouseup", onUp, { capture: true });

      // Bypass react-plotly's onSelected prop (which seems to not wire
      // reliably under plotly.js 3.x) by registering the event directly
      // on the graphDiv. Plotly attaches an .on() method to the div.
      type PlotlyGd = HTMLElement & {
        on?: (event: string, cb: (e: unknown) => void) => void;
        removeListener?: (event: string, cb: (e: unknown) => void) => void;
      };
      const plotlyGd = gd as PlotlyGd;
      const onSelectedRaw = (eventData: unknown) => {
        const ev = eventData as
          | { range?: { x: number[]; y: number[] } }
          | undefined;
        const currentMode = useSelectionStore.getState().toolMode;
        const currentMsr = msrNameRef.current;

        const Plotly = (
          window as {
            Plotly?: {
              relayout: (
                gd: HTMLElement,
                layout: Record<string, unknown>,
              ) => void;
              restyle?: (
                gd: HTMLElement,
                update: Record<string, unknown>,
              ) => void;
            };
          }
        ).Plotly;

        // Always clear the lingering selection rectangle + the per-trace
        // selectedpoints highlight (darker dots) on any path below.
        const clearBox = () => {
          if (!Plotly) return;
          Plotly.relayout(gd, { selections: [] });
          try {
            Plotly.restyle?.(gd, { selectedpoints: null });
          } catch {
            // restyle can throw if there are no traces yet; ignore.
          }
        };

        if (currentMode === "idle" || !ev?.range) {
          clearBox();
          return;
        }

        if (currentMode === "zoom") {
          const start = dragStartRef.current;
          const end = dragEndRef.current;
          if (!Plotly) {
            clearBox();
            return;
          }
          // Determine direction from raw drag coords (fallback: drag-screen
          // start/end might be missing if Plotly captured mousedown; use the
          // range orientation as a fallback signal). Plotly returns range.x
          // as [x0, x1] in data coords where x0 is drag-start. So if x1 < x0
          // we know the user dragged from right to left.
          let isZoomIn: boolean;
          if (start && end) {
            isZoomIn = end.x - start.x > 0 && end.y - start.y > 0;
          } else {
            // Fallback: heuristic on range direction (Plotly may sort, so
            // default to zoom in when we cannot determine direction).
            isZoomIn = true;
          }
          if (isZoomIn) {
            Plotly.relayout(gd, {
              "xaxis.range": ev.range.x,
              "yaxis.range": ev.range.y,
              selections: [],
            });
          } else {
            Plotly.relayout(gd, {
              "xaxis.autorange": true,
              "yaxis.autorange": true,
              selections: [],
            });
          }
          return;
        }

        // delete / deleteAll: walk ALL chips (not just sampled) so the entire
        // selected region is removed, not just the visible subsample.
        const xMin = Math.min(ev.range.x[0], ev.range.x[1]);
        const xMax = Math.max(ev.range.x[0], ev.range.x[1]);
        const yMin = Math.min(ev.range.y[0], ev.range.y[1]);
        const yMax = Math.max(ev.range.y[0], ev.range.y[1]);

        const chipIds = new Set<string>();
        const excluded = excludedXysRef.current;
        const values = msrValuesRef.current;
        for (const chip of chipsRef.current) {
          if (excluded.has(chip.xy)) continue;
          const v = values[chip.xy];
          if (v === undefined || v === null || Number.isNaN(v)) continue;
          if (
            chip.cd >= xMin &&
            chip.cd <= xMax &&
            v >= yMin &&
            v <= yMax
          ) {
            chipIds.add(chip.xy);
          }
        }
        if (chipIds.size === 0) return;

        dispatch({ type: "setBoxSelection", msrName: currentMsr, chipIds });
        if (currentMode === "delete") {
          dispatch({ type: "deletePerChart" });
        } else if (currentMode === "deleteAll") {
          dispatch({ type: "deleteGlobal" });
        }
        if (Plotly) Plotly.relayout(gd, { selections: [] });
      };
      plotlyGd.on?.("plotly_selected", onSelectedRaw);

      (
        gd as HTMLElement & { __plotmateCleanup?: () => void }
      ).__plotmateCleanup = () => {
        gd.removeEventListener("mousedown", onDown, { capture: true });
        window.removeEventListener("mouseup", onUp, { capture: true });
        plotlyGd.removeListener?.("plotly_selected", onSelectedRaw);
      };
    },
    [msr.name, dispatch],
  );

  // (handleSelected via Plot prop is bypassed because react-plotly's onSelected
  // wiring is unreliable under plotly.js 3.x. The raw plotly_selected listener
  // attached inside handleInitialized handles everything.)

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
          />
        ) : (
          <div className="h-full w-full animate-pulse rounded bg-muted/60" />
        )}
      </div>
    </div>
  );
}
