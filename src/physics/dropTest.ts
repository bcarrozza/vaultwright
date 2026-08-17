import { Box, Edge, Vec2, World } from "planck";
import { circularArc } from "../geom/arch";
import { edgeById, vertexById } from "../geom/graph";
import type { Project, Warning } from "../model/project";
import { PHYSICS_FAIL, PHYSICS_WARN } from "../masonry/warnings";
import type { Point } from "../analysis/types";

export const DROP_T_S = 8;
export const E_QUIET = 0.05;
export const DT = 1 / 60;
export const VEL_ITERS = 20;
export const POS_ITERS = 10;
export const PASS_FRAC = 0.005;
export const FAIL_FRAC = 0.02;
export const FAIL_ROT_RAD = (30 * Math.PI) / 180;
export const GROUND_FAIL_Y = -0.5;

export type PhysicsResult = "PASS" | "WARN" | "FAIL";
export type OverlayBand = "green" | "amber" | "red";
export type CombinedVerdict =
  | "conservative pass"
  | "stands, not conservative"
  | "stands in the toy, fails design"
  | "collapse";

export type StoneSpec = {
  id: string;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type DropInput = {
  stones: StoneSpec[];
  span: number;
  g?: number;
  paused?: boolean;
  T?: number;
};

export type DropResult = {
  result: PhysicsResult;
  maxCmDisplacement_m: number;
  maxRotation_rad: number;
  settled: boolean;
  T_s: number;
  paused: boolean;
  warnings: Warning[];
};

export function combinedVerdict(
  overlay: OverlayBand,
  physics: PhysicsResult,
): CombinedVerdict {
  if (physics === "FAIL") return "collapse";
  if (overlay === "green" && physics === "PASS") return "conservative pass";
  if (overlay === "amber" && physics === "PASS") return "stands, not conservative";
  if (overlay === "red" && physics === "PASS") {
    return "stands in the toy, fails design";
  }
  if (physics === "WARN") {
    if (overlay === "green") return "stands, not conservative";
    return overlay === "red"
      ? "stands in the toy, fails design"
      : "stands, not conservative";
  }
  return "collapse";
}

function polygonCentroid(s: StoneSpec): Point {
  return { x: (s.minX + s.maxX) / 2, y: (s.minY + s.maxY) / 2 };
}

export function dropTest(input: DropInput): DropResult {
  const g = input.g ?? 9.81;
  const T = input.T ?? DROP_T_S;
  const paused = input.paused === true;
  const world = new World(new Vec2(0, paused ? 0 : -g));
  const ground = world.createBody({ type: "static", position: new Vec2(0, 0) });
  ground.createFixture({
    shape: new Edge(new Vec2(-50, 0), new Vec2(50, 0)),
    friction: 0.4,
    restitution: 0,
  });

  const bodies = input.stones.map((stone) => {
    const c = polygonCentroid(stone);
    const hw = (stone.maxX - stone.minX) / 2;
    const hh = (stone.maxY - stone.minY) / 2;
    const body = world.createBody({
      type: paused ? "kinematic" : "dynamic",
      position: new Vec2(c.x, c.y),
      allowSleep: true,
    });
    body.createFixture({
      shape: new Box(Math.max(hw, 0.02), Math.max(hh, 0.02)),
      density: 1800,
      friction: 0.6,
      restitution: 0,
    });
    return { stone, body, c0: c };
  });

  const steps = Math.max(1, Math.round(T / DT));
  let quietTime = 0;
  let settled = false;
  for (let i = 0; i < steps; i++) {
    world.step(DT, VEL_ITERS, POS_ITERS);
    let ke = 0;
    for (const item of bodies) {
      const v = item.body.getLinearVelocity();
      const w = item.body.getAngularVelocity();
      const m = item.body.getMass();
      const I = item.body.getInertia();
      ke += 0.5 * m * (v.x * v.x + v.y * v.y) + 0.5 * I * w * w;
    }
    if (ke < E_QUIET) {
      quietTime += DT;
      if (quietTime >= 1) {
        settled = true;
        break;
      }
    } else {
      quietTime = 0;
    }
  }

  let maxDisp = 0;
  let maxRot = 0;
  let fallen = false;
  for (const item of bodies) {
    const p = item.body.getPosition();
    const disp = Math.hypot(p.x - item.c0.x, p.y - item.c0.y);
    if (disp > maxDisp) maxDisp = disp;
    const rot = Math.abs(item.body.getAngle());
    if (rot > maxRot) maxRot = rot;
    if (p.y < GROUND_FAIL_Y) fallen = true;
  }

  const span = Math.max(input.span, 1e-6);
  let result: PhysicsResult = "PASS";
  if (
    !paused &&
    (fallen ||
      maxDisp > FAIL_FRAC * span ||
      maxRot > FAIL_ROT_RAD ||
      !settled)
  ) {
    result = "FAIL";
  } else if (!paused && maxDisp > PASS_FRAC * span) {
    result = "WARN";
  }

  const warnings: Warning[] = [];
  if (result === "FAIL") {
    warnings.push({
      code: PHYSICS_FAIL,
      severity: "red",
      message: "Drop-test collapse.",
    });
  } else if (result === "WARN") {
    warnings.push({
      code: PHYSICS_WARN,
      severity: "amber",
      message: "Drop-test WARN band.",
    });
  }

  return {
    result,
    maxCmDisplacement_m: maxDisp,
    maxRotation_rad: maxRot,
    settled: paused ? true : settled,
    T_s: T,
    paused,
    warnings,
  };
}

/** Intrados-only falsework. Does not reach abutments. */
export function centeringPolyline(project: Project): Point[] {
  const edge = project.edges.find((e) => e.kind === "arch" && e.rise != null);
  if (!edge || edge.rise == null) return [];
  const start = vertexById(project, edge.start);
  const end = vertexById(project, edge.end);
  const arc = circularArc(start, end, edge.rise);
  const pts: Point[] = [];
  const n = 16;
  const inset = 0.08;
  const a0 = arc.phiStart + inset / Math.max(arc.r, 1e-6);
  const a1 = arc.phiStart + arc.sweep - inset / Math.max(arc.r, 1e-6);
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push({
      x: arc.cx + arc.r * Math.cos(a),
      y: arc.cy + arc.r * Math.sin(a) - 0.04,
    });
  }
  return pts;
}

