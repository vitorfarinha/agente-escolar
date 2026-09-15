import { createServiceClient } from "@/lib/supabase/service-client";

export type GuardianScope = {
  scope_type: string;
  scope_id: string;
};

/**
 * Reaproveita a função SQL get_guardian_scopes (definida na migração de RLS)
 * para devolver ciclos/anos/turmas/atividades/alunos relevantes ao encarregado.
 */
export async function getGuardianScopes(guardianId: string): Promise<GuardianScope[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("get_guardian_scopes", { p_guardian_id: guardianId });

  if (error) throw new Error(`Falha ao obter âmbitos do encarregado: ${error.message}`);

  return data ?? [];
}
