"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { ChatHeader } from "@/components/chat/chat-header";
import { GreetingBlock } from "@/components/chat/greeting-block";
import { ChatMessage, type ChatMessageData } from "@/components/chat/chat-message";
import { SuggestionChips } from "@/components/chat/suggestion-chips";
import { ChatInputBar } from "@/components/chat/chat-input-bar";
import { AssistantAvatar } from "@/components/chat/avatar";
import type { FeedbackType } from "@/components/chat/message-feedback";

// Estático por agora — pode passar a vir da escola/ciclo do encarregado mais tarde.
const SUGGESTIONS = ["Horário da turma", "Próximas atividades", "Circulares recentes", "Refeições da semana"];

export function ChatClient({
  guardianId,
  guardianName,
  guardianEmail,
  initialMessages,
}: {
  guardianId: string;
  guardianName: string;
  guardianEmail: string | null;
  initialMessages: ChatMessageData[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessageData[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setError("");
    setInput("");
    setSending(true);
    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: "user", content: trimmed }]);

    try {
      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });

      if (!response.ok) throw new Error("Falha ao enviar a mensagem.");

      const outgoing: { text: string; messageId?: string; familyNoteSaved?: boolean } = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          id: outgoing.messageId ?? `local-${Date.now()}-reply`,
          role: "assistant",
          content: outgoing.text,
          messageId: outgoing.messageId,
          familyNoteSaved: outgoing.familyNoteSaved,
        },
      ]);
    } catch {
      setError("Não foi possível enviar a mensagem. Tenta novamente.");
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(input);
  }

  async function handleSignOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleFeedback(messageId: string, type: FeedbackType) {
    const supabase = createBrowserSupabaseClient();
    const { error: feedbackError } = await supabase
      .from("message_feedback")
      .upsert({ message_id: messageId, guardian_id: guardianId, feedback_type: type }, { onConflict: "message_id,guardian_id" });
    if (feedbackError) console.error("handleFeedback:", feedbackError.message);
  }

  const firstName = guardianName.trim().split(/\s+/)[0] || guardianName;

  return (
    <div className="flex h-screen flex-col bg-surface-bg">
      <ChatHeader guardianName={guardianName} guardianEmail={guardianEmail} onSignOut={handleSignOut} />

      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <>
            <GreetingBlock firstName={firstName} />
            <SuggestionChips suggestions={SUGGESTIONS} onSelect={sendMessage} />
          </>
        ) : (
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} guardianName={guardianName} onFeedback={handleFeedback} />
            ))}

            {sending && (
              <div className="flex items-center gap-2">
                <AssistantAvatar />
                <div className="rounded-2xl rounded-bl-sm bg-surface-card px-4 py-2.5 text-sm text-muted shadow-sm">a escrever...</div>
              </div>
            )}
          </div>
        )}

        {error && <p className="mx-auto mt-3 max-w-2xl px-4 text-center text-xs text-red-600">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <ChatInputBar value={input} onChange={setInput} onSubmit={handleSubmit} sending={sending} />
    </div>
  );
}
