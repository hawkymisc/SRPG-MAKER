import fs from "node:fs/promises";
import path from "node:path";

/** @param {string} root */
export async function readFolderPayload(root) {
  /** @type {Record<string, string>} */
  const json = {};
  /** @type {Record<string, string>} */
  const assetsBase64 = {};

  /** @param {string} dir @param {string} prefix */
  async function walk(dir, prefix) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full, rel);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const normalized = rel.replace(/\\/g, "/");
      if (normalized.startsWith("assets/") && !normalized.endsWith(".json")) {
        const buf = await fs.readFile(full);
        assetsBase64[normalized] = buf.toString("base64");
      } else if (normalized.endsWith(".json")) {
        json[normalized] = await fs.readFile(full, "utf8");
      }
    }
  }

  await walk(root, "");
  return { json, assetsBase64 };
}

/** @deprecated Use readFolderPayload */
export async function readFolderFiles(root) {
  const { json } = await readFolderPayload(root);
  return json;
}

/**
 * @param {string} root
 * @param {{ json: Record<string, string>, assetsBase64?: Record<string, string> }} payload
 */
export async function writeFolderPayload(root, payload) {
  for (const [relPath, content] of Object.entries(payload.json)) {
    const normalized = relPath.replace(/\\/g, "/");
    const full = path.join(root, normalized);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content, "utf8");
  }
  for (const [relPath, base64] of Object.entries(payload.assetsBase64 ?? {})) {
    const normalized = relPath.replace(/\\/g, "/");
    const full = path.join(root, normalized);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, Buffer.from(base64, "base64"));
  }
}

/**
 * @param {string} root
 * @param {Record<string, string>} files
 */
export async function writeFolderFiles(root, files) {
  await writeFolderPayload(root, { json: files, assetsBase64: {} });
}
