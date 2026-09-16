import { createServiceClient } from "@/lib/supabase/service-client";

export type GuardianChild = {
  id: string;
  first_name: string;
  last_name: string;
};

/** Educandos de um encarregado — usado para desambiguar referências como
 * "a minha filha" na extração de factos, e como opções do picker no
 * Centro de Conhecimento. Corre via service_role: a extração acontece no
 * núcleo agnóstico de canal, onde nem sempre há sessão Supabase Auth
 * (ex: canal de email). */
export async function getGuardianChildren(guardianId: string): Promise<GuardianChild[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase.from("guardian_students").select("students(id, first_name, last_name)").eq("guardian_id", guardianId);

  if (error) throw new Error(`Falha ao obter educandos do encarregado: ${error.message}`);

  return (data ?? [])
    .map((row) => row.students as unknown as GuardianChild | null)
    .filter((child): child is GuardianChild => Boolean(child));
}
