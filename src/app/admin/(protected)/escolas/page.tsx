import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function createSchool(formData: FormData) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const { error } = await supabase.from("schools").insert({ name });
  if (error) console.error("createSchool:", error.message);
  revalidatePath("/admin/escolas");
}

async function updateSchool(formData: FormData) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const { error } = await supabase.from("schools").update({ name }).eq("id", id);
  if (error) console.error("updateSchool:", error.message);
  revalidatePath("/admin/escolas");
}

async function deleteSchool(formData: FormData) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("schools").delete().eq("id", id);
  if (error) console.error("deleteSchool:", error.message);
  revalidatePath("/admin/escolas");
}

export default async function EscolasPage() {
  const supabase = await createServerSupabaseClient();
  const { data: schools } = await supabase.from("schools").select("*").order("name");

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Escolas</h1>

      <form action={createSchool} className="mb-6 flex gap-2">
        <input name="name" required placeholder="Nome da escola" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-sm text-white">
          Adicionar
        </button>
      </form>

      <table className="w-full text-sm">
        <tbody>
          {schools?.map((school) => (
            <tr key={school.id} className="border-t border-gray-200">
              <td className="py-2">
                <form action={updateSchool} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={school.id} />
                  <input name="name" defaultValue={school.name} className="rounded border border-gray-300 px-2 py-1" />
                  <button type="submit" className="text-blue-600 hover:underline">
                    Guardar
                  </button>
                </form>
              </td>
              <td className="py-2 text-right">
                <form action={deleteSchool}>
                  <input type="hidden" name="id" value={school.id} />
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
