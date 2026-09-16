import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/admin-shell";

async function signOut() {
  "use server";
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    redirect("/admin/login");
  }

  const { data: adminRow } = await supabase.from("admin_users").select("id").maybeSingle();

  if (!adminRow) {
    // Autenticado mas sem conta de admin — não deixa a sessão pendurada
    // apontada à área de admin, e explica o que aconteceu (em vez de um
    // redirect silencioso para a mesma página de login).
    await supabase.auth.signOut();
    redirect("/admin/login?error=nao_autorizado");
  }

  const email = typeof claimsData.claims.email === "string" ? claimsData.claims.email : "Admin";

  return (
    <AdminShell email={email} signOutAction={signOut}>
      {children}
    </AdminShell>
  );
}
