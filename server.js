import http from "http";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const API_KEY = "92282327-b4d6-4501-a073-e661e3e792e9"; // din DMI nøgle
const PORT = process.env.PORT || 3000;
const CACHE_TTL_MS = 60 * 1000; // cache DMI svar i 60s

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname); // projektrod

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

// Simple in-memory cache for DMI responses
let dmiCache = { ts: 0, body: null, status: 0, headers: {} };

// Reusable fetch with timeout helper
async function fetchWithTimeout(input, opts = {}, ms = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(input, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(body);
}

async function handleDmiProxy(req, res, url) {
  // serve from cache if fresh
  if (Date.now() - dmiCache.ts < CACHE_TTL_MS && dmiCache.body) {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "X-Cache": "HIT" });
    res.end(dmiCache.body);
    return;
  }

  const dmiUrl = new URL("https://dmigw.govcloud.dk/v2/metObs/collections/observation/items");
  dmiUrl.searchParams.set("stationId", "06180");
  dmiUrl.searchParams.set("period", "latest-10-minutes");

  console.log(`[${new Date().toISOString()}] Proxy til DMI: ${dmiUrl.href}`);

  try {
    let r;
    try {
      r = await fetchWithTimeout(dmiUrl, { headers: { "X-Gravitee-Api-Key": API_KEY } }, 15000);
    } catch (err) {
      console.warn("Første fetch fejl, retry med længere timeout:", err?.name || err);
      r = await fetchWithTimeout(dmiUrl, { headers: { "X-Gravitee-Api-Key": API_KEY } }, 30000);
    }

    const duration = Date.now() - dmiCache.ts;
    console.log(`DMI status: ${r.status} ${r.statusText}`);

    const bodyText = await r.text();

    if (r.ok) {
      // store in simple cache
      dmiCache = { ts: Date.now(), body: bodyText, status: r.status, headers: Object.fromEntries(r.headers) || {} };
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "X-Cache": "MISS" });
      res.end(bodyText);
      return;
    }

    res.writeHead(r.status || 502, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Fejl fra DMI", status: r.status, details: bodyText }));
  } catch (err) {
    const msg = err.name === "AbortError" ? "Timeout ved hentning fra DMI" : String(err);
    console.error("Fejl ved hentning fra DMI:", msg);
    sendJson(res, 502, { error: "Bad Gateway", message: msg });
  }
}

async function serveStatic(resolved, res) {
  try {
    const stat = await fsp.stat(resolved);
    if (!stat.isFile()) throw new Error("not file");
    const ext = path.extname(resolved).toLowerCase();
    const type = mime[ext] || "application/octet-stream";
    // security headers + cache for static assets
    const headers = {
      "Content-Type": type,
      "Content-Length": stat.size,
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    };
    res.writeHead(200, headers);
    const stream = fs.createReadStream(resolved);
    stream.pipe(res);
    stream.on("error", (e) => {
      console.error("Stream error:", e);
      res.destroy();
    });
  } catch (err) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  try {
    // Basic request logging
    console.log(`${req.method} ${req.url}`);

    // CORS for frontend fetch
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === "/dmi") {
      await handleDmiProxy(req, res, url);
      return;
    }

    // Serve static files
    let filePath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
    const resolved = path.resolve(ROOT, "." + filePath);
    if (!resolved.startsWith(ROOT)) {
      res.writeHead(403, { "Content-Type": "text/plain" });
      res.end("Forbidden");
      return;
    }
    await serveStatic(resolved, res);
  } catch (err) {
    console.error("Serverfejl:", err);
    sendJson(res, 500, { error: "Server error", message: String(err) });
  }
});

server.listen(PORT, () => console.log(`✅ Server kører: http://localhost:${PORT}/`));

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down...");
  server.close(() => process.exit(0));
});

