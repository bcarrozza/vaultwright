import {
  inchesToMetres,
  jointThicknessIn,
  metresToInches,
  unitSizeIn,
} from "../catalog/brick";
import { circularArc, polar, type Point } from "../geom/arch";
import { edgeById, vertexById } from "../geom/graph";
import type { ArchMember, Face, Project } from "../model/project";
import { polygonAabb } from "./overlap";
import type { Unit3D } from "./types";

export type RingLayout = {
  cx: number;
  cy: number;
  rin: number;
  rout: number;
  t: number;
  Nv: number;
  N: number;
  vaultBond: NonNullable<ArchMember["vaultBond"]>;
  span: number;
  phiLeft: number;
  phiRight: number;
  phiVia: number;
  sweep: number;
  springingY: number;
  units3D: Unit3D[];
};

function floorPitches(lengthIn: number, pitchIn: number): number {
  if (pitchIn <= 0) return 0;
  const q = lengthIn / pitchIn;
  const nearest = Math.round(q);
  if (Math.abs(q - nearest) < 1e-9) return nearest;
  return Math.floor(q + 1e-12);
}

function oddNv(n: number | undefined): number {
  const v = n != null && n > 0 ? Math.round(n) : 7;
  if (v % 2 === 0) return v + 1;
  return v;
}

function jointPhis(arcPhi0: number, sweep: number, Nv: number, staggered: boolean): number[] {
  if (!staggered) {
    const phis: number[] = [];
    for (let i = 0; i <= Nv; i++) phis.push(arcPhi0 + (i / Nv) * sweep);
    return phis;
  }
  const phis = [arcPhi0];
  for (let i = 0; i < Nv; i++) {
    phis.push(arcPhi0 + ((i + 0.5) / Nv) * sweep);
  }
  phis.push(arcPhi0 + sweep);
  return phis;
}

function voussoirPolygon(
  cx: number,
  cy: number,
  rin: number,
  rout: number,
  phi0: number,
  phi1: number,
): Point[] {
  return [
    polar(cx, cy, rin, phi0),
    polar(cx, cy, rout, phi0),
    polar(cx, cy, rout, phi1),
    polar(cx, cy, rin, phi1),
  ];
}

function boxFromPolygon(
  polygon: Point[],
  minZ: number,
  maxZ: number,
): Pick<Unit3D, "minX" | "minY" | "minZ" | "maxX" | "maxY" | "maxZ"> {
  const aabb = polygonAabb(polygon);
  return {
    minX: aabb.minX,
    minY: aabb.minY,
    minZ,
    maxX: aabb.maxX,
    maxY: aabb.maxY,
    maxZ,
  };
}

function pickIntrados(project: Project, face: Face) {
  const arches = face.loop
    .map((id) => edgeById(project, id))
    .filter((e) => e.kind === "arch" && e.rise != null)
    .map((edge) => {
      const start = vertexById(project, edge.start);
      const end = vertexById(project, edge.end);
      const chord = Math.hypot(end.x - start.x, end.y - start.y);
      return { edge, start, end, chord };
    });
  if (arches.length === 0) return null;
  arches.sort((a, b) => a.chord - b.chord);
  return arches[0]!;
}

export function ringMember(
  project: Project,
  face: Face,
): ArchMember | undefined {
  return project.archMembers?.find((m) => m.faceId === face.id);
}

/**
 * Barrel of cut voussoirs: equal arc-length joints normal to the curve,
 * odd Nv with keystone on even Z-rings, half-brick stagger on odd Z-rings.
 */
