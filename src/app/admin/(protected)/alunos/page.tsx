import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

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
      <h1 className="mb-4 text-xl font-semibold">Alunos</h1>

      <form action={createStudent} className="mb-6 flex flex-wrap gap-2">
        <select name="school_id" required className="rounded border border-gray-300 px-3 py-2 text-sm">
          <option value="">Escola</option>
          {schools?.map((school) => (
            <option key={school.id} value={school.id}>
              {school.name}
            </option>
          ))}
        </select>
        <input name="first_name" required placeholder="Nome próprio" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <input name="last_name" required placeholder="Apelido" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <select name="class_id" className="rounded border border-gray-300 px-3 py-2 text-sm">
          <option value="">Turma</option>
          {classes?.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-sm text-white">
          Adicionar
        </button>
      </form>

      <table className="w-full text-sm">
        <tbody>
          {students?.map((student) => (
            <tr key={student.id} className="border-t border-gray-200">
              <td className="py-2">
                <form action={updateStudent} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={student.id} />
                  <input name="first_name" defaultValue={student.first_name} className="w-28 rounded border border-gray-300 px-2 py-1" />
                  <input name="last_name" defaultValue={student.last_name} className="w-28 rounded border border-gray-300 px-2 py-1" />
                  <select name="class_id" defaultValue={student.class_id ?? ""} className="rounded border border-gray-300 px-2 py-1">
                    <option value="">Sem turma</option>
                    {classes?.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="text-blue-600 hover:underline">
                    Guardar
                  </button>
                </form>
              </td>
              <td className="py-2 text-right">
                <form action={deleteStudent}>
                  <input type="hidden" name="id" value={student.id} />
                  <button type="submit" className="text-red-600 hover:underline">
                    Eliminar
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
