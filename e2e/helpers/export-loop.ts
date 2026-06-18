import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Download, type Page } from "@playwright/test";

const E2E_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

let exportDownloadExtractSeq = 0;

export const EXPORT_MOUNT_ORIGIN = "http://127.0.0.1:5199";

export type ExportZipEntries = Record<string, Uint8Array>;

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ogg": "audio/ogg",
  ".wasm": "application/wasm",
};

function contentTypeFor(path: string): string {
  const dot = path.lastIndexOf(".");
  if (dot < 0) {
    return "application/octet-stream";
  }
  return MIME[path.slice(dot)] ?? "application/octet-stream";
}

function walkExportFiles(rootDir: string, prefix = ""): ExportZipEntries {
  const entries: ExportZipEntries = {};
  for (const name of readdirSync(rootDir)) {
    const fullPath = join(rootDir, name);
    const relPath = prefix ? `${prefix}/${name}` : name;
    if (statSync(fullPath).isDirectory()) {
      Object.assign(entries, walkExportFiles(fullPath, relPath));
    } else {
      entries[relPath.replace(/\\/g, "/")] = readFileSync(fullPath);
    }
  }
  return entries;
}

export function loadExportVariant(variantName: string): ExportZipEntries {
  const variantRoot = join(E2E_ROOT, "fixtures", "export-variants", variantName);
  return walkExportFiles(variantRoot);
}

async function unzipDownloadToEntries(download: Download): Promise<ExportZipEntries> {
  const { mkdirSync, rmSync } = await import("node:fs");
  const { execFileSync } = await import("node:child_process");
  const { platform } = await import("node:os");
  exportDownloadExtractSeq += 1;
  const extractRoot = join(
    E2E_ROOT,
    "..",
    "test-results",
    "export-download",
    `run-${exportDownloadExtractSeq}`,
  );
  const zipPath = join(extractRoot, "export.zip");
  mkdirSync(extractRoot, { recursive: true });
  await download.saveAs(zipPath);

  if (platform() === "win32") {
    execFileSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${extractRoot.replace(/'/g, "''")}' -Force`,
      ],
      { stdio: "pipe" },
    );
  } else {
    execFileSync("unzip", ["-q", zipPath, "-d", extractRoot], { stdio: "pipe" });
  }

  const entries = walkExportFiles(extractRoot);
  delete entries["export.zip"];
  rmSync(extractRoot, { recursive: true, force: true });
  return entries;
}

export async function readPlaywrightDownload(download: Download): Promise<ExportZipEntries> {
  return unzipDownloadToEntries(download);
}

export async function mountExportedGame(page: Page, entries: ExportZipEntries): Promise<void> {
  await page.route(`${EXPORT_MOUNT_ORIGIN}/**`, async (route) => {
    const url = new URL(route.request().url());
    let rel = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    if (rel === "" || rel === "index.html") {
      rel = "game/index.html";
    } else if (!rel.startsWith("game/")) {
      rel = `game/${rel}`;
    }

    const data = entries[rel];
    if (!data) {
      await route.fulfill({ status: 404, body: `missing export entry: ${rel}` });
      return;
    }

    await route.fulfill({
      status: 200,
      body: Buffer.from(data),
      contentType: contentTypeFor(rel),
    });
  });

  await page.goto(`${EXPORT_MOUNT_ORIGIN}/game/index.html`);
}

export async function exportHtml5ZipFromEditor(page: Page): Promise<ExportZipEntries> {
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("btn-export-html5").click();
  await expect(page.getByTestId("btn-export-html5")).not.toHaveText("書き出し中…", {
    timeout: 60_000,
  });
  const download = await downloadPromise;
  await expect(download.suggestedFilename()).toMatch(/\.zip$/i);
  return readPlaywrightDownload(download);
}
