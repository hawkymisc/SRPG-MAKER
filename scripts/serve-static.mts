/**
 * Minimal static file server for exported HTML5 E2E fixture (no extra deps).
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { resolve } from "node:path";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
};

function usage(): never {
  console.error("Usage: tsx scripts/serve-static.mts <rootDir> <port> [host]");
  process.exit(1);
}

const rootDir = resolve(process.argv[2] ?? usage());
const port = Number(process.argv[3] ?? usage());
const host = process.argv[4] ?? "127.0.0.1";

if (!Number.isFinite(port) || port <= 0) {
  usage();
}

function sendFile(res: ServerResponse, filePath: string): void {
  const ext = extname(filePath);
  const body = readFileSync(filePath);
  res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
  res.end(body);
}

function handler(req: IncomingMessage, res: ServerResponse): void {
  const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/");
  const rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
  const candidate = normalize(join(rootDir, rel));

  if (!candidate.startsWith(rootDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (!existsSync(candidate) || !statSync(candidate).isFile()) {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  sendFile(res, candidate);
}

createServer(handler).listen(port, host, () => {
  console.log(`static server: http://${host}:${port} -> ${rootDir}`);
});
