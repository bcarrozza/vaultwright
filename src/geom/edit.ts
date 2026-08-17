import type { Project } from "../model/project";
import { edgeById, vertexById } from "./graph";

export function moveVertex(
  project: Project,
  id: string,
  x: number,
  y: number,
): Project {
  vertexById(project, id);
  return {
    ...project,
    vertices: project.vertices.map((v) =>
      v.id === id ? { ...v, x, y } : v,
    ),
  };
}

/** Typed length on the selected edge (§6.2). Start vertex stays put. */
export function setEdgeLength(
  project: Project,
  edgeId: string,
  lengthM: number,
): Project {
  if (!(lengthM > 0) || !Number.isFinite(lengthM)) {
    return project;
  }
  const edge = edgeById(project, edgeId);
  const start = vertexById(project, edge.start);
  const end = vertexById(project, edge.end);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const current = Math.hypot(dx, dy);
  const constraints = edge.constraints ?? [];
  const vertical = constraints.includes("vertical");
  const horizontal = constraints.includes("horizontal");

  let nx: number;
  let ny: number;
  if (current === 0) {
    nx = vertical ? start.x : start.x + lengthM;
    ny = horizontal ? start.y : start.y + lengthM;
    if (vertical) ny = start.y + lengthM;
    if (horizontal) nx = start.x + lengthM;
  } else {
    const s = lengthM / current;
    nx = start.x + dx * s;
    ny = start.y + dy * s;
    if (vertical) nx = start.x;
    if (horizontal) ny = start.y;
  }
  return moveVertex(project, edge.end, nx, ny);
}
