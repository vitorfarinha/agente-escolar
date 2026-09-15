"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const searchParams = useSearchParams();
  const linkError = searchParams.get("error") === "link_invalido";

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
    <main style={{ maxWidth: 360, margin: "80px auto", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 20, marginBottom: 24 }}>Agente Escolar — Admin</h1>

      {linkError && (
        <p style={{ color: "crimson", marginBottom: 16 }}>
          O link de acesso é inválido ou expirou. Pede um novo abaixo.
        </p>
      )}

      {status === "sent" ? (
        <p>
          Enviámos um link de acesso para <strong>{email}</strong>. Verifica o teu email (em desenvolvimento local, o
          Mailpit em <code>http://127.0.0.1:54324</code>) e clica no link para entrar.
        </p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={{ padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
          />
          <button type="submit" disabled={status === "sending"} style={{ padding: 10, borderRadius: 4 }}>
            {status === "sending" ? "A enviar..." : "Enviar link de acesso"}
          </button>
          {status === "error" && <p style={{ color: "crimson" }}>{errorMessage}</p>}
        </form>
      )}
    </main>
  );
}