export function centeringTouchesAbutments(
  project: Project,
  pts: Point[],
): boolean {
  const walls = project.faces.filter(
    (f) => f.regionKind === "masonryWall" || f.regionKind === "masonryPier",
  );
  if (pts.length === 0 || walls.length === 0) return false;
  const xs = pts.map((p) => p.x);
  const minP = Math.min(...xs);
  const maxP = Math.max(...xs);
  for (const face of walls) {
    const vs = face.loop.map((id) => {
      const e = edgeById(project, id);
      return [vertexById(project, e.start).x, vertexById(project, e.end).x];
    });
    const nums = vs.flat();
    const minW = Math.min(...nums);
    const maxW = Math.max(...nums);
    if (minP <= minW + 1e-6 && maxP >= maxW - 1e-6) return true;
    if (minP < minW + 0.02 && maxP > minW - 0.02 && minW > 0.1) {
      /* springing contact */
    }
  }
  const opening = project.vertices.filter((v) => v.id === "vSL" || v.id === "vSR");
  if (opening.length === 2) {
    const lo = Math.min(opening[0]!.x, opening[1]!.x);
    const hi = Math.max(opening[0]!.x, opening[1]!.x);
    return minP <= lo + 1e-4 || maxP >= hi - 1e-4;
  }
  return false;
}

export { PHYSICS_FAIL, PHYSICS_WARN };
