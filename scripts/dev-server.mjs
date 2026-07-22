import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const port = Number(process.env.PORT || 4173);
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".xml": "application/xml; charset=utf-8", ".png": "image/png", ".webp": "image/webp", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8" };

async function localEnv() {
  const path = join(root, ".env");
  if (!existsSync(path)) return {};
  const text = await readFile(path, "utf8");
  return Object.fromEntries(text.split(/\r?\n/).filter((line) => line && !line.trim().startsWith("#") && line.includes("=")).map((line) => {
    const separator = line.indexOf("=");
    return [line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "")];
  }));
}
const env = await localEnv();
const config = {
  supabaseUrl: process.env.SUPABASE_URL || env.SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || "",
  adminEmail: process.env.ADMIN_EMAIL || env.ADMIN_EMAIL || "nyxfreelancer9@gmail.com",
  contactEndpoint: "/api/contact"
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === "/js/config.js") {
      response.writeHead(200, { "Content-Type": mime[".js"], "Cache-Control": "no-store" });
      return response.end(`export const PUBLIC_CONFIG = Object.freeze(${JSON.stringify(config)});`);
    }
    let requestPath = decodeURIComponent(url.pathname);
    if (requestPath === "/admin" || requestPath === "/admin/") requestPath = "/admin/index.html";
    if (requestPath.endsWith("/")) requestPath += "index.html";
    const safePath = normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
    let filePath = join(root, safePath);
    if (!filePath.startsWith(root)) throw new Error("Caminho inválido");
    if (!existsSync(filePath) || !(await stat(filePath)).isFile()) {
      filePath = join(root, "404.html");
      response.statusCode = 404;
    }
    response.setHeader("Content-Type", mime[extname(filePath).toLowerCase()] || "application/octet-stream");
    response.setHeader("Cache-Control", "no-cache");
    response.end(await readFile(filePath));
  } catch {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Erro interno do servidor local.");
  }
}).listen(port, "127.0.0.1", () => console.log(`Local: http://127.0.0.1:${port}`));
