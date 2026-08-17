import type { Point, Stone2D } from "./types";

const EPS = 1e-12;

export function polygonAabb(polygon: Point[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of polygon) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

/** Signed shoelace area. Absolute value is the polygon area. */
export function polygonArea(polygon: Point[]): number {
  if (polygon.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) * 0.5;
}

function projectAxis(
  polygon: Point[],
  nx: number,
  ny: number,
): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const p of polygon) {
    const d = p.x * nx + p.y * ny;
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return { min, max };
}

function axesOf(polygon: Point[], into: Point[]): void {
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % n]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < EPS) continue;
    into.push({ x: -dy / len, y: dx / len });
  }
}

function aabbInteriorOverlap(
  A: { minX: number; minY: number; maxX: number; maxY: number },
  B: { minX: number; minY: number; maxX: number; maxY: number },
): boolean {
  return (
    A.minX < B.maxX - EPS &&
    A.maxX > B.minX + EPS &&
    A.minY < B.maxY - EPS &&
    A.maxY > B.minY + EPS
  );
}

function satSeparated(a: Point[], b: Point[]): boolean {
  const axes: Point[] = [];
  axesOf(a, axes);
  axesOf(b, axes);
  for (const axis of axes) {
    const A = projectAxis(a, axis.x, axis.y);
    const B = projectAxis(b, axis.x, axis.y);
    if (!(A.min < B.max - EPS && B.min < A.max - EPS)) {
      return true;
    }
  }
  return axes.length === 0;
}

function centroidOf(polygon: Point[]): Point {
  let x = 0;
  let y = 0;
  for (const p of polygon) {
    x += p.x;
    y += p.y;
  }
  const n = polygon.length || 1;
  return { x: x / n, y: y / n };
}

function anyVertexInside(verts: Point[], polygon: Point[]): boolean {
  for (const p of verts) {
    if (pointInPolygon(p, polygon)) return true;
  }
  return false;
}

/**
 * Interior overlap of convex polygons. Edge-touching is not overlap.
 * AABB first (S02 mortar gaps), then SAT, then centroid/vertex containment
 * so trapezoid voussoirs cannot hide behind a false SAT gap.
 */
export function polygonsOverlap(a: Point[], b: Point[]): boolean {
  if (!aabbInteriorOverlap(polygonAabb(a), polygonAabb(b))) {
    return false;
  }
  if (!satSeparated(a, b)) {
    return true;
  }
  const ca = centroidOf(a);
  const cb = centroidOf(b);
  return (
    pointInPolygon(ca, b) ||
    pointInPolygon(cb, a) ||
    anyVertexInside(a, b) ||
    anyVertexInside(b, a)
  );
}

export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  if (pointOnBoundary(point, polygon)) return false;
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const pi = polygon[i]!;
    const pj = polygon[j]!;
    if (pj.y === pi.y) continue;
    if (
      pi.y > point.y !== pj.y > point.y &&
      point.x <
        ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y) + pi.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function pointOnBoundary(point: Point, polygon: Point[]): boolean {
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % n]!;
    const cross =
      (point.y - a.y) * (b.x - a.x) - (point.x - a.x) * (b.y - a.y);
    if (Math.abs(cross) > 1e-10) continue;
    const dot =
      (point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y);
    const len2 = (b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y);
    if (dot >= -1e-10 && dot <= len2 + 1e-10) return true;
  }
  return false;
}

/**
 * DEC-026: do not emit intersecting 2D polygons. Drop every stone that
 * interior-overlaps another; count intersecting pairs.
 */
export function rejectOverlaps(stones: Stone2D[]): {
  stones: Stone2D[];
  overlapCount: number;
} {
  const n = stones.length;
  const overlapping = new Set<number>();
  let overlapCount = 0;
  for (let i = 0; i < n; i++) {
    const a = stones[i]!;
    for (let j = i + 1; j < n; j++) {
      const b = stones[j]!;
      if (polygonsOverlap(a.polygon, b.polygon)) {
        overlapping.add(i);
        overlapping.add(j);
        overlapCount += 1;
      }
    }
  }
  if (overlapCount === 0) {
    return { stones, overlapCount: 0 };
  }
  return {
    stones: stones.filter((_, i) => !overlapping.has(i)),
    overlapCount,
  };
}
