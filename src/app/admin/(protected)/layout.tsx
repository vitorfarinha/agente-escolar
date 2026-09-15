import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const NAV_LINKS = [
  { href: "/admin", label: "Início" },
  { href: "/admin/escolas", label: "Escolas" },
  { href: "/admin/turmas", label: "Turmas" },
  { href: "/admin/atividades", label: "Atividades" },
  { href: "/admin/alunos", label: "Alunos" },
  { href: "/admin/encarregados", label: "Encarregados" },
  { href: "/admin/documentos", label: "Documentos" },
  { href: "/admin/lembretes", label: "Lembretes" },
];

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
    redirect("/admin/login");
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", display: "flex", minHeight: "100vh" }}>
      <nav style={{ width: 200, borderRight: "1px solid #e5e5e5", padding: 16, flexShrink: 0 }}>
        <p style={{ fontWeight: 600, marginBottom: 16 }}>Agente Escolar</p>
        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>
        <form action={signOut} style={{ marginTop: 24 }}>
          <button type="submit">Sair</button>
        </form>
      </nav>
      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  );
}
