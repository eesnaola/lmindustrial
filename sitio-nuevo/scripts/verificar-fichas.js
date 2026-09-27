import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verificarFicha } from "../lib/verificacion.js";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, "../..");
const RUTA = path.resolve(AQUI, "../src/_data/productos.json");

const productos = JSON.parse(await readFile(RUTA, "utf8"));
let pendientes = 0;
for (const p of productos.filter((p) => p.ficha)) {
  const texto = execFileSync("pdftotext", ["-layout", path.join(RAIZ, p.pdf), "-"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  p.verificacion = verificarFicha(p, texto);
  const revisada = p.revision_manual === "ok";
  if (p.fuente === "imagen" && !revisada) {
    pendientes += 1;
    console.log(`✗ ${p.id}: PDF escaneado, falta revisión manual`);
  } else if (!p.verificacion.ok && !revisada) {
    pendientes += 1;
    console.log(`✗ ${p.id}: no están en el PDF → ${p.verificacion.no_encontrados.join(", ")}`);
  } else {
    console.log(`✓ ${p.id}`);
  }
}
await writeFile(RUTA, JSON.stringify(productos, null, 2) + "\n");
console.log(pendientes ? `${pendientes} ficha(s) para revisar` : "Todas las fichas verificadas");
process.exit(pendientes ? 1 : 0);
