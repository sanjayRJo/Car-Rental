/**
 * Notification architecture (server only).
 *
 * Providers are pluggable: WhatsApp (Meta Cloud API) and email (Resend-compatible
 * HTTP API) are selected purely from environment variables, so either can be
 * swapped without touching callers. Every attempt is logged to public.notifications
 * with an idempotent reminder key so a reminder is never sent twice.
 */

export type Channel = "email" | "whatsapp" | "sms" | "push";

export type SendResult = { ok: boolean; error?: string | undefined; skipped?: boolean | undefined };

export interface NotificationProvider {
  readonly channel: Channel;
  isConfigured(): boolean;
  send(input: { to: string; subject?: string | undefined; body: string }): Promise<SendResult>;
}

export const whatsAppProvider: NotificationProvider = {
  channel: "whatsapp",
  isConfigured() {
    return Boolean(process.env["WHATSAPP_ACCESS_TOKEN"] && process.env["WHATSAPP_PHONE_NUMBER_ID"]);
  },
  async send({ to, body }) {
    if (!this.isConfigured()) {
      return { ok: false, skipped: true, error: "WhatsApp provider not configured" };
    }
    const apiUrl = process.env["WHATSAPP_API_URL"] ?? "https://graph.facebook.com/v21.0";
    const phoneId = process.env["WHATSAPP_PHONE_NUMBER_ID"];
    const response = await fetch(`${apiUrl}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env["WHATSAPP_ACCESS_TOKEN"]}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/[^\d+]/g, ""),
        type: "text",
        text: { body },
      }),
    });
    if (!response.ok) {
      return { ok: false, error: `WhatsApp API ${response.status}` };
    }
    return { ok: true };
  },
};

export const emailProvider: NotificationProvider = {
  channel: "email",
  isConfigured() {
    return Boolean(process.env["EMAIL_API_KEY"] && process.env["EMAIL_FROM"]);
  },
  async send({ to, subject, body }) {
    if (!this.isConfigured()) {
      return { ok: false, skipped: true, error: "Email provider not configured" };
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env["EMAIL_API_KEY"]}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env["EMAIL_FROM"],
        to: [to],
        subject: subject ?? "Update on your booking",
        html: renderEmailHtml(subject ?? "Booking update", body),
      }),
    });
    if (!response.ok) return { ok: false, error: `Email API ${response.status}` };
    return { ok: true };
  },
};

export function renderEmailHtml(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f6f5f2;font-family:Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
  <tr><td style="background:#1d1f24;color:#ffffff;padding:24px 28px;font-size:18px;font-weight:600">Drivora</td></tr>
  <tr><td style="padding:28px">
  <h1 style="margin:0 0 12px;font-size:20px;color:#1d1f24">${escapeHtml(title)}</h1>
  <p style="margin:0;font-size:15px;line-height:1.6;color:#43464d;white-space:pre-line">${escapeHtml(body)}</p>
  </td></tr>
  <tr><td style="padding:20px 28px;background:#f6f5f2;color:#6b6f76;font-size:12px">Drivora self-drive rentals · Support +91 90000 11000</td></tr>
  </table></td></tr></table></body></html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;",
  );
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => vars[key] ?? "");
}

export const providers: Record<"email" | "whatsapp", NotificationProvider> = {
  email: emailProvider,
  whatsapp: whatsAppProvider,
};
