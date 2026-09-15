#!/usr/bin/env node
// Gera um link de acesso direto (bypass ao envio de email) via admin.generateLink() —
// útil quando o rate limit de email (Mailpit local ou Resend em produção) bloqueia testes.
// O link é single-use: só deve ser aberto pela pessoa a quem se destina.
//
// Uso:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/generate-magic-link.mjs email@exemplo.com [callback_url]
//
// Local:      SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=<secret local>
// Produção:   SUPABASE_URL=https://<project-ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<secret de produção>
// (Nunca commitar a service_role key — passa-a só como variável de ambiente na shell.)

import { createClient } from "@supabase/supabase-js";

const email = process.argv[2];
const redirectTo = process.argv[3] ?? "http://localhost:3000/auth/callback";

if (!email) {
  console.error("Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/generate-magic-link.mjs email@exemplo.com [callback_url]");
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

const { data, error } = await supabase.auth.admin.generateLink({
  type: "magiclink",
  email,
  options: { redirectTo },
});

if (error) {
  console.error("Falha ao gerar link:", error.message);
  process.exit(1);
}

console.log(data.properties.action_link);
