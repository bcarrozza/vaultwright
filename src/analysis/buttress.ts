import {
  courseHeightIn,
  inchesToMetres,
  stretcherWythePitchIn,
} from "../catalog/brick";
import { faceBounds } from "../geom/graph";
import type {
  ButtressFaceMode,
  Edge,
  Face,
  Project,
  Vertex,
  Warning,
} from "../model/project";
import {
  BUTTRESS_EXCESS,
  GROUND_ANGLE_AMBER,
  GROUND_ANGLE_RED,
} from "../masonry/warnings";
import { ringLoadModel } from "./deadLoad";
import {
  jointColor,
  kernSearchH,
  round3,
  threeHingedH,
  wallFunicular,
  type WallRun,
} from "./funicular";

export const TAPER_MAX_SLOPE = 1 / 3;
export const TIER_STEP_COURSES = 4;
export const TIER_STEP_DEPTH_WYTHES = 1;
export const GROUND_ANGLE_AMBER_DEG = 15;
export const GROUND_ANGLE_RED_DEG = 25;
export const EXCESS_RATIO = 1.2;

export type Abutment = {
  faceId: string;
  side: "left" | "right";
  xInner: number;
  xOuter: number;
  yTop: number;
  yBot: number;
  thickness: number;
  lockedThickness: boolean;
};

export type ButtressMetrics = {
  flyingButtresses: false;
  faceMode: ButtressFaceMode;
  taperMaxSlope: number;
  tierStepCourses: number;
  tierStepDepthWythes: number;
  tierStepHeight_m: number;
  tierStepDepth_m: number;
  wallThickness_m: number;
  userGroundWidth_m: number;
  minGreenGroundWidth_m: number;
  suggestedGroundWidth_m: number;
  extraAtGround_m: number;
  wallThicknessUnchanged: true;
  H_N: number;
  V_ground_N: number;
  groundAngleFromVertical_deg: number;
  excess: boolean;
  warnings: Warning[];
};

function brickDensity(project: Project): number {
  return project.materials?.find((m) => m.id === "fired-brick")?.density ?? 1800;
}

export function wallAbutments(project: Project, cx?: number): Abutment[] {
  const center =
    cx ??
    ringLoadModel(project)?.cx ??
    project.vertices.reduce((s, v) => s + v.x, 0) /
      Math.max(1, project.vertices.length);
  const out: Abutment[] = [];
  for (const face of project.faces) {
    if (face.regionKind !== "masonryWall" && face.regionKind !== "masonryPier") {
      continue;
    }
    const b = faceBounds(project, face);
    const mid = (b.minX + b.maxX) / 2;
    const side: "left" | "right" = mid < center ? "left" : "right";
    const xInner = side === "left" ? b.maxX : b.minX;
    const xOuter = side === "left" ? b.minX : b.maxX;
    out.push({
      faceId: face.id,
      side,
      xInner,
      xOuter,
      yTop: b.maxY,
      yBot: b.minY,
      thickness: b.maxX - b.minX,
      lockedThickness: face.lockedThickness !== false,
    });
  }
  return out;
}

function extraFromButtressFaces(project: Project, wall: Abutment): number {
  let extra = 0;
  for (const face of project.faces) {
    if (face.regionKind !== "buttress") continue;
    const b = faceBounds(project, face);
    const mid = (b.minX + b.maxX) / 2;
    if (wall.side === "left" && mid < wall.xInner) {
      extra = Math.max(extra, wall.xOuter - b.minX);
    }
    if (wall.side === "right" && mid > wall.xInner) {
      extra = Math.max(extra, b.maxX - wall.xOuter);
    }
  }
  return Math.max(0, extra);
}

