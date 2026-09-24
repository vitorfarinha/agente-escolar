import OpenAI from "openai";
import { createServiceClient } from "@/lib/supabase/service-client";
import type { GuardianScope } from "./get-guardian-scopes";
import type { ConversationTurn } from "./types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type RetrievedChunk = {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  similarity: number;
};

// Sinónimos de papéis na escola que os documentos e os encarregados usam
// de forma inconsistente consoante o nível de ensino (ex: a EPE chama
// "Educadora" a quem os pais naturalmente chamam "professora" ao
// perguntar). A pesquisa por texto literal falha nestes casos sem uma
// expansão explícita — o significado é o mesmo, mas a palavra é
// diferente, por isso nem o stemming do português ajuda aqui.
const ROLE_SYNONYMS: Array<[RegExp, string]> = [
  [/professor/i, "educador educadora"],
  [/educador/i, "professor professora"],
];

function expandRoleSynonyms(text: string): string {
  const extras = ROLE_SYNONYMS.filter(([pattern]) => pattern.test(text)).map(([, synonym]) => synonym);
  return extras.length > 0 ? `${text} ${extras.join(" ")}` : text;
}

// Perguntas de seguimento ("e a sua professora?", "e o horário dela?")
// não fazem sentido pesquisadas isoladamente — dependem do que já foi
// dito na conversa (de quem se está a falar, que turma/atividade). Junta
// as últimas trocas ao texto da pergunta antes de embutir/pesquisar, para
// a pesquisa "herdar" o mesmo referente que o modelo de resposta já vê
// no histórico.
const HISTORY_TURNS_FOR_QUERY = 2;

function buildSearchText(question: string, history: ConversationTurn[]): string {
  const recentContext = history
    .slice(-HISTORY_TURNS_FOR_QUERY)
    .map((turn) => turn.content)
    .join(" ");
  const combined = [recentContext, question].filter(Boolean).join(" ");
  return expandRoleSynonyms(combined);
}

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
  history: ConversationTurn[] = [],
): Promise<RetrievedChunk[]> {
  const searchText = buildSearchText(question, history);

  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: searchText,
  });
  const queryEmbedding = embeddingResponse.data[0].embedding;

  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: queryEmbedding,
    guardian_scopes: scopes,
    match_count: matchCount,
    query_text: searchText,
  });

  if (error) throw new Error(`Falha na pesquisa de documentos: ${error.message}`);

  return data ?? [];
}
