import { faceBounds } from "../geom/graph";
import { GROUND_LINE_Y } from "../geom/coords";
import type {
  Face,
  Foundation,
  Project,
  SoilPreset,
  Warning,
} from "../model/project";
import {
  FOOTING_USER_EDITED,
  FROST_SHALLOW,
  NO_FOUNDATION,
} from "../masonry/warnings";
import { buttressMetrics } from "./buttress";
import { round3 } from "./funicular";

export const DEFAULT_DEPTH_M = 1.2192;
export const DEFAULT_FROST_M = 0.9144;
export const DEFAULT_BEARING_PA = 150_000;
export const DEFAULT_MU_SOIL = 0.4;
export const STEP_ANGLE_DEG = 60;
export const NO_REBAR = true;
export const NO_PILES = true;
export const NO_GRADE_BEAMS = true;
export const NO_FROST_HEAVE = true;

export const SOIL: Record<SoilPreset, { bearingPa: number; mu: number }> = {
  "soft-clay": { bearingPa: 75_000, mu: 0.3 },
  "stiff-clay-firm-sand": { bearingPa: 150_000, mu: 0.4 },
  "dense-sand-gravel": { bearingPa: 250_000, mu: 0.5 },
  bedrock: { bearingPa: 500_000, mu: 0.6 },
};

export type FootingCheck = {
  supportId: string;
  faceId: string;
  depth_m: number;
  width_m: number;
  bearingPa: number;
  bearingOk: boolean;
  middleThirdOk: boolean;
  slideOk: boolean;
  frostOk: boolean;
  userEdited: boolean;
};

export type FootingMetrics = {
  soilPreset: SoilPreset;
  allowableBearingPa: number;
  muSoil: number;
  defaultDepth_m: number;
  frostLineDepth_m: number;
  frostStatus: "OK" | "too shallow";
  stepAngle_deg: number;
  noRebar: true;
  noPiles: true;
  noGradeBeams: true;
  noFrostHeave: true;
  checks: FootingCheck[];
  warnings: Warning[];
};

function soilOf(project: Project) {
  const preset: SoilPreset = project.soilPreset ?? "stiff-clay-firm-sand";
  return { preset, ...SOIL[preset] };
}

function supports(project: Project): Face[] {
  return project.faces.filter(
    (f) =>
      f.regionKind === "masonryWall" ||
      f.regionKind === "masonryPier" ||
      f.regionKind === "buttress",
  );
}

function foundationForSupport(
  project: Project,
  support: Face,
): Face | undefined {
  const linked = project.foundations?.find((f) => f.faceId === support.id);
  if (linked) return project.faces.find((f) => f.id === linked.id);
  return project.faces.find(
    (f) => f.regionKind === "foundation" && f.id === `found-${support.id}`,
  );
}

function projection(depth: number): number {
  return depth / Math.tan((STEP_ANGLE_DEG * Math.PI) / 180);
}

function pushFoundationGeom(project: Project, support: Face, depth: number) {
  const b = faceBounds(project, support);
  const proj = projection(depth);
  const minX = b.minX - proj;
  const maxX = b.maxX + proj;
  const yTop = GROUND_LINE_Y;
  const yBot = GROUND_LINE_Y - depth;
  const tag = `found-${support.id}`;
  const vertices = [
    { id: `${tag}-v0`, x: minX, y: yBot },
    { id: `${tag}-v1`, x: maxX, y: yBot },
    { id: `${tag}-v2`, x: b.maxX, y: yTop },
    { id: `${tag}-v3`, x: b.minX, y: yTop },
  ];
  const edges = [
    { id: `${tag}-e0`, kind: "line" as const, start: `${tag}-v0`, end: `${tag}-v1` },
    { id: `${tag}-e1`, kind: "line" as const, start: `${tag}-v1`, end: `${tag}-v2` },
    { id: `${tag}-e2`, kind: "line" as const, start: `${tag}-v2`, end: `${tag}-v3` },
    { id: `${tag}-e3`, kind: "line" as const, start: `${tag}-v3`, end: `${tag}-v0` },
  ];
  const face: Face = {
    id: tag,
    regionKind: "foundation",
    materialId: support.materialId ?? "fired-brick",
    unitCatalogId: support.unitCatalogId ?? project.unitCatalogId,
    loop: edges.map((e) => e.id),
    userEdited: false,
  };
  return { vertices, edges, face };
}

