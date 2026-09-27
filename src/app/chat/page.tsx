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

  // Filtrar explicitamente por auth_user_id, em vez de confiar só na RLS
  // com .maybeSingle() sem filtro: contas que são também admin (ex:
  // admin_users) veem TODAS as linhas de guardians via a policy "admins
  // manage guardians", o que faz .maybeSingle() falhar com mais de uma
  // linha e era tratado (incorretamente) como "encarregado não encontrado".
  const userId = claimsData.claims.sub;
  const { data: guardian } = await supabase.from("guardians").select("id, name, email").eq("auth_user_id", userId).maybeSingle();

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
