import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Modelo fixo (independente do modelo usado para gerar a resposta) —
// esta verificação é uma tarefa simples de classificação binária, não
// precisa de um modelo mais caro mesmo que a geração principal use um.
const VERIFICATION_MODEL = "claude-haiku-4-5-20251001";

const VERIFICATION_SYSTEM_PROMPT = `Vais receber a pergunta de um encarregado de educação e a resposta que foi gerada para essa pergunta. A tua única tarefa é confirmar se a resposta responde de facto a essa pergunta específica — não avalies se a resposta está correta ou completa, só se é sobre o mesmo assunto que foi perguntado.

Responde com exatamente uma palavra: SIM (a resposta é sobre o que foi perguntado) ou NAO (a resposta é sobre outra coisa — por exemplo, repete ou continua um assunto anterior sem relação com a pergunta atual, ou é uma confirmação de um facto que a pergunta atual não menciona).`;

export type RelevanceCheckResult = {
  relevant: boolean;
  usage: { inputTokens: number; outputTokens: number };
};

export async function verifyAnswerRelevance(question: string, answer: string): Promise<RelevanceCheckResult> {
  const message = await anthropic.messages.create({
    model: VERIFICATION_MODEL,
    max_tokens: 5,
    system: VERIFICATION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Pergunta do encarregado: ${question}\n\nResposta gerada: ${answer}`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  const relevant = (textBlock?.text ?? "").trim().toUpperCase().startsWith("SIM");

  return {
    relevant,
    usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens },
  };
}
