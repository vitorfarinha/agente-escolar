import type { GetReceivingEmailResponseSuccess } from "resend";
import type { IncomingMessage, OutgoingMessage } from "@/lib/core/types";

/**
 * Adaptador de canal — email. Só traduz formatos entre Resend e o núcleo
 * (IncomingMessage/OutgoingMessage); nenhuma lógica de negócio vive aqui.
 */

/** Extrai o endereço de email de um campo "From" (ex: "Nome <a@b.pt>" ou "a@b.pt"). */
export function parseSenderEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  const address = match ? match[1] : from;
  return address.trim().toLowerCase();
}

/** Remove tags HTML de forma simples — usado só como fallback quando não há corpo em texto simples. */
export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function emailToIncomingMessage(email: GetReceivingEmailResponseSuccess): IncomingMessage {
  const text = email.text?.trim() || (email.html ? stripHtml(email.html) : "");

  return {
    channel: "email",
    identifier: parseSenderEmail(email.from),
    text,
  };
}

export function replySubject(originalSubject: string): string {
  return /^re:/i.test(originalSubject.trim()) ? originalSubject : `Re: ${originalSubject}`;
}

export function outgoingMessageToReplyEmail(
  outgoing: OutgoingMessage,
  received: GetReceivingEmailResponseSuccess,
): { from: string; to: string; subject: string; text: string } {
  const replyFrom = received.received_for[0] ?? received.to[0];

  return {
    from: replyFrom,
    to: received.from,
    subject: replySubject(received.subject),
    text: outgoing.text,
  };
}