function thicknessAtFactory(
  mode: ButtressFaceMode,
  wallT: number,
  extra: number,
  ySpring: number,
  yBot: number,
  stepDepth: number,
): (y: number) => number {
  const h = Math.max(ySpring - yBot, 1e-9);
  if (mode === "taper") {
    return (y: number) => wallT + extra * ((ySpring - y) / h);
  }
  if (mode === "tiered") {
    const n = Math.max(1, Math.round(extra / Math.max(stepDepth, 1e-9)));
    return (y: number) => {
      const frac = Math.min(1, Math.max(0, (ySpring - y) / h));
      const step = Math.min(n, Math.floor(frac * n + 1e-9));
      return wallT + (step / n) * extra;
    };
  }
  return () => wallT + extra;
}

function runGround(
  wall: WallRun,
  startX: number,
  startY: number,
  Hsign: number,
  V0: number,
  H: number,
  extra: number,
  mode: ButtressFaceMode,
  density: number,
  g: number,
  depth: number,
  stepDepth: number,
): {
  x: number;
  y: number;
  V: number;
  t: number;
  color: ReturnType<typeof jointColor>;
} {
  const wallT = Math.abs(wall.xInner - wall.xOuter);
  const thicknessAt = thicknessAtFactory(
    mode,
    wallT,
    extra,
    startY,
    wall.yBot,
    stepDepth,
  );
  const outer = Hsign > 0 ? wall.xOuter - extra : wall.xOuter + extra;
  const inner = wall.xInner;
  const pts = wallFunicular(
    { x: startX, y: startY },
    Hsign,
    V0,
    H,
    { xInner: inner, xOuter: outer, yTop: startY, yBot: wall.yBot },
    density,
    g,
    depth,
    16,
    thicknessAt,
  );
  const last = pts[pts.length - 1] ?? { x: startX, y: startY };
  const t = thicknessAt(last.y);
  const lo = Math.min(inner, outer);
  const hi = Math.max(inner, outer);
  const mid = (lo + hi) / 2;
  const e = last.x - mid;
  let V = V0;
  const steps = 16;
  for (let i = 1; i <= steps; i++) {
    const y = startY + ((wall.yBot - startY) * i) / steps;
    const yPrev =
      i === 1 ? startY : startY + ((wall.yBot - startY) * (i - 1)) / steps;
    V += density * g * thicknessAt(y) * depth * Math.abs(y - yPrev);
  }
  return { x: last.x, y: last.y, V, t, color: jointColor(e, t) };
}

function minGreenWidth(
  wall: WallRun,
  startX: number,
  startY: number,
  Hsign: number,
  V0: number,
  H: number,
  mode: ButtressFaceMode,
  density: number,
  g: number,
  depth: number,
  wallT: number,
  extraCap: number,
  stepDepth: number,
): number {
  const tMax = wallT + extraCap;
  const tMin = 0.15;
  let best = Number.POSITIVE_INFINITY;
  const n = 200;
  for (let i = 0; i <= n; i++) {
    const t = tMin + ((tMax - tMin) * i) / n;
    const extra = t - wallT;
    const gnd = runGround(
      wall,
      startX,
      startY,
      Hsign,
      V0,
      H,
      extra,
      mode,
      density,
      g,
      depth,
      stepDepth,
    );
    if (gnd.color === "green" && t < best) best = t;
  }
  return Number.isFinite(best) ? best : tMax;
}

