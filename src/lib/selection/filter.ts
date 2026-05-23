export function matchesQuery(name: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return true;
  return name.toLowerCase().includes(q);
}
