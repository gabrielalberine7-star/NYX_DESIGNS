import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFile(resolve(root, path), "utf8");

test("as páginas essenciais e os arquivos de marca existem", async () => {
  const required = [
    "index.html", "404.html", "admin/index.html", "css/style.css", "css/admin.css",
    "js/main.js", "js/portfolio.js", "js/admin.js", "supabase/schema.sql",
    "assets/branding/logo-original.png", "assets/branding/logo-web.webp",
    "assets/branding/favicon.ico", "assets/branding/favicon-32x32.png",
    "assets/branding/favicon-16x16.png", "assets/branding/apple-touch-icon.png"
  ];
  for (const path of required) assert.ok((await stat(resolve(root, path))).size > 0, `${path} está vazio ou ausente`);
});

test("logo e favicon originais mantêm as dimensões recebidas", async () => {
  const dimensions = async (path) => {
    const buffer = await readFile(resolve(root, path));
    assert.equal(buffer.toString("ascii", 1, 4), "PNG");
    return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
  };
  assert.deepEqual(await dimensions("assets/branding/logo-original.png"), [1254, 1254]);
  assert.deepEqual(await dimensions("assets/branding/favicon-original.png"), [512, 512]);
});

test("todas as páginas configuram a marca, o favicon e acessibilidade básica", async () => {
  for (const page of ["index.html", "404.html", "admin/index.html"]) {
    const html = await read(page);
    assert.match(html, /assets\/branding\/favicon\.ico/);
    assert.match(html, /apple-touch-icon\.png/);
    assert.match(html, /alt="NyxVantore Designs"/);
    assert.match(html, /<html lang="pt-BR">/);
    assert.match(html, /<meta name="viewport"/);
  }
});

test("a página pública contém as seções e contatos oficiais", async () => {
  const html = await read("index.html");
  for (const id of ["inicio", "portfolio", "servicos", "sobre", "contato"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /@nyxvantore_designs/);
  assert.match(html, /nyxfreelancer9@gmail\.com/);
  assert.match(html, /5543998091790/);
  assert.match(html, /application\/ld\+json/);
});

test("a segurança do Supabase usa RLS e o bucket privado", async () => {
  const sql = await read("supabase/schema.sql");
  assert.match(sql, /enable row level security/gi);
  assert.match(sql, /create policy "Projetos publicados são públicos"/);
  assert.match(sql, /public\.is_admin\(\)/);
  assert.match(sql, /'portfolio',\s*'portfolio',\s*false/);
  assert.doesNotMatch(sql, /service[_ -]?role/i);
});

test("nenhuma chave privada foi incluída no frontend", async () => {
  const frontend = await Promise.all(["index.html", "admin/index.html", "js/config.js", "js/admin.js", "js/portfolio.js"].map(read));
  assert.doesNotMatch(frontend.join("\n"), /SUPABASE_SERVICE_ROLE_KEY|service_role|sk_live_|eyJ[a-zA-Z0-9_-]{30,}/);
});

test("a configuração da Vercel protege rotas e permite o Supabase", async () => {
  const config = JSON.parse(await read("vercel.json"));
  const serialized = JSON.stringify(config);
  assert.match(serialized, /Content-Security-Policy/);
  assert.match(serialized, /supabase\.co/);
  assert.match(serialized, /frame-ancestors 'none'/);
  assert.ok(config.rewrites.some((rule) => rule.source === "/admin"));
});

test("responsividade, menu acessível e redução de movimento estão implementados", async () => {
  const [css, main] = await Promise.all([read("css/style.css"), read("js/main.js")]);
  assert.match(css, /@media \(max-width:720px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(main, /aria-expanded/);
  assert.match(main, /event\.key === "Escape"/);
});

test("a função de contato rejeita métodos e conteúdos inválidos", async () => {
  const { default: contact } = await import("../api/contact.js");
  const methodResponse = await contact.fetch(new Request("https://example.com/api/contact", { method: "GET" }));
  assert.equal(methodResponse.status, 405);
  const invalidResponse = await contact.fetch(new Request("https://example.com/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "A" })
  }));
  assert.equal(invalidResponse.status, 400);
});
