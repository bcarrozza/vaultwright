import type { Project, Warning } from "../model/project";

/** Frozen warning code (docs/warning-codes.md). */
export const DANGLING_EDGE = "DANGLING_EDGE";

export function danglingEdgeIds(project: Project): string[] {
  const used = new Set<string>();
  for (const face of project.faces) {
    for (const id of face.loop) used.add(id);
  }

  const degree = new Map<string, number>();
  for (const edge of project.edges) {
    degree.set(edge.start, (degree.get(edge.start) ?? 0) + 1);
    degree.set(edge.end, (degree.get(edge.end) ?? 0) + 1);
  }

  const ids: string[] = [];
  for (const edge of project.edges) {
    const unused = !used.has(edge.id);
    const startDeg = degree.get(edge.start) ?? 0;
    const endDeg = degree.get(edge.end) ?? 0;
    if (unused || startDeg < 2 || endDeg < 2) {
      ids.push(edge.id);
    }
  }
  return ids;
}

export function hasDanglingEdges(project: Project): boolean {
  return danglingEdgeIds(project).length > 0;
}

function danglingWarning(targetId: string): Warning {
  return {
    code: DANGLING_EDGE,
    severity: "red",
    message: "Sketch left with dangling edges.",
    targetId,
  };
}

/** Dangling edges are illegal when leaving sketch mode (§6.3). */
export function leaveSketchMode(project: Project): {
  ok: boolean;
  project: Project;
} {
  const dangling = danglingEdgeIds(project);
  const other = (project.warnings ?? []).filter((w) => w.code !== DANGLING_EDGE);
  if (dangling.length === 0) {
    return {
      ok: true,
      project: {
        ...project,
        warnings: other.length > 0 ? other : project.warnings,
      },
    };
  }
  return {
    ok: false,
    project: {
      ...project,
      warnings: [...other, danglingWarning(dangling[0]!)],
    },
  };
}
