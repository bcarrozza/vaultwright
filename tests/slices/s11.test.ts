import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import s03 from "../../docs/fixtures/s03-circular-arch/project.json";
import passExpected from "../../docs/fixtures/s11-pass/expected.json";
import warnExpected from "../../docs/fixtures/s11-warn/expected.json";
import failExpected from "../../docs/fixtures/s11-fail/expected.json";
import { loadProject } from "../../src/persist/project";
import { Sheet } from "../../src/draw/Sheet";
import {
  centeringPolyline,
  centeringTouchesAbutments,
  combinedVerdict,
  dropTest,
} from "../../src/physics/dropTest";

const SPAN = 3.048;

const onGround = [
  { id: "b0", minX: 0, minY: 0, maxX: 1, maxY: 0.2 },
];
const warnLift = [
  { id: "b0", minX: 0, minY: 0.05, maxX: 1, maxY: 0.25 },
];
const failDrop = [
  { id: "b0", minX: 0, minY: 1, maxX: 1, maxY: 1.2 },
];

describe("S11 — Centering and drop-test", () => {
  it("paused = kinematic blocks + centering under the intrados only", () => {
    const project = loadProject(s03);
    const pts = centeringPolyline(project);
    expect(pts.length).toBeGreaterThan(2);
    expect(centeringTouchesAbutments(project, pts)).toBe(false);
    const paused = dropTest({
      stones: failDrop,
      span: SPAN,
      paused: true,
      T: 1,
    });
    expect(paused.paused).toBe(true);
    expect(paused.result).not.toBe("FAIL");
    const html = renderToStaticMarkup(
      createElement(Sheet, {
        project,
        centering: pts,
        physicsPaused: true,
      }),
    );
    expect(html).toContain('data-centering="true"');
    expect(html).toContain('data-intrados-only="true"');
  });

  it("unpaused Planck.js: abutments can move; ground is static; three fixtures", () => {
    const pass = dropTest({ stones: onGround, span: SPAN, paused: false });
    const warn = dropTest({ stones: warnLift, span: SPAN, paused: false });
    const fail = dropTest({ stones: failDrop, span: SPAN, paused: false });
    expect(pass.result).toBe(passExpected.result);
    expect(warn.result).toBe(warnExpected.result);
    expect(fail.result).toBe(failExpected.result);
    expect(fail.maxCmDisplacement_m).toBeGreaterThan(0.02 * SPAN);
  });

  it("combined verdict table (DEC-030)", () => {
    expect(combinedVerdict("green", "PASS")).toBe("conservative pass");
    expect(combinedVerdict("amber", "PASS")).toBe("stands, not conservative");
    expect(combinedVerdict("red", "PASS")).toBe(
      "stands in the toy, fails design",
    );
    expect(combinedVerdict("green", "FAIL")).toBe("collapse");
  });
});
