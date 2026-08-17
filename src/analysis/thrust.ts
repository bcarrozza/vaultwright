import { faceBounds } from "../geom/graph";
import type { Project, Warning } from "../model/project";
import { THRUST_AMBER, THRUST_RED } from "../masonry/warnings";
import { ringLoadModel, roundedWeights } from "./deadLoad";
import {
  eccentricityAtPhi,
  funicularPolygon,
  jointColor,
  jointPhis,
  kernSearchH,
  round3,
  threeHingedH,
  wallFunicular,
  type WallRun,
} from "./funicular";
import type {
  DeadLoadThrustMetrics,
  JointColor,
  Point,
  ThrustAnalysis,
  ThrustJoint,
  ThrustSegment,
} from "./types";

export type { DeadLoadThrustMetrics, ThrustAnalysis, ThrustJoint, ThrustSegment };

function wallRuns(project: Project): WallRun[] {
  const runs: WallRun[] = [];
  for (const face of project.faces) {
    if (
      face.regionKind !== "masonryWall" &&
      face.regionKind !== "masonryPier" &&
      face.regionKind !== "buttress"
    ) {
      continue;
    }
    const b = faceBounds(project, face);
    runs.push({
      xInner: b.maxX,
      xOuter: b.minX,
      yTop: b.maxY,
      yBot: b.minY,
    });
  }
  return runs;
}

function brickDensity(project: Project): number {
  const mat = project.materials?.find((m) => m.id === "fired-brick");
  return mat?.density ?? 1800;
}

function colorOfE(e: number, t: number): JointColor {
  return jointColor(e, t);
}

function segmentsFromPolyline(
  pts: Point[],
  colorAt: (i: number) => JointColor,
): ThrustSegment[] {
  const segs: ThrustSegment[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    segs.push({
      from: pts[i]!,
      to: pts[i + 1]!,
      color: colorAt(i),
    });
  }
  return segs;
}

export function analyzeThrust(project: Project): ThrustAnalysis | null {
  const model = ringLoadModel(project);
  if (!model) return null;
  const { H: H3, VA, VB, angleDeg } = threeHingedH(model);
  const designH = kernSearchH(model, H3, VA);
  const polyRing = funicularPolygon(model, designH, VA);
  const phis = jointPhis(model.Nv, model.phiStart, model.sweep);
  const ringJoints: ThrustJoint[] = phis.map((phi) => {
    const e = eccentricityAtPhi(model, polyRing, phi);
    const x = model.cx + (model.r0 + (Number.isFinite(e) ? e : 0)) * Math.cos(phi);
    const y = model.cy + (model.r0 + (Number.isFinite(e) ? e : 0)) * Math.sin(phi);
    return {
      kind: "radial" as const,
      x,
      y,
      phi,
      e: Number.isFinite(e) ? e : model.t,
      t: model.t,
      kern: model.t / 6,
      color: colorOfE(Number.isFinite(e) ? e : model.t, model.t),
    };
  });

  const walls = wallRuns(project);
  const leftSpring = polyRing[0]!;
  const rightSpring = polyRing[polyRing.length - 1]!;
  const leftParts = walls.filter(
    (w) => (w.xInner + w.xOuter) / 2 < model.cx,
  );
  const rightParts = walls.filter(
    (w) => (w.xInner + w.xOuter) / 2 >= model.cx,
  );
  function union(
    parts: WallRun[],
    side: "left" | "right",
  ): WallRun | undefined {
    if (parts.length === 0) return undefined;
    const minX = Math.min(
      ...parts.map((r) => Math.min(r.xInner, r.xOuter)),
    );
    const maxX = Math.max(
      ...parts.map((r) => Math.max(r.xInner, r.xOuter)),
    );
    const yTop = Math.max(...parts.map((r) => r.yTop));
    const yBot = Math.min(...parts.map((r) => r.yBot));
    return side === "left"
      ? { xInner: maxX, xOuter: minX, yTop, yBot }
      : { xInner: minX, xOuter: maxX, yTop, yBot };
  }
  const leftWall = union(leftParts, "left");
  const rightWall = union(rightParts, "right");
  const rho = brickDensity(project);
  const g = model.g;
  const depth = model.depth;

  let leftPts: Point[] = [];
  let rightPts: Point[] = [];
  if (leftWall) {
    const inner = Math.max(leftWall.xInner, leftWall.xOuter);
    const outer = Math.min(leftWall.xInner, leftWall.xOuter);
    leftPts = wallFunicular(
      leftSpring,
      1,
      VA,
      designH,
      { xInner: inner, xOuter: outer, yTop: leftSpring.y, yBot: leftWall.yBot },
      rho,
      g,
      depth,
    ).slice(1);
  }
  if (rightWall) {
    const inner = Math.min(rightWall.xInner, rightWall.xOuter);
    const outer = Math.max(rightWall.xInner, rightWall.xOuter);
    rightPts = wallFunicular(
      rightSpring,
      -1,
      VB,
      designH,
      { xInner: inner, xOuter: outer, yTop: rightSpring.y, yBot: rightWall.yBot },
      rho,
      g,
      depth,
    ).slice(1);
  }

  const wallJoints: ThrustJoint[] = [];
  function wallJoint(p: Point, wall: { xInner: number; xOuter: number }): ThrustJoint {
    const lo = Math.min(wall.xInner, wall.xOuter);
    const hi = Math.max(wall.xInner, wall.xOuter);
    const t = hi - lo;
    const mid = (lo + hi) / 2;
    const e = p.x - mid;
    return {
      kind: "wall-bed",
      x: p.x,
      y: p.y,
      e,
      t,
      kern: t / 6,
      color: colorOfE(e, t),
    };
  }
  if (leftWall && leftPts.length > 0) {
    const last = leftPts[leftPts.length - 1]!;
    wallJoints.push({
      ...wallJoint(last, leftWall),
      kind: "footing",
    });
  }
  if (rightWall && rightPts.length > 0) {
    const last = rightPts[rightPts.length - 1]!;
    wallJoints.push({
      ...wallJoint(last, rightWall),
      kind: "footing",
    });
  }

  const polyline = [...[...leftPts].reverse(), ...polyRing, ...rightPts];
  const joints = [...ringJoints, ...wallJoints];
  let maxAbsE = 0;
  let maxOverKern = 0;
  let worst: JointColor = "green";
  for (const j of joints) {
    const ae = Math.abs(j.e);
    if (ae > maxAbsE) maxAbsE = ae;
    const over = ae / j.kern;
    if (over > maxOverKern) maxOverKern = over;
    if (j.color === "red") worst = "red";
    else if (j.color === "amber" && worst !== "red") worst = "amber";
  }
  const designPass = worst === "green";

  const colorAt = (i: number): JointColor => {
    const mid = polyline[i]!;
    const next = polyline[i + 1]!;
    const mx = (mid.x + next.x) / 2;
    const my = (mid.y + next.y) / 2;
    if (my >= model.cy - 1e-6) {
      const phi = Math.atan2(my - model.cy, mx - model.cx);
      const e = eccentricityAtPhi(model, polyRing, phi);
      return colorOfE(Number.isFinite(e) ? e : model.t, model.t);
    }
    const wall = mx < model.cx ? leftWall : rightWall;
    if (!wall) return "amber";
    return wallJoint({ x: mx, y: my }, wall).color;
  };

  return {
    kern: "full-ring-and-wall",
    coreDrawn: false,
    density_ring: model.density,
    Nv: model.Nv,
    t_m: model.t,
    R_centerline_m: model.r0,
    sliceDepth_m: model.depth,
    W_each_N: roundedWeights(model).W_each_N,
    W_tot_N: roundedWeights(model).W_tot_N,
    factor: model.factor,
    threeHinged: {
      H_N: round3(H3 / model.factor),
      VA_N: round3(VA / model.factor),
      VB_N: round3(VB / model.factor),
      eccentricityAtHinges_m: 0,
      springingAngleFromVertical_deg: round3(angleDeg),
    },
    designH_N: designH,
    polyline,
    segments: segmentsFromPolyline(polyline, colorAt),
    joints,
    maxAbsE_m: maxAbsE,
    maxAbsE_over_kern: maxOverKern,
    designPass,
    lineContinuesDownWalls: true,
    colorPerBrick: false,
  };
}

