export default function Loading() {
  return (
    <div className="flex h-screen gap-2.5 bg-muted/40 p-3">
      <aside className="flex w-[175px] shrink-0 flex-col gap-1.5">
        <div className="h-8 rounded-lg bg-card animate-pulse" />
        <div className="flex-1 rounded-lg bg-card animate-pulse" />
        <div className="h-7 rounded-md bg-card animate-pulse" />
        <div className="h-10 rounded-xl bg-primary/30 animate-pulse" />
      </aside>
      <section className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="h-3 w-32 rounded bg-muted animate-pulse" />
          <div className="h-3 w-24 rounded bg-muted animate-pulse" />
        </header>
        <div className="flex flex-1 items-center justify-center p-6 text-xs text-muted-foreground">
          데이터 로드 중…
        </div>
      </section>
      <aside className="flex w-[140px] shrink-0 flex-col gap-2">
        <div className="flex-1 rounded-lg bg-card animate-pulse" />
        <div className="flex-1 rounded-lg bg-card animate-pulse" />
      </aside>
    </div>
  );
}
