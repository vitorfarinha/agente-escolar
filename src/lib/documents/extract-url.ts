import * as cheerio from "cheerio";

const FETCH_TIMEOUT_MS = 15_000;

export type ExtractedPage = {
  title: string | null;
  text: string;
};

/**
 * Faz fetch de uma página e extrai o texto principal, removendo scripts,
 * estilos e blocos que tipicamente não são conteúdo (nav/header/footer).
 * Sem re-fetch periódico — é um snapshot único, tal como um PDF carregado.
 */
export async function extractFromUrl(url: string): Promise<ExtractedPage> {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Só são suportados URLs http/https.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let html: string;
  try {
    const response = await fetch(parsed, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AgenteEscolarBot/1.0)" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} ao aceder a ${url}`);
    html = await response.text();
  } finally {
    clearTimeout(timeout);
  }

  const $ = cheerio.load(html);
  $("script, style, nav, header, footer, noscript, iframe, svg").remove();

  const title = $("title").first().text().trim() || null;
  const text = $("body")
    .text()
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*/g, "\n\n")
    .trim();

  return { title, text };
}
