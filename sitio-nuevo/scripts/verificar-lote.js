// Verifica un lote de fichas (JSON con una lista de fichas) antes de integrarlo a productos.json.
// Uso: node scripts/verificar-lote.js <lote.json>
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validarFicha } from "../lib/fichas.js";
import { verificarFicha } from "../lib/verificacion.js";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, "../..");
const productos = JSON.parse(await readFile(path.resolve(AQUI, "../src/_data/productos.json"), "utf8"));
const lote = JSON.parse(await readFile(process.argv[2], "utf8"));

let pendientes = 0;
for (const f of lote) {
  const problemas = validarFicha(f);
  const producto = productos.find((p) => p.pdf === f.pdf);
  if (!producto) problemas.push("el PDF no corresponde a ningún producto");
  else if (producto.ficha) problemas.push("ese producto ya tiene ficha");
  if (f.fuente === "imagen") {
    if (f.revision_manual !== "ok") problemas.push("PDF escaneado: revisar contra las imágenes y poner revision_manual: \"ok\"");
  } else {
    const texto = execFileSync("pdftotext", ["-layout", path.join(RAIZ, f.pdf), "-"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    const v = verificarFicha(f, texto);
    if (!v.ok && f.revision_manual !== "ok") problemas.push(`números que no están en el PDF: ${v.no_encontrados.join(", ")}`);
  }
  if (problemas.length) { pendientes += 1; console.log(`✗ ${f.pdf}\n    ${problemas.join("\n    ")}`); }
  else console.log(`✓ ${f.id}`);
}
const ids = lote.map((f) => f.id);
const repetidos = ids.filter((id, i) => ids.indexOf(id) !== i);
if (repetidos.length) { pendientes += 1; console.log(`✗ ids repetidos: ${repetidos.join(", ")}`); }
console.log(pendientes ? `${pendientes} problema(s)` : `Lote OK: ${lote.length} fichas`);
process.exit(pendientes ? 1 : 0);
