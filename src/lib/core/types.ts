export type Channel = "email" | "whatsapp" | "sms" | "telegram" | "webapp" | "awl";

/**
 * Formato interno comum a todos os canais — o núcleo nunca sabe
 * se a pergunta veio de email, WhatsApp ou chat web.
 */
export type IncomingMessage = {
  channel: Channel;
  identifier: string; // email, número de telemóvel, ID do canal, etc.
  text: string;
};

export type OutgoingMessage = {
  text: string;
  referencedDocumentIds: string[];
  /** id da mensagem do agente persistida em `messages` — ausente quando a conversa nem chega a ser gravada (ex: encarregado não identificado). */
  messageId?: string;
};
