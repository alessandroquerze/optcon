import { describe, expect, it } from 'vitest';
import { computeQuadratic, evaluateQuadratic, quadraticDefaults, weightMatrix } from '../math/quadratic';

describe('weighted quadratic: analytic invariants', () => {
  it('agrees with the diagonal analytic expression', () => {
    const result = computeQuadratic({ ...quadraticDefaults, weight1: 2, weight2: 4, angle: 0,
      pointX: 3, pointY: -1, centerX: 1, centerY: 0 });
    expect(result.value).toBeCloseTo(6, 12);
    expect(result.gradient).toEqual([4, -4]);
    expect(result.gradientNorm).toBeCloseTo(Math.sqrt(32), 12);
  });
  it('has zero cost and gradient at the translated minimum', () => {
    const result = computeQuadratic({ ...quadraticDefaults, angle: 67,
      centerX: -1.2, centerY: 0.7, pointX: -1.2, pointY: 0.7 });
    expect(result.value).toBe(0);
    expect(result.gradient).toEqual([0, 0]);
  });
  it('preserves the spectrum under rotation, including exchanged axes', () => {
    for (const angle of [-90, -37, 0, 28, 90]) {
      const W = weightMatrix(0.2, 5, angle);
      expect(W[0][1]).toBe(W[1][0]);
      expect(W[0][0] + W[1][1]).toBeCloseTo(5.2, 12);
      expect(W[0][0] * W[1][1] - W[0][1] * W[1][0]).toBeCloseTo(1, 12);
    }
    const quarterTurn = weightMatrix(1, 3, 90);
    expect(quarterTurn[0][0]).toBeCloseTo(3, 12);
    expect(quarterTurn[1][1]).toBeCloseTo(1, 12);
  });
  it('is rotation-invariant for equal eigenvalues', () => {
    const a = computeQuadratic({ ...quadraticDefaults, weight1: 2, weight2: 2, angle: 0 });
    const b = computeQuadratic({ ...quadraticDefaults, weight1: 2, weight2: 2, angle: 71 });
    expect(a.value).toBeCloseTo(b.value, 12);
    expect(b.condition).toBe(1);
  });
  it('agrees with finite differences for the gradient', () => {
    const W = weightMatrix(0.3, 5, -35);
    const point = [1.4, -0.8] as const, center = [-0.5, 0.3] as const, epsilon = 1e-5;
    const analytical = evaluateQuadratic(W, point, center);
    for (let i = 0; i < 2; i++) {
      const plus: [number, number] = [...point], minus: [number, number] = [...point];
      plus[i] += epsilon;
      minus[i] -= epsilon;
      const numerical = (evaluateQuadratic(W, plus, center).value - evaluateQuadratic(W, minus, center).value) / (2 * epsilon);
      expect(analytical.gradient[i]).toBeCloseTo(numerical, 7);
    }
  });
  it('maps rows to y and columns to x and stays finite at all slider extremes', () => {
    for (const weight1 of [0.2, 5]) for (const weight2 of [0.2, 5]) for (const angle of [-90, 90]) {
      const data = computeQuadratic({ weight1, weight2, angle, pointX: -3, pointY: 3, centerX: 2, centerY: -2 }, 9);
      expect(data.values[2][5]).toBeCloseTo(evaluateQuadratic(data.matrix, [data.x[5], data.y[2]], data.center).value, 12);
      expect(data.values.flat().every(value => Number.isFinite(value) && value >= 0)).toBe(true);
      expect(data.condition).toBeLessThanOrEqual(25);
    }
  });
  it('rejects invalid parameters and unbounded grids', () => {
    expect(() => computeQuadratic({ ...quadraticDefaults, weight1: 0 })).toThrow(RangeError);
    expect(() => computeQuadratic({ ...quadraticDefaults, pointX: Number.NaN })).toThrow(RangeError);
    expect(() => computeQuadratic(quadraticDefaults, 10000)).toThrow(RangeError);
  });
});
