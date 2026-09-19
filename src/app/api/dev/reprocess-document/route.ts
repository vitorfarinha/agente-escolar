import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service-client";
import { chunkText } from "@/lib/documents/chunk-text";
import { embedChunks } from "@/lib/documents/embed-chunks";

/**
 * Utilitário de desenvolvimento para reprocessar um documento já existente
 * (novo chunkText + embedChunks) sem perder o document_id nem as
 * document_scopes já atribuídas — usado para corrigir documentos cujos
 * chunks foram gerados antes de uma correção ao chunking (ex: tabelas
 * cortadas a meio sem repetição do cabeçalho).
 */
export async function POST(request: NextRequest) {
  const internalKey = request.headers.get("x-internal-api-key");
  if (!process.env.INTERNAL_API_KEY || internalKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const documentId = body.document_id as string | undefined;
  if (!documentId) {
    return NextResponse.json({ error: "document_id em falta" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id, raw_text")
    .eq("id", documentId)
    .single();

  if (documentError || !document) {
    return NextResponse.json({ error: documentError?.message ?? "documento não encontrado" }, { status: 404 });
  }

  const { error: deleteError } = await supabase.from("document_chunks").delete().eq("document_id", documentId);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const chunks = chunkText(document.raw_text);
  const embeddings = await embedChunks(chunks);

  if (chunks.length > 0) {
    const rows = chunks.map((content, index) => ({
      document_id: documentId,
      chunk_index: index,
      content,
      embedding: embeddings[index],
    }));

    const { error: insertError } = await supabase.from("document_chunks").insert(rows);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ document_id: documentId, chunks: chunks.length }, { status: 200 });
}