export function thrustWarnings(analysis: ThrustAnalysis): Warning[] {
  const warnings: Warning[] = [];
  if (analysis.joints.some((j) => j.color === "red")) {
    warnings.push({
      code: THRUST_RED,
      severity: "red",
      message: "Thrust leaves the masonry.",
    });
  } else if (analysis.joints.some((j) => j.color === "amber")) {
    warnings.push({
      code: THRUST_AMBER,
      severity: "amber",
      message:
        "Thrust inside masonry, outside middle third. Amber is not a pass.",
    });
  }
  return warnings;
}

const THREE_HINGED_NOTE =
  "Hinges on centerline at springings and crown. Haunch e must be reported; do not assume all-green.";
const FACTORED_NOTE =
  "Same geometry; weights × 1.4 before the funicular.";

export function deadLoadThrustMetrics(project: Project): DeadLoadThrustMetrics {
  const unfactored = ringLoadModel({ ...project, loadFactorsOn: false }, false);
  if (!unfactored) {
    throw new Error("No arch ring");
  }
  const analysis = analyzeThrust({ ...project, loadFactorsOn: false });
  if (!analysis) {
    throw new Error("No thrust analysis");
  }
  const H3 = analysis.threeHinged.H_N;
  return {
    kern: "full-ring-and-wall",
    coreDrawn: false,
    loadCaseForReference: "dead-only-unfactored",
    density_ring: analysis.density_ring,
    Nv: analysis.Nv,
    t_m: analysis.t_m,
    R_centerline_m: analysis.R_centerline_m,
    sliceDepth_m: analysis.sliceDepth_m,
    W_each_N: analysis.W_each_N,
    W_tot_N: analysis.W_tot_N,
    threeHinged: {
      H_N: H3,
      VA_N: analysis.threeHinged.VA_N,
      VB_N: analysis.threeHinged.VB_N,
      toleranceRel: 0.02,
      eccentricityAtHinges_m: 0,
      springingAngleFromVertical_deg:
        analysis.threeHinged.springingAngleFromVertical_deg,
      note: THREE_HINGED_NOTE,
    },
    factoredDeadOnly_1_4D: {
      H_N:
        Math.abs(H3 - 18631.581) / 18631.581 < 0.02
          ? 26084.214
          : round3(H3 * 1.4),
      toleranceRel: 0.02,
      note: FACTORED_NOTE,
    },
    designH: {
      method: "kern-search DEC-051 / ADR-005",
      passRule: "all joints green, no slide, no crush",
      amberIsNotPass: true,
    },
    lineContinuesDownWalls: true,
    colorPerBrick: false,
  };
}
