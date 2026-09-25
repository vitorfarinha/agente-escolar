import { createServiceClient } from "@/lib/supabase/service-client";

export type TokenUsageCallType = "answer" | "verification" | "regeneration";

/** Regista o consumo de tokens de cada chamada ao modelo, para análise
 * futura de custo (ex: decidir se vale a pena trocar de modelo, ou se a
 * verificação de relevância compensa o custo extra que introduz). Nunca
 * deve travar o fluxo principal — uma falha aqui é só um log perdido. */
export async function logTokenUsage(params: {
  guardianId: string;
  callType: TokenUsageCallType;
  model: string;
  inputTokens: number;
  outputTokens: number;
}): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("token_usage_log").insert({
      guardian_id: params.guardianId,
      call_type: params.callType,
      model: params.model,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
    });
    if (error) console.error("logTokenUsage:", error.message);
  } catch (error) {
    console.error("logTokenUsage:", error instanceof Error ? error.message : error);
  }
}
