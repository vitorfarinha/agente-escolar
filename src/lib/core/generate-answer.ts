import Anthropic from "@anthropic-ai/sdk";
import type { RetrievedChunk } from "./retrieve-relevant-chunks";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-haiku-4-5-20251001";

// Escolas-alvo são em Portugal — usa-se sempre este fuso para "hoje"/"amanhã",
// independentemente de onde a função serverless está a correr (normalmente UTC).
const SCHOOL_TIMEZONE = "Europe/Lisbon";

const WEEKDAY_PT: Record<string, string> = {
  Sunday: "domingo",
  Monday: "segunda-feira",
  Tuesday: "terça-feira",
  Wednesday: "quarta-feira",
  Thursday: "quinta-feira",
  Friday: "sexta-feira",
  Saturday: "sábado",
};

/** Data/hora atuais em Portugal + dia da semana em português, para o modelo
 * conseguir resolver referências relativas ("amanhã", "esta semana", "sexta-feira
 * que vem") contra horários/calendários presentes no contexto. */
function currentDateTimeLabel(): string {
  const now = new Date();
  const weekdayEn = new Intl.DateTimeFormat("en-US", { timeZone: SCHOOL_TIMEZONE, weekday: "long" }).format(now);
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHOOL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const time = new Intl.DateTimeFormat("pt-PT", {
    timeZone: SCHOOL_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);

  return `${WEEKDAY_PT[weekdayEn] ?? weekdayEn}, ${date}, ${time}`;
}

const SYSTEM_PROMPT = `És o assistente de informação escolar de uma escola. Respondes a perguntas de encarregados de educação com base nos factos presentes nos excertos de documentos fornecidos como contexto.

Regras:
- Sê breve e direto.
- A mensagem do utilizador começa com a data/hora atuais (dia da semana, data, hora) em Portugal. Usa-as para resolver qualquer referência relativa de tempo na pergunta ("hoje", "amanhã", "esta semana", "sexta-feira que vem") — calcula o dia da semana correspondente e cruza-o com horários/calendários presentes no contexto (ex: "amanhã" a partir de uma quarta-feira é quinta-feira — usa o horário de quinta-feira).
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
        content: `Data e hora atuais: ${currentDateTimeLabel()}\n\nContexto:\n${context}\n\nPergunta do encarregado: ${question}`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  return textBlock?.text ?? "Não foi possível gerar uma resposta.";
}
