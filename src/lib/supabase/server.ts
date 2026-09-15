import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente Supabase para Server Components / Server Actions / Route Handlers.
 * Server Components não podem escrever cookies (só ler) — o setAll falha
 * nesse contexto, por isso é envolvido em try/catch. A renovação real da
 * sessão é feita pelo middleware, que consegue escrever tanto no request
 * como na resposta.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado a partir de um Server Component — não é possível
          // escrever cookies aqui; o middleware trata da renovação.
        }
      },
    },
  });
}
