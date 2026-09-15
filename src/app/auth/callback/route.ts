import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service-client";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/login?error=link_invalido", request.url));

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(new URL("/login?error=link_invalido", request.url));
  }

  const { data: existingGuardian } = await supabase.from("guardians").select("id").eq("auth_user_id", data.user.id).maybeSingle();

  if (existingGuardian) {
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  // Ainda não ligado a este utilizador — tenta associar pelo email já
  // registado pelo admin. RLS bloqueia a leitura por email aqui (a policy
  // só permite ver a própria linha via auth_user_id, que ainda não está
  // definido), por isso usa-se o service_role só para este passo de
  // "reivindicação" da conta.
  if (data.user.email) {
    const serviceClient = createServiceClient();
    const { data: guardianByEmail } = await serviceClient
      .from("guardians")
      .select("id, auth_user_id")
      .eq("email", data.user.email)
      .maybeSingle();

    if (guardianByEmail && !guardianByEmail.auth_user_id) {
      const { error: linkError } = await serviceClient.from("guardians").update({ auth_user_id: data.user.id }).eq("id", guardianByEmail.id);

      if (!linkError) {
        return NextResponse.redirect(new URL("/chat", request.url));
      }
    }
  }

  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login?error=nao_registado", request.url));
}
