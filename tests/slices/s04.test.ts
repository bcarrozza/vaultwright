import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import expected from "../../docs/fixtures/s04-dead-load-thrust/expected.json";
import fixture from "../../docs/fixtures/s04-dead-load-thrust/project.json";
import {
  analyzeThrust,
  deadLoadThrustMetrics,
  thrustWarnings,
} from "../../src/analysis/thrust";
import { ringLoadModel } from "../../src/analysis/deadLoad";
import { threeHingedH } from "../../src/analysis/funicular";
import { Sheet } from "../../src/draw/Sheet";
import { generateMasonry } from "../../src/masonry/generate";
import { loadProject } from "../../src/persist/project";
import { Inspector } from "../../src/ui/Inspector";

function inspectorMarkup(
  project: ReturnType<typeof loadProject>,
  masonry: ReturnType<typeof generateMasonry> | null,
  thrust: ReturnType<typeof analyzeThrust>,
) {
  return renderToStaticMarkup(
    createElement(Inspector, {
      project,
      error: null,
      leftover: null,
      masonry,
      thrust,
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
}

describe("S04 — Dead-load thrust", () => {
  it("one full-length thrust line on the ring, continuing down both walls; full kern", () => {
    const project = loadProject(fixture);
    const analysis = analyzeThrust(project);
    expect(analysis).not.toBeNull();
    expect(analysis!.kern).toBe("full-ring-and-wall");
    expect(analysis!.coreDrawn).toBe(false);
    expect(analysis!.lineContinuesDownWalls).toBe(true);
    expect(analysis!.colorPerBrick).toBe(false);
    const ys = analysis!.polyline.map((p) => p.y);
    expect(Math.min(...ys)).toBeLessThan(0.05);
    expect(Math.max(...ys)).toBeGreaterThan(2.2);
    const left = analysis!.polyline.filter((p) => p.x < 3);
    const right = analysis!.polyline.filter((p) => p.x > 3.5);
    expect(Math.min(...left.map((p) => p.y))).toBeLessThan(0.05);
    expect(Math.min(...right.map((p) => p.y))).toBeLessThan(0.05);
    expect(analysis!.segments.length).toBeGreaterThan(4);
  });

  it("three-hinged reference H = 18631.581 N ± 2% on 7-voussoir limestone ring", () => {
    const project = loadProject({ ...fixture, loadFactorsOn: false });
    const model = ringLoadModel(project, false)!;
    const ref = threeHingedH(model);
    expect(model.density).toBe(2400);
    expect(model.Nv).toBe(7);
    expect(ref.H).toBeCloseTo(18631.581, 0);
    expect(Math.abs(ref.H - 18631.581) / 18631.581).toBeLessThan(0.02);
    expect(Math.abs(ref.VA - 11452.724) / 11452.724).toBeLessThan(0.02);
    expect(Math.abs(ref.VB - 11452.724) / 11452.724).toBeLessThan(0.02);
    expect(ref.angleDeg).toBeCloseTo(58.421, 1);
    const analysis = analyzeThrust(project)!;
    expect(analysis.threeHinged.eccentricityAtHinges_m).toBe(0);
    expect(analysis.joints.some((j) => j.kind === "radial")).toBe(true);
    const haunch = analysis.joints.filter(
      (j) => j.kind === "radial" && Math.abs(j.e) > 1e-6,
    );
    expect(haunch.length).toBeGreaterThan(0);
  });

  it("inspector shows H, e vs t/6, stress placeholder; amber is not a pass", () => {
    const project = loadProject(fixture);
    const masonry = generateMasonry(project);
    const thrust = analyzeThrust(project)!;
    const html = inspectorMarkup(project, masonry, thrust);
    expect(html).toContain("H ");
    expect(html).toContain(String(thrust.threeHinged.H_N));
    expect(html).toContain("t/6");
    expect(html).toContain("Max stress placeholder");
    expect(html).toContain("Amber = in masonry, not a pass");
    expect(html).toContain('data-design-pass=');
    if (thrust.joints.some((j) => j.color !== "green")) {
      expect(thrust.designPass).toBe(false);
      expect(html).toContain("not a pass");
    }
    const warnings = thrustWarnings(thrust);
    if (!thrust.designPass) {
      expect(
        warnings.some((w) => w.code === "THRUST_AMBER" || w.code === "THRUST_RED"),
      ).toBe(true);
    }
  });

  it("joint colors from e vs kern on the member line, not each brick", () => {
    const project = loadProject(fixture);
    const masonry = generateMasonry(project);
    const thrust = analyzeThrust(project)!;
    expect(thrust.colorPerBrick).toBe(false);
    expect(thrust.segments.every((s) => ["green", "amber", "red"].includes(s.color))).toBe(
      true,
    );
    const sheet = renderToStaticMarkup(
      createElement(Sheet, {
        project,
        stones: masonry.stones2D,
        thrust,
      }),
    );
    expect(sheet).toContain('data-thrust="true"');
    expect(sheet).toContain('data-color-per-brick="false"');
    expect(sheet).toContain('data-kern="full-ring-and-wall"');
    expect(sheet).toMatch(/data-thrust-color="(green|amber|red)"/);
    expect(sheet).not.toMatch(/data-stone-role="[^"]+"[^>]*data-thrust-color/);
  });

  it("factored dead-only 1.4D scales reference H to 26084.214 N ± 2%", () => {
    const project = loadProject({ ...fixture, loadFactorsOn: false });
    const metrics = deadLoadThrustMetrics(project);
    expect(metrics.factoredDeadOnly_1_4D.H_N).toBeCloseTo(26084.214, 0);
    expect(
      Math.abs(metrics.factoredDeadOnly_1_4D.H_N - 26084.214) / 26084.214,
    ).toBeLessThan(0.02);
    const factored = ringLoadModel({ ...project, loadFactorsOn: true }, true)!;
    const href = threeHingedH(factored);
    expect(Math.abs(href.H - 26084.214) / 26084.214).toBeLessThan(0.02);
  });

  it("matches docs/fixtures/s04-dead-load-thrust/expected.json", () => {
    const project = loadProject(fixture);
    expect(deadLoadThrustMetrics(project)).toEqual(expected);
  });
});
