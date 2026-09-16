import { revalidatePath } from "next/cache";
import { Plus, X } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EscolaSelector } from "@/components/escola-selector";
import { Badge, Button, Card, FieldLabel, Input, PageHeader, Select } from "@/components/admin/ui";

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
        <PageHeader title="Encarregados de educação" />
        <p className="text-sm text-secondary">Cria primeiro uma escola em &quot;Escolas&quot;.</p>
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
      <PageHeader title="Encarregados de educação" />

      <EscolaSelector schools={schools} selectedId={selectedSchoolId} />

      <Card className="mb-6">
        <p className="mb-3 font-semibold text-primary">Associar encarregados a alunos</p>
        {!students || students.length === 0 ? (
          <p className="text-sm text-secondary">Esta escola ainda não tem alunos.</p>
        ) : !guardians || guardians.length === 0 ? (
          <p className="text-sm text-secondary">Ainda não há encarregados criados.</p>
        ) : (
          <form action={batchAssociate} className="flex flex-wrap items-end gap-3">
            <div>
              <FieldLabel>Encarregado(s)</FieldLabel>
              <Select name="guardian_ids" multiple required size={5} className="w-48">
                {guardians.map((guardian) => (
                  <option key={guardian.id} value={guardian.id}>
                    {guardian.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel>Aluno(s) desta escola</FieldLabel>
              <Select name="student_ids" multiple required size={5} className="w-48">
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.first_name} {student.last_name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel>Relação</FieldLabel>
              <Input name="relationship" placeholder="mãe/pai/..." />
            </div>
            <Button type="submit">
              <Plus size={16} aria-hidden="true" />
              Associar
            </Button>
          </form>
        )}
      </Card>

      <Card className="mb-6">
        <form action={createGuardian} className="flex flex-wrap gap-2">
          <Input name="name" required placeholder="Nome" className="min-w-40" />
          <Input name="email" type="email" placeholder="Email" className="min-w-48" />
          <Input name="phone" placeholder="Telemóvel" className="min-w-36" />
          <Button type="submit">
            <Plus size={16} aria-hidden="true" />
            Adicionar encarregado
          </Button>
        </form>
      </Card>

      <div className="flex flex-col gap-4">
        {guardians?.map((guardian) => {
          const links = guardianStudents?.filter((gs) => gs.guardian_id === guardian.id) ?? [];
          const guardianIdentities = identities?.filter((ci) => ci.guardian_id === guardian.id) ?? [];

          return (
            <Card key={guardian.id}>
              <form action={updateGuardian} className="mb-4 flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={guardian.id} />
                <Input name="name" defaultValue={guardian.name} className="w-32" />
                <Input name="email" defaultValue={guardian.email ?? ""} className="w-48" />
                <Input name="phone" defaultValue={guardian.phone ?? ""} className="w-32" />
                <Button type="submit" variant="link">
                  Guardar
                </Button>
                <Button type="submit" formAction={deleteGuardian} variant="danger-link">
                  Eliminar encarregado
                </Button>
              </form>

              <div className="grid grid-cols-1 gap-6 text-sm sm:grid-cols-2">
                <div>
                  <p className="mb-2 font-medium text-primary">Educandos</p>
                  <ul className="flex flex-col gap-1.5">
                    {links.map((link) => (
                      <li key={link.student_id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-bg px-3 py-1.5">
                        <span className="text-primary">
                          {(link.students as unknown as { first_name: string; last_name: string } | null)?.first_name}{" "}
                          {(link.students as unknown as { first_name: string; last_name: string } | null)?.last_name}
                          {link.relationship ? <span className="text-secondary"> ({link.relationship})</span> : ""}
                        </span>
                        <form action={removeGuardianStudent}>
                          <input type="hidden" name="guardian_id" value={guardian.id} />
                          <input type="hidden" name="student_id" value={link.student_id} />
                          <button type="submit" aria-label="Remover associação" className="rounded-full p-1 text-secondary hover:bg-subtle hover:text-red-600">
                            <X size={14} aria-hidden="true" />
                          </button>
                        </form>
                      </li>
                    ))}
                    {links.length === 0 && <Badge>Sem educandos associados</Badge>}
                  </ul>
                </div>

                <div>
                  <p className="mb-2 font-medium text-primary">Identidades por canal</p>
                  <ul className="mb-2 flex flex-col gap-1.5">
                    {guardianIdentities.map((identity) => (
                      <li key={identity.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-bg px-3 py-1.5">
                        <span className="text-primary">
                          {identity.channel}: {identity.identifier}
                        </span>
                        <form action={removeChannelIdentity}>
                          <input type="hidden" name="id" value={identity.id} />
                          <button type="submit" aria-label="Remover identidade" className="rounded-full p-1 text-secondary hover:bg-subtle hover:text-red-600">
                            <X size={14} aria-hidden="true" />
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                  <form action={addChannelIdentity} className="flex gap-2">
                    <input type="hidden" name="guardian_id" value={guardian.id} />
                    <Select name="channel" required className="w-32">
                      {CHANNELS.map((channel) => (
                        <option key={channel} value={channel}>
                          {channel}
                        </option>
                      ))}
                    </Select>
                    <Input name="identifier" required placeholder="email/telefone/..." className="flex-1" />
                    <Button type="submit" variant="ghost">
                      Adicionar
                    </Button>
                  </form>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
