export const BACKUP_PREFIX = "srpg-editor-backup:";
export const BACKUP_GENERATIONS = 5;

export interface BackupStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export function rotateBackups(existing: string[], next: string, max = BACKUP_GENERATIONS): string[] {
  return [next, ...existing].slice(0, max);
}

export function loadBackupList(store: BackupStore, projectKey: string): string[] {
  const raw = store.get(`${BACKUP_PREFIX}${projectKey}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function saveBackup(store: BackupStore, projectKey: string, content: string): string[] {
  const list = loadBackupList(store, projectKey);
  const next = rotateBackups(list, content);
  store.set(`${BACKUP_PREFIX}${projectKey}`, JSON.stringify(next));
  return next;
}
