"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Bell, FileText, Home, Layers, School, UserRound, Users } from "lucide-react";

export const ADMIN_NAV_LINKS = [
  { href: "/admin", label: "Início", icon: Home },
  { href: "/admin/escolas", label: "Escolas", icon: School },
  { href: "/admin/turmas", label: "Turmas", icon: Layers },
  { href: "/admin/atividades", label: "Atividades", icon: Activity },
  { href: "/admin/alunos", label: "Alunos", icon: UserRound },
  { href: "/admin/encarregados", label: "Encarregados", icon: Users },
  { href: "/admin/documentos", label: "Documentos", icon: FileText },
  { href: "/admin/lembretes", label: "Lembretes", icon: Bell },
] as const;

/** Lista de links pura, reaproveitada pela sidebar fixa (desktop) e pelo
 * menu em drawer (mobile) — só muda o contentor à volta. */
export function AdminNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {ADMIN_NAV_LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active ? "bg-brand-900 text-white" : "text-secondary hover:bg-surface-bg hover:text-primary"
            }`}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </>
  );
}
