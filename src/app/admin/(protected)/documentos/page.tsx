import { revalidatePath } from "next/cache";
import { Plus, Trash2, X } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { extractText } from "@/lib/documents/extract-text";
import { extractFromUrl } from "@/lib/documents/extract-url";
import { chunkText } from "@/lib/documents/chunk-text";
import { embedChunks } from "@/lib/documents/embed-chunks";
import { Badge, Button, Card, Input, PageHeader, Select, Textarea } from "@/components/ui";

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
  const url = String(formData.get("url") ?? "").trim();
  const file = formData.get("file") as File | null;
  if (!school_id || !title) return;
  if (!text && !url && (!file || file.size === 0)) return;

  let rawText: string;
  let source_channel: "upload" | "url" = "upload";
  if (text) {
    rawText = text;
  } else if (url) {
    try {
      rawText = (await extractFromUrl(url)).text;
    } catch (error) {
      console.error("uploadDocument (url):", error instanceof Error ? error.message : error);
      return;
    }
    source_channel = "url";
  } else {
    rawText = await extractText({ buffer: Buffer.from(await file!.arrayBuffer()), mimeType: file!.type });
  }

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .insert({
      school_id,
      title,
      source_channel,
      original_filename: source_channel === "upload" ? (file?.name ?? null) : null,
      source_url: source_channel === "url" ? url : null,
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
      <PageHeader title="Documentos" />

      <Card className="mb-6">
        <p className="mb-3 font-semibold text-primary">Adicionar documento</p>
        <form action={uploadDocument} className="flex flex-col gap-2" encType="multipart/form-data">
          <div className="flex flex-wrap gap-2">
            <Select name="school_id" required className="min-w-40">
              <option value="">Escola</option>
              {schools?.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </Select>
            <Input name="title" required placeholder="Título" className="min-w-40 flex-1" />
          </div>
          <label className="text-sm text-secondary">Ficheiro (PDF), URL de uma página, ou texto colado abaixo</label>
          <input name="file" type="file" accept="application/pdf" className="text-sm text-secondary" />
          <Input name="url" type="url" placeholder="...ou cola aqui o URL de uma página (ex: https://escola.pt/circular)" />
          <Textarea name="text" placeholder="...ou cola aqui o texto diretamente" rows={3} />
          <Button type="submit" className="w-fit">
            <Plus size={16} aria-hidden="true" />
            Carregar
          </Button>
        </form>
      </Card>

      <div className="flex flex-col gap-4">
        {documents?.map((document) => {
          const docScopes = scopes?.filter((s) => s.document_id === document.id) ?? [];
          const hasChunks = chunkCounts?.some((c) => c.document_id === document.id) ?? false;
          const hasText = Boolean(document.raw_text?.trim());

          return (
            <Card key={document.id}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-primary">{document.title}</p>
                  {document.source_url ? (
                    <a href={document.source_url} target="_blank" rel="noreferrer" className="text-xs text-brand-900 hover:underline">
                      {document.source_url}
                    </a>
                  ) : document.original_filename ? (
                    <p className="text-xs text-secondary">{document.original_filename}</p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Badge tone={hasText ? "success" : "neutral"}>{hasText ? "extraído" : "sem texto"}</Badge>
                  <Badge tone={hasChunks ? "success" : "neutral"}>{hasChunks ? "com embeddings" : "sem embeddings"}</Badge>
                  <Badge tone={docScopes.length > 0 ? "success" : "neutral"}>{docScopes.length > 0 ? "etiquetado" : "sem âmbito"}</Badge>
                </div>
              </div>

              <div className="mb-3">
                <p className="mb-2 text-sm font-medium text-primary">Âmbitos</p>
                <ul className="mb-2 flex flex-wrap gap-2">
                  {docScopes.map((scope) => (
                    <li key={scope.id}>
                      <form action={removeScope} className="inline-flex items-center gap-1 rounded-full bg-surface-bg py-1 pl-3 pr-1 text-xs text-primary">
                        <input type="hidden" name="id" value={scope.id} />
                        {scopeLabel(scope.scope_type, scope.scope_id)}
                        <button type="submit" aria-label="Remover âmbito" className="rounded-full p-1 text-secondary hover:bg-subtle hover:text-red-600">
                          <X size={12} aria-hidden="true" />
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
                <form action={addScope} className="flex gap-2">
                  <input type="hidden" name="document_id" value={document.id} />
                  <Select name="scope" required className="flex-1">
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
                  </Select>
                  <Button type="submit" variant="ghost">
                    Adicionar âmbito
                  </Button>
                </form>
              </div>

              <details className="mb-3">
                <summary className="cursor-pointer text-sm font-medium text-primary">Texto extraído (editar e reprocessar)</summary>
                <form action={updateDocumentText} className="mt-2 flex flex-col gap-2">
                  <input type="hidden" name="document_id" value={document.id} />
                  <Textarea name="raw_text" defaultValue={document.raw_text ?? ""} rows={8} className="font-mono text-xs" />
                  <Button type="submit" variant="ghost" className="w-fit">
                    Guardar e reprocessar (re-chunk + re-embed)
                  </Button>
                </form>
              </details>

              <form action={deleteDocument}>
                <input type="hidden" name="document_id" value={document.id} />
                <Button type="submit" variant="danger-link">
                  <Trash2 size={14} aria-hidden="true" />
                  Eliminar documento
                </Button>
              </form>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
