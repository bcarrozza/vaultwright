export type Point = { x: number; y: number };

export type CircularArc = {
  cx: number;
  cy: number;
  r: number;
  phiStart: number;
  phiEnd: number;
  phiVia: number;
  sweep: number;
};

function chordNormal(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): { nx: number; ny: number; chord: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const chord = Math.hypot(dx, dy);
  if (chord <= 0) {
    throw new Error("Arch chord length is zero");
  }
  return { nx: -dy / chord, ny: dx / chord, chord };
}

function wrapToPi(d: number): number {
  let x = d;
  while (x > Math.PI) x -= 2 * Math.PI;
  while (x < -Math.PI) x += 2 * Math.PI;
  return x;
}

/** Sweep from → via → to, each leg wrapped to (−π, π]. */
export function sweepVia(from: number, via: number, to: number): number {
  return wrapToPi(via - from) + wrapToPi(to - via);
}

export function lerpPhiVia(
  from: number,
  via: number,
  to: number,
  t: number,
): number {
  return from + sweepVia(from, via, to) * t;
}

/** Circular arc from chord + sagitta. Normal points toward the bulge. */
export function circularArc(
  start: Point,
  end: Point,
  rise: number,
): CircularArc {
  if (rise <= 0) {
    throw new Error("Arch needs a positive rise");
  }
  const { nx, ny, chord } = chordNormal(start.x, start.y, end.x, end.y);
  const r = (chord * chord) / (8 * rise) + rise / 2;
  const mx = (start.x + end.x) / 2;
  const my = (start.y + end.y) / 2;
  const d = r - rise;
  const cx = mx - nx * d;
  const cy = my - ny * d;
  const viaX = mx + nx * rise;
  const viaY = my + ny * rise;
  const phiStart = Math.atan2(start.y - cy, start.x - cx);
  const phiEnd = Math.atan2(end.y - cy, end.x - cx);
  const phiVia = Math.atan2(viaY - cy, viaX - cx);
  return {
    cx,
    cy,
    r,
    phiStart,
    phiEnd,
    phiVia,
    sweep: sweepVia(phiStart, phiVia, phiEnd),
  };
}

export function polar(cx: number, cy: number, r: number, phi: number): Point {
  return { x: cx + r * Math.cos(phi), y: cy + r * Math.sin(phi) };
}

export function sampleCircularArc(arc: CircularArc, steps = 32): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    pts.push(
      polar(
        arc.cx,
        arc.cy,
        arc.r,
        lerpPhiVia(arc.phiStart, arc.phiVia, arc.phiEnd, i / steps),
      ),
    );
  }
  return pts;
}

export function pointOnIntrados(
  cx: number,
  cy: number,
  rin: number,
  x: number,
): number | null {
  const dx = x - cx;
  const inside = rin * rin - dx * dx;
  if (inside < 0) return null;
  return cy + Math.sqrt(inside);
}
