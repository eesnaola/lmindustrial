import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sitio from "../../src/_data/sitio.js";
import { mensajeProducto } from "../../lib/catalogo.js";

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

test("el inicio muestra las 7 categorías principales con foto", () => {
  const grilla = leer("index.html").match(/<div class="grilla grilla--portada">([\s\S]*?)<\/div>\s*<\/section>/)?.[1] ?? "";
  assert.equal((grilla.match(/class="tarjeta-categoria"/g) ?? []).length, 7);
  assert.equal((grilla.match(/<picture>/g) ?? []).length, 7);
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
    assert.ok(textos.includes(mensajeProducto(p)), `${p.id}: ${textos.join(" | ")}`);
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
  assert.equal(nombres.length, 14, `logos: ${nombres.join(", ")}`);
  assert.equal((listas[1][2].match(/<img /g) ?? []).length, 14);
  assert.doesNotMatch(listas[1][2], /alt="[^"]+"/, "la copia no repite los nombres");
  assert.doesNotMatch(carrusel, /loading="lazy"/, "con carga diferida los logos entran en blanco mientras el carrusel se mueve");
  for (const nombre of nombres) {
    const clave = nombre.split(" ")[0].toUpperCase();
    assert.ok(productos.some((p) => `${p.marca} ${p.marca_anterior ?? ""} ${p.pdf}`.toUpperCase().includes(clave)), `${nombre} no tiene productos`);
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

// Datos estructurados (JSON-LD): uno por página indexable, y siempre igual a lo que se ve.
const grafo = (rel) => {
  const bloques = [...leer(rel).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(bloques.length, 1, `${rel}: bloques JSON-LD`);
  return JSON.parse(bloques[0][1])["@graph"];
};
const nodo = (g, tipo) => g.find((n) => n["@type"] === tipo);
const textoPlano = (html) => html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
const migasVisibles = (rel) => {
  const nav = leer(rel).match(/<nav class="contenedor migas"[\s\S]*?<\/nav>/)?.[0] ?? "";
  return [...nav.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(([, li]) => textoPlano(li));
};

test("cada página indexable declara la empresa y el sitio, y buscar y 404 no declaran nada", () => {
  const indexables = ["index.html", "contacto.html", ...categorias.map((c) => `${c.slug}.html`), ...fichas.map((p) => `productos/${p.id}.html`)];
  for (const rel of indexables) {
    const g = grafo(rel);
    assert.equal(nodo(g, "Organization")?.telephone, sitio.telefono_tel, rel);
    assert.equal(nodo(g, "WebSite")?.url, `${sitio.url}/`, rel);
  }
  for (const rel of ["buscar.html", "404.html"]) assert.doesNotMatch(leer(rel), /application\/ld\+json/, rel);
});

test("el Product de cada ficha repite el título, la marca, el modelo y las especificaciones visibles, sin precio", () => {
  for (const p of fichas) {
    const rel = `productos/${p.id}.html`;
    const prod = nodo(grafo(rel), "Product");
    assert.equal(prod.name, textoPlano(leer(rel).match(/<h1>([\s\S]*?)<\/h1>/)[1]), rel);
    assert.equal(prod.brand?.name, p.marca === "Genérica" ? undefined : p.marca, rel);
    assert.equal(prod.model, p.modelo, rel);
    assert.equal(prod.additionalProperty?.length ?? 0, p.specs.length, rel);
    assert.equal(prod.offers, undefined, `${rel}: sin precio no va Offer`);
    assert.match(prod.image[0], /^https:\/\/www\.lmindustrial\.com\.ar\/img\/opt\/.+\.jpeg$/, rel);
    assert.ok(existsSync(path.join(SITE, new URL(prod.image[0]).pathname)), `${rel}: la imagen declarada existe`);
  }
});

test("las migas declaradas son las mismas que se ven", () => {
  const conMigas = ["contacto.html", ...categorias.map((c) => `${c.slug}.html`), ...fichas.map((p) => `productos/${p.id}.html`)];
  for (const rel of conMigas) {
    const lista = nodo(grafo(rel), "BreadcrumbList").itemListElement;
    assert.deepEqual(lista.map((m) => m.name), migasVisibles(rel), rel);
    assert.equal(lista.at(-1).item, undefined, `${rel}: la página actual va sin URL`);
  }
});

test("cada categoría lista en sus datos estructurados lo mismo que muestra su grilla", () => {
  for (const c of categorias) {
    const rel = `${c.slug}.html`;
    const html = leer(rel);
    const tarjetas = (html.match(/class="tarjeta(?:-categoria)?"/g) ?? []).length;
    const esperadas = c.productos.length ? (html.match(/class="tarjeta"/g) ?? []).length : tarjetas;
    assert.equal(nodo(grafo(rel), "CollectionPage").mainEntity.numberOfItems, esperadas, rel);
  }
});

test("cada categoría tiene un párrafo propio debajo del título", () => {
  for (const c of categorias) {
    assert.ok(c.intro?.length >= 80, `${c.slug}: intro`);
    assert.match(leer(`${c.slug}.html`), /<h1>[^<]+<\/h1>\s*<p class="intro">/, `${c.slug}: el párrafo va debajo del h1`);
  }
});

test("el pie de todas las páginas nombra en texto las mismas marcas que muestra el carrusel", () => {
  const esperado = `Marcas que comercializamos: ${sitio.marcas.map((m) => m.nombre).join(" · ")}`;
  for (const rel of paginas) {
    const parrafo = leer(rel).match(/<p class="pie__marcas">([\s\S]*?)<\/p>/)?.[1];
    assert.equal(parrafo && textoPlano(parrafo), esperado, rel);
  }
});

test("Empresa y Privacidad existen, están en el sitemap y se enlazan desde el pie de todas las páginas", () => {
  const mapa = leer("sitemap.xml");
  for (const rel of ["empresa.html", "privacidad.html"]) {
    assert.ok(existsSync(path.join(SITE, rel)), rel);
    assert.match(mapa, new RegExp(`<loc>${sitio.url}/${rel}</loc>`), `${rel} en el sitemap`);
  }
  for (const rel of paginas) {
    const pie = leer(rel).match(/<footer class="pie">[\s\S]*<\/footer>/)?.[0] ?? "";
    assert.match(pie, /href="\/empresa\.html"/, rel);
    assert.match(pie, /href="\/privacidad\.html"/, rel);
    assert.match(pie, new RegExp(`href="${sitio.instagram}"`), rel);
    assert.ok(pie.includes(`href="${sitio.google_maps}"`), `${rel}: Google Maps en el pie`);
  }
});

test("Empresa muestra los datos que declara la Organization (razón social, CUIT, localidad, Instagram), sin dirección", () => {
  const html = leer("empresa.html");
  for (const dato of [sitio.razon_social, sitio.cuit, sitio.localidad, `@${sitio.instagram_usuario}`]) assert.ok(html.includes(dato), dato);
  const org = nodo(grafo("empresa.html"), "Organization");
  assert.equal(org.legalName, sitio.razon_social);
  assert.equal(org.taxID, sitio.cuit);
  assert.deepEqual(org.sameAs, [sitio.instagram, sitio.google_maps]);
  assert.deepEqual(Object.keys(org.address).sort(), ["@type", "addressCountry", "addressLocality", "addressRegion"], "sin calle ni código postal");
  assert.equal(nodo(grafo("empresa.html"), "AboutPage")?.about["@id"], org["@id"]);
});

test("la política de privacidad nombra al responsable e incluye la leyenda de la Ley 25.326", () => {
  const html = leer("privacidad.html");
  assert.ok(html.includes(sitio.razon_social) && html.includes(sitio.cuit));
  assert.match(html, /artículo 14, inciso 3 de la Ley N° 25\.326/);
  assert.match(html, /Agencia de Acceso a la Información Pública/);
});

test("títulos y descripciones de categoría con largo razonable, únicos y sin cortes a mitad de frase", () => {
  const titulos = new Set(), descripciones = new Set();
  for (const c of categorias) {
    assert.ok(c.titulo_seo.length >= 30 && c.titulo_seo.length <= 70, `${c.slug}: título de ${c.titulo_seo.length}`);
    assert.ok(c.descripcion_seo.length >= 70 && c.descripcion_seo.length <= 160, `${c.slug}: descripción de ${c.descripcion_seo.length}`);
    assert.doesNotMatch(c.descripcion_seo, /…$/, c.slug);
    titulos.add(c.titulo_seo); descripciones.add(c.descripcion_seo);
  }
  assert.equal(titulos.size, categorias.length, "títulos únicos");
  assert.equal(descripciones.size, categorias.length, "descripciones únicas");
});

test("la descripción de cada ficha empieza por marca (y modelo) y no pasa de 160 caracteres", () => {
  for (const p of fichas) {
    const d = leer(`productos/${p.id}.html`).match(/<meta name="description" content="([^"]*)"/)[1];
    assert.ok(textoPlano(d).startsWith(mensajeProducto(p).replace("Hola, quiero consultar por ", "").split(" – ")[0] + ":"), p.id);
    assert.ok(textoPlano(d).length <= 160, `${p.id}: ${d.length}`);
  }
});

test("vista previa al compartir en todas las páginas: título, descripción, URL canónica e imagen absoluta que existe", () => {
  for (const rel of paginas) {
    const html = leer(rel);
    const meta = (prop) => html.match(new RegExp(`<meta property="${prop}" content="([^"]*)"`))?.[1];
    assert.equal(meta("og:title"), html.match(/<title>([^<]*)<\/title>/)[1], rel);
    assert.equal(meta("og:description"), html.match(/<meta name="description" content="([^"]*)"/)[1], rel);
    assert.equal(meta("og:url"), html.match(/<link rel="canonical" href="([^"]*)"/)[1], rel);
    const imagen = meta("og:image");
    assert.match(imagen ?? "", /^https:\/\/www\.lmindustrial\.com\.ar\//, rel);
    assert.ok(existsSync(path.join(SITE, new URL(imagen).pathname)), `${rel}: ${imagen}`);
  }
});

test("la foto de portada viene en varios anchos y con prioridad; solo la primera tarjeta de cada grilla no espera", () => {
  const portada = leer("index.html").match(/<div class="portada__fondo">([\s\S]*?)<\/div>/)[1];
  assert.match(portada, /fetchpriority="high"/);
  assert.match(portada, /srcset="[^"]*480w[^"]*768w[^"]*1024w[^"]*1600w"/);
  assert.doesNotMatch(portada, /loading="lazy"/);
  for (const c of categorias) {
    const grilla = leer(`${c.slug}.html`).match(/<div class="grilla [^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<h2|<p class="filtros__vacio"|<\/section>|\s*\{)/)?.[1] ?? "";
    const imgs = [...grilla.matchAll(/<img [^>]*>/g)].map(([t]) => t);
    imgs.slice(0, 1).forEach((t) => assert.doesNotMatch(t, /loading="lazy"/, `${c.slug}: primera tarjeta`));
    imgs.slice(1).forEach((t) => assert.match(t, /loading="lazy"/, `${c.slug}: las demás esperan a entrar en pantalla`));
  }
});

test("el título de cada ficha empieza por marca y modelo, y suma el sitio solo si entra en 65 caracteres", () => {
  for (const p of fichas) {
    const titulo = textoPlano(leer(`productos/${p.id}.html`).match(/<title>([^<]*)<\/title>/)[1]);
    const marcaModelo = mensajeProducto(p).replace("Hola, quiero consultar por ", "").split(" – ")[0];
    assert.ok(titulo.startsWith(`${marcaModelo}: ${p.nombre}`), `${p.id}: ${titulo}`);
    if (titulo.endsWith("| LM Industrial")) assert.ok(titulo.length <= 65, `${p.id}: ${titulo.length}`);
  }
});

test("Google Analytics se pide recién con la página cargada", () => {
  const html = leer("index.html");
  assert.doesNotMatch(html, /<script async src="https:\/\/www\.googletagmanager\.com/);
});
