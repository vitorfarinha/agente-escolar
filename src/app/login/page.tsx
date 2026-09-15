"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/brand-logo";

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
    <div className="flex min-h-screen items-center justify-center bg-surface-bg px-4">
      <main className="mx-4 w-full max-w-[400px] rounded-2xl bg-surface-card p-8 shadow-md">
        <div className="mb-6 flex flex-col items-center gap-4 text-center">
          <BrandLogo withWordmark={false} />
          <div>
            <h1 className="text-xl font-bold text-primary">Entrar no Agente Escolar</h1>
            <p className="mt-1 text-sm text-secondary">Acede com o email associado à escola do teu educando</p>
          </div>
        </div>

        {linkError && (
          <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
            O link de acesso é inválido ou já foi usado. Pede um novo abaixo.
          </p>
        )}
        {notRegistered && (
          <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
            Não encontrámos esse email associado a nenhum educando. Contacta a escola para seres registado.
          </p>
        )}

        {status === "sent" ? (
          <p className="text-center text-sm text-secondary">
            Enviámos um link de acesso para <strong className="font-semibold text-primary">{email}</strong>. Verifica o teu email e
            clica no link para entrar.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="o-teu-email@exemplo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-xl border border-subtle px-4 py-3 text-sm text-primary placeholder:text-muted outline-none focus:border-brand-900 focus:ring-2 focus:ring-brand-900 focus-visible:outline-none"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-brand-900/90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 focus-visible:ring-offset-2"
            >
              {status === "sending" && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              {status === "sending" ? "A enviar..." : "Enviar link de acesso"}
            </button>
            {status === "error" && (
              <p className="text-sm text-red-600" role="alert">
                {errorMessage}
              </p>
            )}
          </form>
        )}

        <p className="mt-6 text-center text-xs text-muted">
          Os teus dados são geridos pela escola do teu educando. Em caso de dúvida, contacta diretamente a secretaria.
        </p>
      </main>
    </div>
  );
}
