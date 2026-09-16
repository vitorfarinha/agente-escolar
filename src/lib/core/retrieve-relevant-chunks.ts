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
  matchCount = 5,
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
