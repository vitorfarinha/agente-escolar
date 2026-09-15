"use client";

import { useState } from "react";
import { Bell, ChevronDown } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { GuardianAvatar } from "./avatar";

export function ChatHeader({
  guardianName,
  guardianEmail,
  onSignOut,
}: {
  guardianName: string;
  guardianEmail?: string | null;
  onSignOut: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const anyOpen = menuOpen || notifOpen;

  function closeAll() {
    setMenuOpen(false);
    setNotifOpen(false);
  }

  return (
    <header className="relative z-20 flex items-center justify-between border-b border-subtle bg-surface-card px-4 py-3 shadow-sm sm:px-6">
      {anyOpen && <button aria-hidden="true" tabIndex={-1} onClick={closeAll} className="fixed inset-0 z-10 cursor-default" />}

      <BrandLogo size="sm" />

      <div className="relative z-20 flex items-center gap-1.5 sm:gap-2.5">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotifOpen((open) => !open);
              setMenuOpen(false);
            }}
            aria-label="Notificações"
            aria-expanded={notifOpen}
            className="rounded-full p-2 text-secondary transition hover:bg-surface-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
          >
            <Bell size={18} aria-hidden="true" />
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-subtle bg-surface-card p-3 text-sm text-secondary shadow-md">
              Sem notificações novas.
            </div>
          )}
        </div>

        <span aria-hidden="true" className="h-6 w-px bg-subtle" />

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setMenuOpen((open) => !open);
              setNotifOpen(false);
            }}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-surface-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
          >
            <GuardianAvatar name={guardianName} />
            <span className="hidden text-sm font-medium text-primary sm:inline">{guardianName}</span>
            <ChevronDown size={16} className="text-secondary" aria-hidden="true" />
          </button>

          {menuOpen && (
            <div role="menu" className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-subtle bg-surface-card p-1.5 shadow-md">
              <div className="px-2.5 py-1.5">
                <p className="text-sm font-medium text-primary">{guardianName}</p>
                {guardianEmail && <p className="truncate text-xs text-muted">{guardianEmail}</p>}
              </div>
              <span aria-hidden="true" className="my-1 block h-px bg-subtle" />
              <button
                type="button"
                role="menuitem"
                onClick={onSignOut}
                className="w-full rounded-lg px-2.5 py-1.5 text-left text-sm text-secondary transition hover:bg-surface-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
              >
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
