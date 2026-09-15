import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service-client";
import { handleIncomingMessage } from "@/lib/core/handle-incoming-message";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: guardian } = await supabase.from("guardians").select("id").maybeSingle();
  if (!guardian) {
    return NextResponse.json({ error: "not registered" }, { status: 403 });
  }

  const body = await request.json();
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "empty text" }, { status: 400 });
  }

  // Garante uma identidade de canal 'webapp' para este encarregado —
  // auto-provisionada no primeiro uso, já que a autenticação em si (magic
  // link + associação em /auth/callback) já prova quem é o encarregado.
  const serviceClient = createServiceClient();
  const { data: existingIdentity } = await serviceClient
    .from("channel_identities")
    .select("id")
    .eq("channel", "webapp")
    .eq("guardian_id", guardian.id)
    .maybeSingle();

  if (!existingIdentity) {
    await serviceClient.from("channel_identities").insert({
      guardian_id: guardian.id,
      channel: "webapp",
      identifier: guardian.id,
      verified: true,
    });
  }

  const outgoing = await handleIncomingMessage({ channel: "webapp", identifier: guardian.id, text });
  return NextResponse.json(outgoing);
}
