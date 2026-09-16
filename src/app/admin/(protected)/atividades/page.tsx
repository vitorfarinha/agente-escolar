import { revalidatePath } from "next/cache";
import { Plus, Trash2 } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Button, Card, Input, PageHeader, Select } from "@/components/ui";

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
      <PageHeader title="Atividades" />

      <Card className="mb-6">
        <form action={createActivity} className="flex flex-wrap gap-2">
          <Select name="school_id" required className="min-w-40">
            <option value="">Escola</option>
            {schools?.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </Select>
          <Input name="name" required placeholder="Nome (ex: Natação)" className="min-w-40 flex-1" />
          <Input name="activity_type" placeholder="Tipo (ex: desportiva)" className="min-w-40" />
          <Input name="description" placeholder="Descrição" className="min-w-40 flex-1" />
          <Button type="submit">
            <Plus size={16} aria-hidden="true" />
            Adicionar
          </Button>
        </form>
      </Card>

      <Card className="flex flex-col gap-3">
        {(!activities || activities.length === 0) && <p className="text-sm text-secondary">Ainda não há atividades criadas.</p>}
        {activities?.map((activity) => (
          <form
            key={activity.id}
            action={updateActivity}
            className="flex flex-wrap items-center gap-2 border-b border-subtle pb-3 last:border-0 last:pb-0"
          >
            <input type="hidden" name="id" value={activity.id} />
            <Input name="name" defaultValue={activity.name} className="w-36" />
            <Input name="activity_type" defaultValue={activity.activity_type ?? ""} className="w-32" placeholder="Tipo" />
            <Input name="description" defaultValue={activity.description ?? ""} className="flex-1 min-w-40" placeholder="Descrição" />
            <Button type="submit" variant="link">
              Guardar
            </Button>
            <Button type="submit" formAction={deleteActivity} variant="icon-danger" aria-label="Eliminar atividade">
              <Trash2 size={16} aria-hidden="true" />
            </Button>
          </form>
        ))}
      </Card>
    </div>
  );
}
