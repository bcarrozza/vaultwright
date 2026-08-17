import {
  courseHeightIn,
  headerThroughPitchIn,
  inchesToMetres,
  jointThicknessIn,
  metresToInches,
  snapQty,
  stretcherWythePitchIn,
  unitSizeIn,
} from "../catalog/brick";
import { FOOT_M } from "../catalog/units";
import { leftoverForFace } from "../geom/leftover";
import { COURSED_KINDS, SOLID_KINDS, facePolygon, isVoidKind } from "../geom/graph";
import { pointOnIntrados } from "../geom/arch";
import type { Face, Project, Warning } from "../model/project";
import { polygonAabb, polygonArea, polygonsOverlap, rejectOverlaps } from "./overlap";
import {
  generateRings,
  jointsNormalToCurve,
  keystoneCentered,
  type RingLayout,
} from "./ring";
import { courseKind, headerCourseIndices, resolveSliceZ } from "./bond";
import type {
  BondSliceMetrics,
  CircularArchMetrics,
  MasonryResult,
  Point,
  Stone2D,
  StoneSchedule,
  Unit3D,
  UnitRole,
} from "./types";
import { COLLAR_JOINT, OVERLAP, RING_OVERLAP } from "./warnings";

export type {
  BondSliceMetrics,
  CircularArchMetrics,
  MasonryResult,
  Stone2D,
  StoneSchedule,
  Unit3D,
};
export { COLLAR_JOINT, OVERLAP } from "./warnings";
export { polygonsOverlap, rejectOverlaps } from "./overlap";
export { courseKind, headerCourseIndices, resolveSliceZ };

const AREA_EPS = 1e-16;
const SIZE_EPS_IN = 1e-6;
const CLIP_EPS = 1e-12;

function floorPitches(lengthIn: number, pitchIn: number): number {
  if (pitchIn <= 0) return 0;
  const q = lengthIn / pitchIn;
  const nearest = Math.round(q);
  if (Math.abs(q - nearest) < 1e-9) return nearest;
  return Math.floor(q + 1e-12);
}

function rectPolygon(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): Point[] {
  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
}

function box(
  originX_in: number,
  originY_in: number,
  originZ_in: number,
  sizeX_in: number,
  sizeY_in: number,
  sizeZ_in: number,
): Pick<Unit3D, "minX" | "minY" | "minZ" | "maxX" | "maxY" | "maxZ"> {
  return {
    minX: inchesToMetres(originX_in),
    minY: inchesToMetres(originY_in),
    minZ: inchesToMetres(originZ_in),
    maxX: inchesToMetres(originX_in + sizeX_in),
    maxY: inchesToMetres(originY_in + sizeY_in),
    maxZ: inchesToMetres(originZ_in + sizeZ_in),
  };
}

