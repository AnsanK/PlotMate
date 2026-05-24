"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { PlotParams } from "react-plotly.js";

export const Plot: ComponentType<PlotParams> = dynamic(
  () => import("react-plotly.js"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse rounded bg-muted/60" />
    ),
  },
);
