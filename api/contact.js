const MAX_MESSAGE_LENGTH = 3000;

function clean(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function json(payload, status = 200) {
  return Response.json(payload, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
  });
}

export default {
  async fetch(request) {
    if (request.method !== "POST") return json({ message: "Método não permitido." }, 405);
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ message: "Conteúdo inválido." }, 400);
    }
    if (body.company) return json({ ok: true });
    const payload = {
      name: clean(body.name, 100),
      email: clean(body.email, 160),
      whatsapp: clean(body.whatsapp, 30),
      service: clean(body.service, 100),
      message: clean(body.message, MAX_MESSAGE_LENGTH)
    };
    if (!payload.name || !isEmail(payload.email) || !payload.whatsapp || !payload.service || payload.message.length < 20) {
      return json({ message: "Revise os campos e tente novamente." }, 400);
    }
    if (!process.env.CONTACT_FORM_KEY) return json({ message: "O formulário ainda não foi ativado." }, 503);

    try {
      const upstream = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: process.env.CONTACT_FORM_KEY,
          from_name: "Site NyxVantore Designs",
          subject: `Novo briefing — ${payload.service}`,
          name: payload.name,
          email: payload.email,
          phone: payload.whatsapp,
          message: payload.message
        })
      });
      const result = await upstream.json().catch(() => ({}));
      if (!upstream.ok || !result.success) throw new Error("Falha no provedor de e-mail.");
      return json({ ok: true });
    } catch (error) {
      console.error("Falha no formulário de contato", error);
      return json({ message: "O envio está temporariamente indisponível." }, 502);
    }
  }
};
