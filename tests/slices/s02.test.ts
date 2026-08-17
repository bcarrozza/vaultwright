import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import expected from "../../docs/fixtures/s02-bond-slice/expected.json";
import fixture from "../../docs/fixtures/s02-bond-slice/project.json";
import { metresToInches, unitSizeIn } from "../../src/catalog/brick";
import { Sheet } from "../../src/draw/Sheet";
import {
  bondSliceMetrics,
  COLLAR_JOINT,
  generateMasonry,
  OVERLAP,
  rejectOverlaps,
  stoneSizeIn,
  type Stone2D,
} from "../../src/masonry/generate";
import { loadProject } from "../../src/persist/project";
import { Inspector } from "../../src/ui/Inspector";

function rect(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): Stone2D["polygon"] {
  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
}

describe("S02 — Bond then slice", () => {
  it("same wall as S01; common bond; bottom course header; sliceZMode header-course", () => {
    const project = loadProject(fixture);
    expect(project.bondPattern).toBe("common");
    expect(project.sliceZMode).toBe("header-course");
    expect(project.faces[0]?.regionKind).toBe("masonryWall");
    expect(metresToInches(project.vertices[1]!.x)).toBe(24);
    expect(metresToInches(project.vertices[2]!.y)).toBe(72);
    const result = generateMasonry(project);
    expect(result.bondPattern).toBe("common");
    expect(result.bottomCourse).toBe("header");
    expect(result.sliceZMode).toBe("header-course");
    expect(result.headerCourseIndices[0]).toBe(0);
  });

  it("147 non-overlapping 2D polygons (5×3 headers + 22×6 stretchers)", () => {
    const result = generateMasonry(loadProject(fixture));
    expect(result.coursesFilled).toBe(27);
    expect(result.headerCourseIndices).toEqual([0, 6, 12, 18, 24]);
    expect(result.stones2D).toHaveLength(147);
    expect(result.schedule.headersInSlice).toBe(15);
    expect(result.schedule.stretchersInSlice).toBe(132);
    expect(result.overlapCount).toBe(0);
  });

  it("header courses show 3 through-units (7.625 in in X); stretchers 6 wythe ends (3.625 in in X)", () => {
    const result = generateMasonry(loadProject(fixture));
    const brick = unitSizeIn("us-modular-brick");
    for (const course of result.headerCourseIndices) {
      const stones = result.stones2D.filter((s) => s.courseIndex === course);
      expect(stones).toHaveLength(3);
      for (const stone of stones) {
        expect(stone.role).toBe("header");
        const size = stoneSizeIn(stone);
        expect(size.x).toBe(brick.length);
        expect(size.y).toBe(brick.height);
      }
    }
    for (let course = 0; course < result.coursesFilled; course++) {
      if (result.headerCourseIndices.includes(course)) continue;
      const stones = result.stones2D.filter((s) => s.courseIndex === course);
      expect(stones).toHaveLength(6);
      for (const stone of stones) {
        expect(stone.role).toBe("stretcher");
        const size = stoneSizeIn(stone);
        expect(size.x).toBe(brick.width);
        expect(size.y).toBe(brick.height);
      }
    }
  });

  it("OVERLAP fails visibly if polygons intersect; do not emit intersections", () => {
    const overlapping: Stone2D[] = [
      {
        id: "a",
        unitId: "ua",
        role: "stretcher",
        courseIndex: 0,
        polygon: rect(0, 0, 2, 2),
      },
      {
        id: "b",
        unitId: "ub",
        role: "stretcher",
        courseIndex: 0,
        polygon: rect(1, 1, 3, 3),
      },
      {
        id: "c",
        unitId: "uc",
        role: "header",
        courseIndex: 1,
        polygon: rect(10, 10, 11, 11),
      },
    ];
    const filtered = rejectOverlaps(overlapping);
    expect(filtered.overlapCount).toBe(1);
    expect(filtered.stones.map((s) => s.id)).toEqual(["c"]);

    const result = generateMasonry(loadProject(fixture));
    expect(result.overlapCount).toBe(0);
    expect(result.warnings.some((w) => w.code === OVERLAP)).toBe(false);
    for (let i = 0; i < result.stones2D.length; i++) {
      for (let j = i + 1; j < result.stones2D.length; j++) {
        const a = result.stones2D[i]!;
        const b = result.stones2D[j]!;
        const A = {
          minX: Math.min(...a.polygon.map((p) => p.x)),
          minY: Math.min(...a.polygon.map((p) => p.y)),
          maxX: Math.max(...a.polygon.map((p) => p.x)),
          maxY: Math.max(...a.polygon.map((p) => p.y)),
        };
        const B = {
          minX: Math.min(...b.polygon.map((p) => p.x)),
          minY: Math.min(...b.polygon.map((p) => p.y)),
          maxX: Math.max(...b.polygon.map((p) => p.x)),
          maxY: Math.max(...b.polygon.map((p) => p.y)),
        };
        const hit =
          A.minX < B.maxX &&
          A.maxX > B.minX &&
          A.minY < B.maxY &&
          A.maxY > B.minY &&
          A.maxX - B.minX > 1e-12 &&
          B.maxX - A.minX > 1e-12 &&
          A.maxY - B.minY > 1e-12 &&
          B.maxY - A.minY > 1e-12;
        expect(hit).toBe(false);
      }
    }
  });

  it("stretcher-course sliceZ preset raises COLLAR_JOINT; default header cut does not", () => {
    const project = loadProject(fixture);
    const header = generateMasonry(project);
    expect(header.warnings.some((w) => w.code === COLLAR_JOINT)).toBe(false);
    const stretcher = generateMasonry({
      ...project,
      sliceZMode: "stretcher-course",
    });
    expect(stretcher.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: COLLAR_JOINT,
          severity: "amber",
        }),
      ]),
    );
    expect(stretcher.schedule.headersInSlice).toBe(0);
    expect(stretcher.schedule.stretchersInSlice).toBe(132);
  });

  it("stone schedule 3D counts come from the 3D layout over sliceDepth, not extruded 2D", () => {
    const project = loadProject(fixture);
    const result = generateMasonry(project);
    const depthIn = metresToInches(project.sliceDepth);
    const headerZPitch = 4;
    const stretcherZPitch = 8;
    const nZHeader = Math.floor(depthIn / headerZPitch + 1e-12);
    const nZStretcher = Math.floor(depthIn / stretcherZPitch + 1e-12);
    expect(nZHeader).not.toBe(nZStretcher);
    expect(result.schedule.headers3D).toBe(5 * 3 * nZHeader);
    expect(result.schedule.stretchers3D).toBe(22 * 6 * nZStretcher);
    expect(result.schedule.total3D).toBe(
      result.schedule.headers3D + result.schedule.stretchers3D,
    );
    expect(result.schedule.total3D).not.toBe(result.stones2D.length);
    expect(result.schedule.stretchers3D).not.toBe(
      result.schedule.stretchersInSlice,
    );
    const fakeExtrude2D = result.stones2D.length * nZHeader;
    expect(result.schedule.total3D).not.toBe(fakeExtrude2D);
    expect(result.schedule.total3D).toBe(result.units3D.length);
  });

  it("matches docs/fixtures/s02-bond-slice/expected.json", () => {
    const project = loadProject(fixture);
    expect(bondSliceMetrics(project)).toEqual(expected);
  });

  it("masonry sheet draws slice polygons; inspector shows COLLAR_JOINT on stretcher cut", () => {
    const project = loadProject(fixture);
    const masonry = generateMasonry(project);
    const sheet = renderToStaticMarkup(
      createElement(Sheet, { project, stones: masonry.stones2D }),
    );
    expect(sheet).toContain("data-stone-role=\"header\"");
    expect(sheet).toContain("data-stone-role=\"stretcher\"");
    expect((sheet.match(/data-stone-id=/g) ?? []).length).toBe(147);

    const stretcher = generateMasonry({
      ...project,
      sliceZMode: "stretcher-course",
    });
    const inspector = renderToStaticMarkup(
      createElement(Inspector, {
        project: { ...project, sliceZMode: "stretcher-course" },
        error: null,
        leftover: null,
        masonry: stretcher,
        canUndo: false,
        canRedo: false,
        selectedEdgeId: "",
        typedLength: "",
        onUnits: () => undefined,
        onSave: () => undefined,
        onLoadFile: () => undefined,
        onUndo: () => undefined,
        onRedo: () => undefined,
        onAllowCutCourse: () => undefined,
        onSelectEdge: () => undefined,
        onTypedLength: () => undefined,
        onApplyLength: () => undefined,
      }),
    );
    expect(inspector).toContain("COLLAR_JOINT");
    expect(inspector).toContain(String(stretcher.schedule.headers3D));
    expect(inspector).toContain(String(stretcher.schedule.stretchers3D));
  });
});
