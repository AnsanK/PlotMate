export function RightPanel() {
  return (
    <aside className="flex w-[140px] shrink-0 flex-col gap-2">
      {[1, 2].map((n) => (
        <div
          key={n}
          className="flex flex-1 flex-col gap-1.5 rounded-lg border border-border bg-card p-2"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-foreground">
            <span>Group {n}</span>
            <span className="text-[10px] font-normal text-muted-foreground">0</span>
          </div>
          <div className="flex flex-1 items-center justify-center rounded border border-dashed border-border text-[10px] text-muted-foreground">
            empty
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              disabled
              className="flex-1 rounded-md bg-primary px-2 py-1.5 text-[10px] font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add
            </button>
            <button
              type="button"
              disabled
              className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-[10px] text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </aside>
  );
}
