import type { Point } from "./types";
import type { RingLoadModel } from "./deadLoad";

export function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Three-hinged H from ΣM=0 at the crown (centerline hinges). */
export function threeHingedH(model: RingLoadModel): {
  H: number;
  VA: number;
  VB: number;
  angleDeg: number;
} {
  const VA = model.W_tot / 2;
  const VB = VA;
  let moment = 0;
  for (const v of model.voussoirs) {
    const x = v.x - model.cx;
    if (x >= 0) continue;
    moment += v.W * x;
  }
  const H = VA - moment / model.r0;
  const angleDeg = (Math.atan2(H, VA) * 180) / Math.PI;
  return { H, VA, VB, angleDeg };
}

function intersectVertical(
  p: Point,
  dirX: number,
  dirY: number,
  xTarget: number,
): Point | null {
  if (Math.abs(dirX) < 1e-18) return null;
  const s = (xTarget - p.x) / dirX;
  if (s <= 1e-12) return null;
  return { x: xTarget, y: p.y + dirY * s };
}

/**
 * String polygon of voussoir weights for a trial H, starting at the
 * left centerline springing. Symmetric closing at the right springing.
 */
export function funicularPolygon(
  model: RingLoadModel,
  H: number,
  VA: number,
): Point[] {
  const A: Point = { x: model.cx - model.r0, y: model.cy };
  const pts: Point[] = [A];
  let px = A.x;
  let py = A.y;
  let V = VA;
  const ordered = [...model.voussoirs].sort((a, b) => a.x - b.x);
  for (const v of ordered) {
    const hit = intersectVertical({ x: px, y: py }, H, V, v.x);
    if (!hit) continue;
    pts.push(hit);
    px = hit.x;
    py = hit.y;
    V -= v.W;
  }
  const B: Point = { x: model.cx + model.r0, y: model.cy };
  const hitB = intersectVertical({ x: px, y: py }, H, V, B.x);
  if (hitB) pts.push(hitB);
  else pts.push(B);
  return pts;
}

function cross(ax: number, ay: number, bx: number, by: number): number {
  return ax * by - ay * bx;
}

function intersectSegmentRay(
  a: Point,
  b: Point,
  cx: number,
  cy: number,
  phi: number,
): Point | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const rx = Math.cos(phi);
  const ry = Math.sin(phi);
  const det = cross(dx, dy, -rx, -ry);
  if (Math.abs(det) < 1e-18) return null;
  const sx = cx - a.x;
  const sy = cy - a.y;
  const t = cross(sx, sy, -rx, -ry) / det;
  const u = cross(dx, dy, sx, sy) / det;
  if (t < -1e-9 || t > 1 + 1e-9 || u < 1e-9) return null;
  return { x: a.x + t * dx, y: a.y + t * dy };
}

export function jointPhis(Nv: number, phi0: number, sweep: number): number[] {
  const phis: number[] = [];
  for (let i = 0; i <= Nv; i++) phis.push(phi0 + (i / Nv) * sweep);
  return phis;
}

/** Signed eccentricity along the radial joint: + toward extrados. */
export function eccentricityAtPhi(
  model: RingLoadModel,
  polygon: Point[],
  phi: number,
): number {
  for (let i = 0; i < polygon.length - 1; i++) {
    const hit = intersectSegmentRay(
      polygon[i]!,
      polygon[i + 1]!,
      model.cx,
      model.cy,
      phi,
    );
    if (!hit) continue;
    const r = Math.hypot(hit.x - model.cx, hit.y - model.cy);
    return r - model.r0;
  }
  return Number.POSITIVE_INFINITY;
}

export function jointColor(e: number, t: number): "green" | "amber" | "red" {
  const ae = Math.abs(e);
  if (!Number.isFinite(ae) || ae > t / 2 + 1e-9) return "red";
  if (ae > t / 6 + 1e-9) return "amber";
  return "green";
}

/** H that minimizes max |e| on radial joints (full-ring kern, DEC-051). */
export function kernSearchH(model: RingLoadModel, H3: number, VA: number): number {
  const phis = jointPhis(model.Nv, model.phiStart, model.sweep);
  let bestH = H3;
  let bestScore = Number.POSITIVE_INFINITY;
  const n = 81;
  for (let i = 0; i < n; i++) {
    const H = H3 * (0.35 + (2.2 - 0.35) * (i / (n - 1)));
    if (H <= 1) continue;
    const poly = funicularPolygon(model, H, VA);
    let maxAbs = 0;
    for (const phi of phis) {
      const e = eccentricityAtPhi(model, poly, phi);
      const ae = Math.abs(e);
      if (ae > maxAbs) maxAbs = ae;
    }
    if (maxAbs < bestScore) {
      bestScore = maxAbs;
      bestH = H;
    }
  }
  return bestH;
}

export type WallRun = { xInner: number; xOuter: number; yTop: number; yBot: number };

/** Continue the resultant down a vertical wall (H constant, V grows with wall dead). */
export function wallFunicular(
  start: Point,
  Hsign: number,
  V0: number,
  H: number,
  wall: WallRun,
  density: number,
  g: number,
  depth: number,
  steps = 16,
  thicknessAt?: (y: number) => number,
): Point[] {
  const thickness = Math.abs(wall.xInner - wall.xOuter);
  const pts: Point[] = [start];
  const yTop = start.y;
  const yBot = wall.yBot;
  if (yTop <= yBot + 1e-12) return pts;
  let x = start.x;
  let V = V0;
  for (let i = 1; i <= steps; i++) {
    const y = yTop + ((yBot - yTop) * i) / steps;
    const dy = y - (i === 1 ? yTop : yTop + ((yBot - yTop) * (i - 1)) / steps);
    const t = thicknessAt?.(y) ?? thickness;
    const wPerM = density * g * t * depth;
    V += wPerM * Math.abs(dy);
    x += (Hsign * H * dy) / V;
    pts.push({ x, y });
  }
  return pts;
}
