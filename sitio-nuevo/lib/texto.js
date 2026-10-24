export function slugificar(texto) {
  return texto
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function oracion(texto, marcas = []) {
  const palabrasDeMarca = new Map(marcas.flatMap((m) => m.split(" ")).map((p) => [p.toLowerCase(), p]));
  return texto.trim().split(/\s+/).map((palabra, i) => {
    const marca = palabrasDeMarca.get(palabra.toLowerCase());
    if (marca) return marca;
    const esSigla = palabra.length > 1 && palabra === palabra.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(palabra);
    if (/\d/.test(palabra) || esSigla) return palabra;
    const minuscula = palabra.toLowerCase();
    return i === 0 ? minuscula[0].toUpperCase() + minuscula.slice(1) : minuscula;
  }).join(" ");
}

// Para meta descriptions: tantas oraciones enteras como entren en n caracteres. Solo si la primera ya no entra,
// corta en una palabra con puntos suspensivos. Fin de oración = punto seguido de espacio y mayúscula.
export function resumir(texto, n = 160) {
  if (texto.length <= n) return texto;
  const oraciones = texto.split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/);
  let resumen = "";
  for (const o of oraciones) {
    const siguiente = resumen ? `${resumen} ${o}` : o;
    if (siguiente.length > n) break;
    resumen = siguiente;
  }
  return resumen || recortar(texto, n);
}

export function recortar(texto, n = 155) {
  if (texto.length <= n) return texto;
  const corte = texto.lastIndexOf(" ", n - 1);
  return texto.slice(0, corte > 0 ? corte : n - 1).replace(/[\s,;:.–-]+$/, "") + "…";
}
