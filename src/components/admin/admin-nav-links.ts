import { Activity, Bell, FileText, Home, Layers, School, UserRound, Users } from "lucide-react";

/**
 * Dados puros, sem "use client" — importado tanto por Server Components
 * (ex: `(protected)/page.tsx`) como pelo Client Component `admin-nav.tsx`.
 * Um Server Component que importe um export não-componente de um módulo
 * "use client" recebe uma referência de cliente em vez do valor real
 * (aqui, `ADMIN_NAV_LINKS.filter` deixa de existir em runtime no servidor).
 */
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
