"use client";

import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { ChatHeader } from "@/components/chat/chat-header";

export function ConhecimentoHeader({ guardianName, guardianEmail }: { guardianName: string; guardianEmail: string | null }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return <ChatHeader guardianName={guardianName} guardianEmail={guardianEmail} onSignOut={handleSignOut} />;
}
