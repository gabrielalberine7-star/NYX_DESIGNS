import { clearSignedAsset, getPublicConfig, getSignedAsset, getSupabaseClient, hasSupabaseConfig } from "./supabase-client.js";

const loading = document.querySelector("#admin-loading");
const loginPanel = document.querySelector("#login-panel");
const loginForm = document.querySelector("#login-form");
const loginStatus = document.querySelector("#login-status");
const dashboard = document.querySelector("#admin-dashboard");
const identity = document.querySelector("#admin-identity");
const logoutButton = document.querySelector("#logout-button");
const list = document.querySelector("#project-admin-list");
const adminEmpty = document.querySelector("#admin-empty");
const dashboardMessage = document.querySelector("#dashboard-message");
const editor = document.querySelector("#project-editor");
const editorTitle = document.querySelector("#editor-title");
const projectForm = document.querySelector("#project-form");
const editorStatus = document.querySelector("#editor-status");
const uploadProgress = document.querySelector("#upload-progress");
const coverPreview = document.querySelector("#cover-preview");
const galleryPreview = document.querySelector("#gallery-preview");
const existingGallery = document.querySelector("#existing-gallery");
let client;
let projects = [];
let currentProject = null;
let selectedGalleryFiles = [];
let slugWasEdited = false;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxFileSize = 8 * 1024 * 1024;

function setMessage(target, message = "", type = "") {
  target.textContent = message;
  target.className = target === dashboardMessage ? "dashboard-message" : "";
  if (type) target.classList.add(`is-${type}`);
}

function showLogin(message = "") {
  loading.hidden = true;
  dashboard.hidden = true;
  loginPanel.hidden = false;
  logoutButton.hidden = true;
  identity.textContent = "";
  if (message) setMessage(loginStatus, message, "error");
}

async function verifyAccess(session) {
  if (!session) {
    showLogin();
    return;
  }
  const { data: isAdmin, error } = await client.rpc("is_admin");
  if (error || !isAdmin) {
    await client.auth.signOut();
    showLogin("Este usuário não possui permissão administrativa.");
    return;
  }
  loading.hidden = true;
  loginPanel.hidden = true;
  dashboard.hidden = false;
  logoutButton.hidden = false;
  identity.textContent = session.user.email || "Administrador";
  await loadProjects();
}

