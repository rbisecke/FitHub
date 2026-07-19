// Custom-SVG charting primitives (0.16, 09 §1).
//
// FitHub renders charts as hand-authored SVG, using d3-scale / d3-shape for the MATH
// ONLY — never a charting framework (09 §1: the chart set is deliberately simple and
// static, so a library's tooltip/interactivity surface is dead weight). These are thin,
// testable wrappers so call sites don't reach into d3 directly and every chart shares
// one scale/generator vocabulary. Pure functions — no DOM, no React.

import { scaleLinear, scaleTime, scaleBand } from "d3-scale";
import { line, arc, curveMonotoneX, type CurveFactory } from "d3-shape";

export interface NumericScale {
  (value: number): number;
  ticks(count?: number): number[];
  domain(): [number, number];
  range(): [number, number];
}

/** Continuous linear scale (values → pixels). */
export function linearScale(
  domain: [number, number],
  range: [number, number],
): NumericScale {
  const s = scaleLinear().domain(domain).range(range);
  const fn = ((v: number) => s(v)) as NumericScale;
  fn.ticks = (count = 5) => s.ticks(count);
  fn.domain = () => domain;
  fn.range = () => range;
  return fn;
}

/** Time scale for date-keyed x-axes (dates → pixels). */
export function timeScale(domain: [Date, Date], range: [number, number]) {
  const s = scaleTime().domain(domain).range(range);
  return {
    scale: (d: Date) => s(d),
    ticks: (count = 5) => s.ticks(count),
  };
}

/** Band scale for categorical/bar x-axes. */
export function bandScale(
  domain: string[],
  range: [number, number],
  padding = 0.2,
) {
  const s = scaleBand().domain(domain).range(range).padding(padding);
  return {
    scale: (key: string) => s(key) ?? 0,
    bandwidth: () => s.bandwidth(),
    domain: () => domain,
  };
}

export interface Point {
  x: number;
  y: number;
}

/**
 * SVG path `d` for a line through `points` in already-scaled pixel space. `smooth`
 * uses a monotone curve (no overshoot) for trend lines; pass a null point to break
 * the line into a segment (e.g. a dashed "projected" tail rendered as its own path).
 */
export function linePath(points: Point[], smooth = false): string {
  const gen = line<Point>()
    .x((p) => p.x)
    .y((p) => p.y);
  if (smooth) gen.curve(curveMonotoneX as CurveFactory);
  return gen(points) ?? "";
}

/**
 * SVG path `d` for a radial arc (the readiness gauge). Angles in radians, 0 at 12
 * o'clock, clockwise positive — d3's convention.
 */
export function arcPath(opts: {
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
}): string {
  return arc()(opts) ?? "";
}

/**
 * Evenly map a 0..1 fraction onto a [start, end] angular sweep (radians). Handy for
 * turning a normalized value (readiness %, ACWR position) into a gauge arc end-angle.
 */
export function fractionToAngle(
  fraction: number,
  startAngle: number,
  endAngle: number,
): number {
  const clamped = Math.max(0, Math.min(1, fraction));
  return startAngle + clamped * (endAngle - startAngle);
}
