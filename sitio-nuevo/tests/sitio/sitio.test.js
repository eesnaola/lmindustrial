import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sitio from "../../src/_data/sitio.js";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(AQUI, "../../_site");
const VIEJO = path.resolve(AQUI, "../../..");
const leerJson = (rel) => JSON.parse(readFileSync(path.resolve(AQUI, "../../src/_data", rel), "utf8"));
const categorias = leerJson("categorias.json");
const productos = leerJson("productos.json");
const fichas = productos.filter((p) => p.ficha);
const leer = (rel) => readFileSync(path.join(SITE, rel), "utf8");

function htmls(dir = SITE, base = "") {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const rel = path.join(base, e.name);
    if (e.isDirectory()) return ["pagefind", "img", "assets"].includes(e.name) ? [] : htmls(path.join(dir, e.name), rel);
    return e.name.endsWith(".html") ? [rel] : [];
  });
}
const paginas = htmls();

test("las 55 URLs del sitio actual existen (inicio + 54 categorías)", () => {
  const viejas = readdirSync(VIEJO).filter((f) => f.endsWith(".html") && !f.includes("copia") && !f.startsWith("Genebre-"));
  assert.equal(viejas.length, 55);
  for (const f of viejas) assert.ok(existsSync(path.join(SITE, f)), `falta ${f}`);
});

