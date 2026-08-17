import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import expected from "../../docs/fixtures/s05-joints-crushing/expected.json";
import fixture from "../../docs/fixtures/s05-joints-crushing/project.json";
import {
  cohesionPa,
  crushes,
  jointThicknessM,
  jointsMetrics,
  peakCompressiveStress,
  projectJointSummary,
  slides,
} from "../../src/analysis/joints";
import { Sheet } from "../../src/draw/Sheet";
import { loadProject } from "../../src/persist/project";
import { Inspector } from "../../src/ui/Inspector";

describe("S05 — Joints and crushing", () => {
  it("dry: |V| ≤ μN, no cohesion, pack joint 2 mm; slides at 0.45, holds at 0.75", () => {
    expect(jointThicknessM("dry")).toBe(0.002);
    expect(cohesionPa("dry", 50000)).toBe(0);
    const { N_N, V_N } = expected.tabulatedDry;
    expect(slides(V_N, N_N, 0.2032, 0.45, "dry")).toBe(true);
    expect(slides(V_N, N_N, 0.2032, 0.75, "dry")).toBe(false);
    expect(slides(V_N, N_N, 0.2032, 0.45, "dry")).toBe(
      expected.tabulatedDry.slides,
    );
    expect(!slides(V_N, N_N, 0.2032, 0.75, "dry")).toBe(
      expected.tabulatedDry.holds,
    );
  });

  it("lime: |V| ≤ cA + μN, c = 0.05 MPa, joint 10 mm", () => {
    expect(jointThicknessM("lime")).toBe(0.01);
    expect(cohesionPa("lime")).toBe(50000);
    const A = 0.2;
    const N = 10000;
    const V = 6000;
    const cA = 50000 * A;
    expect(cA + 0.45 * N).toBeGreaterThan(V);
    expect(slides(V, N, A, 0.45, "lime", 50000)).toBe(false);
  });

  it("crushing mark when peak stress > allowable table", () => {
    const t = expected.tabulatedCrushing.t_m;
    const depth = expected.tabulatedCrushing.depth_m;
    const allow = expected.tabulatedCrushing.allowable_Pa;
    const crushStress = peakCompressiveStress(2_000_000, 0, t, depth);
    const okStress = peakCompressiveStress(1_000_000, 0, t, depth);
    expect(crushes(crushStress, allow)).toBe(true);
    expect(crushes(okStress, allow)).toBe(false);
    const crushed = renderToStaticMarkup(
      createElement(Sheet, {
        project: loadProject(fixture),
        crushing: true,
      }),
    );
    expect(crushed).toContain('data-crushing="true"');
    const ok = renderToStaticMarkup(
      createElement(Sheet, {
        project: loadProject(fixture),
        crushing: false,
      }),
    );
    expect(ok).not.toContain('data-crushing="true"');
  });

  it("switching only joint mode re-runs checks without redrawing the outline", () => {
    const project = loadProject(fixture);
    expect(project.coreBinderDefault).toBe("dry");
    expect(project.jointMode).toBe("lime");
    const lime = projectJointSummary(project)!;
    const dry = projectJointSummary({ ...project, jointMode: "dry" })!;
    expect(dry.slides || lime.slides).toBe(true);
    const verts = project.vertices.map((v) => ({ ...v }));
    const toggled = { ...project, jointMode: "dry" as const };
    expect(toggled.vertices).toEqual(verts);
    expect(toggled.edges).toEqual(project.edges);
    expect(toggled.coreBinderDefault).toBe("dry");
  });

  it("inspector: max stress, allowable, ratio, location", () => {
    const project = loadProject(fixture);
    const joints = projectJointSummary(project)!;
    const html = renderToStaticMarkup(
      createElement(Inspector, {
        project,
        error: null,
        leftover: null,
        joints,
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
        onJointMode: () => undefined,
        onSelectEdge: () => undefined,
        onTypedLength: () => undefined,
        onApplyLength: () => undefined,
      }),
    );
    expect(html).toContain("Max stress");
    expect(html).toContain("Allowable");
    expect(html).toContain(String(joints.allowable));
    expect(html).toContain("Ratio");
    expect(html).toContain("Location");
    expect(html).toContain(joints.location);
    expect(html).toContain("Lime");
    expect(html).toContain("Dry");
    expect(html).toContain("Independent of core binder");
  });

  it("matches docs/fixtures/s05-joints-crushing/expected.json", () => {
    expect(jointsMetrics()).toEqual(expected);
  });
});
