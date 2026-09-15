"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const linkError = errorParam === "link_invalido";
  const notAuthorized = errorParam === "nao_autorizado";

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
      options: { emailRedirectTo: `${window.location.origin}/admin/auth/callback` },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("sent");
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
      ) : (
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
          {status === "error" && <p className="text-sm text-red-600">{errorMessage}</p>}
        </form>
      )}
    </main>
  );
}