function fillSolid(
  project: Project,
  face: Face,
  idStart = 0,
): { units3D: Unit3D[]; coursesFilled: number; headerCourseIndices: number[] } {
  const leftover = leftoverForFace(project, face);
  const catalogId = leftover.catalogId;
  const jointMode = leftover.jointMode;
  const brick = unitSizeIn(catalogId);
  const course_in = courseHeightIn(catalogId, jointMode);
  const headerPitchX_in = headerThroughPitchIn(catalogId, jointMode);
  const wythePitchX_in = stretcherWythePitchIn(catalogId, jointMode);
  const headerPitchZ_in = wythePitchX_in;
  const stretcherPitchZ_in = headerPitchX_in;
  const pattern = project.bondPattern ?? "common";
  const coursesFilled = Math.floor(leftover.coursesFilled);
  const nHeadersX = floorPitches(leftover.thicknessIn, headerPitchX_in);
  const nWythesX = floorPitches(leftover.thicknessIn, wythePitchX_in);
  const depthIn = metresToInches(project.sliceDepth);
  const nHeadersZ = floorPitches(depthIn, headerPitchZ_in);
  const nStretchersZ = floorPitches(depthIn, stretcherPitchZ_in);
  const originX_in = metresToInches(leftover.bounds.minX);
  const originY_in = metresToInches(leftover.bounds.minY);
  const indices = headerCourseIndices(coursesFilled, pattern);
  const units3D: Unit3D[] = [];
  let n = idStart;

  for (let course = 0; course < coursesFilled; course++) {
    const y_in = originY_in + course * course_in;
    const kind = courseKind(course, pattern);
    if (kind === "header") {
      for (let ix = 0; ix < nHeadersX; ix++) {
        for (let iz = 0; iz < nHeadersZ; iz++) {
          units3D.push({
            id: `u${n++}`,
            role: "header",
            courseIndex: course,
            ...box(
              originX_in + ix * headerPitchX_in,
              y_in,
              iz * headerPitchZ_in,
              brick.length,
              brick.height,
              brick.width,
            ),
          });
        }
      }
    } else {
      for (let ix = 0; ix < nWythesX; ix++) {
        for (let iz = 0; iz < nStretchersZ; iz++) {
          units3D.push({
            id: `u${n++}`,
            role: "stretcher",
            courseIndex: course,
            ...box(
              originX_in + ix * wythePitchX_in,
              y_in,
              iz * stretcherPitchZ_in,
              brick.width,
              brick.height,
              brick.length,
            ),
          });
        }
      }
    }
  }

  return { units3D, coursesFilled, headerCourseIndices: indices };
}

function overlapsVoussoir(rect: Point[], voussoirs: Point[][]): boolean {
  return voussoirs.some((poly) => polygonsOverlap(rect, poly));
}

function inAnnulusSweep(p: Point, layout: RingLayout): boolean {
  const dx = p.x - layout.cx;
  const dy = p.y - layout.cy;
  const r = Math.hypot(dx, dy);
  if (r <= layout.rin + 1e-9 || r >= layout.rout - 1e-9) return false;
  const phi = Math.atan2(dy, dx);
  const lo = Math.min(layout.phiLeft, layout.phiRight);
  const hi = Math.max(layout.phiLeft, layout.phiRight);
  return phi > lo + 1e-9 && phi < hi - 1e-9;
}

function hitsRing(
  rect: Point[],
  voussoirs: Point[][],
  layouts: RingLayout[],
): boolean {
  if (overlapsVoussoir(rect, voussoirs)) return true;
  const cx = (rect[0]!.x + rect[2]!.x) / 2;
  const cy = (rect[0]!.y + rect[2]!.y) / 2;
  const samples = [...rect, { x: cx, y: cy }];
  for (const layout of layouts) {
    for (const p of samples) {
      if (inAnnulusSweep(p, layout)) return true;
    }
  }
  return false;
}

/** Horizontal bed clip at springing; omit the rest (toothing, not a circular saw-cut). */
function toothIntoSpringing(
  units: Unit3D[],
  voussoirPolys: Point[][],
  springingYs: number[],
  layouts: RingLayout[],
): Unit3D[] {
  if (voussoirPolys.length === 0) return units;
  const kept: Unit3D[] = [];
  for (const unit of units) {
    const rect = rectPolygon(unit.minX, unit.minY, unit.maxX, unit.maxY);
    if (!hitsRing(rect, voussoirPolys, layouts)) {
      kept.push(unit);
      continue;
    }
    let clipped: Unit3D | null = null;
    for (const y of springingYs) {
      if (unit.minY < y - CLIP_EPS && unit.maxY > y + CLIP_EPS) {
        const next = { ...unit, maxY: y };
        if (next.maxY - next.minY <= CLIP_EPS) continue;
        const clipRect = rectPolygon(next.minX, next.minY, next.maxX, next.maxY);
        if (!hitsRing(clipRect, voussoirPolys, layouts)) {
          clipped = next;
          break;
        }
      }
    }
    if (clipped) kept.push(clipped);
  }
  return kept;
}

