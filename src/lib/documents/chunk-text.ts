// Aproximação: sem tokenizer dedicado no stack, usa-se 1 token ≈ 4 caracteres.
// ~500 tokens ≈ 2000 caracteres; overlap de ~50 tokens ≈ 200 caracteres.
const DEFAULT_CHUNK_CHARS = 2000;
const DEFAULT_OVERLAP_CHARS = 200;

export type ChunkOptions = {
  chunkSize?: number;
  overlap?: number;
};

export function chunkText(text: string, { chunkSize = DEFAULT_CHUNK_CHARS, overlap = DEFAULT_OVERLAP_CHARS }: ChunkOptions = {}): string[] {
  // Normaliza só espaços/tabs horizontais — preserva quebras de linha.
  // Tabelas em markdown (ver extract-text.ts) dependem de \n para
  // manter a estrutura linha/coluna; colapsar tudo para espaços
  // transformava-as num blob sem fronteiras de linha reconhecíveis.
  const normalized = text
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + chunkSize, normalized.length);

    if (end < normalized.length) {
      // Prefere cortar numa quebra de linha (não parte uma linha/linha de
      // tabela ao meio); só recua para o último espaço se não houver.
      const lastNewline = normalized.lastIndexOf("\n", end);
      if (lastNewline > start) {
        end = lastNewline;
      } else {
        const lastSpace = normalized.lastIndexOf(" ", end);
        if (lastSpace > start) end = lastSpace;
      }
    }

    chunks.push(normalized.slice(start, end).trim());

    if (end >= normalized.length) break;
    start = end - overlap;
  }

  return chunks;
}
