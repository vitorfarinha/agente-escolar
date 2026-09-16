import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service-client";
import { extractText } from "@/lib/documents/extract-text";
import { chunkText } from "@/lib/documents/chunk-text";
import { embedChunks } from "@/lib/documents/embed-chunks";

/**
 * Endpoint público de ingestão para o Awl (Fase 7 do PLANO.md, secção 6.5).
 * Reaproveita a mesma pipeline de ingestão do Admin UI (extração →
 * chunking → embeddings); não faz etiquetagem de âmbito
 * (`document_scopes`) — isso continua a ser feito manualmente no Admin UI
 * após a ingestão.
 */
const ingestSchema = z
  .object({
    school_id: z.guid(),
    title: z.string().min(1),
    source_channel: z.enum(["upload", "email", "api"]),
    original_filename: z.string().optional(),
    document_date: z.string().optional(),
    text: z.string().min(1).optional(),
    file_base64: z.string().min(1).optional(),
    mime_type: z.string().optional(),
  })
  .refine((data) => Boolean(data.text) || Boolean(data.file_base64 && data.mime_type), {
    message: "Fornece 'text' ou ('file_base64' + 'mime_type')",
  });

export async function POST(request: NextRequest) {
  const internalKey = request.headers.get("x-internal-api-key");
  if (!process.env.INTERNAL_API_KEY || internalKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = ingestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { school_id, title, source_channel, original_filename, document_date, text, file_base64, mime_type } = parsed.data;

  const extractedText =
    text ??
    (await extractText({
      buffer: Buffer.from(file_base64!, "base64"),
      mimeType: mime_type!,
    }));

  const supabase = createServiceClient();

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .insert({
      school_id,
      title,
      source_channel,
      original_filename: original_filename ?? null,
      raw_text: extractedText,
      document_date: document_date ?? null,
    })
    .select()
    .single();

  if (documentError) {
    return NextResponse.json({ error: documentError.message }, { status: 500 });
  }

  const chunks = chunkText(extractedText);
  const embeddings = await embedChunks(chunks);

  if (chunks.length > 0) {
    const rows = chunks.map((content, index) => ({
      document_id: document.id,
      chunk_index: index,
      content,
      embedding: embeddings[index],
    }));

    const { error: chunksError } = await supabase.from("document_chunks").insert(rows);
    if (chunksError) {
      return NextResponse.json({ error: chunksError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ document_id: document.id, chunks: chunks.length }, { status: 201 });
}
