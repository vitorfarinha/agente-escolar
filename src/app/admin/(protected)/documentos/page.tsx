import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { extractText } from "@/lib/documents/extract-text";
import { chunkText } from "@/lib/documents/chunk-text";
import { embedChunks } from "@/lib/documents/embed-chunks";

async function reembedDocument(documentId: string, rawText: string) {
  const supabase = await createServerSupabaseClient();

  await supabase.from("document_chunks").delete().eq("document_id", documentId);

  const chunks = chunkText(rawText);
  const embeddings = await embedChunks(chunks);

  if (chunks.length > 0) {
    const rows = chunks.map((content, index) => ({
      document_id: documentId,
      chunk_index: index,
      content,
      embedding: embeddings[index],
    }));
    const { error } = await supabase.from("document_chunks").insert(rows);
    if (error) console.error("reembedDocument:", error.message);
  }
}

async function uploadDocument(formData: FormData) {
  "use server";
  const supabase = await createServerSupabaseClient();

  const school_id = String(formData.get("school_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  const file = formData.get("file") as File | null;
  if (!school_id || !title) return;
  if (!text && (!file || file.size === 0)) return;

  const rawText = text || (await extractText({ buffer: Buffer.from(await file!.arrayBuffer()), mimeType: file!.type }));

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .insert({
      school_id,
      title,
      source_channel: "upload",
      original_filename: file?.name ?? null,
      raw_text: rawText,
    })
    .select()
    .single();

  if (documentError || !document) {
    console.error("uploadDocument:", documentError?.message);
    return;
  }

  await reembedDocument(document.id, rawText);
  revalidatePath("/admin/documentos");
}

async function updateDocumentText(formData: FormData) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const documentId = String(formData.get("document_id"));
  const rawText = String(formData.get("raw_text") ?? "");

  const { error } = await supabase.from("documents").update({ raw_text: rawText }).eq("id", documentId);
  if (error) console.error("updateDocumentText:", error.message);

  await reembedDocument(documentId, rawText);
  revalidatePath("/admin/documentos");
}

async function deleteDocument(formData: FormData) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const documentId = String(formData.get("document_id"));
  await supabase.from("document_scopes").delete().eq("document_id", documentId);
  await supabase.from("document_chunks").delete().eq("document_id", documentId);
  const { error } = await supabase.from("documents").delete().eq("id", documentId);
  if (error) console.error("deleteDocument:", error.message);
  revalidatePath("/admin/documentos");
}

async function addScope(formData: FormData) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const document_id = String(formData.get("document_id"));
  const raw = String(formData.get("scope") ?? "");
  const [scope_type, scope_id] = raw.split(":");
  if (!scope_type) return;

  const { error } = await supabase.from("document_scopes").insert({ document_id, scope_type, scope_id: scope_id || null });
  if (error) console.error("addScope:", error.message);
  revalidatePath("/admin/documentos");
}

async function removeScope(formData: FormData) {
  "use server";
  const supabase = await createServerSupabaseClient();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("document_scopes").delete().eq("id", id);
  if (error) console.error("removeScope:", error.message);
  revalidatePath("/admin/documentos");
}

