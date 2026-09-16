import { revalidatePath } from "next/cache";
import { Plus, Trash2 } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Button, Card, Input, PageHeader, Select } from "@/components/admin/ui";

/** Deriva year_group_id/cycle_id a partir da turma escolhida, para não deixar estes três campos desalinhados entre si. */
async function resolveClassLineage(supabase: SupabaseClient, classId: string) {
  if (!classId) return { year_group_id: null, cycle_id: null };

  const { data } = await supabase.from("classes").select("year_group_id, year_groups(cycle_id)").eq("id", classId).single();

  const yearGroup = data?.year_groups as unknown as { cycle_id: string } | null;
  return { year_group_id: data?.year_group_id ?? null, cycle_id: yearGroup?.cycle_id ?? null };
}

async function createStudent(formData: FormData) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const school_id = String(formData.get("school_id") ?? "");
  const first_name = String(formData.get("first_name") ?? "").trim();
  const last_name = String(formData.get("last_name") ?? "").trim();
  const class_id = String(formData.get("class_id") ?? "");
  if (!school_id || !first_name || !last_name) return;

  const lineage = await resolveClassLineage(supabase, class_id);
  const { error } = await supabase.from("students").insert({
    school_id,
    first_name,
    last_name,
    class_id: class_id || null,
    ...lineage,
  });
  if (error) console.error("createStudent:", error.message);
  revalidatePath("/admin/alunos");
}

async function updateStudent(formData: FormData) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const id = String(formData.get("id"));
  const first_name = String(formData.get("first_name") ?? "").trim();
  const last_name = String(formData.get("last_name") ?? "").trim();
  const class_id = String(formData.get("class_id") ?? "");
  if (!first_name || !last_name) return;

  const lineage = await resolveClassLineage(supabase, class_id);
  const { error } = await supabase
    .from("students")
    .update({ first_name, last_name, class_id: class_id || null, ...lineage })
    .eq("id", id);
  if (error) console.error("updateStudent:", error.message);
  revalidatePath("/admin/alunos");
}

async function deleteStudent(formData: FormData) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) console.error("deleteStudent:", error.message);
  revalidatePath("/admin/alunos");
}

export default async function AlunosPage() {
  const supabase = await createServerSupabaseClient();
  const [{ data: students }, { data: schools }, { data: classes }] = await Promise.all([
    supabase.from("students").select("*, classes(name)").order("first_name"),
    supabase.from("schools").select("id, name").order("name"),
    supabase.from("classes").select("id, name").order("name"),
  ]);

  return (
    <div>
      <PageHeader title="Alunos" />

      <Card className="mb-6">
        <form action={createStudent} className="flex flex-wrap gap-2">
          <Select name="school_id" required className="min-w-40">
            <option value="">Escola</option>
            {schools?.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </Select>
          <Input name="first_name" required placeholder="Nome próprio" className="min-w-36" />
          <Input name="last_name" required placeholder="Apelido" className="min-w-36" />
          <Select name="class_id" className="min-w-32">
            <option value="">Turma</option>
            {classes?.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </Select>
          <Button type="submit">
            <Plus size={16} aria-hidden="true" />
            Adicionar
          </Button>
        </form>
      </Card>

      <Card className="flex flex-col gap-3">
        {(!students || students.length === 0) && <p className="text-sm text-secondary">Ainda não há alunos criados.</p>}
        {students?.map((student) => (
          <form
            key={student.id}
            action={updateStudent}
            className="flex flex-wrap items-center gap-2 border-b border-subtle pb-3 last:border-0 last:pb-0"
          >
            <input type="hidden" name="id" value={student.id} />
            <Input name="first_name" defaultValue={student.first_name} className="w-32" />
            <Input name="last_name" defaultValue={student.last_name} className="w-32" />
            <Select name="class_id" defaultValue={student.class_id ?? ""} className="min-w-32">
              <option value="">Sem turma</option>
              {classes?.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="link">
              Guardar
            </Button>
            <Button type="submit" formAction={deleteStudent} variant="icon-danger" aria-label="Eliminar aluno">
              <Trash2 size={16} aria-hidden="true" />
            </Button>
          </form>
        ))}
      </Card>
    </div>
  );
}
