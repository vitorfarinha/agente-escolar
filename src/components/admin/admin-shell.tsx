"use client";

import { useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { AdminHeader } from "./admin-header";
import { AdminNavLinks } from "./admin-nav";

export function AdminShell({
  email,
  signOutAction,
  children,
}: {
  email: string;
  signOutAction: () => void;
  children: ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-surface-bg">
      <AdminHeader email={email} signOutAction={signOutAction} onMenuClick={() => setNavOpen(true)} />

      {/* min-w-0 é necessário para o item flex poder encolher abaixo da
          largura intrínseca do seu conteúdo (tabelas, formulários) — sem
          isto, conteúdo largo empurra a página inteira para fora do ecrã
          em vez de fazer scroll só dentro da área de conteúdo. */}
      <div className="flex flex-1 overflow-x-hidden">
        <nav className="hidden w-56 shrink-0 flex-col gap-1 border-r border-subtle bg-surface-card p-4 md:flex">
          <AdminNavLinks />
        </nav>

        {navOpen && (
          <div className="fixed inset-0 z-30 md:hidden">
            <button
              type="button"
              aria-label="Fechar menu"
              onClick={() => setNavOpen(false)}
              className="absolute inset-0 bg-black/30"
            />
            <nav className="relative z-40 flex h-full w-64 max-w-[80vw] flex-col gap-1 overflow-y-auto bg-surface-card p-4 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-primary">Menu</span>
                <button
                  type="button"
                  onClick={() => setNavOpen(false)}
                  aria-label="Fechar menu"
                  className="rounded-full p-1.5 text-secondary transition hover:bg-surface-bg"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
              <AdminNavLinks onNavigate={() => setNavOpen(false)} />
            </nav>
          </div>
        )}

        <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
