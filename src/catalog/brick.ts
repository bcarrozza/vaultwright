import { INCH_M } from "./units";
import type { JointMode } from "../model/project";

/** US modular actual size (worked examples §1; 7⅝ × 3⅝ × 2¼ in). */
export const US_MODULAR_BRICK_IN = {
  id: "us-modular-brick",
  length: 7.625,
  width: 3.625,
  height: 2.25,
} as const;

/** Small ashlar (REQUIREMENTS §7.1): 12 × 8 × 6 in. Radial depth = width. */
export const ASHLAR_12_IN = {
  id: "ashlar-12",
  length: 12,
  width: 8,
  height: 6,
} as const;

/** Medium ashlar (REQUIREMENTS §7.1): 24 × 12 × 8 in. */
export const ASHLAR_24_IN = {
  id: "ashlar-24",
  length: 24,
  width: 12,
  height: 8,
} as const;

/** Lime mortar thickness (DEC-042 / worked examples): 3/8 in. */
export const LIME_JOINT_IN = 0.375;

export type UnitSizeIn = {
  id: string;
  length: number;
  width: number;
  height: number;
};

export function unitSizeIn(catalogId: string | undefined): UnitSizeIn {
  switch (catalogId) {
    case "ashlar-12":
      return ASHLAR_12_IN;
    case "ashlar-24":
      return ASHLAR_24_IN;
    case "us-modular-brick":
    case undefined:
    default:
      return US_MODULAR_BRICK_IN;
  }
}

export function jointThicknessIn(jointMode: JointMode | undefined): number {
  return jointMode === "dry" ? 0 : LIME_JOINT_IN;
}

export function courseHeightIn(
  catalogId: string | undefined,
  jointMode: JointMode | undefined,
): number {
  return unitSizeIn(catalogId).height + jointThicknessIn(jointMode);
}

export function stretcherWythePitchIn(
  catalogId: string | undefined,
  jointMode: JointMode | undefined,
): number {
  return unitSizeIn(catalogId).width + jointThicknessIn(jointMode);
}

export function headerThroughPitchIn(
  catalogId: string | undefined,
  jointMode: JointMode | undefined,
): number {
  return unitSizeIn(catalogId).length + jointThicknessIn(jointMode);
}

export function inchesToMetres(inches: number): number {
  return inches * INCH_M;
}

export function metresToInches(metres: number): number {
  return snapQty(metres / INCH_M);
}

/** Snap binary dust so SI display matches fixture JSON. */
export function snapQty(n: number): number {
  return Math.round(n * 1e9) / 1e9;
}
