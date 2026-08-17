import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import expected from "../../docs/fixtures/s01-one-wall/expected.json";
import fixture from "../../docs/fixtures/s01-one-wall/project.json";
import { INCH_M } from "../../src/catalog/units";
import { Sheet } from "../../src/draw/Sheet";
import { DANGLING_EDGE, hasDanglingEdges, leaveSketchMode } from "../../src/geom/dangling";
import { edgeLength, vertexById } from "../../src/geom/graph";
import { moveVertex, setEdgeLength } from "../../src/geom/edit";
import {
  createHistory,
  pushHistory,
  redo,
  undo,
} from "../../src/geom/history";
import { wallOutlineMetrics } from "../../src/geom/leftover";
import { loadProject } from "../../src/persist/project";
import { Inspector } from "../../src/ui/Inspector";

describe("S01 — One wall outline", () => {
  it("loads fixture: 72 in × 24 in rectangle, masonryWall, from (0,0) to (0.6096, 1.8288) m", () => {
    const project = loadProject(fixture);
    const xs = project.vertices.map((v) => v.x);
    const ys = project.vertices.map((v) => v.y);
    expect(Math.min(...xs)).toBe(0);
    expect(Math.min(...ys)).toBe(0);
    expect(Math.max(...xs)).toBe(0.6096);
    expect(Math.max(...ys)).toBe(1.8288);
    expect(project.faces[0]?.regionKind).toBe("masonryWall");
    expect(0.6096 / INCH_M).toBeCloseTo(24, 9);
    expect(1.8288 / INCH_M).toBe(72);
    expect(project.allowCutCourse).toBe(false);
    expect(project.jointMode).toBe("lime");
    expect(project.unitCatalogId).toBe("us-modular-brick");
  });

  it("course snap floor: 27 courses, leftover 1.125 in (0.028575 m), to-next 1.5 in", () => {
    const project = loadProject(fixture);
    const metrics = wallOutlineMetrics(project, hasDanglingEdges(project));
    expect(metrics.snap).toBe("floor");
    expect(metrics.coursesFilled).toBe(27);
    expect(metrics.leftoverHeight_in).toBe(1.125);
    expect(metrics.leftoverHeight_m).toBe(0.028575);
    expect(metrics.toNextCourse_in).toBe(1.5);
    expect(metrics.toNextCourse_m).toBe(0.0381);
  });

  it("matches docs/fixtures/s01-one-wall/expected.json", () => {
    const project = loadProject(fixture);
    expect(wallOutlineMetrics(project, hasDanglingEdges(project))).toEqual(
      expected,
    );
  });

  it("undo/redo restores vertices", () => {
    const project = loadProject(fixture);
    const original = vertexById(project, "v2");
    let history = createHistory(project);
    history = pushHistory(history, moveVertex(history.present, "v2", 0.7, 2));
    expect(vertexById(history.present, "v2")).toEqual({
      id: "v2",
      x: 0.7,
      y: 2,
    });
    history = undo(history);
    expect(vertexById(history.present, "v2")).toEqual(original);
    history = redo(history);
    expect(vertexById(history.present, "v2")).toEqual({
      id: "v2",
      x: 0.7,
      y: 2,
    });
  });

  it("typed length on an edge works", () => {
    const project = loadProject(fixture);
    const next = setEdgeLength(project, "e1", 2);
    expect(edgeLength(next, "e1")).toBeCloseTo(2, 9);
    const start = vertexById(next, "v1");
    const end = vertexById(next, "v2");
    expect(start.x).toBe(end.x);
    expect(start.y).toBe(0);
    expect(end.y).toBeCloseTo(2, 9);
  });

  it("dangling edges illegal when leaving sketch mode (DANGLING_EDGE)", () => {
    const closed = loadProject(fixture);
    const okLeave = leaveSketchMode(closed);
    expect(okLeave.ok).toBe(true);
    expect(hasDanglingEdges(closed)).toBe(false);

    const open = {
      ...closed,
      vertices: [...closed.vertices, { id: "v4", x: 1, y: 0 }],
      edges: [
        ...closed.edges,
        { id: "e4", kind: "line" as const, start: "v1", end: "v4" },
      ],
    };
    const blocked = leaveSketchMode(open);
    expect(blocked.ok).toBe(false);
    expect(hasDanglingEdges(open)).toBe(true);
    expect(blocked.project.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: DANGLING_EDGE,
          severity: "red",
        }),
      ]),
    );
  });

  it("sheet draws the wall; inspector shows leftover height", () => {
    const project = loadProject(fixture);
    const sheet = renderToStaticMarkup(createElement(Sheet, { project }));
    expect(sheet).toContain("data-region-kind=\"masonryWall\"");
    expect(sheet).toContain("data-face-id=\"f0\"");

    const inspector = renderToStaticMarkup(
      createElement(Inspector, {
        project,
        error: null,
        leftover: wallOutlineMetrics(project, hasDanglingEdges(project)),
        canUndo: false,
        canRedo: false,
        selectedEdgeId: "e1",
        typedLength: "72",
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
    expect(inspector).toContain("1.125");
    expect(inspector).toContain("27");
    expect(inspector).toContain("1.5");
  });
});
