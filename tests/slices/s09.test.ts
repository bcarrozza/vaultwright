import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import s03 from "../../docs/fixtures/s03-circular-arch/project.json";
import { multiSpanMetrics } from "../../src/analysis/multiSpan";
import { Sheet } from "../../src/draw/Sheet";
import { generateMasonry } from "../../src/masonry/generate";
import type { Project } from "../../src/model/project";
import { loadProject } from "../../src/persist/project";

const DX = 4.8768;
const DY = 2.5;

function twoSpan(): Project {
  const project = loadProject(s03);
  const ids = ["vSL", "vSR", "vEL", "vER"] as const;
  for (const id of ids) {
    const v = project.vertices.find((item) => item.id === id)!;
    project.vertices.push({ id: `${id}2`, x: v.x + DX, y: v.y });
  }
  project.edges.push(
    {
      id: "eInt2",
      kind: "arch",
      start: "vSL2",
      end: "vSR2",
      archFamily: "circular",
      rise: 1.524,
    },
    {
      id: "eExt2",
      kind: "arch",
      start: "vER2",
      end: "vEL2",
      archFamily: "circular",
      rise: 1.7272,
    },
    {
      id: "eRadL2",
      kind: "line",
      start: "vEL2",
      end: "vSL2",
      constraints: ["horizontal"],
    },
    {
      id: "eRadR2",
      kind: "line",
      start: "vSR2",
      end: "vER2",
      constraints: ["horizontal"],
    },
  );
  project.faces.push({
    id: "fRing2",
    regionKind: "archRing",
    materialId: "limestone",
    unitCatalogId: "ashlar-12",
    loop: ["eRadL2", "eInt2", "eRadR2", "eExt2"],
    ringThickness: 0.2032,
  });
  const members = project.archMembers ?? [];
  if (members[0]) members[0].color = "#2a6f97";
  members.push({
    id: "a1",
    color: "#c44536",
    faceId: "fRing2",
    t: 0.2032,
    N: 1,
    orientation: "ashlar",
    Nv: 7,
    vaultBond: "ashlar-ring",
    r0: 1.524,
  });
  project.archMembers = members;
  return project;
}

function stackedPair(): Project {
  const project = loadProject(s03);
  const ids = ["vSL", "vSR", "vEL", "vER"] as const;
  for (const id of ids) {
    const v = project.vertices.find((item) => item.id === id)!;
    project.vertices.push({ id: `${id}U`, x: v.x, y: v.y + DY });
  }
  project.edges.push(
    {
      id: "eIntU",
      kind: "arch",
      start: "vSLU",
      end: "vSRU",
      archFamily: "circular",
      rise: 1.524,
    },
    {
      id: "eExtU",
      kind: "arch",
      start: "vERU",
      end: "vELU",
      archFamily: "circular",
      rise: 1.7272,
    },
    {
      id: "eRadLU",
      kind: "line",
      start: "vELU",
      end: "vSLU",
      constraints: ["horizontal"],
    },
    {
      id: "eRadRU",
      kind: "line",
      start: "vSRU",
      end: "vERU",
      constraints: ["horizontal"],
    },
  );
  project.faces.push({
    id: "fRingU",
    regionKind: "archRing",
    materialId: "limestone",
    unitCatalogId: "ashlar-12",
    loop: ["eRadLU", "eIntU", "eRadRU", "eExtU"],
    ringThickness: 0.2032,
  });
  const members = project.archMembers ?? [];
  if (members[0]) members[0].color = "#2a6f97";
  members.push({
    id: "aU",
    color: "#c44536",
    faceId: "fRingU",
    t: 0.2032,
    N: 1,
    orientation: "ashlar",
    Nv: 7,
    vaultBond: "ashlar-ring",
    r0: 1.524,
  });
  project.archMembers = members;
  return project;
}

function overlappingRings(): Project {
  const project = loadProject(s03);
  project.faces.push({
    id: "fRingDup",
    regionKind: "archRing",
    materialId: "limestone",
    unitCatalogId: "ashlar-12",
    loop: ["eRadL", "eInt", "eRadR", "eExt"],
    ringThickness: 0.2032,
  });
  return project;
}

describe("S09 — Multi-span and stacked arches", () => {
  it("each arch has a stable color and a full-length line; lines are not merged", () => {
    const project = twoSpan();
    const metrics = multiSpanMetrics(project);
    expect(metrics.memberCount).toBe(2);
    expect(metrics.mergedPolyline).toBe(false);
    expect(metrics.lines[0]!.color).not.toBe(metrics.lines[1]!.color);
    expect(metrics.lines.every((l) => l.fullLength && l.polyline.length > 2)).toBe(
      true,
    );
    const html = renderToStaticMarkup(
      createElement(Sheet, { project, memberLines: metrics.lines }),
    );
    expect(html).toContain('data-member-id="a0"');
    expect(html).toContain('data-member-id="a1"');
    expect(html).toContain('data-full-length="true"');
  });

  it("shared pier: vector addition; symmetric loads cancel H", () => {
    const metrics = multiSpanMetrics(twoSpan());
    expect(metrics.pier?.vectorAddition).toBe(true);
    expect(metrics.pier?.cancels).toBe(true);
    expect(Math.abs(metrics.pier?.residualH_N ?? 1)).toBeLessThan(1);
  });

  it("cart on one bay: LOAD_UNBALANCE and residual H in the pier", () => {
    const metrics = multiSpanMetrics(twoSpan(), { cartOnLeftBay: true });
    expect(metrics.pier?.cancels).toBe(false);
    expect(Math.abs(metrics.pier?.residualH_N ?? 0)).toBeGreaterThan(1);
    expect(metrics.warnings.some((w) => w.code === "LOAD_UNBALANCE")).toBe(true);
  });

  it("stacked: upper loads sit on the lower extrados; two lines, not one curve", () => {
    const project = stackedPair();
    const metrics = multiSpanMetrics(project);
    expect(metrics.stacked).toBe(true);
    expect(metrics.lowerIncludesUpperLoads).toBe(true);
    expect(metrics.mergedPolyline).toBe(false);
    expect(metrics.lines).toHaveLength(2);
    expect(metrics.lines[0]!.polyline).not.toEqual(metrics.lines[1]!.polyline);
    expect(metrics.lines[0]!.cy).not.toBeCloseTo(metrics.lines[1]!.cy, 3);
  });

  it("overlapping archRing faces emit RING_OVERLAP and block generation", () => {
    const project = overlappingRings();
    const metrics = multiSpanMetrics(project);
    expect(metrics.overlapBlocked).toBe(true);
    expect(metrics.warnings.some((w) => w.code === "RING_OVERLAP")).toBe(true);
    const masonry = generateMasonry(project);
    expect(masonry.units3D).toHaveLength(0);
    expect(masonry.stones2D).toHaveLength(0);
    expect(masonry.warnings.some((w) => w.code === "RING_OVERLAP")).toBe(true);
  });
});
