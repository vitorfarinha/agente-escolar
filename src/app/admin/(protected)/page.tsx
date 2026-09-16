import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { ADMIN_NAV_LINKS } from "@/components/admin/admin-nav";

export default function AdminHomePage() {
  const shortcuts = ADMIN_NAV_LINKS.filter((link) => link.href !== "/admin");

  return (
    <div>
      <PageHeader title="Painel de administração" description="Gere escolas, turmas, atividades, alunos, encarregados e documentos." />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shortcuts.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-2xl border border-subtle bg-surface-card p-4 shadow-sm transition hover:border-brand-900/30 hover:shadow-md"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-bg text-primary">
              <Icon size={18} aria-hidden="true" />
            </span>
            <span className="text-sm font-medium text-primary">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
