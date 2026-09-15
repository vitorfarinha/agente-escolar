import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service-client";

function isValidOtpType(type: string | null): type is "magiclink" | "recovery" | "invite" | "email" {
  return type === "magiclink" || type === "recovery" || type === "invite" || type === "email";
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  const supabase = await createServerSupabaseClient();

  let userId: string | undefined;
  let userEmail: string | undefined;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      userId = data.user.id;
      userEmail = data.user.email;
    }
  } else if (tokenHash && isValidOtpType(type)) {
    // Usado por links gerados via admin.generateLink() (ex: contornar rate
    // limit de email em testes) — esses não passam pelo fluxo PKCE do SDK
    // do browser, por isso não têm "code", só o token_hash devolvido pela API.
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error && data.user) {
      userId = data.user.id;
      userEmail = data.user.email;
    }
  }

  if (!userId) {
    return NextResponse.redirect(new URL("/login?error=link_invalido", request.url));
  }

  const { data: existingGuardian } = await supabase.from("guardians").select("id").eq("auth_user_id", userId).maybeSingle();

  if (existingGuardian) {
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  // Ainda não ligado a este utilizador — tenta associar pelo email já
  // registado pelo admin. RLS bloqueia a leitura por email aqui (a policy
  // só permite ver a própria linha via auth_user_id, que ainda não está
  // definido), por isso usa-se o service_role só para este passo de
  // "reivindicação" da conta.
  if (userEmail) {
    const serviceClient = createServiceClient();
    const { data: guardianByEmail } = await serviceClient.from("guardians").select("id, auth_user_id").eq("email", userEmail).maybeSingle();

    if (guardianByEmail && !guardianByEmail.auth_user_id) {
      const { error: linkError } = await serviceClient.from("guardians").update({ auth_user_id: userId }).eq("id", guardianByEmail.id);

      if (!linkError) {
        return NextResponse.redirect(new URL("/chat", request.url));
      }
    }
  }

  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login?error=nao_registado", request.url));
}
