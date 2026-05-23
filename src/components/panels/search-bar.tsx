"use client";

import { Search } from "lucide-react";
import { useSelectionStore } from "@/lib/store/selection-store";

export function SearchBar() {
  const searchQuery = useSelectionStore((s) => s.searchQuery);
  const setSearchQuery = useSelectionStore((s) => s.setSearchQuery);

  return (
    <label className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/40">
      <Search size={11} aria-hidden />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="search…"
        className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
    </label>
  );
}
