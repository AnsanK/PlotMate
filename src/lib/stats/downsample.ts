function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic random sample of indices from [0, n).
 * Returns `n` indices if `n <= limit`; otherwise exactly `limit` indices,
 * sorted ascending, unique. Seed is derived from `(n, limit)` for stability
 * across renders.
 */
export function sampleIndices(n: number, limit: number): number[] {
  if (n <= limit) {
    return Array.from({ length: n }, (_, i) => i);
  }
  const rng = mulberry32(n * 100003 + limit);
  const pool = Array.from({ length: n }, (_, i) => i);
  for (let i = 0; i < limit; i++) {
    const j = i + Math.floor(rng() * (n - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, limit).sort((a, b) => a - b);
}
