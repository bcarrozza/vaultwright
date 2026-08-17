import type { JointMode, Project, Warning } from "../model/project";
import { CRUSHING, SLIDING } from "../masonry/warnings";
import { ringLoadModel } from "./deadLoad";
import { threeHingedH } from "./funicular";

export const DRY_PACK_JOINT_M = 0.002;
export const LIME_JOINT_M = 0.01;
export const DEFAULT_COHESION_PA = 50_000;
export const MU_LOW = 0.45;
export const MU_MED = 0.6;
export const MU_HIGH = 0.75;

export function jointThicknessM(mode: JointMode | undefined): number {
  return mode === "dry" ? DRY_PACK_JOINT_M : LIME_JOINT_M;
}

export function cohesionPa(
  mode: JointMode | undefined,
  materialC?: number,
): number {
  if (mode === "dry") return 0;
  return materialC ?? DEFAULT_COHESION_PA;
}

/** Coulomb / Mohr–Coulomb. No tension: N must be compressive (N ≥ 0). */
export function shearCapacity(
  N: number,
  area: number,
  mu: number,
  mode: JointMode | undefined,
  c: number = DEFAULT_COHESION_PA,
): number {
  if (N < 0) return 0;
  const coh = mode === "dry" ? 0 : c * Math.max(area, 0);
  return coh + mu * N;
}

export function slides(
  V: number,
  N: number,
  area: number,
  mu: number,
  mode: JointMode | undefined,
  c: number = DEFAULT_COHESION_PA,
): boolean {
  return Math.abs(V) > shearCapacity(N, area, mu, mode, c) + 1e-9;
}

/**
 * Peak compressive stress on the member section (DEC-021).
 * Middle third: Navier. Amber (outside third, inside masonry): triangular kern-edge.
 */
export function peakCompressiveStress(
  N: number,
  e: number,
  t: number,
  depth: number,
): number {
  if (t <= 0 || depth <= 0 || N <= 0) return 0;
  const ae = Math.abs(e);
  const A = t * depth;
  if (ae <= t / 6 + 1e-12) {
    return (N / A) * (1 + (6 * ae) / t);
  }
  if (ae >= t / 2 - 1e-12) {
    return Number.POSITIVE_INFINITY;
  }
  const b = 3 * (t / 2 - ae);
  return (2 * N) / (b * depth);
}

export function crushes(
  stress: number,
  allowable: number,
): boolean {
  return Number.isFinite(stress) && stress > allowable + 1e-9;
}

export type JointCheck = {
  slides: boolean;
  crushes: boolean;
  N: number;
  V: number;
  area: number;
  stress: number;
  allowable: number;
  ratio: number;
  location: string;
};

export function checkJoint(input: {
  N: number;
  V: number;
  e: number;
  t: number;
  depth: number;
  mu: number;
  mode: JointMode | undefined;
  c?: number;
  allowable: number;
  location: string;
}): JointCheck {
  const area = input.t * input.depth;
  const stress = peakCompressiveStress(input.N, input.e, input.t, input.depth);
  const ratio = input.allowable > 0 ? stress / input.allowable : Infinity;
  return {
    slides: slides(
      input.V,
      input.N,
      area,
      input.mu,
      input.mode,
      input.c ?? DEFAULT_COHESION_PA,
    ),
    crushes: crushes(stress, input.allowable),
    N: input.N,
    V: input.V,
    area,
    stress,
    allowable: input.allowable,
    ratio,
    location: input.location,
  };
}

export type JointsMetrics = {
  dryPackJoint_m: number;
  limeJoint_m: number;
  limeCohesion_Pa: number;
  noTension: true;
  jointModeIndependentOfCoreBinder: true;
  tabulatedDry: {
    N_N: number;
    V_N: number;
    slidesAt_mu: number;
    holdsAt_mu: number;
    slides: boolean;
    holds: boolean;
  };
  tabulatedCrushing: {
    material: "limestone";
    allowable_Pa: number;
    t_m: number;
    depth_m: number;
    e_m: number;
    N_crush_N: number;
    N_ok_N: number;
    crushesAt2e6: boolean;
    holdsAt1e6: boolean;
  };
  allowable_limestone_Pa: number;
  allowable_brick_Pa: number;
};

const TAB_N = 10000;
const TAB_V = 6000;
const TAB_T = 0.2032;
const TAB_DEPTH = 1;
const LIMESTONE_ALLOW = 8_000_000;
const BRICK_ALLOW = 5_000_000;

export function jointsMetrics(): JointsMetrics {
  const drySlide = slides(TAB_V, TAB_N, TAB_T * TAB_DEPTH, MU_LOW, "dry");
  const dryHold = !slides(TAB_V, TAB_N, TAB_T * TAB_DEPTH, MU_HIGH, "dry");
  const crush = crushes(
    peakCompressiveStress(2_000_000, 0, TAB_T, TAB_DEPTH),
    LIMESTONE_ALLOW,
  );
  const ok = !crushes(
    peakCompressiveStress(1_000_000, 0, TAB_T, TAB_DEPTH),
    LIMESTONE_ALLOW,
  );
  return {
    dryPackJoint_m: DRY_PACK_JOINT_M,
    limeJoint_m: LIME_JOINT_M,
    limeCohesion_Pa: DEFAULT_COHESION_PA,
    noTension: true,
    jointModeIndependentOfCoreBinder: true,
    tabulatedDry: {
      N_N: TAB_N,
      V_N: TAB_V,
      slidesAt_mu: MU_LOW,
      holdsAt_mu: MU_HIGH,
      slides: drySlide,
      holds: dryHold,
    },
    tabulatedCrushing: {
      material: "limestone",
      allowable_Pa: LIMESTONE_ALLOW,
      t_m: TAB_T,
      depth_m: TAB_DEPTH,
      e_m: 0,
      N_crush_N: 2_000_000,
      N_ok_N: 1_000_000,
      crushesAt2e6: crush,
      holdsAt1e6: ok,
    },
    allowable_limestone_Pa: LIMESTONE_ALLOW,
    allowable_brick_Pa: BRICK_ALLOW,
  };
}

export type ProjectJointSummary = {
  maxStress: number;
  allowable: number;
  ratio: number;
  location: string;
  slides: boolean;
  crushes: boolean;
  warnings: Warning[];
};

export function projectJointSummary(project: Project): ProjectJointSummary | null {
  const model = ringLoadModel(project, false);
  if (!model) return null;
  const { H, VA } = threeHingedH(model);
  const mat = project.materials?.find((m) => m.id === "limestone");
  const mu = mat?.mu ?? MU_MED;
  const c = mat?.cohesion ?? DEFAULT_COHESION_PA;
  const allowable = mat?.allowableCompression ?? LIMESTONE_ALLOW;
  const mode = project.jointMode;
  const check = checkJoint({
    N: VA,
    V: H,
    e: 0,
    t: model.t,
    depth: model.depth,
    mu,
    mode,
    c,
    allowable,
    location: "left springing",
  });
  const warnings: Warning[] = [];
  if (check.slides) {
    warnings.push({
      code: SLIDING,
      severity: "red",
      message: "|V| exceeds Coulomb / Mohr–Coulomb capacity.",
      targetId: "left springing",
    });
  }
  if (check.crushes) {
    warnings.push({
      code: CRUSHING,
      severity: "red",
      message: "Peak compressive stress > allowable.",
      targetId: check.location,
    });
  }
  return {
    maxStress: check.stress,
    allowable: check.allowable,
    ratio: check.ratio,
    location: check.location,
    slides: check.slides,
    crushes: check.crushes,
    warnings,
  };
}

