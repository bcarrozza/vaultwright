import {
  courseHeightIn,
  headerThroughPitchIn,
  inchesToMetres,
  metresToInches,
  snapQty,
  stretcherWythePitchIn,
} from "../catalog/brick";
import type { Face, Project } from "../model/project";
import { faceBounds, firstMasonryFace } from "./graph";

export type SnapMode = "floor" | "cut";

export type WallOutlineMetrics = {
  drawnHeight_m: number;
  drawnHeight_in: number;
  drawnThickness_m: number;
  drawnThickness_in: number;
  jointMode: Project["jointMode"];
  courseHeight_in: number;
  snap: SnapMode;
  coursesFilled: number;
  filledHeight_in: number;
  filledHeight_m: number;
  leftoverHeight_in: number;
  leftoverHeight_m: number;
  toNextCourse_in: number;
  toNextCourse_m: number;
  stretcherWythes: number;
  headersThroughThickness: number;
  regionKind: Face["regionKind"];
  danglingEdges: boolean;
};

function floorCourses(heightIn: number, courseIn: number): number {
  if (courseIn <= 0) return 0;
  const q = heightIn / courseIn;
  const nearest = Math.round(q);
  if (Math.abs(q - nearest) < 1e-9) return nearest;
  return Math.floor(q + 1e-12);
}

function countPitches(lengthIn: number, pitchIn: number): number {
  if (pitchIn <= 0) return 0;
  const q = lengthIn / pitchIn;
  const nearest = Math.round(q);
  if (Math.abs(q - nearest) < 1e-9) return nearest;
  return snapQty(q);
}

export function leftoverForFace(project: Project, face: Face) {
  const bounds = faceBounds(project, face);
  const catalogId = face.unitCatalogId ?? project.unitCatalogId;
  const jointMode = project.jointMode ?? "lime";
  const courseIn = courseHeightIn(catalogId, jointMode);
  const heightIn = metresToInches(bounds.height);
  const thicknessIn = metresToInches(bounds.width);
  const allowCut = project.allowCutCourse === true;
  const coursesFilled = allowCut
    ? heightIn / courseIn
    : floorCourses(heightIn, courseIn);
  const filledHeight_in = allowCut ? heightIn : coursesFilled * courseIn;
  const leftoverHeight_in = snapQty(heightIn - filledHeight_in);
  const toNextCourse_in =
    leftoverHeight_in <= 0 ? 0 : snapQty(courseIn - leftoverHeight_in);

  return {
    bounds,
    catalogId,
    jointMode,
    courseHeight_in: courseIn,
    snap: (allowCut ? "cut" : "floor") as SnapMode,
    coursesFilled: allowCut ? snapQty(coursesFilled) : coursesFilled,
    filledHeight_in: snapQty(filledHeight_in),
    leftoverHeight_in,
    toNextCourse_in,
    heightIn,
    thicknessIn,
    stretcherWythes: countPitches(
      thicknessIn,
      stretcherWythePitchIn(catalogId, jointMode),
    ),
    headersThroughThickness: countPitches(
      thicknessIn,
      headerThroughPitchIn(catalogId, jointMode),
    ),
  };
}

export function wallOutlineMetrics(
  project: Project,
  danglingEdges: boolean,
  face: Face | undefined = firstMasonryFace(project),
): WallOutlineMetrics {
  if (!face) {
    throw new Error("No masonry face");
  }
  const leftover = leftoverForFace(project, face);
  return {
    drawnHeight_m: leftover.bounds.height,
    drawnHeight_in: leftover.heightIn,
    drawnThickness_m: leftover.bounds.width,
    drawnThickness_in: leftover.thicknessIn,
    jointMode: leftover.jointMode,
    courseHeight_in: leftover.courseHeight_in,
    snap: leftover.snap,
    coursesFilled: leftover.coursesFilled,
    filledHeight_in: leftover.filledHeight_in,
    filledHeight_m: snapQty(inchesToMetres(leftover.filledHeight_in)),
    leftoverHeight_in: leftover.leftoverHeight_in,
    leftoverHeight_m: snapQty(inchesToMetres(leftover.leftoverHeight_in)),
    toNextCourse_in: leftover.toNextCourse_in,
    toNextCourse_m: snapQty(inchesToMetres(leftover.toNextCourse_in)),
    stretcherWythes: leftover.stretcherWythes,
    headersThroughThickness: leftover.headersThroughThickness,
    regionKind: face.regionKind,
    danglingEdges,
  };
}
