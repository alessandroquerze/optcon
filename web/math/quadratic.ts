export type Vec2 = readonly [number, number];
export type Matrix2 = readonly [Vec2, Vec2];

export interface QuadraticParams {
  weight1: number;
  weight2: number;
  angle: number; // Degrees; first eigenvector counterclockwise from the x-axis.
  centerX: number;
  centerY: number;
  pointX: number;
  pointY: number;
}
export interface QuadraticData {
  matrix: Matrix2;
  point: Vec2;
  center: Vec2;
  value: number;
  gradient: Vec2;
  gradientNorm: number;
  eigenvalues: Vec2;
  condition: number;
  x: number[];
  y: number[];
  values: number[][]; // Row index is y, column index is x (Plotly convention).
}

export const quadraticDefaults: Readonly<QuadraticParams> = Object.freeze({
  weight1: 1, weight2: 3, angle: 25,
  centerX: 0, centerY: 0, pointX: 1.5, pointY: 1,
});

export function weightMatrix(weight1: number, weight2: number, angle: number): Matrix2 {
  if (![weight1, weight2, angle].every(Number.isFinite) || weight1 <= 0 || weight2 <= 0) {
    throw new RangeError('I pesi devono essere positivi e i parametri finiti.');
  }
  const a = angle * Math.PI / 180;
  const c = Math.cos(a), s = Math.sin(a);
  const off = (weight1 - weight2) * c * s;
  return [[weight1 * c * c + weight2 * s * s, off], [off, weight1 * s * s + weight2 * c * c]];
}

export function evaluateQuadratic(matrix: Matrix2, point: Vec2, center: Vec2): {
  value: number; gradient: Vec2;
} {
  const dx = point[0] - center[0], dy = point[1] - center[1];
  const gradient: Vec2 = [matrix[0][0] * dx + matrix[0][1] * dy, matrix[1][0] * dx + matrix[1][1] * dy];
  return { value: 0.5 * (dx * gradient[0] + dy * gradient[1]), gradient };
}

/** Pure computation: no DOM, plotting library, timers or shared mutable state. */
export function computeQuadratic(params: Readonly<QuadraticParams>, resolution = 65): QuadraticData {
  if (!Object.values(params).every(Number.isFinite)) throw new RangeError('Parametri non finiti.');
  if (!Number.isInteger(resolution) || resolution < 3 || resolution > 201) throw new RangeError('Risoluzione non valida.');
  const matrix = weightMatrix(params.weight1, params.weight2, params.angle);
  const center: Vec2 = [params.centerX, params.centerY];
  const point: Vec2 = [params.pointX, params.pointY];
  const x = Array.from({ length: resolution }, (_, i) => -4 + 8 * i / (resolution - 1));
  const y = [...x];
  const values = y.map((yy) => x.map((xx) => evaluateQuadratic(matrix, [xx, yy], center).value));
  const { value, gradient } = evaluateQuadratic(matrix, point, center);
  const eigenvalues: Vec2 = [Math.min(params.weight1, params.weight2), Math.max(params.weight1, params.weight2)];
  return { matrix, point, center, value, gradient, gradientNorm: Math.hypot(...gradient),
    eigenvalues, condition: eigenvalues[1] / eigenvalues[0], x, y, values };
}
