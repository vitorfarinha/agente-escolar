import { createServiceClient } from "@/lib/supabase/service-client";
import { resolveGuardian } from "./resolve-guardian";
import { getGuardianScopes } from "./get-guardian-scopes";
import { retrieveRelevantChunks } from "./retrieve-relevant-chunks";
import { generateAnswer } from "./generate-answer";
import type { IncomingMessage, OutgoingMessage } from "./types";

/**
 * Ponto de entrada único do núcleo agnóstico de canal. Os adaptadores
 * de canal (email hoje; WhatsApp/Awl depois) só traduzem formatos e
 * chamam esta função — nenhuma lógica de negócio vive nos adaptadores.
 */
export async function handleIncomingMessage(msg: IncomingMessage): Promise<OutgoingMessage> {
  const supabase = createServiceClient();

  const guardianId = await resolveGuardian(msg.channel, msg.identifier);

  if (!guardianId) {
    return {
      text: "Não conseguimos identificar o seu contacto no nosso sistema. Por favor contacte a escola para ser registado como encarregado de educação.",
      referencedDocumentIds: [],
    };
  }

  const scopes = await getGuardianScopes(guardianId);
  const chunks = await retrieveRelevantChunks(msg.text, scopes);
  const answerText = await generateAnswer(msg.text, chunks);
  const referencedDocumentIds = [...new Set(chunks.map((chunk) => chunk.document_id))];

  const { data: existingConversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("guardian_id", guardianId)
    .eq("channel", msg.channel)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let conversationId: string | undefined = existingConversation?.id;

  if (!conversationId) {
    const { data: newConversation, error } = await supabase
      .from("conversations")
      .insert({ guardian_id: guardianId, channel: msg.channel })
      .select("id")
      .single();

    if (error) throw new Error(`Falha ao criar conversa: ${error.message}`);
    conversationId = newConversation.id;
  }

  const { data: insertedMessages, error: messagesError } = await supabase
    .from("messages")
    .insert([
      { conversation_id: conversationId, sender: "guardian", content: msg.text },
      {
        conversation_id: conversationId,
        sender: "agent",
        content: answerText,
        referenced_document_ids: referencedDocumentIds,
      },
    ])
    .select("id, sender");

  if (messagesError) throw new Error(`Falha ao gravar mensagens: ${messagesError.message}`);

  const agentMessageId = insertedMessages?.find((message) => message.sender === "agent")?.id;

  return { text: answerText, referencedDocumentIds, messageId: agentMessageId };
}
