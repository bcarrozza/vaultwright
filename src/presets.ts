import type { Project } from "./model/project";
import { loadProject } from "./persist/project";
import s00 from "../docs/fixtures/s00-empty/project.json";
import s01 from "../docs/fixtures/s01-one-wall/project.json";
import s03 from "../docs/fixtures/s03-circular-arch/project.json";

const DX = 4.8768;
const DY = 2.5;

function clone<T>(x: T): T {
  return structuredClone(x);
}

function addSecondBay(project: Project): Project {
  const p = clone(project);
  for (const id of ["vSL", "vSR", "vEL", "vER"] as const) {
    const v = p.vertices.find((item) => item.id === id)!;
    p.vertices.push({ id: `${id}2`, x: v.x + DX, y: v.y });
  }
  p.edges.push(
    { id: "eInt2", kind: "arch", start: "vSL2", end: "vSR2", archFamily: "circular", rise: 1.524 },
    { id: "eExt2", kind: "arch", start: "vER2", end: "vEL2", archFamily: "circular", rise: 1.7272 },
    { id: "eRadL2", kind: "line", start: "vEL2", end: "vSL2" },
    { id: "eRadR2", kind: "line", start: "vSR2", end: "vER2" },
  );
  p.faces.push({
    id: "fRing2",
    regionKind: "archRing",
    materialId: "limestone",
    unitCatalogId: "ashlar-12",
    loop: ["eRadL2", "eInt2", "eRadR2", "eExt2"],
    ringThickness: 0.2032,
  });
  p.archMembers = [
    ...(p.archMembers ?? []),
    {
      id: "a1",
      color: "#c44536",
      faceId: "fRing2",
      t: 0.2032,
      N: 1,
      Nv: 7,
      vaultBond: "ashlar-ring",
      r0: 1.524,
    },
  ];
  return p;
}

function addStacked(project: Project): Project {
  const p = clone(project);
  for (const id of ["vSL", "vSR", "vEL", "vER"] as const) {
    const v = p.vertices.find((item) => item.id === id)!;
    p.vertices.push({ id: `${id}U`, x: v.x, y: v.y + DY });
  }
  p.edges.push(
    { id: "eIntU", kind: "arch", start: "vSLU", end: "vSRU", archFamily: "circular", rise: 1.524 },
    { id: "eExtU", kind: "arch", start: "vERU", end: "vELU", archFamily: "circular", rise: 1.7272 },
    { id: "eRadLU", kind: "line", start: "vELU", end: "vSLU" },
    { id: "eRadRU", kind: "line", start: "vSRU", end: "vERU" },
  );
  p.faces.push({
    id: "fRingU",
    regionKind: "archRing",
    materialId: "limestone",
    unitCatalogId: "ashlar-12",
    loop: ["eRadLU", "eIntU", "eRadRU", "eExtU"],
    ringThickness: 0.2032,
  });
  p.archMembers = [
    ...(p.archMembers ?? []),
    {
      id: "aU",
      color: "#c44536",
      faceId: "fRingU",
      t: 0.2032,
      N: 1,
      Nv: 7,
      vaultBond: "ashlar-ring",
      r0: 1.524,
    },
  ];
  return p;
}

function withDeckAndFill(project: Project): Project {
  const p = clone(project);
  p.vertices.push(
    { id: "vd0", x: 1.8288, y: 3.556 },
    { id: "vd1", x: 4.8768, y: 3.556 },
    { id: "vd2", x: 4.8768, y: 4.064 },
    { id: "vd3", x: 1.8288, y: 4.064 },
  );
  p.edges.push(
    { id: "ed0", kind: "line", start: "vd0", end: "vd1" },
    { id: "ed1", kind: "line", start: "vd1", end: "vd2" },
    { id: "ed2", kind: "line", start: "vd2", end: "vd3" },
    { id: "ed3", kind: "line", start: "vd3", end: "vd0" },
  );
  p.faces.push({
    id: "fDeck",
    regionKind: "deck",
    materialId: "fired-brick",
    lockedThickness: true,
    loop: ["ed0", "ed1", "ed2", "ed3"],
  });
  return p;
}

/** Six §17 presets. Historical mortar is not implied dry. */
export const PRESET_IDS = [
  "empty-semicircle",
  "semicircle-deck-fill",
  "thick-room",
  "two-span-arcade",
  "stacked-arches",
  "stacked-lime-vs-dry",
] as const;

export type PresetId = (typeof PRESET_IDS)[number];

export function loadPreset(id: PresetId): Project {
  switch (id) {
    case "empty-semicircle":
      return loadProject(s03);
    case "semicircle-deck-fill":
      return withDeckAndFill(loadProject(s03));
    case "thick-room":
      return loadProject(s01);
    case "two-span-arcade":
      return addSecondBay(loadProject(s03));
    case "stacked-arches":
      return addStacked(loadProject(s03));
    case "stacked-lime-vs-dry": {
      const p = addStacked(loadProject(s03));
      p.jointMode = "dry";
      p.coreBinderDefault = "dry";
      return p;
    }
    default:
      return loadProject(s00);
  }
}
