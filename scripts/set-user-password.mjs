#!/usr/bin/env node
// Define/repõe a password de um utilizador existente — usado para testar o
// login por password (alternativa ao magic link quando o envio de email
// está limitado). Cria o utilizador se ainda não existir.
//
// Uso:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/set-user-password.mjs email@exemplo.com novaPassword
//
// Local:      SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=<secret local>
// Produção:   SUPABASE_URL=https://<project-ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<secret de produção>
// (Nunca commitar a service_role key — passa-a só como variável de ambiente na shell.)

import { createClient } from "@supabase/supabase-js";

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error("Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/set-user-password.mjs email@exemplo.com novaPassword");
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function findUserByEmail(targetEmail) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);

    const match = data.users.find((user) => user.email?.toLowerCase() === targetEmail.toLowerCase());
    if (match) return match;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

const existing = await findUserByEmail(email);

if (existing) {
  const { error } = await supabase.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
  if (error) {
    console.error("Falha ao atualizar password:", error.message);
    process.exit(1);
  }
  console.log(`Password atualizada para ${email} (user_id: ${existing.id}).`);
} else {
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    console.error("Falha ao criar utilizador:", error.message);
    process.exit(1);
  }
  console.log(`Utilizador criado com password: ${email} (user_id: ${data.user.id}).`);
  console.log("Nota: ainda precisas de ligar este auth_user_id a uma linha em guardians/admin_users.");
}
