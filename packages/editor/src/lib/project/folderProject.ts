import { mergeSplitProject, type SplitProjectFiles } from "../export/splitProject.js";

export function loadProjectFromSplitFiles(files: Record<string, string>) {
  if (!files["project.json"]) {
    throw new Error("project.json が見つかりません（フォルダ形式プロジェクトを選択してください）");
  }
  return mergeSplitProject(files as SplitProjectFiles);
}

export function folderDisplayName(dirPath: string): string {
  const normalized = dirPath.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? dirPath;
}
