import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ChatClient, type ChatMessage } from "./chat-client";

export default async function ChatPage() {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    redirect("/login");
  }

  const { data: guardian } = await supabase.from("guardians").select("id, name").maybeSingle();

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

  let initialMessages: ChatMessage[] = [];

  if (conversation) {
    const { data: messages } = await supabase
      .from("messages")
      .select("id, sender, content")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

    initialMessages = messages ?? [];
  }

  return <ChatClient guardianName={guardian.name} initialMessages={initialMessages} />;
}
