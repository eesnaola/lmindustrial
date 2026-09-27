import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validarFicha } from "../../lib/fichas.js";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, "../../..");
const leer = (f) => JSON.parse(readFileSync(path.resolve(AQUI, "../../src/_data", f), "utf8"));
const categorias = leer("categorias.json");
const productos = leer("productos.json");
const fichas = productos.filter((p) => p.ficha);
const slugs = new Set(categorias.map((c) => c.slug));

test("cada producto tiene PDF e imagen existentes", () => {
  for (const p of productos) {
    assert.ok(existsSync(path.join(RAIZ, p.pdf)), `falta ${p.pdf}`);
    assert.ok(existsSync(path.join(RAIZ, p.imagen)), `falta ${p.imagen}`);
  }
});

test("referencias cruzadas entre categorías y productos", () => {
  const porPdf = new Map(productos.map((p) => [p.pdf, p]));
  for (const c of categorias) {
    for (const pdf of c.productos) assert.ok(porPdf.get(pdf)?.categorias.includes(c.slug), `${c.slug} → ${pdf}`);
    for (const h of c.hijos) assert.ok(slugs.has(h), `${c.slug} → hijo ${h}`);
  }
  for (const p of productos) {
    assert.ok(p.categorias.length > 0, p.pdf);
    assert.ok(p.categorias.includes(p.categoria_principal), p.pdf);
    for (const s of p.categorias) assert.ok(categorias.find((c) => c.slug === s).productos.includes(p.pdf), `${p.pdf} ↔ ${s}`);
  }
});

test("fichas completas y con el formato acordado", () => {
  const problemas = fichas.flatMap((p) => validarFicha(p).map((x) => `${p.pdf}: ${x}`));
  assert.deepEqual(problemas, []);
});

test("ids de ficha únicos", () => {
  assert.equal(new Set(fichas.map((p) => p.id)).size, fichas.length);
});

test("cada ficha verificada contra su PDF o revisada a mano", () => {
  for (const p of fichas) {
    assert.ok(p.revision_manual === "ok" || (p.fuente === "texto" && p.verificacion?.ok), `${p.id}: correr npm run verificar-fichas y revisar`);
  }
});

test("fase 1: válvulas esféricas y comandos completas", () => {
  for (const slug of ["valvula-esferica", "valvula-esferica-comandos"]) {
    const c = categorias.find((c) => c.slug === slug);
    assert.ok(c.intro.length >= 80, `${slug}: intro`);
    for (const pdf of c.productos) assert.ok(productos.find((p) => p.pdf === pdf).ficha, `${pdf} sin ficha`);
  }
});

test("las fotos usadas tienen nombres de archivo únicos (las optimizadas se nombran por el original)", () => {
  const porNombre = new Map();
  for (const ruta of [...productos.map((p) => p.imagen), ...categorias.map((c) => c.imagen)]) {
    const nombre = path.parse(ruta).name;
    porNombre.set(nombre, new Set([...(porNombre.get(nombre) ?? []), ruta]));
  }
  const repetidos = [...porNombre].filter(([, rutas]) => rutas.size > 1).map(([n, rutas]) => `${n}: ${[...rutas].join(", ")}`);
  assert.deepEqual(repetidos, []);
});

test("todos los productos tienen ficha", () => {
  assert.deepEqual(productos.filter((p) => !p.ficha).map((p) => p.pdf), []);
});
