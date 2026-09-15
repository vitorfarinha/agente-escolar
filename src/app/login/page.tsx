"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { LiquidBackground } from "@/components/liquid-background";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const linkError = errorParam === "link_invalido";
  const notRegistered = errorParam === "nao_registado";

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("sent");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <LiquidBackground />

      <main className="w-full max-w-sm rounded-3xl border border-white/40 bg-white/60 p-8 shadow-[0_8px_32px_rgba(31,41,55,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/10">
        <h1 className="mb-1 text-2xl font-semibold text-gray-900 dark:text-white">Agente Escolar</h1>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">Entra com o teu email para falares com o assistente da escola.</p>

        {linkError && (
          <p className="mb-4 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            O link de acesso é inválido ou expirou. Pede um novo abaixo.
          </p>
        )}
        {notRegistered && (
          <p className="mb-4 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            Não encontrámos esse email associado a nenhum educando. Contacta a escola para seres registado.
          </p>
        )}

        {status === "sent" ? (
          <p className="text-sm text-gray-700 dark:text-gray-200">
            Enviámos um link de acesso para <strong>{email}</strong>. Verifica o teu email e clica no link para entrar.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="o-teu-email@exemplo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-2xl border border-white/50 bg-white/70 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none ring-sky-400 focus:ring-2 dark:border-white/10 dark:bg-white/10 dark:text-white"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="rounded-2xl bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
            >
              {status === "sending" ? "A enviar..." : "Enviar link de acesso"}
            </button>
            {status === "error" && <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>}
          </form>
        )}
      </main>
    </div>
  );
}
