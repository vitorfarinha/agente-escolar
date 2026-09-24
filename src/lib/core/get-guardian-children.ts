import { createServiceClient } from "@/lib/supabase/service-client";

export type GuardianChild = {
  id: string;
  first_name: string;
  last_name: string;
  class_name: string | null;
  year_name: string | null;
  cycle_name: string | null;
};

/** Educandos de um encarregado — usado para desambiguar referências como
 * "a minha filha" na extração de factos, como opções do picker no
 * Centro de Conhecimento, e para dar ao modelo de resposta o contexto
 * base de qual filho está em que turma/ano/ciclo (necessário para
 * perguntas que mencionam o filho pelo nome mas a informação nos
 * documentos só está associada ao nome da turma, ex: "quem é a
 * professora do <filho>?"). O ciclo vem sempre explícito do ano
 * letivo real — nunca deve ser inferido a partir do número no nome da
 * turma (ex: "3ºB" não implica "3ºCiclo").
 * Corre via service_role: a extração acontece no núcleo agnóstico de
 * canal, onde nem sempre há sessão Supabase Auth (ex: canal de email). */
export async function getGuardianChildren(guardianId: string): Promise<GuardianChild[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("guardian_students")
    .select("students(id, first_name, last_name, classes(name, year_groups(name, cycles(name))))")
    .eq("guardian_id", guardianId);

  if (error) throw new Error(`Falha ao obter educandos do encarregado: ${error.message}`);

  type StudentRow = {
    id: string;
    first_name: string;
    last_name: string;
    classes: { name: string; year_groups: { name: string; cycles: { name: string } | null } | null } | null;
  };

  return (data ?? [])
    .map((row) => {
      const student = row.students as unknown as StudentRow | null;
      if (!student) return null;
      return {
        id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        class_name: student.classes?.name ?? null,
        year_name: student.classes?.year_groups?.name ?? null,
        cycle_name: student.classes?.year_groups?.cycles?.name ?? null,
      };
    })
    .filter((child): child is GuardianChild => Boolean(child));
}