export function generateFootings(
  project: Project,
  opts?: { forceAll?: boolean },
): Project {
  const depth = project.foundationDepthDefault ?? DEFAULT_DEPTH_M;
  const keepEdited = !opts?.forceAll;
  const supportList = supports(project);
  const editedIds = new Set(
    (project.foundations ?? []).filter((f) => f.userEdited).map((f) => f.id),
  );
  const keptFoundations = project.faces.filter(
    (f) =>
      f.regionKind === "foundation" &&
      keepEdited &&
      (f.userEdited === true || editedIds.has(f.id)),
  );
  const keptIds = new Set(keptFoundations.map((f) => f.id));
  let vertices = project.vertices.filter((v) => !v.id.startsWith("found-"));
  let edges = project.edges.filter((e) => !e.id.startsWith("found-"));
  for (const id of keptIds) {
    vertices.push(
      ...project.vertices.filter((v) => v.id.startsWith(`${id}-`)),
    );
    edges.push(...project.edges.filter((e) => e.id.startsWith(`${id}-`)));
  }
  const faces = [
    ...project.faces.filter(
      (f) => f.regionKind !== "foundation" || keptIds.has(f.id),
    ),
  ];
  const foundations: Foundation[] = (project.foundations ?? []).filter((f) =>
    keptIds.has(f.id),
  );
  for (const support of supportList) {
    const rec = project.foundations?.find((f) => f.faceId === support.id);
    const existing = foundationForSupport(project, support);
    if (keepEdited && (existing?.userEdited || rec?.userEdited)) {
      if (rec && !foundations.some((f) => f.id === rec.id)) {
        foundations.push(rec);
      }
      continue;
    }
    const geom = pushFoundationGeom(project, support, depth);
    vertices.push(...geom.vertices);
    edges.push(...geom.edges);
    faces.push(geom.face);
    foundations.push({
      id: geom.face.id,
      autoGenerated: true,
      userEdited: false,
      faceId: support.id,
    });
  }
  return { ...project, vertices, edges, faces, foundations };
}

export function regenerateFootings(project: Project, all: boolean): Project {
  return generateFootings(project, { forceAll: all });
}

export function footingMetrics(project: Project): FootingMetrics {
  const { preset, bearingPa, mu } = soilOf(project);
  const depth = project.foundationDepthDefault ?? DEFAULT_DEPTH_M;
  const frost = project.frostLineDepth ?? DEFAULT_FROST_M;
  let N = 0;
  let H = 0;
  try {
    const bm = buttressMetrics(project);
    N = bm.V_ground_N;
    H = bm.H_N;
  } catch {
    N = 0;
    H = 0;
  }
  const slice = project.sliceDepth || 1;
  const checks: FootingCheck[] = [];
  const warnings: Warning[] = [];
  for (const support of supports(project)) {
    const found = foundationForSupport(project, support);
    const rec = project.foundations?.find((f) => f.faceId === support.id);
    if (!found) {
      warnings.push({
        code: NO_FOUNDATION,
        severity: "red",
        message: `Support ${support.id} has no foundation face.`,
        targetId: support.id,
      });
      continue;
    }
    const b = faceBounds(project, found);
    const width = b.maxX - b.minX;
    const actualDepth = GROUND_LINE_Y - b.minY;
    const area = width * slice;
    const bearing = area > 0 ? N / area : Infinity;
    const mid = (b.minX + b.maxX) / 2;
    const wall = faceBounds(project, support);
    const e = (wall.minX + wall.maxX) / 2 - mid;
    const userEdited = found.userEdited === true || rec?.userEdited === true;
    checks.push({
      supportId: support.id,
      faceId: found.id,
      depth_m: round3(actualDepth),
      width_m: round3(width),
      bearingPa: round3(bearing),
      bearingOk: bearing <= bearingPa + 1e-6,
      middleThirdOk: Math.abs(e) <= width / 6 + 1e-9,
      slideOk: H <= mu * N + 1e-6,
      frostOk: actualDepth + 1e-9 >= frost,
      userEdited,
    });
    if (actualDepth + 1e-9 < frost) {
      warnings.push({
        code: FROST_SHALLOW,
        severity: "amber",
        message: "Footing depth is shallower than the frost line.",
        targetId: found.id,
      });
    }
    if (userEdited) {
      warnings.push({
        code: FOOTING_USER_EDITED,
        severity: "info",
        message: "Footing is user-edited; auto-update skipped.",
        targetId: found.id,
      });
    }
  }
  const frostStatus: "OK" | "too shallow" =
    depth + 1e-9 >= frost ? "OK" : "too shallow";
  if (
    frostStatus === "too shallow" &&
    !warnings.some((w) => w.code === FROST_SHALLOW)
  ) {
    warnings.push({
      code: FROST_SHALLOW,
      severity: "amber",
      message: "Footing depth is shallower than the frost line.",
    });
  }
  return {
    soilPreset: preset,
    allowableBearingPa: bearingPa,
    muSoil: mu,
    defaultDepth_m: depth,
    frostLineDepth_m: frost,
    frostStatus,
    stepAngle_deg: STEP_ANGLE_DEG,
    noRebar: true,
    noPiles: true,
    noGradeBeams: true,
    noFrostHeave: true,
    checks,
    warnings,
  };
}

export { FROST_SHALLOW, NO_FOUNDATION, FOOTING_USER_EDITED };
