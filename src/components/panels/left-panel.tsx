"use client";

import { useEffect } from "react";
import type { DataSet } from "@/types/dataset";
import { ThemeToggle } from "@/components/theme-toggle";
import { SearchBar } from "@/components/panels/search-bar";
import { MsrList } from "@/components/panels/msr-list";
import { DrawButton } from "@/components/panels/draw-button";
import { useSelectionStore } from "@/lib/store/selection-store";

interface LeftPanelProps {
  dataset: DataSet;
}

export function LeftPanel({ dataset }: LeftPanelProps) {
  const dispatch = useSelectionStore((s) => s.dispatch);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const drawnIds = useSelectionStore((s) => s.drawnIds);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        dispatch({ type: "clearSelection" });
        return;
      }
      if (e.key === "Enter") {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName.toLowerCase();
        if (tag === "input" || tag === "textarea") return;
        const hasNew = [...selectedIds].some((id) => !drawnIds.has(id));
        if (hasNew) dispatch({ type: "draw" });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, selectedIds, drawnIds]);

  return (
    <aside className="flex w-[175px] shrink-0 flex-col gap-1.5">
      <SearchBar />
      <MsrList items={dataset.msrItems} />
      <ThemeToggle />
      <DrawButton />
    </aside>
  );
}
