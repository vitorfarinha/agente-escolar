"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/brand-logo";

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const linkError = errorParam === "link_invalido";
  const notAuthorized = errorParam === "nao_autorizado";

  const [mode, setMode] = useState<"magic" | "password">("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleMagicLinkSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/admin/auth/callback` },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("sent");
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    router.push("/admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-bg px-4">
      <main className="mx-4 w-full max-w-[400px] rounded-2xl bg-surface-card p-8 shadow-md">
        <div className="mb-6 flex flex-col items-center gap-4 text-center">
          <BrandLogo withWordmark={false} />
          <div>
            <h1 className="text-xl font-bold text-primary">Agente Escolar — Admin</h1>
            <p className="mt-1 text-sm text-secondary">Acede com o teu email de administrador</p>
          </div>
        </div>

        {linkError && (
          <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
            O link de acesso é inválido ou já foi usado. Pede um novo abaixo.
          </p>
        )}
        {notAuthorized && (
          <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
            Esse email não tem acesso de administrador. Contacta um admin existente se precisas de acesso.
          </p>
        )}

        {status === "sent" ? (
          <p className="text-center text-sm text-secondary">
            Enviámos um link de acesso para <strong className="font-semibold text-primary">{email}</strong>. Verifica o teu email (em
            desenvolvimento local, o Mailpit em <code>http://127.0.0.1:54324</code>) e clica no link para entrar.
          </p>
        ) : mode === "magic" ? (
          <form onSubmit={handleMagicLinkSubmit} className="flex flex-col gap-3">
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="admin@exemplo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-xl border border-subtle px-4 py-3 text-base text-primary placeholder:text-muted outline-none focus:border-brand-900 focus:ring-2 focus:ring-brand-900 focus-visible:outline-none sm:text-sm"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-brand-900/90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 focus-visible:ring-offset-2"
            >
              {status === "sending" && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              {status === "sending" ? "A enviar..." : "Enviar link de acesso"}
            </button>
          </form>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
            <label htmlFor="email-password" className="sr-only">
              Email
            </label>
            <input
              id="email-password"
              type="email"
              required
              autoComplete="email"
              placeholder="admin@exemplo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-xl border border-subtle px-4 py-3 text-base text-primary placeholder:text-muted outline-none focus:border-brand-900 focus:ring-2 focus:ring-brand-900 focus-visible:outline-none sm:text-sm"
            />
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-xl border border-subtle px-4 py-3 text-base text-primary placeholder:text-muted outline-none focus:border-brand-900 focus:ring-2 focus:ring-brand-900 focus-visible:outline-none sm:text-sm"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-brand-900/90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 focus-visible:ring-offset-2"
            >
              {status === "sending" && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              {status === "sending" ? "A entrar..." : "Entrar"}
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="mt-3 text-center text-sm text-red-600" role="alert">
            {errorMessage}
          </p>
        )}

        {status !== "sent" && (
          <button
            type="button"
            onClick={() => {
              setMode((current) => (current === "magic" ? "password" : "magic"));
              setStatus("idle");
              setErrorMessage("");
            }}
            className="mt-4 w-full text-center text-xs text-secondary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
          >
            {mode === "magic" ? "Entrar com password" : "Usar link de acesso por email"}
          </button>
        )}
      </main>
    </div>
  );
}
