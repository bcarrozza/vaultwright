import type { DisplayUnits, Project } from "../model/project";

/** SI metres. Display conversion only — never rewrite stored numbers (DEC-019). */
export const METRE = 1;
export const FOOT_M = 0.3048;
export const INCH_M = 0.0254;

export function setDisplayUnits(project: Project, units: DisplayUnits): Project {
  return { ...project, units };
}

export function siFields(project: Project): Record<string, number | number[]> {
  return {
    g: project.g ?? 9.81,
    sliceDepth: project.sliceDepth,
    frostLineDepth: project.frostLineDepth ?? 0.9144,
    foundationDepthDefault: project.foundationDepthDefault ?? 1.2192,
    vertices: project.vertices.flatMap((v) => [v.x, v.y]),
  };
}