async function initialize() {
  if (!hasSupabaseConfig()) {
    showLogin("O Supabase ainda não foi configurado. Consulte o README do projeto.");
    loginForm.querySelector("button").disabled = true;
    return;
  }
  try {
    client = await getSupabaseClient();
    const { data: { session } } = await client.auth.getSession();
    await verifyAccess(session);
    client.auth.onAuthStateChange((event, nextSession) => {
      if (event === "SIGNED_OUT") showLogin();
      if (event === "SIGNED_IN" && dashboard.hidden) void verifyAccess(nextSession);
    });
  } catch (error) {
    console.error(error);
    showLogin("Não foi possível iniciar o acesso seguro. Verifique a configuração.");
  }
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = new FormData(loginForm).get("email").trim().toLowerCase();
  const configuredAdmin = getPublicConfig().adminEmail?.trim().toLowerCase();
  setMessage(loginStatus, "Enviando link seguro...");
  if (configuredAdmin && email !== configuredAdmin) {
    setMessage(loginStatus, "Use o e-mail de administrador autorizado.", "error");
    return;
  }
  const button = loginForm.querySelector("button");
  button.disabled = true;
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/admin/`, shouldCreateUser: false }
  });
  button.disabled = false;
  if (error) setMessage(loginStatus, "Não foi possível enviar o link. Confirme se o usuário já foi criado no Supabase.", "error");
  else setMessage(loginStatus, "Link enviado. Confira também a pasta de spam.", "success");
});

logoutButton?.addEventListener("click", () => client?.auth.signOut());

async function loadProjects() {
  setMessage(dashboardMessage, "Carregando projetos...");
  const { data, error } = await client.from("projects")
    .select("*,project_images(*)")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    setMessage(dashboardMessage, `Não foi possível carregar: ${error.message}`, "error");
    return;
  }
  projects = data || [];
  setMessage(dashboardMessage);
  renderProjectList();
}

function renderProjectList() {
  list.replaceChildren();
  adminEmpty.hidden = projects.length > 0;
  projects.forEach((project, index) => {
    const row = document.createElement("article");
    row.className = "admin-project";
    row.dataset.id = project.id;
    const number = document.createElement("span");
    number.className = "admin-project-index";
    number.textContent = String(index + 1).padStart(2, "0");
    const name = document.createElement("h2");
    name.textContent = project.title;
    const slug = document.createElement("small");
    slug.textContent = `/${project.slug}`;
    name.append(slug);
    const state = document.createElement("div");
    state.className = "admin-project-state";
    state.append(createState(project.published ? "Publicado" : "Rascunho", project.published ? "is-published" : ""));
    if (project.featured) state.append(createState("Destaque", "is-featured"));
    const actions = document.createElement("div");
    actions.className = "admin-project-actions";
    actions.append(
      actionButton("↑", "up", "Mover para cima", index === 0),
      actionButton("↓", "down", "Mover para baixo", index === projects.length - 1),
      actionButton(project.published ? "Ocultar" : "Publicar", "publish", project.published ? "Despublicar projeto" : "Publicar projeto"),
      actionButton(project.featured ? "Remover destaque" : "Destacar", "feature", "Alterar destaque"),
      actionButton("Editar", "edit", `Editar ${project.title}`),
      actionButton("Excluir", "delete", `Excluir ${project.title}`, false, true)
    );
    row.append(number, name, state, actions);
    list.append(row);
  });
}

function createState(text, className) {
  const state = document.createElement("span");
  state.className = `state-pill ${className}`;
  state.textContent = text;
  return state;
}

function actionButton(text, action, label, disabled = false, danger = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `icon-button${danger ? " danger" : ""}`;
  button.dataset.action = action;
  button.textContent = text;
  button.setAttribute("aria-label", label);
  button.disabled = disabled;
  return button;
}

list?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  const row = event.target.closest("[data-id]");
  if (!button || !row) return;
  const project = projects.find((item) => item.id === row.dataset.id);
  if (!project) return;
  const action = button.dataset.action;
  if (action === "edit") return openEditor(project);
  if (action === "delete") return deleteProject(project);
  if (action === "publish") return updateFlags(project, { published: !project.published, published_at: !project.published && !project.published_at ? new Date().toISOString() : project.published_at });
  if (action === "feature") return updateFlags(project, { featured: !project.featured });
  if (action === "up" || action === "down") return moveProject(project, action === "up" ? -1 : 1);
});

async function updateFlags(project, changes) {
  setMessage(dashboardMessage, "Atualizando projeto...");
  const { error } = await client.from("projects").update(changes).eq("id", project.id);
  if (error) setMessage(dashboardMessage, error.message, "error");
  else {
    setMessage(dashboardMessage, "Projeto atualizado.", "success");
    await loadProjects();
  }
}

async function moveProject(project, direction) {
  const index = projects.findIndex((item) => item.id === project.id);
  const target = projects[index + direction];
  if (!target) return;
  const firstOrder = Number.isFinite(project.display_order) ? project.display_order : index;
  const secondOrder = Number.isFinite(target.display_order) ? target.display_order : index + direction;
  const results = await Promise.all([
    client.from("projects").update({ display_order: secondOrder }).eq("id", project.id),
    client.from("projects").update({ display_order: firstOrder }).eq("id", target.id)
  ]);
  const failed = results.find((result) => result.error);
  if (failed) setMessage(dashboardMessage, failed.error.message, "error");
  else await loadProjects();
}

async function deleteProject(project) {
  if (!window.confirm(`Excluir definitivamente “${project.title}” e todas as suas imagens?`)) return;
  setMessage(dashboardMessage, "Excluindo projeto...");
  const paths = [project.cover_image_path, ...(project.project_images || []).map((image) => image.storage_path)].filter(Boolean);
  if (paths.length) {
    const { error: storageError } = await client.storage.from("portfolio").remove(paths);
    if (storageError) {
      setMessage(dashboardMessage, `As imagens não puderam ser removidas: ${storageError.message}`, "error");
      return;
    }
  }
  const { error } = await client.from("projects").delete().eq("id", project.id);
  if (error) setMessage(dashboardMessage, error.message, "error");
  else {
    paths.forEach(clearSignedAsset);
    setMessage(dashboardMessage, "Projeto excluído.", "success");
    await loadProjects();
  }
}

document.querySelector("#new-project-button")?.addEventListener("click", () => openEditor());
document.querySelectorAll("[data-close-editor]").forEach((button) => button.addEventListener("click", () => editor.close()));
editor?.addEventListener("click", (event) => {
  if (event.target === editor) editor.close();
});

function slugify(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

projectForm.elements.title.addEventListener("input", () => {
  if (!currentProject && !slugWasEdited) projectForm.elements.slug.value = slugify(projectForm.elements.title.value);
});
projectForm.elements.slug.addEventListener("input", () => { slugWasEdited = true; });

async function openEditor(project = null) {
  currentProject = project;
  selectedGalleryFiles = [];
  slugWasEdited = Boolean(project);
  projectForm.reset();
  coverPreview.replaceChildren();
  galleryPreview.replaceChildren();
  existingGallery.replaceChildren();
  setMessage(editorStatus);
  editorTitle.textContent = project ? "Editar projeto" : "Novo projeto";
  if (project) {
    const values = {
      id: project.id, title: project.title, slug: project.slug, summary: project.summary,
      description: project.description, category: project.category, year: project.year,
      tools: Array.isArray(project.tools) ? project.tools.join(", ") : (project.tools || ""),
      video_url: project.video_url || "", external_url: project.external_url || "",
      display_order: project.display_order ?? 0, cover_alt_text: project.cover_alt_text || ""
    };
    Object.entries(values).forEach(([name, value]) => { if (projectForm.elements[name]) projectForm.elements[name].value = value; });
    projectForm.elements.featured.checked = Boolean(project.featured);
    projectForm.elements.published.checked = Boolean(project.published);
    if (project.published_at) projectForm.elements.published_at.value = toLocalDateTime(project.published_at);
    if (project.cover_image_path) await renderExistingCover(project);
    await renderExistingGallery(project);
  } else {
    projectForm.elements.year.value = new Date().getFullYear();
    projectForm.elements.display_order.value = projects.length;
  }
  editor.showModal();
}

function toLocalDateTime(value) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

async function renderExistingCover(project) {
  try {
    const url = await getSignedAsset(project.cover_image_path);
    const item = previewItem(url, project.cover_alt_text || project.title);
    coverPreview.append(item);
  } catch {
    coverPreview.textContent = "A capa atual não pôde ser visualizada.";
  }
}

async function renderExistingGallery(project) {
  const images = [...(project.project_images || [])].sort((a, b) => a.display_order - b.display_order);
  for (const image of images) {
    try {
      const url = await getSignedAsset(image.storage_path);
      const item = previewItem(url, image.alt_text || project.title);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Remover ${image.alt_text || "imagem"}`);
      remove.addEventListener("click", () => removeExistingImage(image, item));
      item.append(remove);
      existingGallery.append(item);
    } catch {
      // Imagem inválida é ignorada na prévia; ainda pode ser removida pelo banco.
    }
  }
}

