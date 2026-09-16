import type { IncomingMessage, OutgoingMessage } from "@/lib/core/types";

/**
 * Adaptador de canal — WhatsApp (stub, Fase 7 do PLANO.md). Só traduz
 * formatos entre a Meta Cloud API e o núcleo (IncomingMessage/OutgoingMessage);
 * nenhuma lógica de negócio deve viver aqui.
 *
 * Reconhecimento do remetente já funciona sem alterações: `channel_identities`
 * já suporta `whatsapp` como tipo de canal (ver schema em docs/PLANO.md).
 *
 * TODO: ligar à Meta Cloud API quando pronto — falta o webhook em
 * `POST /api/webhooks/whatsapp-inbound` (verificação do desafio do
 * webhook + assinatura do payload) e a chamada de envio via
 * `POST https://graph.facebook.com/<versao>/<phone_number_id>/messages`
 * com `WHATSAPP_ACCESS_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID` (ver docs/ENV.md).
 */

/** Forma mínima do payload de webhook da Meta Cloud API para uma mensagem de texto recebida. */
export type WhatsappInboundPayload = {
  entry: Array<{
    changes: Array<{
      value: {
        messages?: Array<{
          from: string; // número de telemóvel do remetente (formato E.164 sem "+")
          text?: { body: string };
        }>;
      };
    }>;
  }>;
};

/** Extrai a primeira mensagem de texto de um payload de webhook, ou `null` se não houver nenhuma (ex: eventos de estado/entrega). */
export function whatsappToIncomingMessage(payload: WhatsappInboundPayload): IncomingMessage | null {
  const message = payload.entry[0]?.changes[0]?.value.messages?.[0];
  if (!message?.text?.body) return null;

  return {
    channel: "whatsapp",
    identifier: message.from,
    text: message.text.body,
  };
}

/** Corpo do pedido para `POST /<phone_number_id>/messages` da Meta Cloud API, para responder a `to`. */
export function outgoingMessageToWhatsappReply(outgoing: OutgoingMessage, to: string) {
  return {
    messaging_product: "whatsapp" as const,
    to,
    type: "text" as const,
    text: { body: outgoing.text },
  };
}
