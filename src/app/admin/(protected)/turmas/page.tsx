import { revalidatePath } from "next/cache";
import { Plus, X } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EscolaSelector } from "@/components/escola-selector";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Badge, Button, Card, Input, PageHeader } from "@/components/admin/ui";

/** "5" ou "5º" -> {label:"5º", isNumeric:true}; "EPE" -> {label:"EPE", isNumeric:false} */
function normalizeAno(raw: string): { label: string; isNumeric: boolean } {
  const trimmed = raw.trim().replace(/º$/, "");
  if (/^\d{1,2}$/.test(trimmed)) return { label: `${trimmed}º`, isNumeric: true };
  return { label: raw.trim().toUpperCase(), isNumeric: false };
}

function yearGroupName(ano: ReturnType<typeof normalizeAno>): string {
  return ano.isNumeric ? `${ano.label} Ano` : ano.label;
}

function className(ano: ReturnType<typeof normalizeAno>, letra: string): string {
  return ano.isNumeric ? `${ano.label}${letra}` : `${ano.label} ${letra}`;
}

function currentAcademicYearLabel(): string {
  const now = new Date();
  const year = now.getFullYear();
  return now.getMonth() >= 7 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

async function getOrCreateYearGroup(supabase: SupabaseClient, cycleId: string, name: string) {
  const { data: existing } = await supabase.from("year_groups").select("id").eq("cycle_id", cycleId).eq("name", name).maybeSingle();
  if (existing) return existing.id as string;

  const { data: created, error } = await supabase.from("year_groups").insert({ cycle_id: cycleId, name }).select("id").single();
  if (error) throw new Error(error.message);
  return created.id as string;
}

async function getOrCreateCurrentAcademicYear(supabase: SupabaseClient, schoolId: string) {
  const { data: existing } = await supabase
    .from("academic_years")
    .select("id")
    .eq("school_id", schoolId)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data: created, error } = await supabase
    .from("academic_years")
    .insert({ school_id: schoolId, label: currentAcademicYearLabel() })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return created.id as string;
}

async function createCycle(formData: FormData) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const school_id = String(formData.get("school_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!school_id || !name) return;
  const { error } = await supabase.from("cycles").insert({ school_id, name });
  if (error) console.error("createCycle:", error.message);
  revalidatePath("/admin/turmas");
}

async function deleteCycle(formData: FormData) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("cycles").delete().eq("id", id);
  if (error) console.error("deleteCycle:", error.message);
  revalidatePath("/admin/turmas");
}

async function createClass(formData: FormData) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const school_id = String(formData.get("school_id") ?? "");
  const cycle_id = String(formData.get("cycle_id") ?? "");
  const anoRaw = String(formData.get("ano") ?? "");
  const letra = String(formData.get("letra") ?? "").trim().toUpperCase();
  if (!school_id || !cycle_id || !anoRaw.trim() || !letra) return;

  const ano = normalizeAno(anoRaw);

  try {
    const yearGroupId = await getOrCreateYearGroup(supabase, cycle_id, yearGroupName(ano));
    const academicYearId = await getOrCreateCurrentAcademicYear(supabase, school_id);

    const { error } = await supabase.from("classes").insert({
      name: className(ano, letra),
      year_group_id: yearGroupId,
      academic_year_id: academicYearId,
    });
    if (error) console.error("createClass:", error.message);
  } catch (error) {
    console.error("createClass:", error instanceof Error ? error.message : error);
  }

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

export default async function TurmasPage({ searchParams }: { searchParams: Promise<{ escola_id?: string }> }) {
  const supabase = await createServerSupabaseClient();
  const { data: schools } = await supabase.from("schools").select("id, name").order("name");

  if (!schools || schools.length === 0) {
    return (
      <div>
        <PageHeader title="Turmas" />
        <p className="text-sm text-secondary">Cria primeiro uma escola em &quot;Escolas&quot;.</p>
      </div>
    );
  }

  const { escola_id } = await searchParams;
  const selectedSchoolId = escola_id && schools.some((s) => s.id === escola_id) ? escola_id : schools[0].id;

  const [{ data: cycles }, { data: classes }] = await Promise.all([
    supabase.from("cycles").select("id, name").eq("school_id", selectedSchoolId).order("name"),
    supabase.from("classes").select("id, name, year_groups(name, cycle_id)").order("name"),
  ]);

  return (
    <div>
      <PageHeader title="Turmas" />

      <EscolaSelector schools={schools} selectedId={selectedSchoolId} />

      <div>
        <p className="mb-3 text-sm font-semibold text-primary">Ciclos</p>

        <Card className="mb-4">
          <form action={createCycle} className="flex gap-2">
            <input type="hidden" name="school_id" value={selectedSchoolId} />
            <Input name="name" required placeholder="Nome (ex: 1º Ciclo)" className="flex-1" />
            <Button type="submit">
              <Plus size={16} aria-hidden="true" />
              Adicionar ciclo
            </Button>
          </form>
        </Card>

        {(!cycles || cycles.length === 0) && <p className="text-sm text-secondary">Ainda não há ciclos nesta escola.</p>}

        <div className="flex flex-col gap-4">
          {cycles?.map((cycle) => {
            const cycleClasses = classes?.filter((c) => {
              const yg = c.year_groups as unknown as { cycle_id: string } | null;
              return yg?.cycle_id === cycle.id;
            });

            return (
              <Card key={cycle.id}>
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-semibold text-primary">{cycle.name}</p>
                  <form action={deleteCycle}>
                    <input type="hidden" name="id" value={cycle.id} />
                    <Button type="submit" variant="danger-link" className="text-xs">
                      Eliminar ciclo
                    </Button>
                  </form>
                </div>

                <ul className="mb-3 flex flex-wrap gap-2">
                  {cycleClasses?.map((cls) => (
                    <li key={cls.id}>
                      <form action={deleteClass} className="inline-flex items-center gap-1 rounded-full bg-surface-bg py-1 pl-3 pr-1 text-sm text-primary">
                        <input type="hidden" name="id" value={cls.id} />
                        {cls.name}
                        <button type="submit" aria-label={`Eliminar turma ${cls.name}`} className="rounded-full p-1 text-secondary hover:bg-subtle hover:text-red-600">
                          <X size={12} aria-hidden="true" />
                        </button>
                      </form>
                    </li>
                  ))}
                  {(!cycleClasses || cycleClasses.length === 0) && <Badge>Sem turmas ainda</Badge>}
                </ul>

                <form action={createClass} className="flex gap-2">
                  <input type="hidden" name="school_id" value={selectedSchoolId} />
                  <input type="hidden" name="cycle_id" value={cycle.id} />
                  <Input name="ano" required placeholder="Ano (ex: 5 ou EPE)" className="w-36" />
                  <Input name="letra" required maxLength={1} placeholder="Letra" className="w-16" />
                  <Button type="submit" variant="ghost">
                    <Plus size={14} aria-hidden="true" />
                    Adicionar turma
                  </Button>
                </form>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
