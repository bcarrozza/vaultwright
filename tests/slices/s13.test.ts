import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import s03 from "../../docs/fixtures/s03-circular-arch/project.json";
import { generateMasonry } from "../../src/masonry/generate";
import { scheduleReport } from "../../src/masonry/schedule";
import { loadProject } from "../../src/persist/project";
import { PRESET_IDS, loadPreset } from "../../src/presets";
import { Inspector } from "../../src/ui/Inspector";
import { analyzeThrust } from "../../src/analysis/thrust";

describe("S13 — Schedule, presets, disclaimer", () => {
  it("CSV schedule uses 3D role counts, not extruded 2D; rubble, heaviest, leftover", () => {
    const project = loadProject(s03);
    const masonry = generateMasonry(project);
    const report = scheduleReport(project, masonry);
    expect(report.csv).toContain("role,count3D,countInSlice");
    expect(report.csv).toContain("voussoir");
    expect(report.csv).toContain("rubbleVolume_m3");
    expect(report.csv).toContain("heaviestPiece_kg");
    expect(report.csv).toContain("leftover_");
    const voussoir = report.rows.find((r) => r.role === "voussoir")!;
    expect(voussoir.count3D).toBeGreaterThan(voussoir.countInSlice);
    expect(voussoir.count3D).not.toBe(voussoir.countInSlice * project.sliceDepth);
    expect(report.heaviestPiece_kg).toBeGreaterThan(0);
    expect(report.leftoverByFace.length).toBeGreaterThan(0);
  });

  it("six §17 presets load and analyze without crashing", () => {
    expect(PRESET_IDS).toHaveLength(6);
    for (const id of PRESET_IDS) {
      const project = loadPreset(id);
      expect(project.requirementsVersion).toBe("1.4");
      if (project.faces.length > 0) {
        expect(() => generateMasonry(project)).not.toThrow();
      }
      if ((project.archMembers?.length ?? 0) > 0) {
        expect(() => analyzeThrust(project)).not.toThrow();
      }
    }
  });

  it("SCOPE_2D disclaimer is visible; thermal mass thickness/area/mass", () => {
    const project = loadProject(s03);
    const masonry = generateMasonry(project);
    const report = scheduleReport(project, masonry);
    const html = renderToStaticMarkup(
      createElement(Inspector, {
        project,
        error: null,
        leftover: null,
        masonry,
        thermal: report.thermal,
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
    expect(html).toContain("SCOPE_2D");
    expect(html).toContain("not a complete building design");
    expect(html).toContain("data-disclaimer=\"SCOPE_2D\"");
    expect(html).toContain("Thermal mass");
    expect(html).toContain("No climate engine");
    expect(report.thermal.some((t) => t.mass_kg > 0 && t.area_m2 > 0)).toBe(
      true,
    );
  });
});
