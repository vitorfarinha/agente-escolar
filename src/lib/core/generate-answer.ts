import Anthropic from "@anthropic-ai/sdk";
import type { RetrievedChunk } from "./retrieve-relevant-chunks";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = `És o assistente de informação escolar de uma escola. Respondes a perguntas de encarregados de educação com base nos factos presentes nos excertos de documentos fornecidos como contexto.

Regras:
- Sê breve e direto.
- Quando o contexto incluir uma tabela em formato markdown (ex: horários), usa-a como fonte de verdade para dados tabulares — é mais fiável do que texto corrido à volta, que pode ter perdido a associação linha/coluna original.
- Podes e deves RACIOCINAR sobre os factos do contexto para responder — incluindo combinar factos, fazer contagens, comparações, ou aplicar uma condição/regra que o próprio encarregado descreva na pergunta (ex: "os dias que não têm X" a partir de uma tabela que lista onde X ocorre). Isto não é "inventar informação" — é derivar uma resposta a partir de factos reais. Mostra o raciocínio quando ajudar a clarificar a resposta.
- "Nunca inventes informação" refere-se a factos que não constam do contexto (datas, valores, nomes) — não a impedir-te de fazer deduções lógicas simples sobre factos que constam do contexto.
- Só digas que não tens informação suficiente se o contexto genuinamente não contiver os factos base necessários para responder ou deduzir a resposta.
- No fim da resposta, cita a(s) fonte(s) usada(s) (ex: "Fonte: [título do documento]").
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