function bedFaceArea_m2(catalogId: string | undefined): number {
  const brick = unitSizeIn(catalogId);
  return inchesToMetres(brick.length) * inchesToMetres(brick.width);
}

function sliceUnits(
  units: Unit3D[],
  sliceZ: number,
  sliverArea: number,
): Stone2D[] {
  const stones: Stone2D[] = [];
  let n = 0;
  for (const unit of units) {
    if (!(unit.minZ < sliceZ && sliceZ < unit.maxZ)) continue;
    const polygon =
      unit.polygon ?? rectPolygon(unit.minX, unit.minY, unit.maxX, unit.maxY);
    if (polygonArea(polygon) < sliverArea) continue;
    stones.push({
      id: `s${n++}`,
      unitId: unit.id,
      role: unit.role,
      courseIndex: unit.courseIndex,
      polygon,
    });
  }
  return stones;
}

function extentX_in(stone: Stone2D): number {
  const aabb = polygonAabb(stone.polygon);
  return metresToInches(aabb.maxX - aabb.minX);
}

function hasCollarJoint(
  stones: Stone2D[],
  catalogId: string | undefined,
): boolean {
  const brick = unitSizeIn(catalogId);
  const byCourse = new Map<number, Stone2D[]>();
  for (const stone of stones) {
    const list = byCourse.get(stone.courseIndex) ?? [];
    list.push(stone);
    byCourse.set(stone.courseIndex, list);
  }
  let anyThrough = false;
  let maxWythes = 0;
  for (const course of byCourse.values()) {
    let wythes = 0;
    for (const stone of course) {
      const xIn = extentX_in(stone);
      if (
        stone.role === "header" ||
        stone.role === "through" ||
        Math.abs(xIn - brick.length) < SIZE_EPS_IN
      ) {
        anyThrough = true;
      }
      if (
        stone.role === "stretcher" ||
        Math.abs(xIn - brick.width) < SIZE_EPS_IN
      ) {
        wythes += 1;
      }
    }
    if (wythes > maxWythes) maxWythes = wythes;
  }
  return !anyThrough && maxWythes > 2;
}

function countRole(items: { role: UnitRole }[], role: UnitRole): number {
  let n = 0;
  for (const item of items) {
    if (item.role === role) n += 1;
  }
  return n;
}

function scheduleOf(units3D: Unit3D[], stones2D: Stone2D[]): StoneSchedule {
  return {
    headers3D: countRole(units3D, "header"),
    stretchers3D: countRole(units3D, "stretcher"),
    through3D: countRole(units3D, "through"),
    closers3D: countRole(units3D, "closer"),
    voussoirs3D: countRole(units3D, "voussoir"),
    total3D: units3D.length,
    headersInSlice: countRole(stones2D, "header"),
    stretchersInSlice: countRole(stones2D, "stretcher"),
    totalInSlice: stones2D.length,
  };
}

function masonryWarnings(
  overlapCount: number,
  collar: boolean,
  faceId: string,
): Warning[] {
  const warnings: Warning[] = [];
  if (overlapCount > 0) {
    warnings.push({
      code: OVERLAP,
      severity: "red",
      message: "2D polygons intersect after slice. Do not emit intersections.",
      targetId: faceId,
    });
  }
  if (collar) {
    warnings.push({
      code: COLLAR_JOINT,
      severity: "amber",
      message:
        "Stretcher-course slice: continuous collar through more than two wythes.",
      targetId: faceId,
    });
  }
  return warnings;
}

function masonryTargets(project: Project, face?: Face): Face[] {
  if (face) return [face];
  return project.faces.filter((f) => SOLID_KINDS.has(f.regionKind));
}

/** ADR-005 steps 2–3: 3D bond fill of extruded solids, then sliceZ polygons. */
function archRingsOverlap(project: Project): boolean {
  const rings = project.faces.filter((f) => f.regionKind === "archRing");
  for (let i = 0; i < rings.length; i++) {
    const a = facePolygon(project, rings[i]!);
    for (let j = i + 1; j < rings.length; j++) {
      if (polygonsOverlap(a, facePolygon(project, rings[j]!))) return true;
    }
  }
  return false;
}

