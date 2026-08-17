import { facePolygon } from "../geom/graph";
import type { Project, Warning } from "../model/project";
import { polygonsOverlap } from "../masonry/overlap";
import { LOAD_UNBALANCE, RING_OVERLAP } from "../masonry/warnings";
import {
  ringLoadModelForFace,
  type RingLoadModel,
  type VoussoirWeight,
} from "./deadLoad";
import { funicularPolygon, kernSearchH, threeHingedH } from "./funicular";
import type { Point } from "./types";

export const MEMBER_COLORS = ["#2a6f97", "#c44536", "#3d5a40"] as const;

export type MemberLine = {
  id: string;
  color: string;
  faceId: string;
  H_N: number;
  VA_N: number;
  cx: number;
  cy: number;
  polyline: Point[];
  fullLength: true;
};

export type MultiSpanMetrics = {
  memberCount: number;
  lines: MemberLine[];
  mergedPolyline: false;
  pier: {
    H_left_N: number;
    H_right_N: number;
    residualH_N: number;
    cancels: boolean;
    vectorAddition: true;
  } | null;
  stacked: boolean;
  lowerIncludesUpperLoads: boolean;
  overlapBlocked: boolean;
  warnings: Warning[];
};

function cloneModel(model: RingLoadModel): RingLoadModel {
  return {
    ...model,
    voussoirs: model.voussoirs.map((v) => ({ ...v })),
  };
}

function addVerticalLoad(model: RingLoadModel, x: number, W: number): void {
  let best: VoussoirWeight | null = null;
  let bestD = Infinity;
  for (const v of model.voussoirs) {
    const d = Math.abs(v.x - x);
    if (d < bestD) {
      bestD = d;
      best = v;
    }
  }
  if (best) {
    best.W += W;
    model.W_tot += W;
  }
}

export function archRingsOverlap(project: Project): boolean {
  const rings = project.faces.filter((f) => f.regionKind === "archRing");
  for (let i = 0; i < rings.length; i++) {
    const a = facePolygon(project, rings[i]!);
    for (let j = i + 1; j < rings.length; j++) {
      if (polygonsOverlap(a, facePolygon(project, rings[j]!))) return true;
    }
  }
  return false;
}

export function ringOverlapWarning(project: Project): Warning | null {
  if (!archRingsOverlap(project)) return null;
  return {
    code: RING_OVERLAP,
    severity: "red",
    message: "Two archRing faces overlap. Generation is blocked.",
  };
}

function colorFor(index: number, explicit?: string): string {
  if (explicit) return explicit;
  return MEMBER_COLORS[index % MEMBER_COLORS.length]!;
}

function lineFor(
  project: Project,
  faceId: string,
  index: number,
  extraLoads: { x: number; W: number }[] = [],
): MemberLine | null {
  const face = project.faces.find((f) => f.id === faceId);
  if (!face) return null;
  const base = ringLoadModelForFace(project, face, false);
  if (!base) return null;
  const model = cloneModel(base);
  for (const load of extraLoads) addVerticalLoad(model, load.x, load.W);
  const th = threeHingedH(model);
  const H = kernSearchH(model, th.H, th.VA);
  const poly = funicularPolygon(model, H, th.VA);
  const member = project.archMembers?.find((m) => m.faceId === faceId);
  return {
    id: member?.id ?? `m${index}`,
    color: colorFor(index, member?.color),
    faceId,
    H_N: th.H,
    VA_N: th.VA,
    cx: model.cx,
    cy: model.cy,
    polyline: poly,
    fullLength: true,
  };
}

export function multiSpanMetrics(
  project: Project,
  opts?: { cartOnLeftBay?: boolean },
): MultiSpanMetrics {
  const rings = project.faces.filter((f) => f.regionKind === "archRing");
  const overlap = ringOverlapWarning(project);
  const warnings: Warning[] = overlap ? [overlap] : [];

  const sorted = [...rings].sort((a, b) => {
    const ma = ringLoadModelForFace(project, a, false);
    const mb = ringLoadModelForFace(project, b, false);
    return (ma?.cx ?? 0) - (mb?.cx ?? 0);
  });

  const stacked =
    sorted.length >= 2 &&
    (() => {
      const models = sorted
        .map((f) => ringLoadModelForFace(project, f, false))
        .filter((m): m is RingLoadModel => m != null);
      if (models.length < 2) return false;
      const byY = [...models].sort((a, b) => a.cy - b.cy);
      const low = byY[0]!;
      const high = byY[byY.length - 1]!;
      const overlapX =
        Math.min(low.cx + low.r0, high.cx + high.r0) -
        Math.max(low.cx - low.r0, high.cx - high.r0);
      return high.cy - low.cy > 0.4 && overlapX > 0.5 * Math.min(2 * low.r0, 2 * high.r0);
    })();

  const extraByFace = new Map<string, { x: number; W: number }[]>();
  let lowerIncludesUpperLoads = false;
  if (stacked) {
    const models = sorted
      .map((f) => ({ f, m: ringLoadModelForFace(project, f, false) }))
      .filter((x): x is { f: (typeof sorted)[0]; m: RingLoadModel } => x.m != null)
      .sort((a, b) => a.m.cy - b.m.cy);
    const lower = models[0];
    const upper = models[models.length - 1];
    if (lower && upper && lower.f.id !== upper.f.id) {
      const uth = threeHingedH(upper.m);
      extraByFace.set(lower.f.id, [
        { x: upper.m.cx - upper.m.r0, W: uth.VA },
        { x: upper.m.cx + upper.m.r0, W: uth.VB },
      ]);
      lowerIncludesUpperLoads = true;
    }
  }

  if (opts?.cartOnLeftBay && sorted[0]) {
    const left = ringLoadModelForFace(project, sorted[0], false);
    if (left) {
      const cart = 2250 * 4.4482216153 * 1.6;
      const prev = extraByFace.get(sorted[0].id) ?? [];
      extraByFace.set(sorted[0].id, [
        ...prev,
        { x: left.cx - left.r0 / 2, W: cart },
      ]);
    }
  }

  const lines: MemberLine[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const line = lineFor(
      project,
      sorted[i]!.id,
      i,
      extraByFace.get(sorted[i]!.id) ?? [],
    );
    if (line) lines.push(line);
  }

  let pier: MultiSpanMetrics["pier"] = null;
  if (lines.length >= 2 && !stacked) {
    const left = lines[0]!;
    const right = lines[1]!;
    const residualH_N = left.H_N - right.H_N;
    const cancels = Math.abs(residualH_N) <= 0.02 * Math.max(left.H_N, 1);
    pier = {
      H_left_N: left.H_N,
      H_right_N: right.H_N,
      residualH_N,
      cancels,
      vectorAddition: true,
    };
    if (!cancels) {
      warnings.push({
        code: LOAD_UNBALANCE,
        severity: "amber",
        message:
          "Asymmetric or missing neighbor: residual H in the shared pier.",
      });
    }
  }

  return {
    memberCount: lines.length,
    lines,
    mergedPolyline: false,
    pier,
    stacked,
    lowerIncludesUpperLoads,
    overlapBlocked: overlap != null,
    warnings,
  };
}

export { LOAD_UNBALANCE, RING_OVERLAP };
