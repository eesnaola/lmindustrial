import { readdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { construirInventario } from "../lib/inventario.js";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, "../..");
const DATOS = path.resolve(AQUI, "../src/_data");
const forzar = process.argv.includes("--forzar");

for (const f of ["categorias.json", "productos.json"]) {
  const existe = await access(path.join(DATOS, f)).then(() => true, () => false);
  if (existe && !forzar) {
    console.error(`${f} ya existe. Usá --forzar para regenerarlo (pisa todo lo editado a mano).`);
    process.exit(1);
  }
}

const archivos = (await readdir(RAIZ)).filter((f) => f.endsWith(".html") && !f.includes("copia"));
const paginas = new Map(await Promise.all(archivos.map(async (f) => [f, await readFile(path.join(RAIZ, f), "utf8")])));
const { categorias, productos, tarjetasNoReconocidas } = construirInventario(paginas);
if (tarjetasNoReconocidas) throw new Error(`${tarjetasNoReconocidas} tarjetas no reconocidas`);

await writeFile(path.join(DATOS, "categorias.json"), JSON.stringify(categorias, null, 2) + "\n");
await writeFile(path.join(DATOS, "productos.json"), JSON.stringify(productos, null, 2) + "\n");
console.log(`${categorias.length} categorías y ${productos.length} productos escritos en src/_data/`);