export function generateMasonry(
  project: Project,
  face?: Face,
): MasonryResult {
  if (archRingsOverlap(project)) {
    return {
      units3D: [],
      stones2D: [],
      warnings: [
        {
          code: RING_OVERLAP,
          severity: "red",
          message: "Two archRing faces overlap. Generation is blocked.",
        },
      ],
      overlapCount: 0,
      sliceZ: 0,
      sliceZMode: project.sliceZMode ?? "header-course",
      bondPattern: project.bondPattern ?? "common",
      bottomCourse: "header",
      coursesFilled: 0,
      headerCourseIndices: [],
      schedule: scheduleOf([], []),
    };
  }
  const targets = masonryTargets(project, face);
  if (targets.length === 0) {
    throw new Error("No masonry face");
  }
  const coursed = targets.filter((f) => COURSED_KINDS.has(f.regionKind));
  const catalogId =
    coursed[0]?.unitCatalogId ??
    targets[0]?.unitCatalogId ??
    project.unitCatalogId;
  const { sliceZ, sliceZMode } = resolveSliceZ(project, catalogId);
  const rings = generateRings(project);
  const includeRings =
    face == null || face.regionKind === "archRing";
  const units3D: Unit3D[] = includeRings ? [...rings.units3D] : [];
  const voussoirPolys = rings.units3D
    .filter((u) => u.polygon)
    .map((u) => u.polygon!);
  const springingYs = [...new Set(rings.layouts.map((r) => r.springingY))];
  let coursesFilled = 0;
  let headerIndices: number[] = [];
  let nextId = rings.units3D.length;

  for (const item of coursed) {
    const filled = fillSolid(project, item, nextId);
    nextId += filled.units3D.length;
    units3D.push(
      ...toothIntoSpringing(
        filled.units3D,
        voussoirPolys,
        springingYs,
        rings.layouts,
      ),
    );
    if (filled.coursesFilled > coursesFilled) {
      coursesFilled = filled.coursesFilled;
      headerIndices = filled.headerCourseIndices;
    }
  }

  const sliverArea = 0.1 * bedFaceArea_m2(catalogId);
  const raw = sliceUnits(units3D, sliceZ, sliverArea).filter(
    (stone) => polygonArea(stone.polygon) >= sliverArea - AREA_EPS,
  );
  const { stones, overlapCount } = rejectOverlaps(raw);
  const collar = hasCollarJoint(
    stones.filter((s) => s.role === "header" || s.role === "stretcher"),
    catalogId,
  );
  const bondPattern = project.bondPattern ?? "common";
  return {
    units3D,
    stones2D: stones,
    warnings: masonryWarnings(overlapCount, collar, targets[0]!.id),
    overlapCount,
    sliceZ,
    sliceZMode,
    bondPattern,
    bottomCourse: "header",
    coursesFilled,
    headerCourseIndices: headerIndices,
    schedule: scheduleOf(units3D, stones),
  };
}

function blocksPerCourse(
  stones: Stone2D[],
  courseIndices: number[],
): number {
  if (courseIndices.length === 0) return 0;
  const counts = courseIndices.map(
    (i) => stones.filter((s) => s.courseIndex === i).length,
  );
  return counts[0] ?? 0;
}

function hasCode(warnings: Warning[], code: string): boolean {
  return warnings.some((w) => w.code === code);
}

