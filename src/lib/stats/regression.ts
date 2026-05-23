export interface RegressionResult {
  slope: number;
  intercept: number;
  r: number;
  r2: number;
  n: number;
}

const NAN_RESULT = (n: number): RegressionResult => ({
  slope: Number.NaN,
  intercept: Number.NaN,
  r: Number.NaN,
  r2: Number.NaN,
  n,
});

export function linearRegression(xs: number[], ys: number[]): RegressionResult {
  if (xs.length !== ys.length) {
    throw new Error("linearRegression: xs and ys must have the same length");
  }
  const n = xs.length;
  if (n < 2) return NAN_RESULT(n);

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let sumDxDy = 0;
  let sumDx2 = 0;
  let sumDy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    sumDxDy += dx * dy;
    sumDx2 += dx * dx;
    sumDy2 += dy * dy;
  }

  if (sumDx2 === 0 || sumDy2 === 0) return NAN_RESULT(n);

  const slope = sumDxDy / sumDx2;
  const intercept = meanY - slope * meanX;
  const r = sumDxDy / Math.sqrt(sumDx2 * sumDy2);
  const r2 = r * r;

  return { slope, intercept, r, r2, n };
}
