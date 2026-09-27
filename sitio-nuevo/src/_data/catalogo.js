import { readFileSync } from "node:fs";
import { crearCatalogo } from "../../lib/catalogo.js";

const leer = (archivo) => JSON.parse(readFileSync(new URL(archivo, import.meta.url), "utf8"));

export default crearCatalogo(leer("./categorias.json"), leer("./productos.json"));
