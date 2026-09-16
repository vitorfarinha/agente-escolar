"use client";

import { ArrowUp, Loader2 } from "lucide-react";
import type { FormEvent } from "react";

export function ChatInputBar({
  value,
  onChange,
  onSubmit,
  sending,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  sending: boolean;
}) {
  return (
    <div className="sticky bottom-0 border-t border-subtle bg-surface-bg/90 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-3 backdrop-blur sm:px-0">
      <form onSubmit={onSubmit} className="mx-auto flex w-full max-w-2xl items-center gap-2 rounded-full bg-surface-card px-2 py-2 shadow-lg">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Escreve a tua pergunta..."
          aria-label="Escreve a tua pergunta"
          // text-base (16px) evita o zoom automático do iOS Safari ao focar
          // o input; só encolhe para text-sm a partir do breakpoint sm.
          className="flex-1 rounded-full bg-transparent px-3 py-2 text-base text-primary placeholder:text-muted outline-none sm:text-sm"
        />
        <button
          type="submit"
          disabled={sending || !value.trim()}
          aria-label="Enviar pergunta"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-900 text-white transition hover:bg-brand-900/90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 focus-visible:ring-offset-2"
        >
          {sending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <ArrowUp size={16} aria-hidden="true" />}
        </button>
      </form>
      <p className="mx-auto mt-2 max-w-2xl text-center text-[11px] text-muted">
        O assistente pode conter imprecisões. Confirma datas importantes com a escola.
      </p>
    </div>
  );
}
