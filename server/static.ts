import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "..", "dist", "public");
  if (!fs.existsSync(distPath)) {
    // In development, dist might not exist yet if not built, 
    // but serveStatic is usually called in production.
    console.warn(`Static directory not found at ${distPath}`);
  }

  app.use(express.static(distPath));

  // Root path for health checks and index
  app.get("/", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });

  // fall through to index.html if the file doesn't exist
  app.get(/^\/(?!api|healthz|ping).*/, (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
