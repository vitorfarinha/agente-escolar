"use client";

import { useState } from "react";
import { Check, Share2, ThumbsDown, ThumbsUp } from "lucide-react";

export type FeedbackType = "util" | "nao_util";

export function MessageFeedback({
  messageId,
  content,
  onFeedback,
}: {
  messageId: string;
  content: string;
  onFeedback: (messageId: string, type: FeedbackType) => void;
}) {
  const [selected, setSelected] = useState<FeedbackType | null>(null);
  const [shared, setShared] = useState(false);

  function handleFeedback(type: FeedbackType) {
    setSelected(type);
    onFeedback(messageId, type);
  }

  async function handleShare() {
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ text: content });
        return;
      }
      await navigator.clipboard.writeText(content);
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    } catch {
      // utilizador cancelou o share nativo ou clipboard indisponível — não é um erro a reportar
    }
  }

  const buttonClass =
    "flex items-center gap-1 rounded px-1 py-0.5 transition hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900";

  return (
    <div className="mt-1 flex w-full items-center justify-between border-t border-subtle pt-1.5 text-xs text-muted">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleFeedback("util")}
          aria-pressed={selected === "util"}
          aria-label="Marcar resposta como útil"
          className={`${buttonClass} ${selected === "util" ? "font-medium text-secondary" : ""}`}
        >
          <ThumbsUp size={13} aria-hidden="true" />
          Útil
        </button>
        <button
          type="button"
          onClick={() => handleFeedback("nao_util")}
          aria-pressed={selected === "nao_util"}
          aria-label="Marcar resposta como não útil"
          className={`${buttonClass} ${selected === "nao_util" ? "font-medium text-secondary" : ""}`}
        >
          <ThumbsDown size={13} aria-hidden="true" />
          Não útil
        </button>
      </div>

      <button type="button" onClick={handleShare} aria-label="Partilhar resposta" className={buttonClass}>
        {shared ? <Check size={13} aria-hidden="true" /> : <Share2 size={13} aria-hidden="true" />}
        {shared ? "Copiado" : "Partilhar"}
      </button>
    </div>
  );
}
