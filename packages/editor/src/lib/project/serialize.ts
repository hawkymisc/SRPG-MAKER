import type { Project } from "@srpg/shared";
import { assertValidProject } from "./validate.js";

export function serializeProject(project: Project): string {
  const validated = assertValidProject(project);
  return `${JSON.stringify(validated, null, 2)}\n`;
}

export function parseProjectJson(text: string): Project {
  const raw: unknown = JSON.parse(text);
  return assertValidProject(raw);
}
