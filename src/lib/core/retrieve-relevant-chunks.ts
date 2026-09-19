import OpenAI from "openai";
import { createServiceClient } from "@/lib/supabase/service-client";
import type { GuardianScope } from "./get-guardian-scopes";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type RetrievedChunk = {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  similarity: number;
};

export async function retrieveRelevantChunks(
  question: string,
  scopes: GuardianScope[],
  // Corpus ainda pequeno (piloto de uma turma) — subir de 5 para 12 reduz
  // muito o risco de perder um chunk necessário para perguntas que exigem
  // cruzar dois documentos sem palavras-chave em comum entre si (ex:
  // "que dias levar polo amarelo" precisa do Horário + da regra de
  // farda em "Info geral", mas o Horário não contém "polo"/"amarelo"
  // para ser apanhado pela pesquisa por texto literal, só podendo entrar
  // via similaridade vetorial — daí precisar de mais margem no top-N).
  matchCount = 12,
): Promise<RetrievedChunk[]> {
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: question,
  });
  const queryEmbedding = embeddingResponse.data[0].embedding;

  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: queryEmbedding,
    guardian_scopes: scopes,
    match_count: matchCount,
    query_text: question,
  });

  if (error) throw new Error(`Falha na pesquisa de documentos: ${error.message}`);

  return data ?? [];
}
