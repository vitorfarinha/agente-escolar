import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function createActivity(formData: FormData) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const school_id = String(formData.get("school_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const activity_type = String(formData.get("activity_type") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!school_id || !name) return;
  const { error } = await supabase.from("activities").insert({ school_id, name, activity_type, description });
  if (error) console.error("createActivity:", error.message);
  revalidatePath("/admin/atividades");
}

async function updateActivity(formData: FormData) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const activity_type = String(formData.get("activity_type") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!name) return;
  const { error } = await supabase.from("activities").update({ name, activity_type, description }).eq("id", id);
  if (error) console.error("updateActivity:", error.message);
  revalidatePath("/admin/atividades");
}

async function deleteActivity(formData: FormData) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("activities").delete().eq("id", id);
  if (error) console.error("deleteActivity:", error.message);
  revalidatePath("/admin/atividades");
}

export default async function AtividadesPage() {
  const supabase = await createServerSupabaseClient();
  const [{ data: activities }, { data: schools }] = await Promise.all([
    supabase.from("activities").select("*, schools(name)").order("name"),
    supabase.from("schools").select("id, name").order("name"),
  ]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Atividades</h1>

      <form action={createActivity} className="mb-6 flex flex-wrap gap-2">
        <select name="school_id" required className="rounded border border-gray-300 px-3 py-2 text-sm">
          <option value="">Escola</option>
          {schools?.map((school) => (
            <option key={school.id} value={school.id}>
              {school.name}
            </option>
          ))}
        </select>
        <input name="name" required placeholder="Nome (ex: Natação)" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <input name="activity_type" placeholder="Tipo (ex: desportiva)" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <input name="description" placeholder="Descrição" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-sm text-white">
          Adicionar
        </button>
      </form>

      <table className="w-full text-sm">
        <tbody>
          {activities?.map((activity) => (
            <tr key={activity.id} className="border-t border-gray-200">
              <td className="py-2">
                <form action={updateActivity} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={activity.id} />
                  <input name="name" defaultValue={activity.name} className="w-32 rounded border border-gray-300 px-2 py-1" />
                  <input
                    name="activity_type"
                    defaultValue={activity.activity_type ?? ""}
                    className="w-28 rounded border border-gray-300 px-2 py-1"
                  />
                  <input
                    name="description"
                    defaultValue={activity.description ?? ""}
                    className="w-40 rounded border border-gray-300 px-2 py-1"
                  />
                  <button type="submit" className="text-blue-600 hover:underline">
                    Guardar
                  </button>
                </form>
              </td>
              <td className="py-2 text-right">
                <form action={deleteActivity}>
                  <input type="hidden" name="id" value={activity.id} />
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