function previewItem(url, alt) {
  const item = document.createElement("div");
  item.className = "preview-item";
  const image = new Image();
  image.src = url;
  image.alt = alt;
  item.append(image);
  return item;
}

async function removeExistingImage(image, element) {
  if (!window.confirm("Remover esta imagem da galeria?")) return;
  const { error: storageError } = await client.storage.from("portfolio").remove([image.storage_path]);
  if (storageError) return setMessage(editorStatus, storageError.message, "error");
  const { error } = await client.from("project_images").delete().eq("id", image.id);
  if (error) return setMessage(editorStatus, error.message, "error");
  clearSignedAsset(image.storage_path);
  currentProject.project_images = currentProject.project_images.filter((item) => item.id !== image.id);
  element.remove();
  setMessage(editorStatus, "Imagem removida.", "success");
}

projectForm.elements.cover.addEventListener("change", () => {
  coverPreview.replaceChildren();
  const file = projectForm.elements.cover.files[0];
  if (!file) return;
  const problem = validateFile(file);
  if (problem) return setMessage(editorStatus, problem, "error");
  coverPreview.append(previewItem(URL.createObjectURL(file), projectForm.elements.cover_alt_text.value || file.name));
});

projectForm.elements.gallery.addEventListener("change", () => {
  selectedGalleryFiles = Array.from(projectForm.elements.gallery.files);
  renderSelectedGallery();
});

