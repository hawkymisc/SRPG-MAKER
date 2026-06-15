import fs from "node:fs/promises";
import path from "node:path";

/** @param {string} root */
export async function readFolderFiles(root) {
  /** @type {Record<string, string>} */
  const files = {};

  /** @param {string} dir @param {string} prefix */
  async function walk(dir, prefix) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full, rel);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        files[rel.replace(/\\/g, "/")] = await fs.readFile(full, "utf8");
      }
    }
  }

  await walk(root, "");
  return files;
}

/**
 * @param {string} root
 * @param {Record<string, string>} files
 */
export async function writeFolderFiles(root, files) {
  for (const [relPath, content] of Object.entries(files)) {
    const normalized = relPath.replace(/\\/g, "/");
    const full = path.join(root, normalized);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content, "utf8");
  }
}
