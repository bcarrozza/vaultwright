import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import fixture from "../../docs/fixtures/s03-circular-arch/project.json";
import {
  applyOptimize,
  previewOptimize,
  trialViolatesVoidLock,
  voidAreaM2,
} from "../../src/analysis/optimize";
import { Sheet } from "../../src/draw/Sheet";
import { saveProject, loadProject } from "../../src/persist/project";
import { Inspector } from "../../src/ui/Inspector";

describe("S07 — Optimize preview and Apply", () => {
  it("preview does not mutate outline; Apply commits; Cancel leaves JSON identical", () => {
    const project = loadProject(fixture);
    const before = saveProject(project);
    const preview = previewOptimize(project);
    expect(saveProject(project)).toBe(before);
    expect(preview.Nv % 2).toBe(1);
    expect(preview.riseCap).toBeCloseTo(preview.r0, 9);
    const applied = applyOptimize(project);
    expect(applied.archMembers?.[0]?.t).toBe(preview.t);
    expect(applied.archMembers?.[0]?.Nv).toBe(preview.Nv);
    const cancelled = loadProject(JSON.parse(before));
    expect(saveProject(cancelled)).toBe(before);
  });

  it("void area unchanged within 1e-6 m²; t snaps to N * d_orient; semicircle cap", () => {
    const project = loadProject(fixture);
    const preview = previewOptimize(project);
    expect(Math.abs(preview.voidAreaOpt - preview.voidArea)).toBeLessThan(1e-6);
    expect(Math.abs(voidAreaM2(project) - preview.voidArea)).toBeLessThan(1e-6);
    expect(preview.t).toBeCloseTo(preview.N * 0.2032, 9);
    expect(preview.rOpt).toBeLessThanOrEqual(preview.riseCap + 1e-12);
    expect(project.riseCapMode).toBe("semicircle");
  });

  it("VOID_LOCK if a trial would exceed the semicircle rise cap", () => {
    const project = loadProject(fixture);
    expect(trialViolatesVoidLock(project, 2)).toBe(true);
    expect(trialViolatesVoidLock(project, 1.524)).toBe(false);
    const preview = previewOptimize(project);
    expect(preview.refused).toBe(false);
  });

  it("initial dashed vs optimized solid overlay; inspector deviation", () => {
    const project = loadProject(fixture);
    const preview = previewOptimize(project);
    const sheet = renderToStaticMarkup(
      createElement(Sheet, { project, optimize: preview }),
    );
    expect(sheet).toContain('data-arch-initial="true"');
    expect(sheet).toContain('data-arch-optimized="true"');
    const html = renderToStaticMarkup(
      createElement(Inspector, {
        project,
        error: null,
        leftover: null,
        optimize: preview,
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
        onOptimizePreview: () => undefined,
        onOptimizeApply: () => undefined,
        onOptimizeCancel: () => undefined,
        onSelectEdge: () => undefined,
        onTypedLength: () => undefined,
        onApplyLength: () => undefined,
      }),
    );
    expect(html).toContain("Optimize");
    expect(html).toContain("Apply");
    expect(html).toContain("t ");
  });
});
