import { createServiceClient } from "@/lib/supabase/service-client";
import { todayISO } from "./school-time";
import type { GuardianChild } from "./get-guardian-children";

export type ActiveFamilyNote = {
  id: string;
  student_id: string;
  content: string;
  event_date: string | null;
  source: "auto" | "manual";
  childName: string;
};

/** Notas da família "ativas" para o motor de perguntas: sem data (facto
 * permanente) ou com data igual/posterior a hoje. Inclusão direta no
 * prompt, sem embeddings — o volume esperado por educando é pequeno
 * (algumas notas), por isso não vale o custo/risco de uma nota relevante
 * ficar de fora por um corte de pesquisa semântica. Notas com data
 * passada não são apagadas — só deixam de entrar aqui — e continuam
 * visíveis/editáveis no Centro de Conhecimento. */
export async function getActiveFamilyNotes(guardianId: string, children: GuardianChild[]): Promise<ActiveFamilyNote[]> {
  if (children.length === 0) return [];

  const supabase = createServiceClient();
  const today = todayISO();

  const { data, error } = await supabase
    .from("family_notes")
    .select("id, student_id, content, event_date, source")
    .eq("guardian_id", guardianId)
    .in(
      "student_id",
      children.map((child) => child.id),
    )
    .or(`event_date.is.null,event_date.gte.${today}`)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Falha ao obter notas da família: ${error.message}`);

  const nameById = new Map(children.map((child) => [child.id, `${child.first_name} ${child.last_name}`.trim()]));

  return (data ?? []).map((note) => ({ ...note, childName: nameById.get(note.student_id) ?? "educando" }));
}
