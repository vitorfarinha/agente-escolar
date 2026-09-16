import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminNav } from "@/components/admin/admin-nav";

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
    <div className="flex min-h-screen flex-col bg-surface-bg">
      <AdminHeader email={email} signOutAction={signOut} />
      <div className="flex flex-1">
        <AdminNav />
        <main className="flex-1 p-6 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
