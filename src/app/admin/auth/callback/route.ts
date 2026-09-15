import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  const supabase = await createServerSupabaseClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/admin", request.url));
  } else if (tokenHash && isValidOtpType(type)) {
    // Usado por links gerados via admin.generateLink() (ex: contornar rate
    // limit de email em testes) — esses não passam pelo fluxo PKCE do SDK
    // do browser, por isso não têm "code", só o token_hash devolvido pela API.
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.redirect(new URL("/admin/login?error=link_invalido", request.url));
}

function isValidOtpType(type: string | null): type is "magiclink" | "recovery" | "invite" | "email" {
  return type === "magiclink" || type === "recovery" || type === "invite" || type === "email";
}
