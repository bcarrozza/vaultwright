import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import expected from "../../docs/fixtures/s03-circular-arch/expected.json";
import fixture from "../../docs/fixtures/s03-circular-arch/project.json";
import { FOOT_M, INCH_M } from "../../src/catalog/units";
import { Sheet } from "../../src/draw/Sheet";
import { isVoidKind } from "../../src/geom/graph";
import {
  circularArchMetrics,
  generateMasonry,
  polygonsOverlap,
} from "../../src/masonry/generate";
import { generateRings, keystoneCentered } from "../../src/masonry/ring";
import type { Point } from "../../src/masonry/types";
import { loadProject } from "../../src/persist/project";
import { Inspector } from "../../src/ui/Inspector";

function axisAligned(polygon: Point[]): boolean {
  if (polygon.length !== 4) return false;
  for (let i = 0; i < 4; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % 4]!;
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    if (!(dx < 1e-9 || dy < 1e-9)) return false;
  }
  return true;
}

function radialThroughCenter(
  a: Point,
  b: Point,
  cx: number,
  cy: number,
): boolean {
  const cross = (a.x - cx) * (b.y - cy) - (a.y - cy) * (b.x - cx);
  return Math.abs(cross) < 1e-8;
}

function inspectorMarkup(
  project: ReturnType<typeof loadProject>,
  masonry: ReturnType<typeof generateMasonry>,
) {
  return renderToStaticMarkup(
    createElement(Inspector, {
      project,
      error: null,
      leftover: null,
      masonry,
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

describe("S03 — Circular arch barrel", () => {
  it("span 10 ft semicircle, Nv=7 odd, N=1 ashlar ring, radial t=8 in", () => {
    const project = loadProject(fixture);
    const member = project.archMembers?.[0];
    expect(member?.Nv).toBe(7);
    expect(member?.N).toBe(1);
    expect(member?.vaultBond).toBe("ashlar-ring");
    expect(member?.orientation).toBe("ashlar");
    expect(member?.t).toBe(0.2032);
    expect(member?.r0).toBe(1.524);
    expect(member?.r0).toBeCloseTo(5 * FOOT_M, 12);
    expect(member?.t).toBeCloseTo(8 * INCH_M, 12);
    const metrics = circularArchMetrics(project);
    expect(metrics.span_m).toBe(3.048);
    expect(metrics.span_ft).toBe(10);
    expect(metrics.r0_m).toBe(1.524);
    expect(metrics.t_m).toBe(0.2032);
    expect(metrics.t_in).toBe(8);
    expect(metrics.Nv).toBe(7);
    expect(metrics.NvOdd).toBe(true);
    expect(metrics.N).toBe(1);
    expect(metrics.vaultBond).toBe("ashlar-ring");
    expect(metrics.jointAngle_deg).toBe(25.7142857143);
  });

  it("joints perpendicular to the curve; keystone centered in the default slice", () => {
    const project = loadProject(fixture);
    const result = generateMasonry(project);
    const rings = generateRings(project);
    const layout = rings.layouts[0]!;
    const voussoirs = result.stones2D.filter((s) => s.role === "voussoir");
    expect(voussoirs).toHaveLength(7);
    expect(circularArchMetrics(project).jointsNormalToCurve).toBe(true);
    expect(keystoneCentered(layout, result.sliceZ)).toBe(true);
    expect(circularArchMetrics(project).keystoneCenteredInDefaultSlice).toBe(
      true,
    );
    for (const stone of voussoirs) {
      expect(stone.polygon).toHaveLength(4);
      expect(
        radialThroughCenter(
          stone.polygon[0]!,
          stone.polygon[1]!,
          layout.cx,
          layout.cy,
        ),
      ).toBe(true);
      expect(
        radialThroughCenter(
          stone.polygon[2]!,
          stone.polygon[3]!,
          layout.cx,
          layout.cy,
        ),
      ).toBe(true);
    }
    const key = voussoirs.find((s) => {
      const mid = {
        x: (s.polygon[0]!.x + s.polygon[3]!.x) / 2,
        y: (s.polygon[0]!.y + s.polygon[3]!.y) / 2,
      };
      const phi = Math.atan2(mid.y - layout.cy, mid.x - layout.cx);
      return Math.abs(phi - Math.PI / 2) < 1e-6;
    });
    expect(key).toBeDefined();
  });

  it("skewback: first voussoir on angled abutment; wall courses tooth into the springing", () => {
    const project = loadProject(fixture);
    const result = generateMasonry(project);
    const rings = generateRings(project);
    const layout = rings.layouts[0]!;
    const voussoirs = result.stones2D.filter((s) => s.role === "voussoir");
    const walls = result.stones2D.filter(
      (s) => s.role === "header" || s.role === "stretcher",
    );
    expect(walls.length).toBeGreaterThan(0);
    for (const wall of walls) {
      expect(axisAligned(wall.polygon)).toBe(true);
    }
    const leftSpringer = voussoirs.reduce((best, s) => {
      const minX = Math.min(...s.polygon.map((p) => p.x));
      const bestX = Math.min(...best.polygon.map((p) => p.x));
      return minX < bestX ? s : best;
    });
    const springingEdge = [leftSpringer.polygon[0]!, leftSpringer.polygon[1]!];
    expect(Math.abs(springingEdge[0]!.y - layout.springingY)).toBeLessThan(
      1e-9,
    );
    expect(Math.abs(springingEdge[1]!.y - layout.springingY)).toBeLessThan(
      1e-9,
    );
    expect(
      radialThroughCenter(
        springingEdge[0]!,
        springingEdge[1]!,
        layout.cx,
        layout.cy,
      ),
    ).toBe(true);
    const innerFace = layout.cx - layout.rin;
    const overlapTop = layout.cy + Math.sqrt(layout.rout * layout.rout - (innerFace - layout.cx) ** 2);
    const bed = walls.filter((s) => {
      const maxY = Math.max(...s.polygon.map((p) => p.y));
      const maxX = Math.max(...s.polygon.map((p) => p.x));
      const minX = Math.min(...s.polygon.map((p) => p.x));
      return (
        Math.abs(maxY - layout.springingY) < 1e-6 &&
        maxX <= innerFace + 1e-6 &&
        minX >= layout.cx - layout.rout - 1e-6
      );
    });
    expect(bed.length).toBeGreaterThan(0);
    const inBand = walls.filter((s) => {
      const minY = Math.min(...s.polygon.map((p) => p.y));
      const maxY = Math.max(...s.polygon.map((p) => p.y));
      const maxX = Math.max(...s.polygon.map((p) => p.x));
      return minY > layout.springingY && maxY < overlapTop && maxX < layout.cx;
    });
    expect(inBand.length).toBeGreaterThan(0);
    const bandMaxX = Math.max(
      ...inBand.map((s) => Math.max(...s.polygon.map((p) => p.x))),
    );
    expect(bandMaxX).toBeLessThan(innerFace - 0.05);
  });

  it("Z-stagger on the barrel; 2D slice polygons do not overlap", () => {
    const project = loadProject(fixture);
    const result = generateMasonry(project);
    expect(result.overlapCount).toBe(0);
    const voussoir3D = result.units3D.filter(
      (u) => u.role === "voussoir" || u.role === "closer",
    );
    expect(voussoir3D.length).toBeGreaterThan(7);
    const byZ = new Map<string, typeof voussoir3D>();
    for (const u of voussoir3D) {
      const key = u.minZ.toFixed(6);
      const list = byZ.get(key) ?? [];
      list.push(u);
      byZ.set(key, list);
    }
    expect(byZ.size).toBeGreaterThan(1);
    const zKeys = [...byZ.keys()].sort((a, b) => Number(a) - Number(b));
    const phiOf = (key: string) =>
      (byZ.get(key) ?? []).map((u) =>
        Math.atan2(u.polygon![0]!.y - 1.8288, u.polygon![0]!.x - 3.3528),
      );
    const phi0 = phiOf(zKeys[0]!);
    const phi1 = phiOf(zKeys[1]!);
    expect(phi0).toHaveLength(7);
    expect(phi1.length).not.toBe(phi0.length);
    const voussoirs2D = result.stones2D.filter(
      (s) => s.role === "voussoir" || s.role === "closer",
    );
    for (let i = 0; i < voussoirs2D.length; i++) {
      for (let j = i + 1; j < voussoirs2D.length; j++) {
        expect(
          polygonsOverlap(
            voussoirs2D[i]!.polygon,
            voussoirs2D[j]!.polygon,
          ),
        ).toBe(false);
      }
    }
  });

  it("void under the intrados stays labeled archOpening / void", () => {
    const project = loadProject(fixture);
    const opening = project.faces.find((f) => isVoidKind(f.regionKind));
    expect(opening?.regionKind).toBe("archOpening");
    const result = generateMasonry(project);
    expect(circularArchMetrics(project).voidLocked).toBe(true);
    expect(project.faces.find((f) => f.id === "fOpening")?.regionKind).toBe(
      "archOpening",
    );
    const sheet = renderToStaticMarkup(
      createElement(Sheet, { project, stones: result.stones2D }),
    );
    expect(sheet).toContain('data-region-kind="archOpening"');
    expect(sheet).toContain('data-region-kind="archRing"');
    expect(sheet).toContain('data-stone-role="voussoir"');
    expect((sheet.match(/data-stone-role="voussoir"/g) ?? []).length).toBe(7);
    const inspector = inspectorMarkup(project, result);
    expect(inspector).toContain(String(result.schedule.voussoirs3D));
  });

  it("matches docs/fixtures/s03-circular-arch/expected.json", () => {
    const project = loadProject(fixture);
    expect(circularArchMetrics(project)).toEqual(expected);
  });
});
