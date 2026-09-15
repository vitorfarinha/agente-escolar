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
    // Autenticado mas sem conta de admin — não deixa a sessão pendurada
    // apontada à área de admin, e explica o que aconteceu (em vez de um
    // redirect silencioso para a mesma página de login).
    await supabase.auth.signOut();
    redirect("/admin/login?error=nao_autorizado");
  }

  return (
    <div className="flex min-h-screen">
      <nav className="w-52 shrink-0 border-r border-gray-200 p-4">
        <p className="mb-4 font-semibold">Agente Escolar</p>
        <ul className="flex flex-col gap-2 text-sm">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="text-gray-700 hover:text-gray-950 hover:underline">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <form action={signOut} className="mt-6">
          <button type="submit" className="text-sm text-gray-500 hover:underline">
            Sair
          </button>
        </form>
      </nav>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
