import { inchesToMetres, unitSizeIn } from "../catalog/brick";
import type { BondPattern, Project, SliceZMode } from "../model/project";

/** Common / American: 5 stretcher courses then 1 header (§8.3). */
export const COMMON_STRETCHER_RUN = 5;
export const COMMON_PERIOD = COMMON_STRETCHER_RUN + 1;

export type CourseKind = "header" | "stretcher";

/** Walls: bottom course is a header (ties to footing). */
export function courseKind(
  index: number,
  pattern: BondPattern = "common",
): CourseKind {
  if (pattern === "ashlar-through") return "header";
  const period = pattern === "english" ? 2 : COMMON_PERIOD;
  return index % period === 0 ? "header" : "stretcher";
}

export function headerCourseIndices(
  coursesFilled: number,
  pattern: BondPattern = "common",
): number[] {
  const indices: number[] = [];
  for (let i = 0; i < coursesFilled; i++) {
    if (courseKind(i, pattern) === "header") indices.push(i);
  }
  return indices;
}

/**
 * Default cut is through tying units (header body).
 * Stretcher-course preset is mid-stretcher along Z, which lands in the
 * header perpend (collar) — the weak educational cut (§6.7, §8.2).
 */
export function resolveSliceZ(
  project: Project,
  catalogId: string | undefined,
): { sliceZ: number; sliceZMode: SliceZMode } {
  const sliceZMode: SliceZMode = project.sliceZMode ?? "header-course";
  if (sliceZMode === "custom" && project.sliceZ != null) {
    return { sliceZ: project.sliceZ, sliceZMode };
  }
  const brick = unitSizeIn(catalogId);
  if (sliceZMode === "stretcher-course") {
    return { sliceZ: inchesToMetres(brick.length / 2), sliceZMode };
  }
  return { sliceZ: inchesToMetres(brick.width / 2), sliceZMode };
}
