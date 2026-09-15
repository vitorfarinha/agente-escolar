import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (via pdfjs-dist) tenta carregar um worker cujo caminho não
  // sobrevive ao bundling do Next — deixamos o Node fazer require() direto
  // a partir de node_modules em vez de o Next tentar empacotá-lo.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
};

export default nextConfig;
