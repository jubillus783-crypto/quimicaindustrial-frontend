import type { APIRoute } from "astro";
import nodemailer from "nodemailer";

export const prerender = false;

const esc = (v: unknown, max = 200) =>
  String(v ?? "")
    .slice(0, max)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export const POST: APIRoute = async ({ request }) => {
  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  try {
    const pass = import.meta.env.SMTP_PASS;
    const user = import.meta.env.SMTP_USER || "contacto@quimicaindustrial.pe";
    const host = import.meta.env.SMTP_HOST || "smtp.hostinger.com";
    const notifyTo = import.meta.env.QUOTE_NOTIFY_TO || user;
    if (!pass) return json({ success: false, error: "smtp_not_configured" }, 503);

    const data = await request.json().catch(() => null);
    const q = data?.quote;
    if (!q) return json({ success: false, error: "missing_quote" }, 400);

    const email = String(q.email || "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return json({ success: false, error: "invalid_email" }, 400);

    const quoteId = esc(data.quoteId || "", 60);
    const name = esc([q.firstName, q.lastName].filter(Boolean).join(" "), 120) || "Cliente";
    const products = Array.isArray(q.products) ? q.products.slice(0, 30) : [];
    const td = 'style="padding:6px 10px;border:1px solid #e2e8f0"';
    const rows = products
      .map(
        (p: Record<string, unknown>) =>
          `<tr><td ${td}>${esc(p.productName || p.productId, 120)}</td><td ${td}>${esc(p.presentationLabel || "-", 80)}</td><td ${td} align="center">${Number(p.quantity) || "-"}</td><td ${td}>${esc(p.frequency || "-", 40)}</td></tr>`,
      )
      .join("");
    const table = `<table style="border-collapse:collapse;font-size:14px"><tr><th ${td}>Producto</th><th ${td}>Presentación</th><th ${td}>Cantidad</th><th ${td}>Frecuencia</th></tr>${rows}</table>`;

    const transporter = nodemailer.createTransport({
      host,
      port: Number(import.meta.env.SMTP_PORT || 465),
      secure: true,
      auth: { user, pass },
    });

    const brand = "Química Industrial";
    const customerHtml = `<div style="font-family:Arial,sans-serif;color:#1e293b;max-width:600px"><h2 style="color:#1d4ed8">¡Gracias por tu cotización, ${name}!</h2><p>Hemos recibido tu solicitud${quoteId ? ` (código <b>${quoteId}</b>)` : ""} y nuestro equipo comercial te responderá en <b>menos de 24 horas hábiles</b>.</p><p><b>Resumen de tu solicitud:</b></p>${table}<p style="margin-top:16px">Si tienes alguna consulta urgente:<br>WhatsApp: <a href="https://wa.me/51933634055">+51 933 634 055</a><br>Email: <a href="mailto:contacto@quimicaindustrial.pe">contacto@quimicaindustrial.pe</a></p><p style="color:#64748b;font-size:12px">${brand} — Jr. Dante 236, Surquillo, Lima</p></div>`;

    const details = `<p><b>Tipo:</b> ${esc(q.clientType)} | <b>Nombre:</b> ${name} | <b>DNI:</b> ${esc(q.dni || "-")} | <b>Empresa:</b> ${esc(q.companyName || "-")} | <b>RUC:</b> ${esc(q.ruc || "-")}<br><b>Email:</b> ${esc(email)} | <b>Celular:</b> ${esc(q.phone || "-")}<br><b>Prefiere:</b> ${esc(JSON.stringify(q.contactPreferences || {}))}<br><b>Observaciones:</b> ${esc(q.observations || "-", 1000)}</p>`;
    const internalHtml = `<div style="font-family:Arial,sans-serif;color:#1e293b"><h2>Nueva cotización web${quoteId ? ` #${quoteId}` : ""}</h2>${details}${table}</div>`;

    const results = await Promise.allSettled([
      transporter.sendMail({
        from: `"${brand}" <${user}>`,
        to: email,
        subject: "Confirmación de Cotización - Química Industrial",
        html: customerHtml,
      }),
      transporter.sendMail({
        from: `"${brand} Web" <${user}>`,
        to: notifyTo,
        replyTo: email,
        subject: `Nueva cotización web${quoteId ? ` #${quoteId}` : ""} - ${name}`,
        html: internalHtml,
      }),
    ]);

    const sent = results.map((r) => r.status);
    if (sent.every((s) => s === "rejected")) {
      console.error("send-quote-email: all sends failed", results);
      return json({ success: false, error: "send_failed" }, 502);
    }
    return json({ success: true, sent });
  } catch (err) {
    console.error("send-quote-email error:", err);
    return json({ success: false, error: "internal_error" }, 500);
  }
};
