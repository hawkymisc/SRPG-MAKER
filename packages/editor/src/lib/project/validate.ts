import { ProjectSchema, type Project } from "@srpg/shared";

export interface ValidationResult {
  ok: boolean;
  project?: Project;
  error?: string;
}

export function validateProject(raw: unknown): ValidationResult {
  try {
    const project = ProjectSchema.parse(raw);
    return { ok: true, project };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

export function assertValidProject(raw: unknown): Project {
  return ProjectSchema.parse(raw);
}
