import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EscolaSelector } from "@/components/escola-selector";

const CHANNELS = ["email", "whatsapp", "sms", "telegram", "webapp", "awl"] as const;

async function createGuardian(formData: FormData) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  if (!name) return;
  const { error } = await supabase.from("guardians").insert({ name, email, phone });
  if (error) console.error("createGuardian:", error.message);
  revalidatePath("/admin/encarregados");
}

async function updateGuardian(formData: FormData) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  if (!name) return;
  const { error } = await supabase.from("guardians").update({ name, email, phone }).eq("id", id);
  if (error) console.error("updateGuardian:", error.message);
  revalidatePath("/admin/encarregados");
}

async function deleteGuardian(formData: FormData) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("guardians").delete().eq("id", id);
  if (error) console.error("deleteGuardian:", error.message);
  revalidatePath("/admin/encarregados");
}

async function batchAssociate(formData: FormData) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const guardianIds = formData.getAll("guardian_ids").map(String);
  const studentIds = formData.getAll("student_ids").map(String);
  const relationship = String(formData.get("relationship") ?? "").trim() || null;
  if (guardianIds.length === 0 || studentIds.length === 0) return;

  const rows = guardianIds.flatMap((guardian_id) => studentIds.map((student_id) => ({ guardian_id, student_id, relationship })));
  const { error } = await supabase.from("guardian_students").upsert(rows, { onConflict: "guardian_id,student_id" });
  if (error) console.error("batchAssociate:", error.message);
  revalidatePath("/admin/encarregados");
}

async function removeGuardianStudent(formData: FormData) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const guardian_id = String(formData.get("guardian_id"));
  const student_id = String(formData.get("student_id"));
  const { error } = await supabase.from("guardian_students").delete().eq("guardian_id", guardian_id).eq("student_id", student_id);
  if (error) console.error("removeGuardianStudent:", error.message);
  revalidatePath("/admin/encarregados");
}

async function addChannelIdentity(formData: FormData) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const guardian_id = String(formData.get("guardian_id"));
  const channel = String(formData.get("channel") ?? "");
  const identifier = String(formData.get("identifier") ?? "").trim();
  if (!channel || !identifier) return;
  const { error } = await supabase.from("channel_identities").insert({ guardian_id, channel, identifier, verified: true });
  if (error) console.error("addChannelIdentity:", error.message);
  revalidatePath("/admin/encarregados");
}

async function removeChannelIdentity(formData: FormData) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("channel_identities").delete().eq("id", id);
  if (error) console.error("removeChannelIdentity:", error.message);
  revalidatePath("/admin/encarregados");
}

