// Aproximação: sem tokenizer dedicado no stack, usa-se 1 token ≈ 4 caracteres.
// ~500 tokens ≈ 2000 caracteres; overlap de ~50 tokens ≈ 200 caracteres.
const DEFAULT_CHUNK_CHARS = 2000;
const DEFAULT_OVERLAP_CHARS = 200;

export type ChunkOptions = {
  chunkSize?: number;
  overlap?: number;
};

type TableBlock = {
  headerLines: string; // linha de cabeçalho + linha separadora, já com \n
  headerEnd: number; // índice (no texto normalizado) logo a seguir à linha separadora
  tableEnd: number; // índice do fim da última linha de dados da tabela
};

// Deteta tabelas markdown (cabeçalho + linha separadora "| --- | --- |" +
// linhas de dados) e devolve os seus limites, para podermos repor o
// cabeçalho em qualquer chunk que comece a meio de uma tabela — sem isto,
// um corte a meio perde a associação linha/coluna (ex: qual dia da semana
// corresponde a cada coluna de um horário).
function findTableBlocks(text: string): TableBlock[] {
  const lines = text.split("\n");
  const blocks: TableBlock[] = [];
  let offset = 0;
  const lineStarts: number[] = [];
  for (const line of lines) {
    lineStarts.push(offset);
    offset += line.length + 1; // +1 pelo "\n" removido no split
  }

  const isTableRow = (line: string) => line.trim().startsWith("|");
  const isSeparatorRow = (line: string) => /^\|[\s:-]+\|[\s|:-]*$/.test(line.trim());

  for (let i = 0; i < lines.length - 1; i++) {
    if (isTableRow(lines[i]) && isSeparatorRow(lines[i + 1])) {
      const headerLines = `${lines[i]}\n${lines[i + 1]}\n`;
      const headerEnd = lineStarts[i + 1] + lines[i + 1].length + 1;
      let j = i + 2;
      while (j < lines.length && isTableRow(lines[j])) j++;
      const tableEnd = j < lines.length ? lineStarts[j] : text.length;
      blocks.push({ headerLines, headerEnd, tableEnd });
      i = j - 1;
    }
  }

  return blocks;
}

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

  const tableBlocks = findTableBlocks(normalized);

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

    let chunkContent = normalized.slice(start, end).trim();

    // Se este chunk começa a meio de uma tabela cujo cabeçalho ficou no
    // chunk anterior (fora do alcance do overlap), repete o cabeçalho +
    // linha separadora no início deste chunk, para não perder a
    // associação linha/coluna.
    const containingTable = tableBlocks.find((block) => start > block.headerEnd - 1 && start < block.tableEnd && end > block.headerEnd);
    if (containingTable && !chunkContent.startsWith(containingTable.headerLines.split("\n")[0])) {
      chunkContent = `${containingTable.headerLines}${chunkContent}`;
    }

    chunks.push(chunkContent);

    if (end >= normalized.length) break;
    start = end - overlap;
  }

  return chunks;
}
