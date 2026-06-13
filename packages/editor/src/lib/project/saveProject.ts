import type { Project } from "@srpg/shared";
import { saveBackup, type BackupStore } from "./backup.js";
import { atomicWrite, type AtomicWriteTarget } from "./atomicWrite.js";
import { serializeProject } from "./serialize.js";
import { assertValidProject } from "./validate.js";

export interface SaveProjectOptions {
  project: Project;
  target: AtomicWriteTarget;
  backupStore: BackupStore;
  projectKey: string;
}

export interface SaveProjectResult {
  content: string;
  backups: string[];
}

export async function saveProjectAtomic(options: SaveProjectOptions): Promise<SaveProjectResult> {
  const validated = assertValidProject(options.project);
  const content = serializeProject(validated);
  const backups = saveBackup(options.backupStore, options.projectKey, content);
  await atomicWrite(options.target, content);
  return { content, backups };
}

export class MemoryBackupStore implements BackupStore {
  private data = new Map<string, string>();

  get(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.data.set(key, value);
  }
}
