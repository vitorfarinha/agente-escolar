import Anthropic from "@anthropic-ai/sdk";
import type { RetrievedChunk } from "./retrieve-relevant-chunks";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = `És o assistente de informação escolar de uma escola. Respondes a perguntas de encarregados de educação com base APENAS nos excertos de documentos fornecidos como contexto.

Regras:
- Sê breve e direto.
- No fim da resposta, cita a(s) fonte(s) usada(s) (ex: "Fonte: [título do documento]").
- Se o contexto não contiver a resposta, diz claramente que não tens essa informação e sugere contactar a escola diretamente. Nunca inventes informação.
- Responde sempre em português de Portugal.`;

export async function generateAnswer(question: string, chunks: RetrievedChunk[]): Promise<string> {
  if (chunks.length === 0) {
    return "Não encontrei informação relevante nos documentos disponíveis para responder a esta pergunta. Pode reformular a pergunta ou contactar diretamente a escola.";
  }

  const context = chunks
    .map((chunk, index) => `[Fonte ${index + 1} — documento ${chunk.document_id}]\n${chunk.content}`)
    .join("\n\n");

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Contexto:\n${context}\n\nPergunta do encarregado: ${question}`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  return textBlock?.text ?? "Não foi possível gerar uma resposta.";
}
