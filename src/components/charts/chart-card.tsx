"use client";

import { useMemo } from "react";
import type { Chip, MsrItem } from "@/types/dataset";
import { useSelectionStore } from "@/lib/store/selection-store";
import { linearRegression } from "@/lib/stats/regression";
import { cn } from "@/lib/utils";
import { Plot } from "@/components/charts/plotly-loader";
import type { Data, Layout } from "plotly.js";

interface ChartCardProps {
  msr: MsrItem;
  chips: Chip[];
  orderedDrawnIds: string[];
}

export function ChartCard({ msr, chips, orderedDrawnIds }: ChartCardProps) {
  const selectedChartIds = useSelectionStore((s) => s.selectedChartIds);
  const dispatch = useSelectionStore((s) => s.dispatch);
  const isSelected = selectedChartIds.has(msr.name);

  const { xs, ys } = useMemo(() => {
    const _xs: number[] = [];
    const _ys: number[] = [];
    for (const chip of chips) {
      const v = msr.values[chip.xy];
      if (v === undefined || v === null || Number.isNaN(v)) continue;
      _xs.push(chip.cd);
      _ys.push(v);
    }
    return { xs: _xs, ys: _ys };
  }, [chips, msr]);

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
      dragmode: false,
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

  return (
    <div
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
        </span>
      </header>
      <div className="min-h-0 flex-1">
        <Plot
          data={data}
          layout={layout}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: "100%", height: "100%" }}
          useResizeHandler
        />
      </div>
    </div>
  );
}
