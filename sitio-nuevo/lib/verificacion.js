const FRACCIONES = { "½": "1/2", "¼": "1/4", "¾": "3/4", "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8" };

export function normalizar(texto) {
  return texto
    .replace(/[½¼¾⅛⅜⅝⅞]/g, (f) => FRACCIONES[f])
    .normalize("NFKC")
    .replace(/⁄/g, "/")
    .replace(/[−–—‐]/g, "-")
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function extraerNumeros(texto) {
  return [...normalizar(texto).matchAll(/\d+\s*\/\s*\d+|\d+(?:\.\d+)?/g)].map((m) => m[0].replace(/\s+/g, ""));
}

export function verificarFicha(ficha, textoPdf) {
  const enPdf = new Set(extraerNumeros(textoPdf));
  const fuentes = [ficha.modelo ?? "", ficha.descripcion ?? "", ...(ficha.specs ?? []).map((s) => s.valor), ...(ficha.caracteristicas ?? [])];
  const no_encontrados = [...new Set(fuentes.flatMap(extraerNumeros))].filter((n) => !enPdf.has(n));
  return { ok: no_encontrados.length === 0, no_encontrados };
}
