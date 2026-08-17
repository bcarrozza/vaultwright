import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import expected from "../../docs/fixtures/s08-buttress/expected.json";
import fixture from "../../docs/fixtures/s03-circular-arch/project.json";
import {
  applyButtress,
  buttressMetrics,
  EXCESS_RATIO,
  GROUND_ANGLE_AMBER_DEG,
  GROUND_ANGLE_RED_DEG,
  TAPER_MAX_SLOPE,
  TIER_STEP_COURSES,
  TIER_STEP_DEPTH_WYTHES,
  groundAngleWarning,
  wallAbutments,
} from "../../src/analysis/buttress";
import { edgeById } from "../../src/geom/graph";
import { loadProject } from "../../src/persist/project";
import { Inspector } from "../../src/ui/Inspector";

describe("S08 — Buttress and min H", () => {
  it("free variable is ground width; outer face mode is preserved; no flyers", () => {
    const project = loadProject(fixture);
    expect(project.buttressFaceMode).toBe("vertical");
    const metrics = buttressMetrics(project);
    expect(metrics.flyingButtresses).toBe(false);
    expect(metrics.faceMode).toBe("vertical");
    const applied = applyButtress(project);
    expect(applied.buttressFaceMode).toBe("vertical");
    const tapered = applyButtress({ ...project, buttressFaceMode: "taper" });
    expect(tapered.buttressFaceMode).toBe("taper");
    const tiered = applyButtress({ ...project, buttressFaceMode: "tiered" });
    expect(tiered.buttressFaceMode).toBe("tiered");
    for (const next of [applied, tapered, tiered]) {
      for (const face of next.faces.filter((f) => f.regionKind === "buttress")) {
        for (const id of face.loop) {
          expect(edgeById(next, id).kind).toBe("line");
        }
      }
    }
  });

  it("does not thin locked walls or decks; extra width is at the ground", () => {
    const project = loadProject(fixture);
    const before = wallAbutments(project);
    const applied = applyButtress(project);
    const after = wallAbutments(applied);
    expect(after.map((w) => w.thickness)).toEqual(before.map((w) => w.thickness));
    expect(after.every((w) => w.lockedThickness)).toBe(true);
    const metrics = buttressMetrics(project);
    if (metrics.extraAtGround_m > 1e-9) {
      expect(
        applied.faces.some((f) => f.regionKind === "buttress"),
      ).toBe(true);
    }
  });

  it("taper max 1:3; tier step 4 courses and one wythe; 120% excess flag", () => {
    const project = loadProject(fixture);
    const metrics = buttressMetrics(project);
    expect(metrics.taperMaxSlope).toBe(TAPER_MAX_SLOPE);
    expect(metrics.taperMaxSlope).toBeCloseTo(1 / 3, 12);
    expect(metrics.tierStepCourses).toBe(TIER_STEP_COURSES);
    expect(metrics.tierStepDepthWythes).toBe(TIER_STEP_DEPTH_WYTHES);
    expect(metrics.tierStepCourses).toBe(4);
    expect(metrics.tierStepDepthWythes).toBe(1);
    const taper = applyButtress({ ...project, buttressFaceMode: "taper" });
    const tm = buttressMetrics({ ...project, buttressFaceMode: "taper" });
    const left = wallAbutments(project).find((w) => w.side === "left");
    const drop = (left?.yTop ?? 1.8288) - (left?.yBot ?? 0);
    expect(tm.extraAtGround_m).toBeLessThanOrEqual(
      TAPER_MAX_SLOPE * drop + 1e-6,
    );
    void taper;
    expect(metrics.excess).toBe(
      metrics.userGroundWidth_m > EXCESS_RATIO * metrics.minGreenGroundWidth_m,
    );
  });

  it("ground-angle readout; amber > 15° and red > 25° at terminator", () => {
    const project = loadProject(fixture);
    const metrics = buttressMetrics(project);
    expect(metrics.groundAngleFromVertical_deg).toBeTypeOf("number");
    const html = renderToStaticMarkup(
      createElement(Inspector, {
        project,
        error: null,
        leftover: null,
        buttress: metrics,
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
    expect(html).toContain("Ground angle");
    expect(html).toContain("Vertical");
    expect(html).toContain("Taper");
    expect(html).toContain("Tiered");
    expect(GROUND_ANGLE_AMBER_DEG).toBe(15);
    expect(GROUND_ANGLE_RED_DEG).toBe(25);
    expect(groundAngleWarning(16)?.code).toBe("GROUND_ANGLE_AMBER");
    expect(groundAngleWarning(26)?.code).toBe("GROUND_ANGLE_RED");
    expect(groundAngleWarning(10)).toBeNull();
    const codes = metrics.warnings.map((w) => w.code);
    if (metrics.groundAngleFromVertical_deg > 25) {
      expect(codes).toContain("GROUND_ANGLE_RED");
    } else if (metrics.groundAngleFromVertical_deg > 15) {
      expect(codes).toContain("GROUND_ANGLE_AMBER");
    }
  });

  it("matches docs/fixtures/s08-buttress/expected.json", () => {
    const metrics = buttressMetrics(loadProject(fixture));
    expect(metrics).toEqual(expected);
  });
});