function clampExtra(
  mode: ButtressFaceMode,
  extra: number,
  height: number,
): number {
  if (mode === "taper") return Math.min(extra, TAPER_MAX_SLOPE * height);
  return extra;
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

export function groundAngleDeg(H: number, V: number): number {
  return (Math.atan2(Math.abs(H), Math.abs(V)) * 180) / Math.PI;
}

export function groundAngleWarning(deg: number): Warning | null {
  if (deg > GROUND_ANGLE_RED_DEG) {
    return {
      code: GROUND_ANGLE_RED,
      severity: "red",
      message: `Resultant at ground ${deg.toFixed(1)}° from vertical (limit 25°).`,
    };
  }
  if (deg > GROUND_ANGLE_AMBER_DEG) {
    return {
      code: GROUND_ANGLE_AMBER,
      severity: "amber",
      message: `Resultant at ground ${deg.toFixed(1)}° from vertical (limit 15°).`,
    };
  }
  return null;
}

export function buttressMetrics(project: Project): ButtressMetrics {
  const mode: ButtressFaceMode = project.buttressFaceMode ?? "vertical";
  const catalog = project.unitCatalogId ?? "us-modular-brick";
  const joint = project.jointMode;
  const tierStepHeight_m = inchesToMetres(
    courseHeightIn(catalog, joint) * TIER_STEP_COURSES,
  );
  const tierStepDepth_m = inchesToMetres(
    stretcherWythePitchIn(catalog, joint) * TIER_STEP_DEPTH_WYTHES,
  );
  const model = ringLoadModel(project);
  const walls = wallAbutments(project, model?.cx);
  const left = walls.find((w) => w.side === "left") ?? walls[0];
  const wallThickness_m = left?.thickness ?? 0;
  const springY = model?.cy ?? (left?.yTop ?? 0);
  const run: WallRun | undefined = left
    ? {
        xInner: left.xInner,
        xOuter: left.xOuter,
        yTop: left.yTop,
        yBot: left.yBot,
      }
    : undefined;

  let H = 0;
  let VA = 0;
  let startX = run?.xInner ?? 0;
  if (model) {
    const th = threeHingedH(model);
    H = kernSearchH(model, th.H, th.VA);
    VA = th.VA;
    startX = model.cx - model.r0;
  }
  const density = brickDensity(project);
  const g = model?.g ?? project.g ?? 9.81;
  const depth = model?.depth ?? project.sliceDepth;
  const drop = Math.max(springY - (left?.yBot ?? 0), 0.1);
  const extraCap = clampExtra(mode, 8, drop);
  const minGreen = run
    ? minGreenWidth(
        run,
        startX,
        springY,
        1,
        VA,
        H,
        mode,
        density,
        g,
        depth,
        wallThickness_m,
        extraCap,
        tierStepDepth_m,
      )
    : wallThickness_m;
  const userExtra = left ? extraFromButtressFaces(project, left) : 0;
  const userGroundWidth_m = wallThickness_m + userExtra;
  const extraNeeded = Math.max(0, minGreen - wallThickness_m);
  const extraAtGround_m = clampExtra(mode, extraNeeded, drop);
  const suggestedGroundWidth_m = wallThickness_m + extraAtGround_m;
  const gnd = run
    ? runGround(
        run,
        startX,
        springY,
        1,
        VA,
        H,
        userExtra,
        mode,
        density,
        g,
        depth,
        tierStepDepth_m,
      )
    : { V: VA, t: wallThickness_m, x: 0, y: 0, color: "green" as const };
  const groundAngleFromVertical_deg = round3(groundAngleDeg(H, gnd.V));
  const excess = userGroundWidth_m > EXCESS_RATIO * minGreen + 1e-9;
  const warnings: Warning[] = [];
  if (excess) {
    warnings.push({
      code: BUTTRESS_EXCESS,
      severity: "info",
      message:
        "Buttress thicker than needed (ground width > 120% of minimum green width).",
    });
  }
  const ang = groundAngleWarning(groundAngleFromVertical_deg);
  if (ang) warnings.push(ang);

  return {
    flyingButtresses: false,
    faceMode: mode,
    taperMaxSlope: TAPER_MAX_SLOPE,
    tierStepCourses: TIER_STEP_COURSES,
    tierStepDepthWythes: TIER_STEP_DEPTH_WYTHES,
    tierStepHeight_m,
    tierStepDepth_m,
    wallThickness_m: round6(wallThickness_m),
    userGroundWidth_m: round6(userGroundWidth_m),
    minGreenGroundWidth_m: round6(minGreen),
    suggestedGroundWidth_m: round6(suggestedGroundWidth_m),
    extraAtGround_m: round6(extraAtGround_m),
    wallThicknessUnchanged: true,
    H_N: round3(H),
    V_ground_N: round3(gnd.V),
    groundAngleFromVertical_deg,
    excess,
    warnings,
  };
}

function pushLoop(
  vertices: Vertex[],
  edges: Edge[],
  faces: Face[],
  project: Project,
  prefix: string,
  pts: { x: number; y: number }[],
) {
  const ids = pts.map((_, i) => `${prefix}v${i}`);
  for (let i = 0; i < pts.length; i++) {
    vertices.push({ id: ids[i]!, x: pts[i]!.x, y: pts[i]!.y });
  }
  const eids: string[] = [];
  for (let i = 0; i < pts.length; i++) {
    const id = `${prefix}e${i}`;
    eids.push(id);
    edges.push({
      id,
      kind: "line",
      start: ids[i]!,
      end: ids[(i + 1) % pts.length]!,
    });
  }
  faces.push({
    id: `${prefix}f`,
    regionKind: "buttress",
    materialId: "fired-brick",
    unitCatalogId: project.unitCatalogId,
    loop: eids,
    lockedThickness: false,
  });
}

/** Apply suggested extra ground width. Never thins locked walls. No flyers. */
export function applyButtress(project: Project): Project {
  const metrics = buttressMetrics(project);
  const extra = metrics.extraAtGround_m;
  const model = ringLoadModel(project);
  const walls = wallAbutments(project, model?.cx);
  const mode = metrics.faceMode;
  const vertices = project.vertices.filter((v) => !v.id.startsWith("Butt"));
  const edges = project.edges.filter((e) => !e.id.startsWith("Butt"));
  const faces = project.faces.filter((f) => f.regionKind !== "buttress");

  if (extra <= 1e-9) {
    return { ...project, vertices, edges, faces, buttressFaceMode: mode };
  }

  for (const wall of walls) {
    const outerG =
      wall.side === "left" ? wall.xOuter - extra : wall.xOuter + extra;
    const yBot = wall.yBot;
    const yTop = wall.yTop;
    const ySpring = model?.cy ?? yTop;
    const tag = `Butt${wall.side === "left" ? "L" : "R"}`;
    if (mode === "vertical") {
      pushLoop(vertices, edges, faces, project, tag, [
        { x: outerG, y: yBot },
        { x: wall.xOuter, y: yBot },
        { x: wall.xOuter, y: yTop },
        { x: outerG, y: yTop },
      ]);
    } else if (mode === "taper") {
      pushLoop(vertices, edges, faces, project, tag, [
        { x: outerG, y: yBot },
        { x: wall.xOuter, y: yBot },
        { x: wall.xOuter, y: ySpring },
      ]);
    } else {
      const stepH = metrics.tierStepHeight_m;
      const stepD = metrics.tierStepDepth_m;
      const n = Math.max(1, Math.round(extra / stepD));
      let y = yBot;
      for (let i = 0; i < n; i++) {
        const depthI = (i + 1) * stepD;
        const xOut =
          wall.side === "left" ? wall.xOuter - depthI : wall.xOuter + depthI;
        const xIn =
          wall.side === "left"
            ? wall.xOuter - i * stepD
            : wall.xOuter + i * stepD;
        const y1 = Math.min(ySpring, y + stepH);
        pushLoop(vertices, edges, faces, project, `${tag}${i}`, [
          { x: xOut, y },
          { x: xIn, y },
          { x: xIn, y: y1 },
          { x: xOut, y: y1 },
        ]);
        y = y1;
        if (y >= ySpring - 1e-9) break;
      }
    }
  }

  return {
    ...project,
    vertices,
    edges,
    faces,
    buttressFaceMode: mode,
  };
}

export { BUTTRESS_EXCESS, GROUND_ANGLE_AMBER, GROUND_ANGLE_RED };
