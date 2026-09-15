#!/usr/bin/env node
// Cria um utilizador admin de teste: conta no Supabase Auth (confirmada,
// sem password — login é sempre por magic link) + linha em admin_users.
//
// Uso: node scripts/create-admin-user.mjs email@exemplo.com

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env.local");

const env = Object.fromEntries(
  readFileSync(envPath, "utf-8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    }),
);

const email = process.argv[2];
if (!email) {
  console.error("Uso: node scripts/create-admin-user.mjs email@exemplo.com");
  process.exit(1);
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: created, error: createError } = await supabase.auth.admin.createUser({
  email,
  email_confirm: true,
});

if (createError) {
  console.error("Falha ao criar utilizador:", createError.message);
  process.exit(1);
}

const { error: adminError } = await supabase.from("admin_users").insert({
  auth_user_id: created.user.id,
  role: "admin",
});

if (adminError) {
  console.error("Falha ao inserir em admin_users:", adminError.message);
  process.exit(1);
}

console.log(`Admin criado: ${email} (auth_user_id: ${created.user.id})`);
console.log("Login em /admin/login com este email — o link mágico aparece no Mailpit (http://127.0.0.1:54324).");
