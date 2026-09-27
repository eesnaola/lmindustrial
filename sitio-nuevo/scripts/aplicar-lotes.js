// Integra lotes de fichas verificados a src/_data/productos.json (conserva pdf, imagen y categorías).
// Uso: node scripts/aplicar-lotes.js <lote1.json> [<lote2.json> ...]
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validarFicha } from "../lib/fichas.js";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RUTA = path.resolve(AQUI, "../src/_data/productos.json");
const productos = JSON.parse(await readFile(RUTA, "utf8"));
const CAMPOS = ["id", "marca", "modelo", "nombre", "descripcion", "specs", "destacados", "caracteristicas", "filtros", "fuente", "revision_manual"];

const errores = [];
let aplicadas = 0;
for (const archivo of process.argv.slice(2)) {
  for (const f of JSON.parse(await readFile(archivo, "utf8"))) {
    const p = productos.find((x) => x.pdf === f.pdf);
    const problemas = validarFicha(f);
    if (!p) errores.push(`${archivo}: ${f.pdf} no existe`);
    else if (p.ficha) errores.push(`${archivo}: ${f.pdf} ya tiene ficha`);
    else if (problemas.length) errores.push(`${archivo}: ${f.pdf}: ${problemas.join("; ")}`);
    else {
      delete p.nombre; delete p.marca;
      Object.assign(p, { ficha: true }, Object.fromEntries(CAMPOS.filter((c) => f[c] !== undefined).map((c) => [c, f[c]])));
      aplicadas += 1;
    }
  }
}
const ids = productos.filter((p) => p.ficha).map((p) => p.id);
const repetidos = ids.filter((id, i) => ids.indexOf(id) !== i);
if (repetidos.length) errores.push(`ids repetidos: ${repetidos.join(", ")}`);
if (errores.length) { console.error(errores.join("\n")); process.exit(1); }
await writeFile(RUTA, JSON.stringify(productos, null, 2) + "\n");
console.log(`${aplicadas} fichas integradas`);
