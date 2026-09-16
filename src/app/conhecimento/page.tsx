import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Plus, Trash2 } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/core/school-time";
import { Badge, Button, Card, FieldLabel, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { ConhecimentoHeader } from "./conhecimento-header";

type Child = { id: string; first_name: string; last_name: string };

async function createNote(formData: FormData) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const { data: guardian } = await supabase.from("guardians").select("id").maybeSingle();
  if (!guardian) return;

  const student_id = String(formData.get("student_id") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  const event_date = String(formData.get("event_date") ?? "").trim() || null;
  if (!student_id || !content) return;

  const { error } = await supabase.from("family_notes").insert({
    guardian_id: guardian.id,
    student_id,
    content,
    event_date,
    source: "manual",
  });
  if (error) console.error("createNote:", error.message);
  revalidatePath("/conhecimento");
}

async function updateNote(formData: FormData) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const id = String(formData.get("id"));
  const student_id = String(formData.get("student_id") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  const event_date = String(formData.get("event_date") ?? "").trim() || null;
  if (!student_id || !content) return;

  const { error } = await supabase.from("family_notes").update({ student_id, content, event_date }).eq("id", id);
  if (error) console.error("updateNote:", error.message);
  revalidatePath("/conhecimento");
}

async function deleteNote(formData: FormData) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("family_notes").delete().eq("id", id);
  if (error) console.error("deleteNote:", error.message);
  revalidatePath("/conhecimento");
}

export default async function ConhecimentoPage() {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (!claimsData?.claims) {
    redirect("/login");
  }

  const { data: guardian } = await supabase.from("guardians").select("id, name, email").maybeSingle();

  if (!guardian) {
    await supabase.auth.signOut();
    redirect("/login?error=nao_registado");
  }

  const [{ data: links }, { data: notes }] = await Promise.all([
    supabase.from("guardian_students").select("students(id, first_name, last_name)").eq("guardian_id", guardian.id),
    supabase.from("family_notes").select("*").order("created_at", { ascending: false }),
  ]);

  const children = (links ?? []).map((row) => row.students as unknown as Child | null).filter((child): child is Child => Boolean(child));
  const today = todayISO();

  return (
    <div className="min-h-screen bg-surface-bg">
      <ConhecimentoHeader guardianName={guardian.name} guardianEmail={guardian.email} />

      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-0">
        <PageHeader
          title="Centro de Conhecimento"
          description="Informação que só tu vês e editas sobre os teus educandos — a escola nunca tem acesso a isto."
        />

        {children.length === 0 ? (
          <p className="text-sm text-secondary">Ainda não há educandos associados à tua conta. Contacta a escola.</p>
        ) : (
          <>
            <Card className="mb-6">
              <p className="mb-3 font-semibold text-primary">Adicionar nota</p>
              <form action={createNote} className="flex flex-col gap-3">
                <div>
                  <FieldLabel>Educando</FieldLabel>
                  <Select name="student_id" required className="w-full">
                    <option value="">Escolhe o educando</option>
                    {children.map((child) => (
                      <option key={child.id} value={child.id}>
                        {child.first_name} {child.last_name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <FieldLabel>Nota</FieldLabel>
                  <Textarea name="content" required placeholder="Ex: É alérgica a frutos secos" rows={2} className="w-full" />
                </div>
                <div>
                  <FieldLabel>Data (opcional — deixa em branco para um facto permanente)</FieldLabel>
                  <Input name="event_date" type="date" />
                </div>
                <Button type="submit" className="w-fit">
                  <Plus size={16} aria-hidden="true" />
                  Guardar nota
                </Button>
              </form>
            </Card>

            <div className="flex flex-col gap-3">
              {(!notes || notes.length === 0) && <p className="text-sm text-secondary">Ainda não há notas guardadas.</p>}
              {notes?.map((note) => {
                const expired = Boolean(note.event_date && note.event_date < today);
                return (
                  <Card key={note.id}>
                    <form action={updateNote} className="flex flex-col gap-3">
                      <input type="hidden" name="id" value={note.id} />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={note.source === "auto" ? "success" : "neutral"}>{note.source === "auto" ? "Automático" : "Manual"}</Badge>
                          {expired && <Badge>Expirado</Badge>}
                        </div>
                        <Button type="submit" formAction={deleteNote} variant="icon-danger" aria-label="Eliminar nota">
                          <Trash2 size={16} aria-hidden="true" />
                        </Button>
                      </div>
                      <Select name="student_id" defaultValue={note.student_id} className="w-full">
                        {children.map((child) => (
                          <option key={child.id} value={child.id}>
                            {child.first_name} {child.last_name}
                          </option>
                        ))}
                      </Select>
                      <Textarea name="content" defaultValue={note.content} rows={2} className="w-full" />
                      <div>
                        <FieldLabel>Data (opcional)</FieldLabel>
                        <Input name="event_date" type="date" defaultValue={note.event_date ?? ""} />
                      </div>
                      <Button type="submit" variant="link" className="w-fit">
                        Guardar alterações
                      </Button>
                    </form>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
