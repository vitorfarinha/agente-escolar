// Aproximação: sem tokenizer dedicado no stack, usa-se 1 token ≈ 4 caracteres.
// ~500 tokens ≈ 2000 caracteres; overlap de ~50 tokens ≈ 200 caracteres.
const DEFAULT_CHUNK_CHARS = 2000;
const DEFAULT_OVERLAP_CHARS = 200;

export type ChunkOptions = {
  chunkSize?: number;
  overlap?: number;
};

export function chunkText(text: string, { chunkSize = DEFAULT_CHUNK_CHARS, overlap = DEFAULT_OVERLAP_CHARS }: ChunkOptions = {}): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + chunkSize, normalized.length);

    if (end < normalized.length) {
      const lastSpace = normalized.lastIndexOf(" ", end);
      if (lastSpace > start) end = lastSpace;
    }

    chunks.push(normalized.slice(start, end).trim());

    if (end >= normalized.length) break;
    start = end - overlap;
  }

  return chunks;
}
