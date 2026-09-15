import { createServiceClient } from "@/lib/supabase/service-client";
import type { Channel } from "./types";

export async function resolveGuardian(channel: Channel, identifier: string): Promise<string | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("channel_identities")
    .select("guardian_id")
    .eq("channel", channel)
    .eq("identifier", identifier)
    .eq("verified", true)
    .maybeSingle();

  if (error) throw new Error(`Falha ao resolver encarregado: ${error.message}`);

  return data?.guardian_id ?? null;
}
