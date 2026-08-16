import type { Project } from "./project";

/** Schema defaults for a new empty file (S00 fixture). */
export const EMPTY_PROJECT: Project = {
  requirementsVersion: "1.4",
  units: "us-customary",
  g: 9.81,
  sliceDepth: 1,
  sliceZMode: "header-course",
  bondPattern: "common",
  wallConstruction: "solid",
  jointMode: "lime",
  loadFactorsOn: true,
  soilPreset: "stiff-clay-firm-sand",
  frostLineDepth: 0.9144,
  foundationDepthDefault: 1.2192,
  riseCapMode: "semicircle",
  buttressFaceMode: "vertical",
  coreBinderDefault: "dry",
  unitCatalogId: "us-modular-brick",
  allowCutCourse: false,
  wholeUnitsOnly: false,
  vertices: [],
  edges: [],
  faces: [],
  loadCases: [],
  materials: [],
};

export function createEmptyProject(): Project {
  return structuredClone(EMPTY_PROJECT);
}
