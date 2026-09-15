import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EscolaSelector } from "@/components/escola-selector";
import type { SupabaseClient } from "@supabase/supabase-js";

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
        <h1 className="mb-4 text-xl font-semibold">Turmas</h1>
        <p className="text-sm text-gray-600">Cria primeiro uma escola em &quot;Escolas&quot;.</p>
      </div>
    );
  }

  const { escola_id } = await searchParams;
  const selectedSchoolId = escola_id && schools.some((s) => s.id === escola_id) ? escola_id : schools[0].id;

  const [{ data: cycles }, { data: classes }] = await Promise.all([
    supabase.from("cycles").select("id, name").eq("school_id", selectedSchoolId).order("name"),
    supabase
      .from("classes")
      .select("id, name, year_groups(name, cycle_id)")
      .order("name"),
  ]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Turmas</h1>

      <EscolaSelector schools={schools} selectedId={selectedSchoolId} />

      <div className="mb-8">
        <p className="mb-2 font-medium">Ciclos</p>
        <form action={createCycle} className="mb-3 flex gap-2">
          <input type="hidden" name="school_id" value={selectedSchoolId} />
          <input name="name" required placeholder="Nome (ex: 1º Ciclo)" className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-sm text-white">
            Adicionar ciclo
          </button>
        </form>

        {(!cycles || cycles.length === 0) && <p className="text-sm text-gray-500">Ainda não há ciclos nesta escola.</p>}

        <div className="flex flex-col gap-6">
          {cycles?.map((cycle) => {
            const cycleClasses = classes?.filter((c) => {
              const yg = c.year_groups as unknown as { cycle_id: string } | null;
              return yg?.cycle_id === cycle.id;
            });

            return (
              <div key={cycle.id} className="rounded border border-gray-200 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-medium">{cycle.name}</p>
                  <form action={deleteCycle}>
                    <input type="hidden" name="id" value={cycle.id} />
                    <button type="submit" className="text-sm text-red-600 hover:underline">
                      Eliminar ciclo
                    </button>
                  </form>
                </div>

                <ul className="mb-3 flex flex-wrap gap-2">
                  {cycleClasses?.map((cls) => (
                    <li key={cls.id} className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-sm">
                      {cls.name}
                      <form action={deleteClass}>
                        <input type="hidden" name="id" value={cls.id} />
                        <button type="submit" className="text-red-600 hover:underline">
                          ×
                        </button>
                      </form>
                    </li>
                  ))}
                  {(!cycleClasses || cycleClasses.length === 0) && <li className="text-sm text-gray-500">Sem turmas ainda.</li>}
                </ul>

                <form action={createClass} className="flex gap-2">
                  <input type="hidden" name="school_id" value={selectedSchoolId} />
                  <input type="hidden" name="cycle_id" value={cycle.id} />
                  <input name="ano" required placeholder="Ano (ex: 5 ou EPE)" className="w-32 rounded border border-gray-300 px-2 py-1 text-sm" />
                  <input name="letra" required maxLength={1} placeholder="Letra" className="w-16 rounded border border-gray-300 px-2 py-1 text-sm" />
                  <button type="submit" className="text-sm text-blue-600 hover:underline">
                    Adicionar turma
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
