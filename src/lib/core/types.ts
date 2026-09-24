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
  /** true quando uma nota foi guardada automaticamente em `family_notes` a
   * partir desta mensagem — só usado pelo chat web para um indicador
   * discreto; outros canais podem ignorar o campo. */
  familyNoteSaved?: boolean;
};

/** Um turno da conversa (encarregado ou agente), usado tanto para dar
 * histórico ao modelo de resposta como para enriquecer a pesquisa de
 * documentos em perguntas de seguimento (ex: "e a sua professora?"). */
export type ConversationTurn = {
  sender: "guardian" | "agent";
  content: string;
};
