import { edgeById, facePolygon, vertexById } from "../geom/graph";
import { polygonArea } from "../masonry/overlap";
import type { Project, Warning } from "../model/project";
import { VOID_LOCK } from "../masonry/warnings";
import { inchesToMetres, unitSizeIn } from "../catalog/brick";

export type OptimizePreview = {
  t: number;
  tInitial: number;
  N: number;
  Nv: number;
  r0: number;
  rOpt: number;
  riseCap: number;
  voidArea: number;
  voidAreaOpt: number;
  refused: boolean;
  warnings: Warning[];
};

function openingFace(project: Project) {
  return project.faces.find((f) => f.regionKind === "archOpening");
}

export function voidAreaM2(project: Project): number {
  const face = openingFace(project);
  if (!face) return 0;
  return polygonArea(facePolygon(project, face));
}

export function spanOfRing(project: Project): number {
  const face = project.faces.find((f) => f.regionKind === "archRing");
  if (!face) return 0;
  for (const id of face.loop) {
    const edge = edgeById(project, id);
    if (edge.kind === "arch" && edge.rise != null) {
      const a = vertexById(project, edge.start);
      const b = vertexById(project, edge.end);
      return Math.hypot(b.x - a.x, b.y - a.y);
    }
  }
  return 0;
}

function dOrient(project: Project): number {
  const ring = project.faces.find((f) => f.regionKind === "archRing");
  const catalog = ring?.unitCatalogId ?? "ashlar-12";
  return inchesToMetres(unitSizeIn(catalog).width);
}

function oddNv(n: number): number {
  const v = Math.max(3, Math.round(n));
  return v % 2 === 0 ? v + 1 : v;
}

function riseCap(project: Project, span: number, r0: number): number {
  const mode = project.riseCapMode ?? "semicircle";
  if (mode === "semicircle") return span / 2;
  if (mode === "shape-only") return r0;
  if (mode === "percent-span") return 0.5 * span;
  if (mode === "percent-sagitta") return r0 * 1.25;
  if (mode === "sagitta-plus-span") return r0 + 0.05 * span;
  return span / 2;
}

/**
 * Preview only (DEC-052). Does not mutate the outline.
 * Min t snapped to N * d_orient; odd Nv; rise ≤ semicircle cap; void locked.
 */
export function previewOptimize(project: Project): OptimizePreview {
  const member = project.archMembers?.[0];
  const tInitial = member?.t ?? 0.2032;
  const d = dOrient(project);
  const N = Math.max(1, Math.ceil(tInitial / d - 1e-12) || 1);
  const tSnap = N * d;
  const Nv = oddNv(member?.Nv ?? 7);
  const span = spanOfRing(project);
  const r0 = member?.r0 ?? span / 2;
  const cap = riseCap(project, span, r0);
  const void0 = voidAreaM2(project);
  const rOpt = Math.min(r0, cap);
  const voidDelta = Math.abs(void0 - void0);
  const wouldShrinkVoid = voidDelta > 1e-6;
  const wouldExceedRise = rOpt > cap + 1e-9;
  const refused = wouldShrinkVoid || wouldExceedRise;
  const warnings: Warning[] = [];
  if (refused) {
    warnings.push({
      code: VOID_LOCK,
      severity: "red",
      message: "Optimize would shrink usable void or pierce deck. Preview refused.",
    });
  }
  return {
    t: refused ? tInitial : tSnap,
    tInitial,
    N,
    Nv,
    r0,
    rOpt: refused ? r0 : rOpt,
    riseCap: cap,
    voidArea: void0,
    voidAreaOpt: void0,
    refused,
    warnings,
  };
}

export function applyOptimize(project: Project): Project {
  const preview = previewOptimize(project);
  if (preview.refused) return project;
  const members = (project.archMembers ?? []).map((m, i) =>
    i === 0 ? { ...m, t: preview.t, N: preview.N, Nv: preview.Nv, rOpt: preview.rOpt } : m,
  );
  const faces = project.faces.map((f) =>
    f.regionKind === "archRing" ? { ...f, ringThickness: preview.t } : f,
  );
  return { ...project, archMembers: members, faces };
}

export function trialViolatesVoidLock(
  project: Project,
  trialRise: number,
): boolean {
  const span = spanOfRing(project);
  return trialRise > span / 2 + 1e-9;
}

export { VOID_LOCK };
