import { getPublicConfig } from "./supabase-client.js";

const header = document.querySelector(".site-header");
const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".main-nav");
const topButton = document.querySelector("#back-to-top");
const year = document.querySelector("#current-year");
const contactForm = document.querySelector("#contact-form");

if (year) year.textContent = String(new Date().getFullYear());

function closeMenu() {
  if (!menuButton || !navigation) return;
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.querySelector(".sr-only").textContent = "Abrir menu";
  navigation.classList.remove("is-open");
  document.body.style.overflow = "";
}

menuButton?.addEventListener("click", () => {
  const shouldOpen = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(shouldOpen));
  menuButton.querySelector(".sr-only").textContent = shouldOpen ? "Fechar menu" : "Abrir menu";
  navigation?.classList.toggle("is-open", shouldOpen);
  document.body.style.overflow = shouldOpen ? "hidden" : "";
});
navigation?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

function updateScrollUI() {
  const scrolled = window.scrollY > 24;
  header?.classList.toggle("is-scrolled", scrolled);
  topButton?.classList.toggle("is-visible", window.scrollY > 650);
}
window.addEventListener("scroll", updateScrollUI, { passive: true });
updateScrollUI();
topButton?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

const revealItems = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6%" });
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

contactForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const status = document.querySelector("#form-status");
  const submit = contactForm.querySelector("button[type=submit]");
  const payload = Object.fromEntries(new FormData(contactForm).entries());
  status.className = "";
  if (payload.company) return;
  submit.disabled = true;
  submit.textContent = "Enviando...";
  status.textContent = "Seu briefing está sendo enviado.";
  try {
    const response = await fetch(getPublicConfig().contactEndpoint || "/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "Não foi possível enviar agora.");
    contactForm.reset();
    status.className = "is-success";
    status.textContent = "Briefing enviado. Obrigada pelo contato!";
  } catch (error) {
    status.className = "is-error";
    status.textContent = `${error.message} Se preferir, fale pelo WhatsApp.`;
  } finally {
    submit.disabled = false;
    submit.textContent = "Enviar briefing";
  }
});
