import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import expected from "../../docs/fixtures/s06-envelope/expected.json";
import s05 from "../../docs/fixtures/s05-joints-crushing/project.json";
import {
  CART_LBF,
  DWELLING_PSF,
  MIN_PATCH_M,
  defaultLoadCases,
  envelopeMetrics,
} from "../../src/analysis/envelope";
import { loadProject } from "../../src/persist/project";
import { Inspector } from "../../src/ui/Inspector";

function projectWithEnvelope() {
  return loadProject({
    ...s05,
    loadFactorsOn: true,
    loadCases: defaultLoadCases(),
  });
}

describe("S06 — Load envelope", () => {
  it("cases 1.4D, 1.2D+1.6L uniform, 1.2D+1.6L asymmetric; default factored", () => {
    const project = projectWithEnvelope();
    expect(project.loadFactorsOn).toBe(true);
    const kinds = (project.loadCases ?? []).map((c) => c.kind);
    expect(kinds).toContain("dead-only");
    expect(kinds).toContain("dead-plus-uniform-live");
    expect(kinds).toContain("dead-plus-asymmetric-live");
    const metrics = envelopeMetrics(project);
    expect(metrics.cases).toEqual(expected.cases);
    expect(metrics.defaultFactored).toBe(true);
    expect(metrics.dwellingLive_psf).toBe(DWELLING_PSF);
    expect(metrics.cart_lbf).toBe(CART_LBF);
    expect(metrics.minPatch_m).toBe(MIN_PATCH_M);
    expect(metrics.minPatch_m).toBeGreaterThanOrEqual(0.3);
  });

  it("unfactored toggle exists; default remains factored", () => {
    const project = projectWithEnvelope();
    const html = renderToStaticMarkup(
      createElement(Inspector, {
        project,
        error: null,
        leftover: null,
        envelope: envelopeMetrics(project),
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
        onLoadFactors: () => undefined,
        onSelectEdge: () => undefined,
        onTypedLength: () => undefined,
        onApplyLength: () => undefined,
      }),
    );
    expect(html).toContain("Factored");
    expect(html).toContain("Unfactored");
    expect(html).toContain("1.4D");
    expect(html).toContain("1.2D+1.6L");
  });

  it("patch ≥ 12 in; max point-load readout all-green, first amber, first red", () => {
    const metrics = envelopeMetrics(projectWithEnvelope());
    expect(metrics.minPatch_in).toBe(12);
    expect(metrics.maxPointLoad.firstAmber_N).toBeGreaterThanOrEqual(
      metrics.maxPointLoad.allGreen_N,
    );
    expect(metrics.maxPointLoad.firstRed_N).toBeGreaterThanOrEqual(
      metrics.maxPointLoad.firstAmber_N,
    );
    const patch = (projectWithEnvelope().loadCases ?? []).find(
      (c) => c.kind === "dead-plus-asymmetric-live",
    );
    expect(patch?.patchLoads?.[0]?.width).toBeGreaterThanOrEqual(MIN_PATCH_M);
  });

  it("worst envelope case is reported for later ring/buttress slices", () => {
    const metrics = envelopeMetrics(projectWithEnvelope());
    expect(metrics.cases).toContain(metrics.worstCase);
  });

  it("matches docs/fixtures/s06-envelope/expected.json", () => {
    const metrics = envelopeMetrics(projectWithEnvelope());
    expect(metrics).toEqual(expected);
  });
});
