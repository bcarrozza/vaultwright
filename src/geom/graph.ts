import type { Edge, Face, Project, Vertex } from "../model/project";
import { circularArc, sampleCircularArc, type Point } from "./arch";

export function vertexById(project: Project, id: string): Vertex {
  const v = project.vertices.find((item) => item.id === id);
  if (!v) throw new Error(`Unknown vertex ${id}`);
  return v;
}

export function edgeById(project: Project, id: string): Edge {
  const e = project.edges.find((item) => item.id === id);
  if (!e) throw new Error(`Unknown edge ${id}`);
  return e;
}

export function distance(a: Vertex, b: Vertex): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function edgeLength(project: Project, edgeId: string): number {
  const edge = edgeById(project, edgeId);
  return distance(vertexById(project, edge.start), vertexById(project, edge.end));
}

export function edgePoints(project: Project, edge: Edge, steps = 32): Point[] {
  const start = vertexById(project, edge.start);
  const end = vertexById(project, edge.end);
  if (edge.kind === "arch" && edge.rise != null && edge.rise > 0) {
    return sampleCircularArc(circularArc(start, end, edge.rise), steps);
  }
  return [start, end];
}

/** Walk a face loop (edge ids, CCW) to unique vertices in order. */
export function faceVertices(project: Project, face: Face): Vertex[] {
  if (face.loop.length < 3) {
    throw new Error(`Face ${face.id} loop too short`);
  }
  const edges = face.loop.map((id) => edgeById(project, id));
  const first = edges[0]!;
  const second = edges[1]!;
  const firstStart =
    first.end === second.start || first.end === second.end
      ? first.start
      : first.end;
  const verts: Vertex[] = [vertexById(project, firstStart)];
  let at = firstStart;
  for (const edge of edges) {
    at = edge.start === at ? edge.end : edge.start;
    verts.push(vertexById(project, at));
  }
  verts.pop();
  return verts;
}

/** Face outline including sampled arch edges (for drawing). */
export function facePolygon(project: Project, face: Face): Point[] {
  if (face.loop.length < 3) {
    throw new Error(`Face ${face.id} loop too short`);
  }
  const edges = face.loop.map((id) => edgeById(project, id));
  const first = edges[0]!;
  const second = edges[1]!;
  const firstStartId =
    first.end === second.start || first.end === second.end
      ? first.start
      : first.end;
  const pts: Point[] = [];
  let at = firstStartId;
  for (const edge of edges) {
    const forward = edge.start === at;
    const samples = edgePoints(project, edge);
    const ordered = forward ? samples : [...samples].reverse();
    for (let i = 0; i < ordered.length - 1; i++) {
      pts.push(ordered[i]!);
    }
    at = forward ? edge.end : edge.start;
  }
  return pts;
}

export type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};

export function faceBounds(project: Project, face: Face): Bounds {
  const verts = faceVertices(project, face);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const v of verts) {
    if (v.x < minX) minX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.x > maxX) maxX = v.x;
    if (v.y > maxY) maxY = v.y;
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function firstMasonryFace(project: Project): Face | undefined {
  return project.faces.find(
    (f) => f.regionKind === "masonryWall" || f.regionKind === "masonryPier",
  );
}

export const COURSED_KINDS = new Set([
  "masonryWall",
  "masonryPier",
  "buttress",
  "deck",
  "fill",
]);

export const SOLID_KINDS = new Set([...COURSED_KINDS, "archRing"]);

export function isVoidKind(kind: Face["regionKind"]): boolean {
  return kind === "void" || kind === "archOpening";
}
