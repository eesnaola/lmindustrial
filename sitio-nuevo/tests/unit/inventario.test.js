import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { construirInventario, marcaDesdeArchivo } from "../../lib/inventario.js";

const RAIZ = new URL("../../../", import.meta.url);
const archivos = readdirSync(RAIZ).filter((f) => f.endsWith(".html") && !f.includes("copia"));
const paginas = new Map(archivos.map((f) => [f, readFileSync(new URL(f, RAIZ), "utf8")]));
const { categorias, productos, tarjetasNoReconocidas } = construirInventario(paginas);
const cat = (slug) => categorias.find((c) => c.slug === slug);

test("encuentra 54 categorías y 261 productos", () => {
  assert.equal(categorias.length, 54);
  assert.equal(productos.length, 261);
});

test("reconoce todas las tarjetas", () => {
  assert.equal(tarjetasNoReconocidas, 0);
});

test("las 6 categorías principales, en el orden del inicio", () => {
  assert.deepEqual(categorias.filter((c) => c.padre === null).map((c) => c.slug), [
    "valvulas-industriales", "vapor", "control-de-quemadores",
    "automatizacion-neumatica", "instrumentos-de-medicion", "anti-incendio",
  ]);
});

test("válvulas esféricas: 14 productos en orden y la subcategoría de comandos", () => {
  const c = cat("valvula-esferica");
  assert.equal(c.padre, "valvulas-industriales");
  assert.equal(c.productos.length, 14);
  assert.equal(c.productos[0], "catalogos/Valvula-Esferica/GENEBRE-Valvula-Esferica-2025.pdf");
  assert.deepEqual(c.hijos, ["valvula-esferica-comandos"]);
  assert.equal(cat("valvula-esferica-comandos").productos.length, 4);
});

test("una categoría compartida conserva su primer padre y figura como hija del segundo", () => {
  assert.equal(cat("valvula-esferica-comandos").padre, "valvula-esferica");
  assert.ok(cat("valvula-esferica-vapor").hijos.includes("valvula-esferica-comandos"));
  assert.equal(cat("actuador-rotante").padre, "valvulas-industriales");
  assert.ok(cat("automatizacion-neumatica").hijos.includes("actuador-rotante"));
});

test("las páginas Genebre-* no son categorías", () => {
  assert.ok(!categorias.some((c) => c.slug.startsWith("Genebre-")));
});

test("cada categoría tiene nombre, imagen y descripción", () => {
  for (const c of categorias) {
    assert.ok(c.nombre, c.slug);
    assert.ok(c.imagen, c.slug);
    assert.ok(c.descripcion_seo, c.slug);
    assert.equal(c.titulo_seo, `${c.nombre} | LM Industrial`);
  }
});

test("nombres de categoría únicos (sin los títulos repetidos del sitio viejo)", () => {
  assert.equal(new Set(categorias.map((c) => c.nombre)).size, 54);
  assert.equal(cat("nivel").nombre, "Medición de nivel");
});

test("producto sin ficha: nombre en oración, marca, categorías", () => {
  const p = productos.find((p) => p.pdf.endsWith("GENEBRE-Valvula-Esferica-2025.pdf"));
  assert.deepEqual(p, {
    pdf: "catalogos/Valvula-Esferica/GENEBRE-Valvula-Esferica-2025.pdf",
    imagen: "img/iconos/VEInRo.jpg",
    nombre: "Válvula esférica inox roscada",
    marca: "Genebre",
    categoria_principal: "valvula-esferica",
    categorias: ["valvula-esferica"],
    ficha: false,
  });
});

test("marca desde el nombre del PDF", () => {
  assert.equal(marcaDesdeArchivo("catalogos/Control-de-Llama/HONEYWELL-SATRONIC-Control-De-Llama-DKG972.pdf"), "Honeywell");
  assert.equal(marcaDesdeArchivo("catalogos/Nivel/Sensor-de-Nivel-por-Radar-INSTRUBIT.pdf"), "Instrubit");
  assert.equal(marcaDesdeArchivo("catalogos/Presostato-y-Transmisor/FANTINI-COSMI-Presostato-B.pdf"), "Fantini Cosmi");
  assert.equal(marcaDesdeArchivo("catalogos/Termostato/Controlador-de-Temperatura-STC-1000.pdf"), null);
});
