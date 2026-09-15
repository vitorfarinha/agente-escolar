import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ChatMessageData } from "@/components/chat/chat-message";
import { ChatClient } from "./chat-client";

export default async function ChatPage() {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    redirect("/login");
  }

  const { data: guardian } = await supabase.from("guardians").select("id, name, email").maybeSingle();

  if (!guardian) {
    await supabase.auth.signOut();
    redirect("/login?error=nao_registado");
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("guardian_id", guardian.id)
    .eq("channel", "webapp")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let initialMessages: ChatMessageData[] = [];

  if (conversation) {
    const { data: messages } = await supabase
      .from("messages")
      .select("id, sender, content")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

    initialMessages = (messages ?? []).map((message) => ({
      id: message.id,
      role: message.sender === "guardian" ? "user" : "assistant",
      content: message.content,
      messageId: message.id,
    }));
  }

  return (
    <ChatClient
      guardianId={guardian.id}
      guardianName={guardian.name}
      guardianEmail={guardian.email}
      initialMessages={initialMessages}
    />
  );
}
