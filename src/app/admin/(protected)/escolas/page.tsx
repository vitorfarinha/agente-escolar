import { revalidatePath } from "next/cache";
import { Plus, Trash2 } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Button, Card, Input, PageHeader } from "@/components/admin/ui";

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
      <PageHeader title="Escolas" />

      <Card className="mb-6">
        <form action={createSchool} className="flex gap-2">
          <Input name="name" required placeholder="Nome da escola" className="flex-1" />
          <Button type="submit">
            <Plus size={16} aria-hidden="true" />
            Adicionar
          </Button>
        </form>
      </Card>

      <Card className="flex flex-col gap-3">
        {(!schools || schools.length === 0) && <p className="text-sm text-secondary">Ainda não há escolas criadas.</p>}
        {schools?.map((school) => (
          <form key={school.id} action={updateSchool} className="flex items-center gap-2 border-b border-subtle pb-3 last:border-0 last:pb-0">
            <input type="hidden" name="id" value={school.id} />
            <Input name="name" defaultValue={school.name} className="flex-1" />
            <Button type="submit" variant="link">
              Guardar
            </Button>
            <Button type="submit" formAction={deleteSchool} variant="icon-danger" aria-label="Eliminar escola">
              <Trash2 size={16} aria-hidden="true" />
            </Button>
          </form>
        ))}
      </Card>
    </div>
  );
}
