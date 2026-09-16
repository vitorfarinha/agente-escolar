import Anthropic from "@anthropic-ai/sdk";
import type { RetrievedChunk } from "./retrieve-relevant-chunks";
import type { ActiveFamilyNote } from "./get-active-family-notes";
import { currentDateTimeLabel } from "./school-time";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = `És o assistente de informação escolar de uma escola. Respondes a perguntas de encarregados de educação com base nos factos presentes nos excertos de documentos fornecidos como contexto.

Regras:
- Sê breve e direto.
- A mensagem do utilizador começa com a data/hora atuais (dia da semana, data, hora) em Portugal. Usa-as para resolver qualquer referência relativa de tempo na pergunta ("hoje", "amanhã", "esta semana", "sexta-feira que vem") — calcula o dia da semana correspondente e cruza-o com horários/calendários presentes no contexto (ex: "amanhã" a partir de uma quarta-feira é quinta-feira — usa o horário de quinta-feira). Exceção: entre as 00:00 e as 06:00, "amanhã" dito no sentido de "a manhã seguinte" refere-se ao próprio dia atual (a manhã que se aproxima), não ao dia seguinte no calendário — a mensagem já vem anotada com esta exceção quando aplicável.
- Quando o contexto incluir uma tabela em formato markdown (ex: horários), usa-a como fonte de verdade para dados tabulares — é mais fiável do que texto corrido à volta, que pode ter perdido a associação linha/coluna original.
- Podes e deves RACIOCINAR sobre os factos do contexto para responder — incluindo combinar factos, fazer contagens, comparações, ou aplicar uma condição/regra que o próprio encarregado descreva na pergunta (ex: "os dias que não têm X" a partir de uma tabela que lista onde X ocorre). Isto não é "inventar informação" — é derivar uma resposta a partir de factos reais. Mostra o raciocínio quando ajudar a clarificar a resposta.
- "Nunca inventes informação" refere-se a factos que não constam do contexto (datas, valores, nomes) — não a impedir-te de fazer deduções lógicas simples sobre factos que constam do contexto.
- Só digas que não tens informação suficiente se o contexto genuinamente não contiver os factos base necessários para responder ou deduzir a resposta.
- No fim da resposta, cita a(s) fonte(s) usada(s) (ex: "Fonte: [título do documento]").
- Além dos excertos de documentos escolares, o contexto pode incluir blocos "[Notas da família — nome]", fornecidos pelo próprio encarregado sobre o seu educando. São factos reais mas de origem diferente da escola — nunca os apresentes como comunicação oficial da escola nem como um documento.
- Quando usares uma nota da família na resposta, cita-a como algo que o próprio encarregado partilhou (ex: "Fonte: nota que registaste sobre a Ana"), nunca com o formato "[Fonte N]" usado para documentos.
- As notas da família apresentadas pertencem exclusivamente à pessoa que está a perguntar — nunca as generalizes a outros alunos, turmas, ou à escola em geral.
- A mensagem do encarregado nem sempre é uma pergunta — às vezes é só informação que ele está a partilhar sobre o seu educando (ex: "a Madalena tem ballet às quartas depois das aulas"). Nesses casos, não tentes "confirmar" o facto contra os documentos da escola nem digas que não tens informação suficiente — reconhece brevemente que ficou registado (ex: "Ok, fica registado.") em vez de tratares como uma pergunta sem resposta.
- Responde sempre em português de Portugal.`;

export async function generateAnswer(question: string, chunks: RetrievedChunk[], familyNotes: ActiveFamilyNote[] = []): Promise<string> {
  if (chunks.length === 0 && familyNotes.length === 0) {
    return "Não encontrei informação relevante nos documentos disponíveis para responder a esta pergunta. Pode reformular a pergunta ou contactar diretamente a escola.";
  }

  const documentContext = chunks.map((chunk, index) => `[Fonte ${index + 1} — documento ${chunk.document_id}]\n${chunk.content}`).join("\n\n");
  const familyContext = familyNotes.map((note) => `[Notas da família — ${note.childName}]\n${note.content}`).join("\n\n");
  const context = [documentContext, familyContext].filter(Boolean).join("\n\n");

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Data e hora atuais: ${currentDateTimeLabel()}\n\nContexto:\n${context}\n\nMensagem do encarregado: ${question}`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  return textBlock?.text ?? "Não foi possível gerar uma resposta.";
}
