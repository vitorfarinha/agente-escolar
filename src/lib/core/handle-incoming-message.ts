import { createServiceClient } from "@/lib/supabase/service-client";
import { resolveGuardian } from "./resolve-guardian";
import { getGuardianScopes } from "./get-guardian-scopes";
import { getGuardianChildren } from "./get-guardian-children";
import { getActiveFamilyNotes } from "./get-active-family-notes";
import { retrieveRelevantChunks } from "./retrieve-relevant-chunks";
import { generateAnswer } from "./generate-answer";
import { extractFamilyFact } from "./extract-family-fact";
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

  const [scopes, children] = await Promise.all([getGuardianScopes(guardianId), getGuardianChildren(guardianId)]);
  const [chunks, familyNotes] = await Promise.all([retrieveRelevantChunks(msg.text, scopes), getActiveFamilyNotes(guardianId, children)]);
  const referencedDocumentIds = [...new Set(chunks.map((chunk) => chunk.document_id))];

  const [answerText, extractedFact] = await Promise.all([
    generateAnswer(msg.text, chunks, familyNotes),
    extractFamilyFact(msg.text, children, familyNotes).catch((error) => {
      console.error("extractFamilyFact:", error instanceof Error ? error.message : error);
      return null;
    }),
  ]);

  let familyNoteSaved = false;
  if (extractedFact) {
    const { error: noteError } = await supabase.from("family_notes").insert({
      guardian_id: guardianId,
      student_id: extractedFact.student_id,
      content: extractedFact.content,
      event_date: extractedFact.event_date,
      source: "auto",
    });
    if (noteError) console.error("family_notes insert:", noteError.message);
    else familyNoteSaved = true;
  }

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

  return { text: answerText, referencedDocumentIds, messageId: agentMessageId, familyNoteSaved };
}
