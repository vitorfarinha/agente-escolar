"use client";

import { useState } from "react";
import { ChevronDown, Menu } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export function AdminHeader({
  email,
  signOutAction,
  onMenuClick,
}: {
  email: string;
  signOutAction: () => void;
  onMenuClick?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <header className="relative z-20 flex items-center justify-between border-b border-subtle bg-surface-card px-4 py-3 shadow-sm sm:px-6">
      {menuOpen && <button aria-hidden="true" tabIndex={-1} onClick={() => setMenuOpen(false)} className="fixed inset-0 z-10 cursor-default" />}

      <div className="flex items-center gap-2 sm:gap-3">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Abrir menu"
            className="-ml-1.5 rounded-full p-2 text-secondary transition hover:bg-surface-bg md:hidden"
          >
            <Menu size={20} aria-hidden="true" />
          </button>
        )}
        <BrandLogo size="sm" />
        <span className="hidden rounded-full bg-surface-bg px-2.5 py-1 text-xs font-medium text-secondary sm:inline">Admin</span>
      </div>

      <div className="relative z-20">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-surface-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
        >
          <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-900 text-xs font-semibold text-white">
            {initials}
          </span>
          <span className="hidden max-w-40 truncate text-sm font-medium text-primary sm:inline">{email}</span>
          <ChevronDown size={16} className="text-secondary" aria-hidden="true" />
        </button>

        {menuOpen && (
          <div role="menu" className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-subtle bg-surface-card p-1.5 shadow-md">
            <div className="px-2.5 py-1.5">
              <p className="truncate text-sm font-medium text-primary">{email}</p>
            </div>
            <span aria-hidden="true" className="my-1 block h-px bg-subtle" />
            <form action={signOutAction}>
              <button
                type="submit"
                role="menuitem"
                className="w-full rounded-lg px-2.5 py-1.5 text-left text-sm text-secondary transition hover:bg-surface-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
              >
                Sair
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
