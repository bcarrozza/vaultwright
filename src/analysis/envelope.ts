import type { LoadCase, Project } from "../model/project";
import { ringLoadModel, type RingLoadModel, type VoussoirWeight } from "./deadLoad";
import {
  eccentricityAtPhi,
  funicularPolygon,
  jointColor,
  jointPhis,
  kernSearchH,
  threeHingedH,
} from "./funicular";

export const DWELLING_PSF = 40;
export const CART_LBF = 2250;
export const MIN_PATCH_IN = 12;
export const MIN_PATCH_M = 0.3048;
export const PSF_PA = 47.8802588889;
export const LBF_N = 4.4482216153;

export type EnvelopeCaseId =
  | "1.4D"
  | "1.2D+1.6L-uniform"
  | "1.2D+1.6L-asymmetric";

export type CaseResult = {
  id: EnvelopeCaseId;
  worstColor: "green" | "amber" | "red";
  maxAbsE_m: number;
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

function uniformLiveEach(model: RingLoadModel, livePa: number): number {
  const span = 2 * model.r0;
  const total = livePa * span * model.depth;
  return total / model.Nv;
}

function applyCase(
  base: RingLoadModel,
  id: EnvelopeCaseId,
  factored: boolean,
  livePa: number,
  cartN: number,
): RingLoadModel {
  const deadF = factored ? (id === "1.4D" ? 1.4 : 1.2) : 1;
  const liveF = factored ? 1.6 : 1;
  const model = cloneModel(base);
  const deadScale = deadF / (base.factor || 1);
  for (const v of model.voussoirs) v.W *= deadScale;
  model.W_each *= deadScale;
  model.W_tot *= deadScale;
  model.factor = deadF;
  if (id === "1.4D") return model;
  const wLive = uniformLiveEach(model, livePa) * liveF;
  if (id === "1.2D+1.6L-uniform") {
    for (const v of model.voussoirs) {
      v.W += wLive;
      model.W_tot += wLive;
    }
    return model;
  }
  for (const v of model.voussoirs) {
    if (v.x < model.cx) {
      v.W += wLive;
      model.W_tot += wLive;
    }
  }
  addVerticalLoad(model, model.cx - model.r0 / 2, cartN * liveF);
  return model;
}

function caseColor(model: RingLoadModel): CaseResult["worstColor"] {
  const { H, VA } = threeHingedH(model);
  const designH = kernSearchH(model, H, VA);
  const poly = funicularPolygon(model, designH, VA);
  const phis = jointPhis(model.Nv, model.phiStart, model.sweep);
  let worst: CaseResult["worstColor"] = "green";
  let maxAbs = 0;
  for (const phi of phis) {
    const e = eccentricityAtPhi(model, poly, phi);
    const ae = Math.abs(Number.isFinite(e) ? e : model.t);
    if (ae > maxAbs) maxAbs = ae;
    const c = jointColor(Number.isFinite(e) ? e : model.t, model.t);
    if (c === "red") worst = "red";
    else if (c === "amber" && worst !== "red") worst = "amber";
  }
  void maxAbs;
  return worst;
}

function worstOf(results: CaseResult[]): EnvelopeCaseId {
  const rank = { green: 0, amber: 1, red: 2 };
  let best = results[0]!;
  for (const r of results) {
    if (rank[r.worstColor] > rank[best.worstColor]) best = r;
    else if (
      r.worstColor === best.worstColor &&
      r.maxAbsE_m > best.maxAbsE_m
    ) {
      best = r;
    }
  }
  return best.id;
}

function colorWithPatch(base: RingLoadModel, forceN: number): CaseResult["worstColor"] {
  const model = cloneModel(base);
  addVerticalLoad(model, model.cx, forceN);
  return caseColor(model);
}

function firstForce(
  base: RingLoadModel,
  target: "amber" | "red",
  hi = 150000,
): number {
  let lo = 0;
  let found = hi;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    const c = colorWithPatch(base, mid);
    const hit =
      target === "amber" ? c === "amber" || c === "red" : c === "red";
    if (hit) {
      found = mid;
      hi = mid;
    } else lo = mid;
  }
  return Math.round(found);
}

function maxPointLoads(base: RingLoadModel): {
  allGreen_N: number;
  firstAmber_N: number;
  firstRed_N: number;
} {
  const factored = cloneModel(base);
  const scale = 1.2 / (base.factor || 1);
  for (const v of factored.voussoirs) v.W *= scale;
  factored.W_tot *= scale;
  const firstAmber_N = firstForce(factored, "amber");
  const firstRed_N = firstForce(factored, "red");
  const allGreen_N = Math.max(0, firstAmber_N - 1);
  return { allGreen_N, firstAmber_N, firstRed_N };
}

export type EnvelopeMetrics = {
  dwellingLive_psf: number;
  cart_lbf: number;
  minPatch_in: number;
  minPatch_m: number;
  defaultFactored: true;
  cases: EnvelopeCaseId[];
  worstCase: EnvelopeCaseId;
  maxPointLoad: {
    allGreen_N: number;
    firstAmber_N: number;
    firstRed_N: number;
  };
};

export function envelopeMetrics(project: Project): EnvelopeMetrics {
  const base = ringLoadModel({ ...project, loadFactorsOn: false }, false);
  if (!base) throw new Error("No arch ring");
  const livePa = DWELLING_PSF * PSF_PA;
  const cartN = CART_LBF * LBF_N;
  const ids: EnvelopeCaseId[] = [
    "1.4D",
    "1.2D+1.6L-uniform",
    "1.2D+1.6L-asymmetric",
  ];
  const results: CaseResult[] = ids.map((id) => {
    const model = applyCase(base, id, true, livePa, cartN);
    const { H, VA } = threeHingedH(model);
    const designH = kernSearchH(model, H, VA);
    const poly = funicularPolygon(model, designH, VA);
    const phis = jointPhis(model.Nv, model.phiStart, model.sweep);
    let maxAbsE_m = 0;
    let worstColor: CaseResult["worstColor"] = "green";
    for (const phi of phis) {
      const e = eccentricityAtPhi(model, poly, phi);
      const ae = Math.abs(Number.isFinite(e) ? e : model.t);
      if (ae > maxAbsE_m) maxAbsE_m = ae;
      const c = jointColor(Number.isFinite(e) ? e : model.t, model.t);
      if (c === "red") worstColor = "red";
      else if (c === "amber" && worstColor !== "red") worstColor = "amber";
    }
    return { id, worstColor, maxAbsE_m };
  });
  return {
    dwellingLive_psf: DWELLING_PSF,
    cart_lbf: CART_LBF,
    minPatch_in: MIN_PATCH_IN,
    minPatch_m: MIN_PATCH_M,
    defaultFactored: true,
    cases: ids,
    worstCase: worstOf(results),
    maxPointLoad: maxPointLoads(base),
  };
}

export function defaultLoadCases(): LoadCase[] {
  return [
    { id: "lc-dead", kind: "dead-only" },
    {
      id: "lc-uniform",
      kind: "dead-plus-uniform-live",
      livePreset: "dwelling",
      uniformLivePa: DWELLING_PSF * PSF_PA,
    },
    {
      id: "lc-asymmetric",
      kind: "dead-plus-asymmetric-live",
      livePreset: "dwelling",
      uniformLivePa: DWELLING_PSF * PSF_PA,
      patchLoads: [
        { x: 0, width: MIN_PATCH_M, forceN: CART_LBF * LBF_N },
      ],
    },
  ];
}