export default async function DocumentosPage() {
  const supabase = await createServerSupabaseClient();

  const [
    { data: documents },
    { data: schools },
    { data: cycles },
    { data: yearGroups },
    { data: classes },
    { data: activities },
    { data: students },
    { data: scopes },
    { data: chunkCounts },
  ] = await Promise.all([
    supabase.from("documents").select("*").order("received_at", { ascending: false }),
    supabase.from("schools").select("id, name").order("name"),
    supabase.from("cycles").select("id, name").order("name"),
    supabase.from("year_groups").select("id, name").order("name"),
    supabase.from("classes").select("id, name").order("name"),
    supabase.from("activities").select("id, name").order("name"),
    supabase.from("students").select("id, first_name, last_name").order("first_name"),
    supabase.from("document_scopes").select("*"),
    supabase.from("document_chunks").select("document_id"),
  ]);

  const scopeLabel = (scopeType: string, scopeId: string | null) => {
    if (scopeType === "geral") return "Geral";
    const lookup: Record<string, { id: string; name?: string; first_name?: string; last_name?: string }[] | null | undefined> = {
      ciclo: cycles,
      ano: yearGroups,
      turma: classes,
      atividade: activities,
      aluno: students,
    };
    const row = lookup[scopeType]?.find((r) => r.id === scopeId);
    if (!row) return `${scopeType}: ?`;
    return row.first_name ? `${row.first_name} ${row.last_name}` : row.name;
  };

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Documentos</h1>

      <form action={uploadDocument} className="mb-8 flex flex-col gap-2 rounded border border-gray-200 p-4" encType="multipart/form-data">
        <p className="font-medium">Adicionar documento</p>
        <div className="flex flex-wrap gap-2">
          <select name="school_id" required className="rounded border border-gray-300 px-3 py-2 text-sm">
            <option value="">Escola</option>
            {schools?.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
          <input name="title" required placeholder="Título" className="rounded border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <label className="text-sm text-gray-600">Ficheiro (PDF) ou texto colado abaixo</label>
        <input name="file" type="file" accept="application/pdf" className="text-sm" />
        <textarea name="text" placeholder="...ou cola aqui o texto diretamente" rows={3} className="rounded border border-gray-300 px-3 py-2 text-sm" />
        <button type="submit" className="w-fit rounded bg-gray-900 px-4 py-2 text-sm text-white">
          Carregar
        </button>
      </form>

      <div className="flex flex-col gap-6">
        {documents?.map((document) => {
          const docScopes = scopes?.filter((s) => s.document_id === document.id) ?? [];
          const hasChunks = chunkCounts?.some((c) => c.document_id === document.id) ?? false;
          const hasText = Boolean(document.raw_text?.trim());

          return (
            <div key={document.id} className="rounded border border-gray-200 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-medium">{document.title}</p>
                <div className="flex gap-2 text-xs">
                  <span className={`rounded px-2 py-1 ${hasText ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                    {hasText ? "extraído" : "sem texto"}
                  </span>
                  <span className={`rounded px-2 py-1 ${hasChunks ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                    {hasChunks ? "com embeddings" : "sem embeddings"}
                  </span>
                  <span className={`rounded px-2 py-1 ${docScopes.length > 0 ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                    {docScopes.length > 0 ? "etiquetado" : "sem âmbito"}
                  </span>
                </div>
              </div>

              <div className="mb-3">
                <p className="mb-1 text-sm font-medium text-gray-700">Âmbitos</p>
                <ul className="mb-2 flex flex-wrap gap-2">
                  {docScopes.map((scope) => (
                    <li key={scope.id} className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs">
                      {scopeLabel(scope.scope_type, scope.scope_id)}
                      <form action={removeScope}>
                        <input type="hidden" name="id" value={scope.id} />
                        <button type="submit" className="text-red-600 hover:underline">
                          ×
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
                <form action={addScope} className="flex gap-2">
                  <input type="hidden" name="document_id" value={document.id} />
                  <select name="scope" required className="rounded border border-gray-300 px-2 py-1 text-sm">
                    <option value="geral:">Geral (toda a escola)</option>
                    <optgroup label="Ciclo">
                      {cycles?.map((c) => (
                        <option key={c.id} value={`ciclo:${c.id}`}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Ano">
                      {yearGroups?.map((yg) => (
                        <option key={yg.id} value={`ano:${yg.id}`}>
                          {yg.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Turma">
                      {classes?.map((cls) => (
                        <option key={cls.id} value={`turma:${cls.id}`}>
                          {cls.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Atividade">
                      {activities?.map((activity) => (
                        <option key={activity.id} value={`atividade:${activity.id}`}>
                          {activity.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Aluno">
                      {students?.map((student) => (
                        <option key={student.id} value={`aluno:${student.id}`}>
                          {student.first_name} {student.last_name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <button type="submit" className="text-sm text-blue-600 hover:underline">
                    Adicionar âmbito
                  </button>
                </form>
              </div>

              <details className="mb-3">
                <summary className="cursor-pointer text-sm font-medium text-gray-700">Texto extraído (editar e reprocessar)</summary>
                <form action={updateDocumentText} className="mt-2 flex flex-col gap-2">
                  <input type="hidden" name="document_id" value={document.id} />
                  <textarea name="raw_text" defaultValue={document.raw_text ?? ""} rows={8} className="rounded border border-gray-300 px-3 py-2 font-mono text-xs" />
                  <button type="submit" className="w-fit rounded bg-gray-900 px-4 py-2 text-sm text-white">
                    Guardar e reprocessar (re-chunk + re-embed)
                  </button>
                </form>
              </details>

              <form action={deleteDocument}>
                <input type="hidden" name="document_id" value={document.id} />
                <button type="submit" className="text-sm text-red-600 hover:underline">
                  Eliminar documento
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
