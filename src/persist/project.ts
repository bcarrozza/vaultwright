import projectSchema from "../../project.schema.json";
import type { Project } from "../model/project";
import {
  type JsonSchema,
  validateAgainstSchema,
} from "./schema";

export class ProjectLoadError extends Error {
  readonly errors: string[];
  constructor(errors: string[]) {
    super(errors.join("; "));
    this.name = "ProjectLoadError";
    this.errors = errors;
  }
}

export function validateProject(data: unknown): string[] {
  return validateAgainstSchema(data, projectSchema as JsonSchema);
}

export function loadProject(input: unknown): Project {
  const data = typeof input === "string" ? JSON.parse(input) : input;
  const errors = validateProject(data);
  if (errors.length > 0) {
    throw new ProjectLoadError(errors);
  }
  const project = data as Project;
  if (project.requirementsVersion !== "1.4") {
    throw new ProjectLoadError([
      `$.requirementsVersion: must be "1.4" (got ${JSON.stringify(project.requirementsVersion)})`,
    ]);
  }
  return structuredClone(project);
}

export function saveProject(project: Project): string {
  const toSave: Project = {
    ...project,
    requirementsVersion: "1.4",
  };
  const errors = validateProject(toSave);
  if (errors.length > 0) {
    throw new ProjectLoadError(errors);
  }
  return JSON.stringify(toSave, null, 2);
}