test("enlaces internos absolutos y sin romper (los PDFs se buscan en la carpeta vieja)", () => {
  const problemas = [];
  for (const rel of paginas) {
    for (const [, url] of leer(rel).matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^(https?:|mailto:|tel:|#|data:)/.test(url)) continue;
      if (!url.startsWith("/")) { problemas.push(`${rel}: enlace relativo ${url}`); continue; }
      const limpio = decodeURIComponent(url.split(/[?#]/)[0]);
      const destino = limpio === "/" ? "/index.html" : limpio;
      const base = destino.startsWith("/catalogos/") ? VIEJO : SITE;
      if (!existsSync(path.join(base, destino))) problemas.push(`${rel}: roto ${url}`);
    }
  }
  assert.deepEqual(problemas, []);
});

test("un solo h1 por página", () => {
  for (const rel of paginas) assert.equal((leer(rel).match(/<h1[\s>]/g) ?? []).length, 1, rel);
});

test("títulos únicos", () => {
  const vistos = new Map();
  for (const rel of paginas) {
    const t = leer(rel).match(/<title>([^<]*)<\/title>/)?.[1];
    assert.ok(t, `${rel} sin título`);
    assert.ok(!vistos.has(t), `título repetido "${t}" en ${rel} y ${vistos.get(t)}`);
    vistos.set(t, rel);
  }
});

test("canónica absoluta a www e idioma es-AR", () => {
  for (const rel of paginas) {
    const html = leer(rel);
    assert.match(html, /<html lang="es-AR">/, rel);
    assert.match(html, /<link rel="canonical" href="https:\/\/www\.lmindustrial\.com\.ar\/[^"]*">/, rel);
  }
});

test("sitio de prueba no indexable", { skip: process.env.SITIO === "produccion" }, () => {
  assert.match(leer("robots.txt"), /Disallow: \//);
  for (const rel of paginas) assert.match(leer(rel), /<meta name="robots" content="noindex, nofollow">/, rel);
});

test("buscar y 404 nunca se indexan", () => {
  for (const rel of ["buscar.html", "404.html"]) assert.match(leer(rel), /<meta name="robots" content="noindex/, rel);
});

test("el inicio muestra las 6 categorías principales con foto", () => {
  const grilla = leer("index.html").match(/<div class="grilla grilla--portada">([\s\S]*?)<\/div>\s*<\/section>/)?.[1] ?? "";
  assert.equal((grilla.match(/class="tarjeta-categoria"/g) ?? []).length, 6);
  assert.equal((grilla.match(/<picture>/g) ?? []).length, 6);
});

test("cada categoría muestra todas sus tarjetas, cada una con foto", () => {
  for (const c of categorias) {
    const html = leer(`${c.slug}.html`);
    assert.equal((html.match(/<article class="tarjeta"/g) ?? []).length, c.productos.length, `${c.slug}: productos`);
    assert.equal((html.match(/class="tarjeta-categoria"/g) ?? []).length, c.hijos.length, `${c.slug}: subcategorías`);
    assert.equal((html.match(/<picture>/g) ?? []).length, c.productos.length + c.hijos.length, `${c.slug}: fotos`);
  }
});

test("migas de categoría hasta el inicio", () => {
  const html = leer("valvula-esferica.html");
  assert.match(html, /<a href="\/">Inicio<\/a>.*<a href="\/valvulas-industriales.html">Válvulas industriales<\/a>.*<span aria-current="page">Válvulas esféricas<\/span>/s);
});

test("los filtros arrancan ocultos (sin JavaScript no quedan botones muertos)", () => {
  for (const c of categorias) {
    const html = leer(`${c.slug}.html`);
    if (html.includes("data-filtros")) assert.match(html, /<div class="filtros" data-filtros hidden>/, c.slug);
  }
});

test("cada ficha tiene su página en /productos/", () => {
  for (const p of fichas) assert.ok(existsSync(path.join(SITE, "productos", `${p.id}.html`)), p.id);
});

test("el WhatsApp de cada ficha nombra el producto (acentos y comillas intactos)", () => {
  for (const p of fichas) {
    const html = leer(`productos/${p.id}.html`);
    const textos = [...html.matchAll(new RegExp(`href="https://wa\\.me/${sitio.whatsapp}\\?text=([^"]+)"`, "g"))].map(([, t]) => decodeURIComponent(t));
    assert.ok(textos.includes(`Hola, quiero consultar por ${p.marca} ${p.modelo} – ${p.nombre}`), `${p.id}: ${textos.join(" | ")}`);
  }
});

test("la ficha muestra todas sus especificaciones y enlaza su PDF", () => {
  for (const p of fichas) {
    const html = leer(`productos/${p.id}.html`);
    assert.equal((html.match(/<th scope="row">/g) ?? []).length, p.specs.length, p.id);
    assert.ok(html.includes(`href="/${p.pdf}"`), `${p.id}: falta el PDF`);
  }
});

test("las fotos optimizadas se nombran por el archivo original, sin hash aleatorio", () => {
  const html = leer("productos/genebre-2025-valvula-esferica-inox-3-piezas-roscada.html");
  assert.match(html, /srcset="\/img\/opt\/VEInRo-250\.webp"/);
});

test("la foto principal de la ficha carga de inmediato (es el elemento más grande de la página)", () => {
  for (const p of fichas) {
    const foto = leer(`productos/${p.id}.html`).match(/<div class="producto__foto">([\s\S]*?)<\/div>/)?.[1] ?? "";
    assert.match(foto, /fetchpriority="high"/, p.id);
    assert.doesNotMatch(foto, /loading="lazy"/, p.id);
  }
});

test("el menú no tiene submenús vacíos (categorías principales sin hijos)", () => {
  const html = leer("index.html");
  assert.doesNotMatch(html, /<ul class="navegacion__sub"><\/ul>/);
  assert.doesNotMatch(html, /<ul><\/ul>/);
});

test("la franja de marcas es un carrusel de logos, y cada marca tiene productos en el catálogo", () => {
  const html = leer("index.html");
  const carrusel = html.match(/<div class="carrusel-marcas">([\s\S]*?)<\/div>\s*<\/div>\s*<\/section>/)?.[1] ?? "";
  const listas = [...carrusel.matchAll(/<ul class="marcas"([^>]*)>([\s\S]*?)<\/ul>/g)];
  assert.equal(listas.length, 2, "una lista visible y una copia para el desplazamiento continuo");
  assert.equal(listas[0][1], "", "la primera lista es la accesible");
  assert.match(listas[1][1], /aria-hidden="true"/, "la copia se oculta a lectores de pantalla");
  const nombres = [...listas[0][2].matchAll(/<img [^>]*alt="([^"]+)"/g)].map(([, alt]) => alt);
  assert.equal(nombres.length, 10, `logos: ${nombres.join(", ")}`);
  assert.equal((listas[1][2].match(/<img /g) ?? []).length, 10);
  assert.doesNotMatch(listas[1][2], /alt="[^"]+"/, "la copia no repite los nombres");
  for (const nombre of nombres) {
    const clave = nombre.split(" ")[0].toUpperCase();
    assert.ok(productos.some((p) => p.pdf.toUpperCase().includes(clave)), `${nombre} no tiene productos`);
  }
});

test("el carrusel respeta a quien prefiere menos movimiento", () => {
  const css = readFileSync(path.join(SITE, "assets/css/estilos.css"), "utf8");
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*{[^}]*\.carrusel-marcas__pista/);
});

test("el número aparece una sola vez en contacto y en el pie, con WhatsApp y llamada", () => {
  const html = leer("contacto.html");
  const lista = html.match(/<ul class="contacto">([\s\S]*?)<\/ul>/)?.[1] ?? "";
  const pie = html.match(/<footer class="pie">([\s\S]*?)<\/footer>/)?.[1] ?? "";
  for (const [nombre, bloque] of [["contacto", lista], ["pie", pie]]) {
    assert.equal(bloque.split(sitio.telefono_visible).length - 1, 1, `${nombre}: el número se repite`);
    assert.ok(bloque.includes(`href="https://wa.me/${sitio.whatsapp}`), `${nombre}: falta WhatsApp`);
    assert.ok(bloque.includes(`href="tel:${sitio.telefono_tel}"`), `${nombre}: falta llamada`);
  }
});

test("si una categoría tiene subcategorías y productos, los separa con títulos visibles", () => {
  for (const c of categorias) {
    const html = leer(`${c.slug}.html`);
    const visibles = [...html.matchAll(/<h2( class="[^"]*")?>(Categorías|Productos)<\/h2>/g)]
      .filter(([, clase]) => !/visualmente-oculto/.test(clase ?? "")).map(([, , titulo]) => titulo);
    if (c.hijos.length && c.productos.length) assert.deepEqual(visibles, ["Categorías", "Productos"], c.slug);
    else assert.deepEqual(visibles, [], c.slug);
  }
});

test("sitemap.xml lista inicio, contacto, categorías, fichas y PDFs, sin buscar ni 404", () => {
  const BASE = "https://www.lmindustrial.com.ar";
  const urls = [...leer("sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, u]) => u);
  const esperadas = [`${BASE}/`, `${BASE}/contacto.html`, ...categorias.map((c) => `${BASE}/${c.slug}.html`),
    ...fichas.map((p) => `${BASE}/productos/${p.id}.html`), ...productos.map((p) => `${BASE}/${encodeURI(p.pdf)}`)];
  const faltan = esperadas.filter((u) => !urls.includes(u));
  assert.deepEqual(faltan, []);
  assert.ok(!urls.includes(`${BASE}/buscar.html`) && !urls.includes(`${BASE}/404.html`), "no debe incluir buscar ni 404");
  assert.equal(new Set(urls).size, urls.length, "URLs repetidas");
});

test("Google Analytics solo en producción", () => {
  const html = leer("index.html");
  if (process.env.SITIO === "produccion") assert.match(html, /googletagmanager\.com\/gtag\/js\?id=G-VMTZYT8BEQ/);
  else assert.doesNotMatch(html, /googletagmanager/);
});
