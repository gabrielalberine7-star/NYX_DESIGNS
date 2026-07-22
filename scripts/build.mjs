import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "dist");
const copyTargets = ["index.html", "404.html", "admin", "css", "js", "assets", "robots.txt", "sitemap.xml", "site.webmanifest"];

function readDotEnv() {
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) return {};
  return readFile(envPath, "utf8").then((text) => Object.fromEntries(text.split(/\r?\n/).filter((line) => line && !line.trim().startsWith("#") && line.includes("=")).map((line) => {
    const separator = line.indexOf("=");
    return [line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "")];
  })));
}

const localEnv = await readDotEnv();
const getEnv = (name, fallback = "") => process.env[name] || localEnv[name] || fallback;
const publicConfig = {
  supabaseUrl: getEnv("SUPABASE_URL"),
  supabaseAnonKey: getEnv("SUPABASE_ANON_KEY"),
  adminEmail: getEnv("ADMIN_EMAIL", "nyxfreelancer9@gmail.com"),
  contactEndpoint: "/api/contact"
};
if (publicConfig.supabaseUrl && !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(publicConfig.supabaseUrl)) {
  throw new Error("SUPABASE_URL deve ser uma URL válida do Supabase.");
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const target of copyTargets) {
  await cp(resolve(root, target), resolve(output, target), { recursive: true });
}
await writeFile(resolve(output, "js/config.js"), `export const PUBLIC_CONFIG = Object.freeze(${JSON.stringify(publicConfig, null, 2)});\n`, "utf8");
console.log("Site preparado em dist/.");
