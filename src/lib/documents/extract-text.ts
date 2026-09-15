import { PDFParse } from "pdf-parse";

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
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text.trim();
    } finally {
      await parser.destroy();
    }
  }

  return buffer.toString("utf-8").trim();
}
