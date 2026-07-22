import { getSignedAsset, getSupabaseClient, hasSupabaseConfig } from "./supabase-client.js";

const grid = document.querySelector("#project-grid");
const status = document.querySelector("#portfolio-status");
const empty = document.querySelector("#portfolio-empty");
const errorState = document.querySelector("#portfolio-error");
const retry = document.querySelector("#portfolio-retry");
const filters = document.querySelector("#portfolio-filters");
const modal = document.querySelector("#project-modal");
const modalContent = document.querySelector("#project-modal-content");
const lightbox = document.querySelector("#image-lightbox");
const lightboxImage = document.querySelector("#lightbox-image");
let projects = [];
let activeFilter = "all";

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function safeUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

async function projectAsset(path, externalUrl = "") {
  if (path) return getSignedAsset(path);
  return safeUrl(externalUrl);
}

function formatDate(value, year) {
  if (!value) return String(year || "");
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

async function addCover(container, project) {
  try {
    const url = await projectAsset(project.cover_image_path, project.cover_image_url);
    if (!url || !container.isConnected) return;
    const image = new Image();
    image.src = url;
    image.alt = project.cover_alt_text || `Capa do projeto ${project.title}`;
    image.loading = "lazy";
    image.decoding = "async";
    image.width = 800;
    image.height = 600;
    container.replaceChildren(image);
  } catch {
    // Mantém o placeholder caso a imagem esteja indisponível.
  }
}

function createProjectCard(project, index) {
  const article = element("article", "project-card");
  article.dataset.category = project.category;
  const coverButton = element("button", "project-cover");
  coverButton.type = "button";
  coverButton.setAttribute("aria-label", `Abrir detalhes de ${project.title}`);
  const placeholder = element("span", "project-cover-placeholder", String(index + 1).padStart(2, "0"));
  coverButton.append(placeholder);
  coverButton.addEventListener("click", () => openProject(project));
  void addCover(coverButton, project);
  const meta = element("div", "project-meta");
  meta.append(element("h3", "", project.title), element("p", "", `${project.category}\n${formatDate(project.published_at, project.year)}`));
  article.append(coverButton, meta, element("p", "project-summary", project.summary));
  return article;
}

function renderProjects() {
  grid.replaceChildren();
  const filtered = activeFilter === "all" ? projects : projects.filter((project) => project.category === activeFilter);
  filtered.forEach((project, index) => grid.append(createProjectCard(project, index)));
  empty.hidden = filtered.length > 0;
  if (!filtered.length && activeFilter !== "all") {
    empty.querySelector("span").textContent = "Nenhum trabalho neste filtro";
    empty.querySelector("h3").textContent = "Explore outra categoria.";
  } else {
    empty.querySelector("span").textContent = "Arquivo em construção";
    empty.querySelector("h3").textContent = "Novos projetos chegam em breve.";
  }
}

async function loadProjects() {
  status.hidden = false;
  errorState.hidden = true;
  empty.hidden = true;
  grid.replaceChildren();
  if (!hasSupabaseConfig()) {
    projects = [];
    status.hidden = true;
    renderProjects();
    return;
  }
  try {
    const client = await getSupabaseClient();
    const { data, error } = await client
      .from("projects")
      .select("id,title,slug,summary,description,category,year,tools,cover_image_path,cover_image_url,cover_alt_text,video_url,external_url,featured,published,display_order,published_at,project_images(id,image_url,storage_path,alt_text,display_order)")
      .eq("published", true)
      .order("featured", { ascending: false })
      .order("display_order", { ascending: true })
      .order("published_at", { ascending: false });
    if (error) throw error;
    projects = data || [];
    renderProjects();
  } catch (error) {
    console.error("Falha ao carregar portfólio", error);
    errorState.hidden = false;
  } finally {
    status.hidden = true;
  }
}

function addDataItem(parent, label, value) {
  if (!value) return;
  const wrap = element("div");
  wrap.append(element("span", "", label), element("p", "", value));
  parent.append(wrap);
}

async function openProject(project) {
  modalContent.replaceChildren();
  const hero = element("div", "modal-hero");
  const body = element("div", "modal-body");
  body.append(element("p", "modal-kicker", `${project.category} / ${project.year}`));
  const title = element("h2", "", project.title);
  title.id = "modal-title";
  body.append(title, element("p", "modal-summary", project.summary), element("p", "modal-description", project.description));
  const data = element("div", "modal-data");
  addDataItem(data, "Ano", project.year);
  addDataItem(data, "Categoria", project.category);
  addDataItem(data, "Ferramentas", Array.isArray(project.tools) ? project.tools.join(", ") : project.tools);
  body.append(data);
  const gallery = element("div", "modal-gallery");
  const sortedImages = [...(project.project_images || [])].sort((a, b) => a.display_order - b.display_order);
  for (const item of sortedImages) {
    try {
      const url = await projectAsset(item.storage_path, item.image_url);
      if (!url) continue;
      const button = element("button");
      button.type = "button";
      button.setAttribute("aria-label", `Ampliar ${item.alt_text || "imagem do projeto"}`);
      const image = new Image();
      image.src = url;
      image.alt = item.alt_text || `Imagem do projeto ${project.title}`;
      image.loading = "lazy";
      button.append(image);
      button.addEventListener("click", () => openLightbox(url, image.alt));
      gallery.append(button);
    } catch {
      // Uma imagem ausente não impede a visualização do restante do projeto.
    }
  }
  if (gallery.childElementCount) body.append(gallery);
  const actions = element("div", "modal-actions");
  const whatsapp = element("a", "button button-primary", "Solicitar trabalho semelhante");
  whatsapp.href = `https://wa.me/5543998091790?text=${encodeURIComponent(`Olá! Vi o projeto “${project.title}” no site da NyxVantore Designs e gostaria de solicitar algo semelhante.`)}`;
  whatsapp.target = "_blank";
  whatsapp.rel = "noopener noreferrer";
  actions.append(whatsapp);
  [[project.video_url, "Ver vídeo"], [project.external_url, "Abrir projeto"]].forEach(([url, label]) => {
    const href = safeUrl(url);
    if (!href) return;
    const link = element("a", "button button-ghost", label);
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    actions.append(link);
  });
  body.append(actions);
  modalContent.append(hero, body);
  modal.showModal();
  try {
    const coverUrl = await projectAsset(project.cover_image_path, project.cover_image_url);
    if (coverUrl) {
      const cover = new Image();
      cover.src = coverUrl;
      cover.alt = project.cover_alt_text || `Capa do projeto ${project.title}`;
      hero.append(cover);
    }
  } catch {
    // O conteúdo textual permanece acessível mesmo sem a capa.
  }
}

function openLightbox(url, alt) {
  lightboxImage.src = url;
  lightboxImage.alt = alt;
  lightbox.showModal();
}

filters?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  activeFilter = button.dataset.filter;
  filters.querySelectorAll("[data-filter]").forEach((item) => {
    const active = item === button;
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-pressed", String(active));
  });
  renderProjects();
});
retry?.addEventListener("click", loadProjects);
document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", () => modal.close()));
document.querySelectorAll("[data-close-lightbox]").forEach((button) => button.addEventListener("click", () => lightbox.close()));
[modal, lightbox].forEach((dialog) => dialog?.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
}));

void loadProjects();
