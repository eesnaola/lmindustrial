import { slugificar } from "./texto.js";

export const MATERIALES = ["Inox", "Acero carbono", "Latón", "Bronce", "Hierro fundido", "Hierro dúctil", "Aluminio", "PVC"];
export const CONEXIONES = ["Roscada", "Bridada", "Socket weld", "Soldar", "Wafer", "Lug", "Clamp"];
const VOCABULARIO = { material: MATERIALES, conexion: CONEXIONES };

export function validarFicha(p) {
  const problemas = [];
  for (const campo of ["marca", "modelo", "nombre", "descripcion"]) {
    if (typeof p[campo] !== "string" || !p[campo].trim()) problemas.push(`falta ${campo}`);
  }
  if (!problemas.length) {
    const id = slugificar(`${p.marca} ${p.modelo} ${p.nombre}`);
    if (p.id !== id) problemas.push(`id debería ser ${id}`);
  }
  const largo = (p.descripcion ?? "").length;
  if (largo < 60 || largo > 400) problemas.push(`descripción de ${largo} caracteres (60 a 400)`);
  if (!Array.isArray(p.specs) || p.specs.length < 2) problemas.push("specs: al menos 2");
  for (const s of p.specs ?? []) if (!s.clave || !s.valor) problemas.push("spec vacía");
  if (!Array.isArray(p.destacados) || p.destacados.length < 1 || p.destacados.length > 3) problemas.push("destacados: de 1 a 3");
  for (const d of p.destacados ?? []) if (!(p.specs ?? []).some((s) => s.clave === d)) problemas.push(`destacado "${d}" no está en specs`);
  if (!Array.isArray(p.caracteristicas)) problemas.push("características: debe ser una lista");
  if (!["texto", "imagen"].includes(p.fuente)) problemas.push("fuente debe ser texto o imagen");
  for (const [clave, valor] of Object.entries(p.filtros ?? {})) {
    if (!VOCABULARIO[clave]) problemas.push(`filtro desconocido: ${clave}`);
    else if (!VOCABULARIO[clave].includes(valor)) problemas.push(`${clave} "${valor}" fuera del vocabulario`);
  }
  const texto = JSON.stringify(p);
  if (/distribuidor oficial/i.test(texto)) problemas.push('dice "distribuidor oficial"');
  if (/precio|p\.v\.p|\$\s?\d|usd\s?\d|€/i.test(texto)) problemas.push("menciona precios");
  return problemas;
}
