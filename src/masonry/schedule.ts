import { leftoverForFace } from "../geom/leftover";
import { COURSED_KINDS, faceBounds, facePolygon } from "../geom/graph";
import type { Project } from "../model/project";
import { polygonArea } from "./overlap";
import type { MasonryResult, Unit3D } from "./types";

export type ScheduleRow = {
  role: string;
  count3D: number;
  countInSlice: number;
};

export type FaceMass = {
  faceId: string;
  regionKind: string;
  thickness_m: number;
  area_m2: number;
  mass_kg: number;
};

export type ScheduleReport = {
  rows: ScheduleRow[];
  rubbleVolume_m3: number;
  cutStoneVolume_m3: number;
  totalMass_kg: number;
  heaviestPiece_kg: number;
  leftoverByFace: { faceId: string; leftoverHeight_m: number }[];
  thermal: FaceMass[];
  csv: string;
};

function unitVolume(u: Unit3D): number {
  return Math.max(0, u.maxX - u.minX) * Math.max(0, u.maxY - u.minY) * Math.max(0, u.maxZ - u.minZ);
}

export function scheduleReport(
  project: Project,
  masonry: MasonryResult,
): ScheduleReport {
  const roles = ["header", "stretcher", "through", "closer", "voussoir"] as const;
  const rows: ScheduleRow[] = roles.map((role) => ({
    role,
    count3D: masonry.units3D.filter((u) => u.role === role).length,
    countInSlice: masonry.stones2D.filter((s) => s.role === role).length,
  }));
  let rubbleVolume_m3 = 0;
  for (const face of project.faces.filter((f) => f.regionKind === "rubble")) {
    rubbleVolume_m3 += polygonArea(facePolygon(project, face)) * project.sliceDepth;
  }
  const density = (id?: string) =>
    project.materials?.find((m) => m.id === id)?.density ?? 1800;
  let cutStoneVolume_m3 = 0;
  let totalMass_kg = 0;
  let heaviestPiece_kg = 0;
  for (const u of masonry.units3D) {
    const v = unitVolume(u);
    cutStoneVolume_m3 += v;
    const m = v * density("fired-brick");
    totalMass_kg += m;
    if (m > heaviestPiece_kg) heaviestPiece_kg = m;
  }
  totalMass_kg += rubbleVolume_m3 * density("fired-brick");
  const leftoverByFace = project.faces
    .filter((f) => COURSED_KINDS.has(f.regionKind))
    .map((f) => {
      try {
        return {
          faceId: f.id,
            leftoverHeight_m: leftoverForFace(project, f).leftoverHeight_in *
              0.0254,
        };
      } catch {
        return { faceId: f.id, leftoverHeight_m: 0 };
      }
    });
  const thermal: FaceMass[] = project.faces
    .filter(
      (f) =>
        f.regionKind === "masonryWall" ||
        f.regionKind === "masonryPier" ||
        f.regionKind === "deck" ||
        f.regionKind === "archRing",
    )
    .map((f) => {
      const b = faceBounds(project, f);
      const area = polygonArea(facePolygon(project, f));
      const thickness = b.maxX - b.minX;
      const mass = area * project.sliceDepth * density(f.materialId);
      return {
        faceId: f.id,
        regionKind: f.regionKind,
        thickness_m: thickness,
        area_m2: area,
        mass_kg: mass,
      };
    });
  const csvLines = [
    "role,count3D,countInSlice",
    ...rows.map((r) => `${r.role},${r.count3D},${r.countInSlice}`),
    `rubbleVolume_m3,${rubbleVolume_m3},`,
    `heaviestPiece_kg,${heaviestPiece_kg},`,
    ...leftoverByFace.map(
      (l) => `leftover_${l.faceId},${l.leftoverHeight_m},`,
    ),
  ];
  return {
    rows,
    rubbleVolume_m3,
    cutStoneVolume_m3,
    totalMass_kg,
    heaviestPiece_kg,
    leftoverByFace,
    thermal,
    csv: csvLines.join("\n"),
  };
}
