"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { LiquidBackground } from "@/components/liquid-background";

export type ChatMessage = {
  id: string;
  sender: "guardian" | "agent";
  content: string;
};

export function ChatClient({ guardianName, initialMessages }: { guardianName: string; initialMessages: ChatMessage[] }) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setError("");
    setInput("");
    setSending(true);
    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, sender: "guardian", content: text }]);

    try {
      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error("Falha ao enviar a mensagem.");

      const outgoing: { text: string } = await response.json();
      setMessages((prev) => [...prev, { id: `local-${Date.now()}-reply`, sender: "agent", content: outgoing.text }]);
    } catch {
      setError("Não foi possível enviar a mensagem. Tenta novamente.");
    } finally {
      setSending(false);
    }
  }

  async function handleSignOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="flex h-screen flex-col px-4 py-4 sm:py-6">
      <LiquidBackground />

      <header className="mx-auto mb-4 flex w-full max-w-2xl items-center justify-between rounded-2xl border border-white/40 bg-white/60 px-5 py-3 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-white/10">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Agente Escolar</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Olá, {guardianName}</p>
        </div>
        <button onClick={handleSignOut} className="text-xs text-gray-500 hover:underline dark:text-gray-400">
          Sair
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden rounded-3xl border border-white/40 bg-white/50 shadow-[0_8px_32px_rgba(31,41,55,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          {messages.length === 0 && (
            <p className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
              Pergunta o que quiseres sobre a escola do teu educando — horários, circulares, atividades...
            </p>
          )}

          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === "guardian" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                    message.sender === "guardian"
                      ? "rounded-br-sm bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                      : "rounded-bl-sm border border-white/50 bg-white/80 text-gray-800 backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-gray-100"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm border border-white/50 bg-white/80 px-4 py-2.5 text-sm text-gray-400 backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-gray-400">
                  a escrever...
                </div>
              </div>
            )}
          </div>
          <div ref={bottomRef} />
        </div>

        {error && <p className="px-4 pb-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

        <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-white/40 p-3 dark:border-white/10">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Escreve a tua pergunta..."
            className="flex-1 rounded-2xl border border-white/50 bg-white/70 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none ring-sky-400 focus:ring-2 dark:border-white/10 dark:bg-white/10 dark:text-white"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-40 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
