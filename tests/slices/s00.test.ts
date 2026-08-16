import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import expected from "../../docs/fixtures/s00-empty/expected.json";
import fixture from "../../docs/fixtures/s00-empty/project.json";
import { setDisplayUnits, siFields } from "../../src/catalog/units";
import { Sheet } from "../../src/draw/Sheet";
import { GROUND_LINE_Y } from "../../src/geom/coords";
import { createEmptyProject } from "../../src/model/empty";
import {
  loadProject,
  saveProject,
  validateProject,
} from "../../src/persist/project";

describe("S00 — Project shell", () => {
  it("load/save round-trips the empty fixture (same numbers; key order may differ)", () => {
    const loaded = loadProject(fixture);
    const saved = JSON.parse(saveProject(loaded)) as typeof fixture;
    expect(saved).toEqual(fixture);
  });

  it("saved JSON validates against project.schema.json and includes requirementsVersion 1.4", () => {
    const json = saveProject(loadProject(fixture));
    const saved = JSON.parse(json) as { requirementsVersion: string };
    expect(validateProject(saved)).toEqual([]);
    expect(saved.requirementsVersion).toBe("1.4");
    expect(json).toContain('"requirementsVersion": "1.4"');
  });

  it("matches docs/fixtures/s00-empty/expected.json", () => {
    const project = loadProject(fixture);
    expect({
      requirementsVersion: project.requirementsVersion,
      displayUnits: project.units,
      storage: "SI",
      groundLineY: GROUND_LINE_Y,
      vertexCount: project.vertices.length,
      faceCount: project.faces.length,
      sliceDepth_m: project.sliceDepth,
      jointMode: project.jointMode,
      bondPattern: project.bondPattern,
      coreBinderDefault: project.coreBinderDefault,
      schema: "project.schema.json",
    }).toEqual(expected);
  });

  it("display units default US customary; stored numbers stay SI when toggled", () => {
    const project = loadProject(fixture);
    expect(project.units).toBe("us-customary");
    const before = siFields(project);
    const metric = setDisplayUnits(project, "metric");
    expect(metric.units).toBe("metric");
    expect(siFields(metric)).toEqual(before);
    expect(JSON.parse(saveProject(metric))).toMatchObject({
      units: "metric",
      g: 9.81,
      sliceDepth: 1,
      frostLineDepth: 0.9144,
      foundationDepthDefault: 1.2192,
    });
  });

  it("ground line at y = 0 is visible; scale bar is visible", () => {
    const html = renderToStaticMarkup(
      createElement(Sheet, { project: loadProject(fixture) }),
    );
    expect(html).toContain("data-ground-line");
    expect(html).toContain('data-ground-y="0"');
    expect(html).toContain('y1="0"');
    expect(html).toContain('y2="0"');
    expect(html).toContain("data-scale-bar");
    expect(html).toContain("10 ft");
    expect(html).toContain("stroke");
  });

  it("new empty project matches the S00 fixture numbers", () => {
    expect(createEmptyProject()).toEqual(fixture);
  });

  it("rejects load when requirementsVersion is missing or wrong", () => {
    const missing = { ...(fixture as object) } as Record<string, unknown>;
    delete missing.requirementsVersion;
    expect(() => loadProject(missing)).toThrow(/requirementsVersion/);
    expect(() =>
      loadProject({ ...(fixture as object), requirementsVersion: "1.3" }),
    ).toThrow(/1\.4/);
  });
});
