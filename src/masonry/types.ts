import type { BondPattern, SliceZMode, Warning } from "../model/project";

export type Point = { x: number; y: number };

export type UnitRole =
  | "header"
  | "stretcher"
  | "through"
  | "voussoir"
  | "closer";

export type Unit3D = {
  id: string;
  role: UnitRole;
  courseIndex: number;
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
  /** XY cross-section when not an axis-aligned rectangle (voussoirs). */
  polygon?: Point[];
};

export type Stone2D = {
  id: string;
  unitId: string;
  role: UnitRole;
  courseIndex: number;
  polygon: Point[];
};

export type StoneSchedule = {
  headers3D: number;
  stretchers3D: number;
  through3D: number;
  closers3D: number;
  voussoirs3D: number;
  total3D: number;
  headersInSlice: number;
  stretchersInSlice: number;
  totalInSlice: number;
};

export type MasonryResult = {
  units3D: Unit3D[];
  stones2D: Stone2D[];
  warnings: Warning[];
  overlapCount: number;
  sliceZ: number;
  sliceZMode: SliceZMode;
  bondPattern: BondPattern;
  bottomCourse: "header";
  coursesFilled: number;
  headerCourseIndices: number[];
  schedule: StoneSchedule;
};

export type CircularArchMetrics = {
  span_m: number;
  span_ft: number;
  r0_m: number;
  t_m: number;
  t_in: number;
  Nv: number;
  NvOdd: boolean;
  N: number;
  vaultBond: "ashlar-ring" | "rowlock-rings" | "stretcher-barrel";
  jointAngle_deg: number;
  jointsNormalToCurve: boolean;
  keystoneCenteredInDefaultSlice: boolean;
  overlapCount: number;
  voussoirsInSlice: number;
  fillFaces: number;
  voidLocked: boolean;
};

export type BondSliceMetrics = {
  bondPattern: BondPattern;
  bottomCourse: "header";
  sliceZMode: SliceZMode;
  coursesFilled: number;
  headerCourseIndices: number[];
  headerCourses: number;
  stretcherCourses: number;
  headerBlocksPerCourse: number;
  stretcherBlocksPerCourse: number;
  slicePolygonCount: number;
  overlapCount: number;
  collarJointWarningOnHeaderSlice: boolean;
  collarJointWarningOnStretcherSlice: boolean;
  stoneActual_in: { length: number; width: number; height: number };
  joint_in: number;
};
