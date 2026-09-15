"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
    <main className="mx-auto mt-20 max-w-sm">
      <h1 className="mb-6 text-xl font-semibold">Agente Escolar — Admin</h1>

      {linkError && <p className="mb-4 text-sm text-red-600">O link de acesso é inválido ou expirou. Pede um novo abaixo.</p>}
      {notAuthorized && (
        <p className="mb-4 text-sm text-red-600">Esse email não tem acesso de administrador. Contacta um admin existente se precisas de acesso.</p>
      )}

      {status === "sent" ? (
        <p className="text-sm">
          Enviámos um link de acesso para <strong>{email}</strong>. Verifica o teu email (em desenvolvimento local, o
          Mailpit em <code>http://127.0.0.1:54324</code>) e clica no link para entrar.
        </p>
      ) : mode === "magic" ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {status === "sending" ? "A enviar..." : "Enviar link de acesso"}
          </button>
        </form>
      ) : (
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
          <label htmlFor="email-password" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email-password"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {status === "sending" ? "A entrar..." : "Entrar"}
          </button>
        </form>
      )}

      {status === "error" && <p className="mt-2 text-sm text-red-600">{errorMessage}</p>}

      {status !== "sent" && (
        <button
          type="button"
          onClick={() => {
            setMode((current) => (current === "magic" ? "password" : "magic"));
            setStatus("idle");
            setErrorMessage("");
          }}
          className="mt-4 text-xs text-gray-500 hover:underline"
        >
          {mode === "magic" ? "Entrar com password" : "Usar link de acesso por email"}
        </button>
      )}
    </main>
  );
}