function renderSelectedGallery() {
  galleryPreview.replaceChildren();
  selectedGalleryFiles.forEach((file, index) => {
    const item = previewItem(URL.createObjectURL(file), file.name);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Remover ${file.name} da seleção`);
    remove.addEventListener("click", () => {
      selectedGalleryFiles.splice(index, 1);
      renderSelectedGallery();
    });
    const label = document.createElement("label");
    label.className = "preview-alt";
    label.setAttribute("aria-label", `Texto alternativo para ${file.name}`);
    const alt = document.createElement("input");
    alt.type = "text";
    alt.dataset.galleryAlt = String(index);
    alt.value = `${projectForm.elements.title.value || "Projeto"} — imagem ${index + 1}`;
    alt.maxLength = 240;
    alt.setAttribute("aria-label", `Texto alternativo para ${file.name}`);
    label.append(alt);
    item.append(remove, label);
    galleryPreview.append(item);
  });
}

function validateFile(file) {
  if (!allowedTypes.has(file.type)) return `${file.name}: formato não permitido.`;
  if (file.size > maxFileSize) return `${file.name}: o arquivo ultrapassa 8 MB.`;
  return "";
}

function cleanFileName(name) {
  const parts = name.toLowerCase().split(".");
  const extension = parts.pop().replace(/[^a-z0-9]/g, "");
  const base = slugify(parts.join("-")) || "imagem";
  return `${base}.${extension}`;
}

projectForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(editorStatus);
  const coverFile = projectForm.elements.cover.files[0];
  const files = [coverFile, ...selectedGalleryFiles].filter(Boolean);
  const fileProblem = files.map(validateFile).find(Boolean);
  if (fileProblem) return setMessage(editorStatus, fileProblem, "error");
  if (!currentProject && !coverFile) return setMessage(editorStatus, "Selecione uma imagem de capa.", "error");
  const formData = new FormData(projectForm);
  const published = formData.get("published") === "on";
  const publishedValue = formData.get("published_at");
  const payload = {
    title: formData.get("title").trim(),
    slug: slugify(formData.get("slug")),
    summary: formData.get("summary").trim(),
    description: formData.get("description").trim(),
    category: formData.get("category"),
    year: Number(formData.get("year")),
    tools: formData.get("tools").split(",").map((item) => item.trim()).filter(Boolean),
    video_url: formData.get("video_url") || null,
    external_url: formData.get("external_url") || null,
    featured: formData.get("featured") === "on",
    published,
    display_order: Number(formData.get("display_order")) || 0,
    published_at: publishedValue ? new Date(publishedValue).toISOString() : (published ? currentProject?.published_at || new Date().toISOString() : null),
    cover_alt_text: formData.get("cover_alt_text").trim()
  };
  const submit = projectForm.querySelector("button[type=submit]");
  submit.disabled = true;
  uploadProgress.hidden = false;
  let projectId = currentProject?.id;
  let createdNow = false;
  const uploadedPaths = [];
  try {
    if (projectId) {
      const { error } = await client.from("projects").update(payload).eq("id", projectId);
      if (error) throw error;
    } else {
      const { data, error } = await client.from("projects").insert({ ...payload, published: false }).select("id").single();
      if (error) throw error;
      projectId = data.id;
      createdNow = true;
    }
    if (coverFile) {
      const coverPath = `projects/${projectId}/cover-${Date.now()}-${cleanFileName(coverFile.name)}`;
      const { error: uploadError } = await client.storage.from("portfolio").upload(coverPath, coverFile, { cacheControl: "31536000", upsert: false });
      if (uploadError) throw uploadError;
      uploadedPaths.push(coverPath);
      const { error: updateError } = await client.from("projects").update({ cover_image_path: coverPath, cover_image_url: null }).eq("id", projectId);
      if (updateError) throw updateError;
      if (currentProject?.cover_image_path) {
        await client.storage.from("portfolio").remove([currentProject.cover_image_path]);
        clearSignedAsset(currentProject.cover_image_path);
      }
    }
    for (let index = 0; index < selectedGalleryFiles.length; index += 1) {
      const file = selectedGalleryFiles[index];
      const path = `projects/${projectId}/gallery-${Date.now()}-${index}-${cleanFileName(file.name)}`;
      const { error: uploadError } = await client.storage.from("portfolio").upload(path, file, { cacheControl: "31536000", upsert: false });
      if (uploadError) throw uploadError;
      uploadedPaths.push(path);
      const altInput = galleryPreview.querySelector(`[data-gallery-alt="${index}"]`);
      const { error: insertError } = await client.from("project_images").insert({ project_id: projectId, storage_path: path, alt_text: altInput?.value.trim() || `${payload.title} — imagem ${index + 1}`, display_order: (currentProject?.project_images?.length || 0) + index });
      if (insertError) throw insertError;
    }
    if (createdNow && payload.published) {
      const { error: publishError } = await client.from("projects").update({ published: true, published_at: payload.published_at }).eq("id", projectId);
      if (publishError) throw publishError;
    }
    setMessage(editorStatus, "Projeto salvo com sucesso.", "success");
    await loadProjects();
    setTimeout(() => editor.close(), 450);
  } catch (error) {
    console.error(error);
    if (uploadedPaths.length) await client.storage.from("portfolio").remove(uploadedPaths);
    if (createdNow && projectId) await client.from("projects").delete().eq("id", projectId);
    setMessage(editorStatus, error.code === "23505" ? "Este slug já está em uso. Escolha outro." : `Não foi possível salvar: ${error.message}`, "error");
  } finally {
    submit.disabled = false;
    uploadProgress.hidden = true;
  }
});

void initialize();