export default async function EncarregadosPage({ searchParams }: { searchParams: Promise<{ escola_id?: string }> }) {
  const supabase = await createServerSupabaseClient();
  const { data: schools } = await supabase.from("schools").select("id, name").order("name");

  if (!schools || schools.length === 0) {
    return (
      <div>
        <h1 className="mb-4 text-xl font-semibold">Encarregados de educação</h1>
        <p className="text-sm text-gray-600">Cria primeiro uma escola em &quot;Escolas&quot;.</p>
      </div>
    );
  }

  const { escola_id } = await searchParams;
  const selectedSchoolId = escola_id && schools.some((s) => s.id === escola_id) ? escola_id : schools[0].id;

  const [{ data: guardians }, { data: students }, { data: guardianStudents }, { data: identities }] = await Promise.all([
    supabase.from("guardians").select("*").order("name"),
    supabase.from("students").select("id, first_name, last_name").eq("school_id", selectedSchoolId).order("first_name"),
    supabase.from("guardian_students").select("*, students(first_name, last_name)"),
    supabase.from("channel_identities").select("*").order("channel"),
  ]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Encarregados de educação</h1>

      <EscolaSelector schools={schools} selectedId={selectedSchoolId} />

      <div className="mb-8 rounded border border-gray-200 p-4">
        <p className="mb-3 font-medium">Associar encarregados a alunos</p>
        {!students || students.length === 0 ? (
          <p className="text-sm text-gray-500">Esta escola ainda não tem alunos.</p>
        ) : !guardians || guardians.length === 0 ? (
          <p className="text-sm text-gray-500">Ainda não há encarregados criados.</p>
        ) : (
          <form action={batchAssociate} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-gray-600">Encarregado(s)</label>
              <select name="guardian_ids" multiple required size={5} className="w-48 rounded border border-gray-300 px-2 py-1 text-sm">
                {guardians.map((guardian) => (
                  <option key={guardian.id} value={guardian.id}>
                    {guardian.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Aluno(s) desta escola</label>
              <select name="student_ids" multiple required size={5} className="w-48 rounded border border-gray-300 px-2 py-1 text-sm">
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.first_name} {student.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Relação</label>
              <input name="relationship" placeholder="mãe/pai/..." className="rounded border border-gray-300 px-2 py-1.5 text-sm" />
            </div>
            <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-sm text-white">
              Associar
            </button>
          </form>
        )}
      </div>

      <form action={createGuardian} className="mb-6 flex flex-wrap gap-2">
        <input name="name" required placeholder="Nome" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <input name="email" type="email" placeholder="Email" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <input name="phone" placeholder="Telemóvel" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-sm text-white">
          Adicionar encarregado
        </button>
      </form>

      <div className="flex flex-col gap-6">
        {guardians?.map((guardian) => {
          const links = guardianStudents?.filter((gs) => gs.guardian_id === guardian.id) ?? [];
          const guardianIdentities = identities?.filter((ci) => ci.guardian_id === guardian.id) ?? [];

          return (
            <div key={guardian.id} className="rounded border border-gray-200 p-4">
              <form action={updateGuardian} className="mb-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={guardian.id} />
                <input name="name" defaultValue={guardian.name} className="w-32 rounded border border-gray-300 px-2 py-1 text-sm" />
                <input name="email" defaultValue={guardian.email ?? ""} className="w-48 rounded border border-gray-300 px-2 py-1 text-sm" />
                <input name="phone" defaultValue={guardian.phone ?? ""} className="w-32 rounded border border-gray-300 px-2 py-1 text-sm" />
                <button type="submit" className="text-sm text-blue-600 hover:underline">
                  Guardar
                </button>
              </form>

              <div className="grid grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="mb-1 font-medium text-gray-700">Educandos</p>
                  <ul className="flex flex-col gap-1">
                    {links.map((link) => (
                      <li key={link.student_id} className="flex items-center gap-2">
                        <span>
                          {(link.students as unknown as { first_name: string; last_name: string } | null)?.first_name}{" "}
                          {(link.students as unknown as { first_name: string; last_name: string } | null)?.last_name}
                          {link.relationship ? ` (${link.relationship})` : ""}
                        </span>
                        <form action={removeGuardianStudent}>
                          <input type="hidden" name="guardian_id" value={guardian.id} />
                          <input type="hidden" name="student_id" value={link.student_id} />
                          <button type="submit" className="text-red-600 hover:underline">
                            remover
                          </button>
                        </form>
                      </li>
                    ))}
                    {links.length === 0 && <li className="text-gray-500">Sem educandos associados.</li>}
                  </ul>
                </div>

                <div>
                  <p className="mb-1 font-medium text-gray-700">Identidades por canal</p>
                  <ul className="mb-2 flex flex-col gap-1">
                    {guardianIdentities.map((identity) => (
                      <li key={identity.id} className="flex items-center gap-2">
                        <span>
                          {identity.channel}: {identity.identifier}
                        </span>
                        <form action={removeChannelIdentity}>
                          <input type="hidden" name="id" value={identity.id} />
                          <button type="submit" className="text-red-600 hover:underline">
                            remover
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                  <form action={addChannelIdentity} className="flex gap-2">
                    <input type="hidden" name="guardian_id" value={guardian.id} />
                    <select name="channel" required className="rounded border border-gray-300 px-2 py-1">
                      {CHANNELS.map((channel) => (
                        <option key={channel} value={channel}>
                          {channel}
                        </option>
                      ))}
                    </select>
                    <input name="identifier" required placeholder="email/telefone/..." className="w-40 rounded border border-gray-300 px-2 py-1" />
                    <button type="submit" className="text-blue-600 hover:underline">
                      Adicionar
                    </button>
                  </form>
                </div>
              </div>

              <form action={deleteGuardian} className="mt-3">
                <input type="hidden" name="id" value={guardian.id} />
                <button type="submit" className="text-sm text-red-600 hover:underline">
                  Eliminar encarregado
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