export function generateRing(
  project: Project,
  face: Face,
  idStart = 0,
): RingLayout | null {
  const picked = pickIntrados(project, face);
  if (!picked) return null;
  const member = ringMember(project, face);
  const t = member?.t ?? face.ringThickness ?? 0;
  if (t <= 0) return null;
  const Nv = oddNv(member?.Nv);
  const N = member?.N != null && member.N > 0 ? member.N : 1;
  const vaultBond = member?.vaultBond ?? "ashlar-ring";
  const arc = circularArc(picked.start, picked.end, picked.edge.rise!);
  const rin = member?.r0 ?? arc.r;
  const rout = rin + t * N;
  const span = picked.chord;
  const catalogId = face.unitCatalogId ?? "ashlar-12";
  const ashlar = unitSizeIn(catalogId);
  const joint = jointThicknessIn(project.jointMode);
  const zPitchIn = ashlar.length + joint;
  const depthIn = metresToInches(project.sliceDepth);
  const nZ = floorPitches(depthIn, zPitchIn);
  const zSize = inchesToMetres(ashlar.length);
  const zPitch = inchesToMetres(zPitchIn);
  const units3D: Unit3D[] = [];
  let n = idStart;

  for (let iz = 0; iz < nZ; iz++) {
    const staggered = iz % 2 === 1;
    const phis = jointPhis(arc.phiStart, arc.sweep, Nv, staggered);
    const minZ = iz * zPitch;
    const maxZ = minZ + zSize;
    for (let i = 0; i < phis.length - 1; i++) {
      const polygon = voussoirPolygon(
        arc.cx,
        arc.cy,
        rin,
        rout,
        phis[i]!,
        phis[i + 1]!,
      );
      const half =
        staggered && (i === 0 || i === phis.length - 2);
      units3D.push({
        id: `u${n++}`,
        role: half ? "closer" : "voussoir",
        courseIndex: i,
        ...boxFromPolygon(polygon, minZ, maxZ),
        polygon,
      });
    }
  }

  return {
    cx: arc.cx,
    cy: arc.cy,
    rin,
    rout,
    t,
    Nv,
    N,
    vaultBond,
    span,
    phiLeft: arc.phiStart,
    phiRight: arc.phiEnd,
    phiVia: arc.phiVia,
    sweep: arc.sweep,
    springingY: (picked.start.y + picked.end.y) / 2,
    units3D,
  };
}

export function generateRings(
  project: Project,
  idStart = 0,
): { layouts: RingLayout[]; units3D: Unit3D[] } {
  const layouts: RingLayout[] = [];
  const units3D: Unit3D[] = [];
  let n = idStart;
  for (const face of project.faces) {
    if (face.regionKind !== "archRing") continue;
    const layout = generateRing(project, face, n);
    if (!layout) continue;
    n += layout.units3D.length;
    layouts.push(layout);
    units3D.push(...layout.units3D);
  }
  return { layouts, units3D };
}

export function jointsNormalToCurve(layout: RingLayout): boolean {
  const phis = jointPhis(layout.phiLeft, layout.sweep, layout.Nv, false);
  for (const phi of phis) {
    const inner = polar(layout.cx, layout.cy, layout.rin, phi);
    const outer = polar(layout.cx, layout.cy, layout.rout, phi);
    const cross =
      (inner.x - layout.cx) * (outer.y - layout.cy) -
      (inner.y - layout.cy) * (outer.x - layout.cx);
    const radial =
      Math.abs(Math.hypot(outer.x - inner.x, outer.y - inner.y) - layout.t) <
      1e-9;
    if (Math.abs(cross) > 1e-9 || !radial) return false;
  }
  return true;
}

export function keystoneCentered(
  layout: RingLayout,
  sliceZ: number,
): boolean {
  const key = layout.units3D.find((u) => {
    if (u.role !== "voussoir") return false;
    if (!(u.minZ < sliceZ && sliceZ < u.maxZ)) return false;
    if (!u.polygon || u.polygon.length < 4) return false;
    const midPhi = Math.atan2(
      (u.polygon[0]!.y + u.polygon[3]!.y) / 2 - layout.cy,
      (u.polygon[0]!.x + u.polygon[3]!.x) / 2 - layout.cx,
    );
    return Math.abs(midPhi - Math.PI / 2) < 1e-6;
  });
  return key != null;
}
