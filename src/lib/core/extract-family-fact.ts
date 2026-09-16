import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { MODEL } from "./generate-answer";
import { currentDateTimeLabel } from "./school-time";
import type { GuardianChild } from "./get-guardian-children";
import type { ActiveFamilyNote } from "./get-active-family-notes";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type ExtractedFamilyFact = {
  student_id: string;
  content: string;
  event_date: string | null;
};

const TOOL_NAME = "record_family_fact";

const toolInputSchema = z.discriminatedUnion("has_fact", [
  z.object({ has_fact: z.literal(false) }),
  z.object({
    has_fact: z.literal(true),
    // Formato solto de propósito: a verificação que importa de facto é a
    // de posse (isKnownChild, abaixo) contra os ids reais do encarregado —
    // exigir aqui um UUID v4 "estrito" rejeitava ids sintéticos válidos
    // (ex: seeds de teste) que o Postgres aceita mas não seguem o formato
    // RFC 4122 completo.
    student_id: z.string().min(1),
    content: z.string().min(1).max(500),
    event_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
  }),
]);

const SYSTEM_PROMPT = `Analisas uma mensagem de um encarregado de educação para decidir se contém um facto novo e concreto sobre um dos seus educandos que vale a pena guardar (ex: "hoje a minha filha tem ballet às 17h", "é alérgica a frutos secos", "amanhã a avó vai buscá-lo à escola").

Regras — sê conservador, na dúvida NÃO extraias:
- Só extraias se a mensagem afirmar um facto concreto sobre UM educando específico. Perguntas, pedidos de informação, ou comentários vagos não contam.
- Só resolvas a criança quando conseguires identificar exatamente uma com confiança: se o encarregado só tem um educando, qualquer referência singular ("a minha filha", "o meu filho") resolve-se a essa criança; se tem vários, só resolvas com uma referência inequívoca (nome próprio mencionado). Caso contrário, não extraias.
- Reescreve o facto numa frase curta na 3ª pessoa, usando o primeiro nome da criança (não copies literalmente a frase do encarregado).
- "event_date": só preenche quando o facto está ligado a uma data concreta (hoje/amanhã/uma data nomeada) — resolve para uma data ISO absoluta (AAAA-MM-DD) usando a data atual fornecida. Deixa a null para factos permanentes ou recorrentes (alergias, rotinas semanais, características).
- Já existem notas ativas registadas (fornecidas abaixo) — não repitas um facto que já lá está, a menos que a mensagem o esteja claramente a atualizar/corrigir (nesse caso, extrai a versão atualizada).
- Se não houver facto a extrair, ou a criança não for resolvível com confiança, chama a tool com has_fact=false.`;

export async function extractFamilyFact(
  messageText: string,
  children: GuardianChild[],
  existingActiveNotes: ActiveFamilyNote[],
): Promise<ExtractedFamilyFact | null> {
  if (children.length === 0) return null;

  const childrenList = children.map((child) => `- ${child.id}: ${child.first_name} ${child.last_name}`).join("\n");
  const notesList =
    existingActiveNotes.length > 0
      ? existingActiveNotes.map((note) => `- (${note.childName}) ${note.content}${note.event_date ? ` [${note.event_date}]` : ""}`).join("\n")
      : "(nenhuma)";

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: TOOL_NAME,
        description: "Regista (ou não) um facto novo sobre um educando extraído da mensagem.",
        input_schema: {
          type: "object",
          properties: {
            has_fact: { type: "boolean", description: "true se a mensagem contém um facto novo e concreto a guardar" },
            student_id: { type: "string", description: "id do educando a quem o facto pertence — só quando has_fact=true" },
            content: { type: "string", description: "facto reescrito em frase curta na 3ª pessoa — só quando has_fact=true" },
            event_date: { type: ["string", "null"], description: "data ISO (AAAA-MM-DD) ou null para facto permanente — só quando has_fact=true" },
          },
          required: ["has_fact"],
        },
      },
    ],
    tool_choice: { type: "tool", name: TOOL_NAME },
    messages: [
      {
        role: "user",
        content: `Data e hora atuais: ${currentDateTimeLabel()}\n\nEducandos deste encarregado:\n${childrenList}\n\nNotas ativas já registadas:\n${notesList}\n\nMensagem do encarregado: ${messageText}`,
      },
    ],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") return null;

  const parsed = toolInputSchema.safeParse(toolUse.input);
  if (!parsed.success) return null;

  const fact = parsed.data;
  if (!fact.has_fact) return null;

  // Nunca confiar cegamente no modelo: confirma que o student_id devolvido
  // é mesmo um dos educandos passados no prompt, não um id inventado.
  const isKnownChild = children.some((child) => child.id === fact.student_id);
  if (!isKnownChild) return null;

  return { student_id: fact.student_id, content: fact.content, event_date: fact.event_date };
}
