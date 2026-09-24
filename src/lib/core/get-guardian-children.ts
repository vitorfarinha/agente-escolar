import { createServiceClient } from "@/lib/supabase/service-client";

export type GuardianChild = {
  id: string;
  first_name: string;
  last_name: string;
  class_name: string | null;
};

/** Educandos de um encarregado — usado para desambiguar referências como
 * "a minha filha" na extração de factos, como opções do picker no
 * Centro de Conhecimento, e para dar ao modelo de resposta o contexto
 * base de qual filho está em que turma (necessário para perguntas que
 * mencionam o filho pelo nome mas a informação nos documentos só está
 * associada ao nome da turma, ex: "quem é a professora do <filho>?").
 * Corre via service_role: a extração acontece no núcleo agnóstico de
 * canal, onde nem sempre há sessão Supabase Auth (ex: canal de email). */
export async function getGuardianChildren(guardianId: string): Promise<GuardianChild[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("guardian_students")
    .select("students(id, first_name, last_name, classes(name))")
    .eq("guardian_id", guardianId);

  if (error) throw new Error(`Falha ao obter educandos do encarregado: ${error.message}`);

  return (data ?? [])
    .map((row) => {
      const student = row.students as unknown as { id: string; first_name: string; last_name: string; classes: { name: string } | null } | null;
      if (!student) return null;
      return {
        id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        class_name: student.classes?.name ?? null,
      };
    })
    .filter((child): child is GuardianChild => Boolean(child));
}