/** Fixture lock for S02 (`docs/fixtures/s02-bond-slice/expected.json`). */
export function bondSliceMetrics(project: Project): BondSliceMetrics {
  const header = generateMasonry({ ...project, sliceZMode: "header-course" });
  const stretcher = generateMasonry({
    ...project,
    sliceZMode: "stretcher-course",
  });
  const leftover = leftoverForFace(
    project,
    coursedOrThrow(project),
  );
  const brick = unitSizeIn(leftover.catalogId);
  const stretcherIndices = [];
  for (let i = 0; i < header.coursesFilled; i++) {
    if (!header.headerCourseIndices.includes(i)) stretcherIndices.push(i);
  }
  return {
    bondPattern: header.bondPattern,
    bottomCourse: "header",
    sliceZMode: "header-course",
    coursesFilled: header.coursesFilled,
    headerCourseIndices: header.headerCourseIndices,
    headerCourses: header.headerCourseIndices.length,
    stretcherCourses: stretcherIndices.length,
    headerBlocksPerCourse: blocksPerCourse(
      header.stones2D,
      header.headerCourseIndices,
    ),
    stretcherBlocksPerCourse: blocksPerCourse(header.stones2D, stretcherIndices),
    slicePolygonCount: header.stones2D.length,
    overlapCount: header.overlapCount,
    collarJointWarningOnHeaderSlice: hasCode(header.warnings, COLLAR_JOINT),
    collarJointWarningOnStretcherSlice: hasCode(
      stretcher.warnings,
      COLLAR_JOINT,
    ),
    stoneActual_in: {
      length: brick.length,
      width: brick.width,
      height: brick.height,
    },
    joint_in: jointThicknessIn(leftover.jointMode),
  };
}

function coursedOrThrow(project: Project): Face {
  const face = project.faces.find((f) => COURSED_KINDS.has(f.regionKind));
  if (!face) throw new Error("No masonry face");
  return face;
}

export function stoneSizeIn(stone: Stone2D): { x: number; y: number } {
  const aabb = polygonAabb(stone.polygon);
  return {
    x: snapQty(metresToInches(aabb.maxX - aabb.minX)),
    y: snapQty(metresToInches(aabb.maxY - aabb.minY)),
  };
}

function centroid(polygon: Point[]): Point {
  let x = 0;
  let y = 0;
  for (const p of polygon) {
    x += p.x;
    y += p.y;
  }
  const n = polygon.length || 1;
  return { x: x / n, y: y / n };
}

function stoneInVoid(layout: RingLayout, stones: Stone2D[]): boolean {
  const left = layout.cx - layout.rin + 1e-9;
  const right = layout.cx + layout.rin - 1e-9;
  for (const stone of stones) {
    const c = centroid(stone.polygon);
    if (c.x <= left || c.x >= right) continue;
    const yInt = pointOnIntrados(layout.cx, layout.cy, layout.rin, c.x);
    if (yInt != null && c.y >= 0 && c.y < yInt - 1e-9) return true;
  }
  return false;
}

/** Fixture lock for S03 (`docs/fixtures/s03-circular-arch/expected.json`). */
export function circularArchMetrics(project: Project): CircularArchMetrics {
  const result = generateMasonry(project);
  const rings = generateRings(project);
  const layout = rings.layouts[0];
  if (!layout) {
    throw new Error("No arch ring");
  }
  const voidFaces = project.faces.filter((f) => isVoidKind(f.regionKind));
  const voidLocked =
    voidFaces.length > 0 &&
    voidFaces.every((f) => isVoidKind(f.regionKind)) &&
    !stoneInVoid(layout, result.stones2D);
  return {
    span_m: layout.span,
    span_ft: snapQty(layout.span / FOOT_M),
    r0_m: layout.rin,
    t_m: layout.t,
    t_in: metresToInches(layout.t),
    Nv: layout.Nv,
    NvOdd: layout.Nv % 2 === 1,
    N: layout.N,
    vaultBond: layout.vaultBond,
    jointAngle_deg: Math.round((180 / layout.Nv) * 1e10) / 1e10,
    jointsNormalToCurve: jointsNormalToCurve(layout),
    keystoneCenteredInDefaultSlice: keystoneCentered(layout, result.sliceZ),
    overlapCount: result.overlapCount,
    voussoirsInSlice: countRole(result.stones2D, "voussoir"),
    fillFaces: project.faces.filter((f) => f.regionKind === "fill").length,
    voidLocked,
  };
}
