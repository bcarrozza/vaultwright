import { circularArc } from "../geom/arch";
import { edgeById, vertexById } from "../geom/graph";
import type { ArchMember, Face, Project } from "../model/project";

export type VoussoirWeight = {
  index: number;
  phiMid: number;
  x: number;
  y: number;
  W: number;
};

export type RingLoadModel = {
  cx: number;
  cy: number;
  r0: number;
  t: number;
  rin: number;
  rout: number;
  Nv: number;
  depth: number;
  g: number;
  density: number;
  factor: number;
  volumeEach: number;
  W_each: number;
  W_tot: number;
  rBar: number;
  phiStart: number;
  sweep: number;
  voussoirs: VoussoirWeight[];
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function ringFace(project: Project): Face | undefined {
  return project.faces.find((f) => f.regionKind === "archRing");
}

function memberOf(project: Project, face: Face): ArchMember | undefined {
  return project.archMembers?.find((m) => m.faceId === face.id);
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

function limestoneDensity(project: Project, face: Face): number {
  const id = face.materialId;
  const mat = project.materials?.find((m) => m.id === id);
  return mat?.density ?? 2400;
}

/** Equal annular sectors on the centerline (worked examples §5). */
export function ringLoadModelForFace(
  project: Project,
  face: Face,
  factored?: boolean,
): RingLoadModel | null {
  const picked = pickIntrados(project, face);
  if (!picked) return null;
  const member = memberOf(project, face);
  const t = member?.t ?? face.ringThickness ?? 0;
  if (t <= 0) return null;
  const Nv = member?.Nv != null && member.Nv > 0 ? Math.round(member.Nv) : 7;
  const arc = circularArc(picked.start, picked.end, picked.edge.rise!);
  const r0 = member?.r0 ?? arc.r;
  const rin = r0 - t / 2;
  const rout = r0 + t / 2;
  const depth = project.sliceDepth;
  const g = project.g ?? 9.81;
  const density = limestoneDensity(project, face);
  const useFactor = factored ?? project.loadFactorsOn === true;
  const factor = useFactor ? 1.4 : 1;
  const dphi = Math.PI / Nv;
  const volumeEach = 0.5 * (rout * rout - rin * rin) * dphi * depth;
  const rBar =
    ((2 / 3) * (rout ** 3 - rin ** 3)) / (rout * rout - rin * rin);
  const W_each = volumeEach * density * g * factor;
  const voussoirs: VoussoirWeight[] = [];
  for (let i = 0; i < Nv; i++) {
    const phiMid = arc.phiStart + ((i + 0.5) / Nv) * arc.sweep;
    voussoirs.push({
      index: i,
      phiMid,
      x: arc.cx + rBar * Math.cos(phiMid),
      y: arc.cy + rBar * Math.sin(phiMid),
      W: W_each,
    });
  }
  return {
    cx: arc.cx,
    cy: arc.cy,
    r0,
    t,
    rin,
    rout,
    Nv,
    depth,
    g,
    density,
    factor,
    volumeEach,
    W_each,
    W_tot: W_each * Nv,
    rBar,
    phiStart: arc.phiStart,
    sweep: arc.sweep,
    voussoirs,
  };
}

export function ringLoadModel(
  project: Project,
  factored?: boolean,
): RingLoadModel | null {
  const face = ringFace(project);
  if (!face) return null;
  return ringLoadModelForFace(project, face, factored);
}

export function roundedWeights(model: RingLoadModel): {
  W_each_N: number;
  W_tot_N: number;
} {
  return {
    W_each_N: round3(model.W_each / model.factor),
    W_tot_N: round3(model.W_tot / model.factor),
  };
}
