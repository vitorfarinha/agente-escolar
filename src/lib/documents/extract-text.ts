import { PDFParse } from "pdf-parse";
import { CanvasFactory } from "pdf-parse/worker";

export type ExtractableFile = {
  buffer: Buffer;
  mimeType: string;
};

/**
 * Deteta o tipo de ficheiro (PDF/email/texto) e extrai o texto.
 * Emails já chegam como corpo de texto simples (o parsing MIME
 * fica a cargo do adaptador de canal em Fase 4) — aqui só passamos através.
 */
export async function extractText({ buffer, mimeType }: ExtractableFile): Promise<string> {
  if (mimeType === "application/pdf") {
    // CanvasFactory explícito: sem isto, o pdf-parse tenta auto-polyfill
    // DOMMatrix via @napi-rs/canvas e falha de forma pouco clara em runtimes
    // serverless (ex: Vercel) — apanhado ao ver "DOMMatrix is not defined"
    // em produção, mesmo só ao listar documentos (o import falhava sozinho).
    const parser = new PDFParse({ data: buffer, CanvasFactory });
    try {
      const textResult = await parser.getText();
      const tableResult = await parser.getTable();

      // getText() devolve tabelas (ex: horários) como texto corrido, o que
      // frequentemente faz o modelo associar mal linhas/colunas (ex: trocar
      // o horário de um dia pelo de outro). Anexamos também as tabelas
      // detetadas (por linhas de grelha no PDF) em formato markdown, que
      // preserva a estrutura linha/coluna de forma inequívoca.
      const tableBlocks = tableResult.pages.flatMap((page, pageIndex) =>
        page.tables
          .filter((table) => table.length > 0)
          .map((table, tableIndex) => `[Tabela — página ${pageIndex + 1}, tabela ${tableIndex + 1}]\n${tableToMarkdown(table)}`),
      );

      return [textResult.text.trim(), ...tableBlocks].filter(Boolean).join("\n\n");
    } finally {
      await parser.destroy();
    }
  }

  return buffer.toString("utf-8").trim();
}

function tableToMarkdown(rows: string[][]): string {
  const [header, ...body] = rows;
  const headerLine = `| ${header.map((cell) => cell.trim()).join(" | ")} |`;
  const separatorLine = `| ${header.map(() => "---").join(" | ")} |`;
  const bodyLines = body.map((row) => `| ${row.map((cell) => cell.trim()).join(" | ")} |`);
  return [headerLine, separatorLine, ...bodyLines].join("\n");
}
