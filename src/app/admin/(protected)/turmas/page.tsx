import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function createClass(formData: FormData) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const name = String(formData.get("name") ?? "").trim();
  const year_group_id = String(formData.get("year_group_id") ?? "");
  const academic_year_id = String(formData.get("academic_year_id") ?? "");
  if (!name || !year_group_id || !academic_year_id) return;
  const { error } = await supabase.from("classes").insert({ name, year_group_id, academic_year_id });
  if (error) console.error("createClass:", error.message);
  revalidatePath("/admin/turmas");
}

async function updateClass(formData: FormData) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const year_group_id = String(formData.get("year_group_id") ?? "");
  const academic_year_id = String(formData.get("academic_year_id") ?? "");
  if (!name || !year_group_id || !academic_year_id) return;
  const { error } = await supabase.from("classes").update({ name, year_group_id, academic_year_id }).eq("id", id);
  if (error) console.error("updateClass:", error.message);
  revalidatePath("/admin/turmas");
}

async function deleteClass(formData: FormData) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("classes").delete().eq("id", id);
  if (error) console.error("deleteClass:", error.message);
  revalidatePath("/admin/turmas");
}

export default async function TurmasPage() {
  const supabase = await createServerSupabaseClient();
  const [{ data: classes }, { data: yearGroups }, { data: academicYears }] = await Promise.all([
    supabase.from("classes").select("*, year_groups(name, cycles(name)), academic_years(label)").order("name"),
    supabase.from("year_groups").select("id, name, cycles(name)").order("name"),
    supabase.from("academic_years").select("id, label").order("label"),
  ]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Turmas</h1>

      <form action={createClass} className="mb-6 flex flex-wrap gap-2">
        <input name="name" required placeholder="Nome (ex: 5ºA)" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <select name="year_group_id" required className="rounded border border-gray-300 px-3 py-2 text-sm">
          <option value="">Ano</option>
          {yearGroups?.map((yg) => (
            <option key={yg.id} value={yg.id}>
              {yg.name} ({(yg.cycles as unknown as { name: string } | null)?.name})
            </option>
          ))}
        </select>
        <select name="academic_year_id" required className="rounded border border-gray-300 px-3 py-2 text-sm">
          <option value="">Ano letivo</option>
          {academicYears?.map((ay) => (
            <option key={ay.id} value={ay.id}>
              {ay.label}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-sm text-white">
          Adicionar
        </button>
      </form>

      <table className="w-full text-sm">
        <tbody>
          {classes?.map((cls) => (
            <tr key={cls.id} className="border-t border-gray-200">
              <td className="py-2">
                <form action={updateClass} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={cls.id} />
                  <input name="name" defaultValue={cls.name} className="w-24 rounded border border-gray-300 px-2 py-1" />
                  <select name="year_group_id" defaultValue={cls.year_group_id} className="rounded border border-gray-300 px-2 py-1">
                    {yearGroups?.map((yg) => (
                      <option key={yg.id} value={yg.id}>
                        {yg.name}
                      </option>
                    ))}
                  </select>
                  <select name="academic_year_id" defaultValue={cls.academic_year_id} className="rounded border border-gray-300 px-2 py-1">
                    {academicYears?.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        {ay.label}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="text-blue-600 hover:underline">
                    Guardar
                  </button>
                </form>
              </td>
              <td className="py-2 text-right">
                <form action={deleteClass}>
                  <input type="hidden" name="id" value={cls.id} />
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
