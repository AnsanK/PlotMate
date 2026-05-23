"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { PlotParams } from "react-plotly.js";

export const Plot: ComponentType<PlotParams> = dynamic(
  () => import("react-plotly.js"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
        loading chart…
      </div>
    ),
  },
);
