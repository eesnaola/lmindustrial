# Rediseño lmindustrial.com.ar — Fase 1: base del sitio nuevo y Válvulas esféricas

> **Para agentes:** SUB-SKILL REQUERIDA: usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** Publicar en un sitio de prueba (no indexable) el sitio nuevo completo en estructura, con las 54 categorías, y con Válvulas esféricas y sus comandos terminados (18 fichas de producto), para que el cliente apruebe el diseño real.

**Arquitectura:** Generador estático Eleventy 3 con plantillas Nunjucks. Los datos salen de dos JSON (`categorias.json`, `productos.json`), generados una vez desde el HTML del sitio actual y después curados a mano. La lógica pura (inventario, catálogo, verificación de fichas) vive en `lib/` y tiene pruebas con `node:test`. Pagefind genera el buscador estático. Se publica en S3 + CloudFront en la cuenta AWS de LM Industrial.

**Tecnología:** Node 26, Eleventy 3.1.6, @11ty/eleventy-img 7.0.0, Pagefind 1.5.2, @fontsource/ibm-plex-sans 5.3.0, puppeteer-core 25.12.0 (usa el Chrome instalado), AWS CLI v2 (perfil `lmindustrial`), pdftotext/pdftoppm (poppler), ImageMagick.

**Spec:** `docs/superpowers/specs/2026-09-26-rediseno-sitio-design.md`

**Precisiones sobre el spec** (decididas al planificar; no cambian lo acordado con el cliente):
- `categorias[].productos` referencia productos por su ruta de PDF (clave estable), no por `id`. El `id` es el slug de la URL y solo existe cuando el producto tiene ficha.
- En esta fase, los productos sin ficha (`ficha: false`) muestran su tarjeta con "Ficha PDF", que abre el PDF directamente. Las fases 2 y 3 completan el resto.
- Los filtros usan un campo curado `filtros: { material, conexion }` con valores cortos ("Inox", "Roscada"), en vez de derivarse del texto de `specs`.
- Las fichas de PDFs escaneados, y las que no pasan la verificación automática, se aprueban con `revision_manual: "ok"` después de revisarlas contra el PDF.
- La función `lmindustrial-redirect-www` se comparte entre prueba y producción. Agregarle las 3 redirecciones `Genebre-…` afecta también a la distribución de producción, que todavía no sirve el dominio.

## Restricciones globales

- **Carpeta del proyecto:** `/Users/ezequiel/Downloads/lm/sitio-nuevo/`. El sitio viejo (`lm/*.html`, `lm/catalogos/`, `lm/img/`) no se modifica.
- **Módulos:** ESM (`"type": "module"` en `package.json`). Sin él, Eleventy no carga `eleventy.config.js`.
- **Imágenes:** `@11ty/eleventy-img` 7 se importa como `import Image from "@11ty/eleventy-img"` (el `Image` nombrado es una clase y falla).
- **Bucles con fotos:** todo bucle cuyo cuerpo use el shortcode `{% foto %}` (directo o vía `include`) debe ser `{% asyncEach x in lista %}…{% endeach %}`. Un `{% for %}` común lo deja vacío **sin error**.
- **Enlaces internos:** siempre absolutos (`/valvula-esferica.html`, `/catalogos/...`).
- **AWS:** siempre `AWS_PROFILE=lmindustrial` (cuenta `318986392550`). Nunca el perfil `default` (es la cuenta de Finet).
- **Git:** nada de `git init`, `git add` ni `git commit` (preferencia del usuario). Donde un plan normal diría "commit", acá hay un **punto de control** que corre las pruebas.
- **Textos:** español rioplatense. Decir "Marcas que comercializamos", **nunca** "distribuidor oficial". Sin precios, stock, plazos ni dirección física.
- **Contacto:** WhatsApp `5491131809499` (se muestra "11 3180-9499"), `tel:+5491131809499`, `info@lmindustrial.com.ar`, "Envíos a todo el país".
- **Colores:** `#135a56` primario, `#104a47` primario oscuro, `#f5f7f7` fondo, `#ffffff` superficie, `#1d2324` texto, `#4a5556` texto secundario, `#e0e6e6` bordes. Tipografía IBM Plex Sans 400/600/700 autoalojada.
- **URLs:**
  - Categorías: `/{slug}.html`, idénticas a las actuales.
  - Productos: `/productos/{id}.html`, con `id = slugificar(marca + " " + modelo + " " + nombre)`.
  - PDFs: `/catalogos/...`, misma ruta que hoy.
  - Canónica: `https://www.lmindustrial.com.ar` + ruta.
- **Sitio de prueba nunca indexable:** `<meta name="robots" content="noindex, nofollow">`, encabezado `X-Robots-Tag: noindex, nofollow` y `robots.txt` con `Disallow: /`.
- **Fichas:** solo datos presentes en el PDF.

## Foco de revisión

Casos que el spec implica y que un usuario va a encontrar. Cada uno tiene su prueba en la tarea que lo implementa:

1. **Búsqueda sin acentos o en mayúsculas** ("valvula esferica", "ESFÉRICA"): tiene que encontrar lo mismo que con acentos. → Tarea 11, `tests/navegador.mjs`.
2. **Nombres con comillas de pulgada, barras, acentos y guiones largos** (`1/2"`, `–`, `á`): el mensaje de WhatsApp tiene que llegar legible y el HTML no se tiene que romper. → Tarea 3 (`urlWhatsapp`) y Tarea 8 (prueba del mensaje en cada ficha).
3. **Celular de 390 px con nombres largos y tablas de especificaciones:** sin scroll horizontal en ninguna ficha ni categoría. → Tarea 11.
4. **Sin JavaScript** (bloqueado o sin cargar): no aparecen botones de filtro muertos, y el menú de celular funciona igual. → Tarea 7 (filtros ocultos por defecto, menú con `<details>`) y Tarea 11.
5. **Enlaces viejos desde Google, WhatsApp o mails** (las 55 páginas, los PDFs y las `Genebre-…`): siguen funcionando. → Tarea 6 (55 URLs) y Tarea 13 (301 en CloudFront).

---

### Tarea 1: Proyecto base y utilidades de texto

**Archivos:**
- Crear: `sitio-nuevo/package.json`, `sitio-nuevo/eleventy.config.js`, `sitio-nuevo/README.md`
- Crear: `sitio-nuevo/lib/texto.js`
- Prueba: `sitio-nuevo/tests/unit/texto.test.js`

**Interfaces:**
- Produce: `slugificar(texto: string): string`, `oracion(texto: string, marcas?: string[]): string`, `recortar(texto: string, n = 155): string`.

- [ ] **Paso 1: Crear `package.json` e instalar**

```json
{
  "name": "lmindustrial-sitio",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "rm -rf _site && eleventy && pagefind --site _site",
    "dev": "eleventy --serve",
    "test": "node --test \"tests/unit/*.test.js\"",
    "test:sitio": "node --test \"tests/sitio/*.test.js\"",
    "test:navegador": "node tests/navegador.mjs",
    "capturas": "node tests/capturas.mjs",
    "inventario": "node scripts/inventario.js",
    "verificar-fichas": "node scripts/verificar-fichas.js"
  },
  "devDependencies": {
    "@11ty/eleventy": "3.1.6",
    "@11ty/eleventy-img": "7.0.0",
    "@fontsource/ibm-plex-sans": "5.3.0",
    "pagefind": "1.5.2",
    "puppeteer-core": "25.12.0"
  }
}
```

Correr: `cd /Users/ezequiel/Downloads/lm/sitio-nuevo && npm install`
Esperado: termina sin errores; `node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2` existe.

- [ ] **Paso 2: Escribir la prueba que falla**

`tests/unit/texto.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { slugificar, oracion, recortar } from "../../lib/texto.js";

test("slugificar quita acentos, símbolos y espacios", () => {
  assert.equal(slugificar("Genebre 2025 Válvula esférica inox 3 piezas, roscada"), "genebre-2025-valvula-esferica-inox-3-piezas-roscada");
  assert.equal(slugificar('Ñandú 1/2" PN16'), "nandu-1-2-pn16");
  assert.equal(slugificar("  --Hola--  "), "hola");
});

test("oracion pasa a minúscula salvo la primera letra, siglas, números y marcas", () => {
  assert.equal(oracion("Válvula Esférica Inox Roscada"), "Válvula esférica inox roscada");
  assert.equal(oracion("Válvula Esférica Latón ISO-5211"), "Válvula esférica latón ISO-5211");
  assert.equal(oracion("Válvula Esférica Inox 2000 WOG"), "Válvula esférica inox 2000 WOG");
  assert.equal(oracion("Válvula Esférica Intor", ["Intor"]), "Válvula esférica Intor");
  assert.equal(oracion("Presostato Fantini Cosmi", ["Fantini Cosmi"]), "Presostato Fantini Cosmi");
});

test("recortar corta en una palabra y agrega puntos suspensivos", () => {
  assert.equal(recortar("corto", 155), "corto");
  assert.equal(recortar("uno dos tres cuatro", 10), "uno dos…");
  assert.equal(recortar("unapalabralarguísima", 8), "unapala…");
});
```

- [ ] **Paso 3: Correr la prueba y ver que falla**

Correr: `npm test`
Esperado: FAIL con `Cannot find module '.../lib/texto.js'`.

- [ ] **Paso 4: Implementar `lib/texto.js`**

```js
export function slugificar(texto) {
  return texto
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function oracion(texto, marcas = []) {
  const palabrasDeMarca = new Map(marcas.flatMap((m) => m.split(" ")).map((p) => [p.toLowerCase(), p]));
  return texto.trim().split(/\s+/).map((palabra, i) => {
    const marca = palabrasDeMarca.get(palabra.toLowerCase());
    if (marca) return marca;
    const esSigla = palabra.length > 1 && palabra === palabra.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(palabra);
    if (/\d/.test(palabra) || esSigla) return palabra;
    const minuscula = palabra.toLowerCase();
    return i === 0 ? minuscula[0].toUpperCase() + minuscula.slice(1) : minuscula;
  }).join(" ");
}

export function recortar(texto, n = 155) {
  if (texto.length <= n) return texto;
  const corte = texto.lastIndexOf(" ", n - 1);
  return texto.slice(0, corte > 0 ? corte : n - 1).replace(/[\s,;:.–-]+$/, "") + "…";
}
```

- [ ] **Paso 5: Correr la prueba y ver que pasa**

Correr: `npm test`
Esperado: `# pass 3`, `# fail 0`.

- [ ] **Paso 6: Crear `eleventy.config.js` y una página mínima de humo**

`eleventy.config.js`:
```js
import path from "node:path";
import { fileURLToPath } from "node:url";
import Image from "@11ty/eleventy-img";
import { recortar } from "./lib/texto.js";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, "..");

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ [path.join(RAIZ, "img")]: "img" });
  for (const peso of [400, 600, 700]) {
    eleventyConfig.addPassthroughCopy({
      [`node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-${peso}-normal.woff2`]: `assets/fuentes/plex-${peso}.woff2`,
    });
  }

  eleventyConfig.addAsyncShortcode("foto", async (src, alt, ancho = 250) => {
    const meta = await Image(path.join(RAIZ, src), {
      widths: [ancho],
      formats: ["webp", "jpeg"],
      outputDir: path.join(AQUI, "_site/img/opt/"),
      urlPath: "/img/opt/",
    });
    return Image.generateHTML(meta, { alt, loading: "lazy", decoding: "async" });
  });

  eleventyConfig.addFilter("recortar", recortar);

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    templateFormats: ["njk"],
    htmlTemplateEngine: "njk",
  };
}
```

Página de humo `src/humo.njk` (se borra en el paso 8):
```njk
---
permalink: "humo.html"
---
<p>ok</p>{% foto "img/iconos/VEInRo.jpg", "prueba" %}
```

Crear la carpeta vacía `src/assets/` (con un archivo `src/assets/.keep` vacío) para que el passthrough no falle.

- [ ] **Paso 7: Compilar y verificar**

Correr: `npx @11ty/eleventy && ls _site/img/opt _site/assets/fuentes && grep -c "<picture>" _site/humo.html`
Esperado: dos archivos `*-250.webp` y `*-250.jpeg`; `plex-400.woff2 plex-600.woff2 plex-700.woff2`; `1`.

- [ ] **Paso 8: Limpiar la página de humo y escribir el README**

Borrar `src/humo.njk`. Crear `README.md`:
```markdown
# Sitio nuevo de LM Industrial

Generado con Eleventy. Los datos están en `src/_data/categorias.json` y `src/_data/productos.json`.

- `npm run dev`: servidor local con recarga (sin buscador).
- `npm run build`: genera `_site/` y el índice del buscador. Por defecto es la versión de prueba; `SITIO=produccion npm run build` genera la de producción.
- `npm test`: pruebas de lógica y datos. `npm run test:sitio`: pruebas del sitio generado. `npm run test:navegador`: buscador, filtros y celular en Chrome.
- `npm run verificar-fichas`: compara los números de cada ficha con su PDF.
- `./deploy.sh prueba`: publica en el sitio de prueba. `./deploy.sh produccion --confirmar`: publica en producción.
- Todo lo de AWS usa el perfil `lmindustrial` (cuenta 318986392550).
```

- [ ] **Paso 9: Punto de control**

Correr: `npm test && npx @11ty/eleventy`
Esperado: pruebas en verde; la compilación escribe 0 páginas sin errores.

---

### Tarea 2: Inventario del sitio actual → datos iniciales

**Archivos:**
- Crear: `sitio-nuevo/lib/inventario.js`, `sitio-nuevo/scripts/inventario.js`
- Prueba: `sitio-nuevo/tests/unit/inventario.test.js`
- Genera: `sitio-nuevo/src/_data/categorias.json`, `sitio-nuevo/src/_data/productos.json`

**Interfaces:**
- Consume: `oracion` (Tarea 1).
- Produce:
  - `construirInventario(paginas: Map<archivo, html>) → { categorias, productos, tarjetasNoReconocidas }`, `leerTarjetas(html)`, `marcaDesdeArchivo(pdf) → string|null`, `NOMBRES`, `MARCAS`.
  - Categoría: `{ slug, nombre, padre: slug|null, hijos: slug[], productos: pdf[], imagen, titulo_seo, descripcion_seo, intro: "", faqs: [] }`.
  - Producto sin ficha: `{ pdf, imagen, nombre, marca, categoria_principal, categorias: slug[], ficha: false }`.

- [ ] **Paso 1: Escribir la prueba que falla**

`tests/unit/inventario.test.js` (usa el HTML real del sitio actual):
```js
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
```

- [ ] **Paso 2: Correr y ver que falla**

Correr: `npm test`
Esperado: FAIL con `Cannot find module '.../lib/inventario.js'`.

- [ ] **Paso 3: Implementar `lib/inventario.js`**

```js
import { oracion } from "./texto.js";

export const NOMBRES = {
  "valvulas-industriales": "Válvulas industriales",
  "valvula-solenoide": "Válvulas a solenoide",
  "valvula-solenoide-laton": "Válvulas a solenoide de latón",
  "valvula-solenoide-laton-NC-AD": "Válvulas a solenoide de latón NC de acción directa",
  "valvula-solenoide-laton-NC-AI": "Válvulas a solenoide de latón NC de acción indirecta",
  "valvula-solenoide-laton-NA-AD": "Válvulas a solenoide de latón NA de acción directa",
  "valvula-solenoide-laton-NA-AI": "Válvulas a solenoide de latón NA de acción indirecta",
  "valvula-solenoide-inox": "Válvulas a solenoide de acero inoxidable",
  "valvula-solenoide-inox-NC-AD": "Válvulas a solenoide inox NC de acción directa",
  "valvula-solenoide-inox-NA-AD": "Válvulas a solenoide inox NA de acción directa",
  "valvula-solenoide-vapor": "Válvulas a solenoide para vapor",
  "valvula-esferica": "Válvulas esféricas",
  "valvula-esferica-comandos": "Comandos manuales y accesorios para válvulas esféricas",
  "valvula-mariposa": "Válvulas mariposa",
  "actuador-rotante": "Actuadores rotantes",
  "actuador-rotante-accesorios": "Accesorios para actuador rotante",
  "valvula-de-asiento-inclinado": "Válvulas de asiento inclinado",
  "valvula-de-retencion": "Válvulas de retención",
  "valvula-esclusa": "Válvulas esclusa",
  "valvula-globo": "Válvulas globo",
  "valvula-de-control": "Válvulas de control",
  "valvula-aguja": "Válvulas aguja",
  "valvula-reductora-de-presion": "Válvulas reductoras de presión",
  "valvula-de-alivio": "Válvulas de alivio",
  "valvula-de-equilibrado": "Válvulas de equilibrado",
  "accesorios-para-valvulas": "Accesorios para válvulas",
  "vapor": "Vapor",
  "valvula-esferica-vapor": "Válvulas esféricas para vapor",
  "valvula-mariposa-vapor": "Válvulas mariposa para vapor",
  "valvula-de-retencion-vapor": "Válvulas de retención para vapor",
  "valvula-esclusa-vapor": "Válvulas esclusa para vapor",
  "valvula-globo-vapor": "Válvulas globo para vapor",
  "purgador-para-vapor": "Purgadores para vapor",
  "valvula-reductora-de-presion-vapor": "Válvulas reductoras de presión para vapor",
  "control-de-quemadores": "Control de quemadores",
  "valvula-solenoide-gas": "Válvulas a solenoide para gas",
  "control-llama": "Controles de llama",
  "detector-llama": "Detectores de llama",
  "presostato-trans": "Presostatos y transmisores de presión",
  "termostato": "Termostatos y controladores de temperatura",
  "actuador-damper": "Actuadores eléctricos para dampers",
  "automatizacion-neumatica": "Automatización neumática",
  "valvula-neumatica": "Válvulas neumáticas",
  "actuador-neumatico": "Actuadores neumáticos",
  "conector-neumatico": "Conectores y accesorios neumáticos",
  "vibrador-neumatico": "Vibradores neumáticos",
  "vacio": "Componentes para vacío",
  "sensor-proximidad": "Sensores de proximidad",
  "instrumentos-de-medicion": "Instrumentos de medición",
  "presion": "Medición de presión",
  "nivel": "Medición de nivel",
  "caudal": "Medición de caudal",
  "temperatura": "Medición de temperatura",
  "anti-incendio": "Anti incendio",
};

const MARCAS_ARCHIVO = [
  ["FANTINI-COSMI", "Fantini Cosmi"], ["GENEBRE", "Genebre"], ["INTOR", "Intor"], ["BRAHMA", "Brahma"],
  ["HONEYWELL", "Honeywell"], ["SATRONIC", "Satronic"], ["SIEMENS", "Siemens"], ["DANFOSS", "Danfoss"],
  ["DUNGS", "Dungs"], ["NOVUS", "Novus"], ["MADAS", "Madas"], ["THERMOVAL", "Thermoval"], ["ALRE", "ALRE"],
  ["INSTRUBIT", "Instrubit"], ["KONNEN", "Konnen"], ["ODE", "ODE"], ["EUROCONTROL", "Eurocontrol"],
  ["DWYER", "Dwyer"], ["GRISWOLD", "Griswold"], ["RESIDEO", "Resideo"],
];
export const MARCAS = MARCAS_ARCHIVO.map(([, nombre]) => nombre);

const TARJETA = /class="team-member">\s*<a href="([^"]+)"><img src="([^"]+)"[^>]*>(?:<\/img>)?<\/a>\s*<h3[^>]*>([\s\S]*?)<\/h3>/g;

export function leerTarjetas(html) {
  return [...html.matchAll(TARJETA)].map(([, href, imagen, h3]) => ({
    href,
    imagen,
    etiqueta: h3.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(),
  }));
}

function metaDescripcion(html) {
  return html.match(/<meta name="description" content="([^"]*)"/)?.[1].trim() ?? "";
}

export function marcaDesdeArchivo(pdf) {
  const base = pdf.split("/").pop().replace(/\.pdf$/i, "").toUpperCase();
  const partes = base.split(/[-_]/);
  for (const [clave, nombre] of MARCAS_ARCHIVO) if (base.startsWith(`${clave}-`)) return nombre;
  for (const [clave, nombre] of MARCAS_ARCHIVO) if (partes.includes(clave)) return nombre;
  return null;
}

export function construirInventario(paginas) {
  const tarjetas = new Map();
  let tarjetasNoReconocidas = 0;
  for (const [archivo, html] of paginas) {
    const lista = leerTarjetas(html);
    tarjetas.set(archivo, lista);
    tarjetasNoReconocidas += (html.match(/class="team-member"/g) ?? []).length - lista.length;
  }

  const categorias = new Map();
  const productos = new Map();
  const visitadas = new Set();
  const agregar = (lista, valor) => { if (!lista.includes(valor)) lista.push(valor); };

  function visitar(archivo) {
    visitadas.add(archivo);
    const actual = archivo === "index.html" ? null : archivo.replace(/\.html$/, "");
    for (const t of tarjetas.get(archivo) ?? []) {
      if (t.href.endsWith(".html")) {
        if (!paginas.has(t.href)) throw new Error(`${archivo} enlaza a ${t.href}, que no existe`);
        const slug = t.href.replace(/\.html$/, "");
        if (!categorias.has(slug)) {
          const nombre = NOMBRES[slug];
          if (!nombre) throw new Error(`Falta el nombre de la categoría "${slug}" en NOMBRES`);
          categorias.set(slug, {
            slug, nombre, padre: actual, hijos: [], productos: [], imagen: t.imagen,
            titulo_seo: `${nombre} | LM Industrial`,
            descripcion_seo: metaDescripcion(paginas.get(t.href)),
            intro: "", faqs: [],
          });
        }
        if (actual) agregar(categorias.get(actual).hijos, slug);
        if (!visitadas.has(t.href)) visitar(t.href);
      } else if (t.href.endsWith(".pdf")) {
        if (!actual) throw new Error(`El inicio enlaza a un PDF: ${t.href}`);
        if (!productos.has(t.href)) {
          productos.set(t.href, {
            pdf: t.href, imagen: t.imagen, nombre: oracion(t.etiqueta, MARCAS),
            marca: marcaDesdeArchivo(t.href), categoria_principal: actual, categorias: [], ficha: false,
          });
        }
        agregar(productos.get(t.href).categorias, actual);
        agregar(categorias.get(actual).productos, t.href);
      } else {
        throw new Error(`${archivo}: tarjeta con enlace desconocido ${t.href}`);
      }
    }
  }

  visitar("index.html");
  return { categorias: [...categorias.values()], productos: [...productos.values()], tarjetasNoReconocidas };
}
```

- [ ] **Paso 4: Correr y ver que pasa**

Correr: `npm test`
Esperado: todas en verde. Si falla "encuentra 54 categorías y 261 productos" o "reconoce todas las tarjetas", revisar la expresión `TARJETA` contra el HTML de la página que figure en el error, no los números esperados: vienen de un relevamiento independiente.

- [ ] **Paso 5: Script que genera los datos**

`scripts/inventario.js`:
```js
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
```

Correr: `npm run inventario`
Esperado: `54 categorías y 261 productos escritos en src/_data/`. Correrlo otra vez tiene que fallar con "ya existe".

- [ ] **Paso 6: Punto de control**

Correr: `npm test`
Esperado: todo en verde.

---

### Tarea 3: Catálogo (consultas sobre los datos) y datos del sitio

**Archivos:**
- Crear: `sitio-nuevo/lib/catalogo.js`, `sitio-nuevo/src/_data/catalogo.js`, `sitio-nuevo/src/_data/sitio.js`
- Modificar: `sitio-nuevo/eleventy.config.js` (registrar filtros)
- Prueba: `sitio-nuevo/tests/unit/catalogo.test.js`

**Interfaces:**
- Consume: la forma de categoría y producto de la Tarea 2.
- Produce:
  - `crearCatalogo(categorias, productos)` → objeto con:
    - `fichas: Producto[]`, `categoria(slug)`, `raices()`, `hijos(slug)`, `productos(slug)`.
    - `migas(slug)` y `migasProducto(p)`, que devuelven `[{nombre, url}]`.
    - `relacionados(p, n=4)` y `facetas(slug)`, que devuelve `[{clave, titulo, valores[]}]`.
    - Sin `this`: se llaman desde Nunjucks.
  - Funciones sueltas `urlProducto(p)`, `urlWhatsapp(numero, texto)`, `mensajeProducto(p)` y `destacados(p) → spec[]`.
  - Filtros Nunjucks con esos mismos nombres, más `recortar`.
  - Datos globales `catalogo` y `sitio`.

- [ ] **Paso 1: Escribir la prueba que falla**

`tests/unit/catalogo.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { crearCatalogo, urlProducto, urlWhatsapp, mensajeProducto, destacados } from "../../lib/catalogo.js";

const categorias = [
  { slug: "raiz", nombre: "Raíz", padre: null, hijos: ["hija"], productos: [], imagen: "a.jpg" },
  { slug: "hija", nombre: "Hija", padre: "raiz", hijos: [], productos: ["c/a.pdf", "c/b.pdf", "c/c.pdf", "c/d.pdf", "c/e.pdf", "c/f.pdf"], imagen: "b.jpg" },
];
const P = (pdf, extra = {}) => ({ pdf, imagen: "x.jpg", nombre: `Producto ${pdf}`, marca: "Genebre", ficha: false, categoria_principal: "hija", categorias: ["hija"], ...extra });
const productos = [
  P("c/a.pdf", { ficha: true, id: "a", modelo: "2025", filtros: { material: "Inox", conexion: "Roscada" }, specs: [{ clave: "Material", valor: "Inox" }], destacados: ["Material", "Inexistente"] }),
  P("c/b.pdf", { ficha: true, id: "b", modelo: "2034", filtros: { material: "Acero carbono", conexion: "Roscada" } }),
  P("c/c.pdf", { ficha: true, id: "c", modelo: "2027", filtros: { material: "Inox", conexion: "Roscada" } }),
  P("c/d.pdf"), P("c/e.pdf"), P("c/f.pdf"),
];
const cat = crearCatalogo(categorias, productos);

test("raíces, hijos y productos en orden", () => {
  assert.deepEqual(cat.raices().map((c) => c.slug), ["raiz"]);
  assert.deepEqual(cat.hijos("raiz").map((c) => c.slug), ["hija"]);
  assert.deepEqual(cat.productos("hija").map((p) => p.pdf), ["c/a.pdf", "c/b.pdf", "c/c.pdf", "c/d.pdf", "c/e.pdf", "c/f.pdf"]);
  assert.deepEqual(cat.fichas.map((p) => p.id), ["a", "b", "c"]);
});

test("migas de categoría y de producto", () => {
  assert.deepEqual(cat.migas("hija"), [
    { nombre: "Inicio", url: "/" }, { nombre: "Raíz", url: "/raiz.html" }, { nombre: "Hija", url: "/hija.html" },
  ]);
  assert.deepEqual(cat.migasProducto(productos[0]).at(-1), { nombre: "Producto c/a.pdf", url: "/productos/a.html" });
});

test("urlProducto: con ficha va a su página; sin ficha, al PDF", () => {
  assert.equal(urlProducto(productos[0]), "/productos/a.html");
  assert.equal(urlProducto(productos[3]), "/c/d.pdf");
});

test("facetas: solo con 6+ productos y 2+ valores; ignora productos sin ficha", () => {
  assert.deepEqual(cat.facetas("hija"), [{ clave: "material", titulo: "Material", valores: ["Acero carbono", "Inox"] }]);
  assert.deepEqual(cat.facetas("raiz"), []);
});

test("relacionados: misma categoría principal, con ficha, sin el propio", () => {
  assert.deepEqual(cat.relacionados(productos[0]).map((p) => p.id), ["b", "c"]);
});

test("destacados ignora claves que no están en specs", () => {
  assert.deepEqual(destacados(productos[0]), [{ clave: "Material", valor: "Inox" }]);
  assert.deepEqual(destacados(productos[3]), []);
});

test("WhatsApp codifica acentos, comillas de pulgada, barras y guiones largos", () => {
  assert.equal(
    urlWhatsapp("5491131809499", 'Hola, quiero consultar por Genebre 2025 – Válvula 1/2" inox'),
    "https://wa.me/5491131809499?text=Hola%2C%20quiero%20consultar%20por%20Genebre%202025%20%E2%80%93%20V%C3%A1lvula%201%2F2%22%20inox",
  );
  assert.equal(mensajeProducto(productos[0]), "Hola, quiero consultar por Genebre 2025 – Producto c/a.pdf");
});

test("una categoría inexistente da un error claro", () => {
  assert.throws(() => cat.migas("no-existe"), /Categoría inexistente: no-existe/);
});
```

- [ ] **Paso 2: Correr y ver que falla**

Correr: `npm test`
Esperado: FAIL con `Cannot find module '.../lib/catalogo.js'`.

- [ ] **Paso 3: Implementar `lib/catalogo.js`**

```js
export const FACETAS = [["material", "Material"], ["conexion", "Conexión"]];

export function urlProducto(p) {
  return p.ficha ? `/productos/${p.id}.html` : `/${p.pdf}`;
}

export function urlWhatsapp(numero, texto) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

export function mensajeProducto(p) {
  return `Hola, quiero consultar por ${p.marca} ${p.modelo} – ${p.nombre}`;
}

export function destacados(p) {
  return (p.destacados ?? []).map((clave) => (p.specs ?? []).find((s) => s.clave === clave)).filter(Boolean);
}

export function crearCatalogo(categorias, productos) {
  const porSlug = new Map(categorias.map((c) => [c.slug, c]));
  const porPdf = new Map(productos.map((p) => [p.pdf, p]));

  const categoria = (slug) => {
    const c = porSlug.get(slug);
    if (!c) throw new Error(`Categoría inexistente: ${slug}`);
    return c;
  };
  const productosDe = (slug) => categoria(slug).productos.map((pdf) => {
    const p = porPdf.get(pdf);
    if (!p) throw new Error(`Producto inexistente: ${pdf} (en ${slug})`);
    return p;
  });
  const migas = (slug) => {
    const cadena = [];
    for (let c = categoria(slug); c; c = c.padre ? categoria(c.padre) : null) {
      cadena.unshift({ nombre: c.nombre, url: `/${c.slug}.html` });
    }
    return [{ nombre: "Inicio", url: "/" }, ...cadena];
  };

  return {
    fichas: productos.filter((p) => p.ficha),
    categoria,
    raices: () => categorias.filter((c) => c.padre === null),
    hijos: (slug) => categoria(slug).hijos.map(categoria),
    productos: productosDe,
    migas,
    migasProducto: (p) => [...migas(p.categoria_principal), { nombre: p.nombre, url: urlProducto(p) }],
    relacionados: (p, n = 4) => productosDe(p.categoria_principal).filter((o) => o.ficha && o.pdf !== p.pdf).slice(0, n),
    facetas: (slug) => {
      const lista = productosDe(slug);
      if (lista.length < 6) return [];
      return FACETAS.map(([clave, titulo]) => ({
        clave,
        titulo,
        valores: [...new Set(lista.filter((p) => p.ficha && p.filtros?.[clave]).map((p) => p.filtros[clave]))]
          .sort((a, b) => a.localeCompare(b, "es")),
      })).filter((f) => f.valores.length >= 2);
    },
  };
}
```

- [ ] **Paso 4: Correr y ver que pasa**

Correr: `npm test`
Esperado: todo en verde.

- [ ] **Paso 5: Datos globales para Eleventy**

`src/_data/catalogo.js` (lee con `readFileSync` para no quedar con una copia vieja en caché durante `--serve`):
```js
import { readFileSync } from "node:fs";
import { crearCatalogo } from "../../lib/catalogo.js";

const leer = (archivo) => JSON.parse(readFileSync(new URL(archivo, import.meta.url), "utf8"));

export default crearCatalogo(leer("./categorias.json"), leer("./productos.json"));
```

`src/_data/sitio.js`:
```js
export default {
  entorno: process.env.SITIO === "produccion" ? "produccion" : "prueba",
  url: "https://www.lmindustrial.com.ar",
  nombre: "LM Industrial",
  descripcion: "LM Industrial comercializa válvulas e insumos industriales en Argentina, con envíos a todo el país.",
  whatsapp: "5491131809499",
  telefono_visible: "11 3180-9499",
  telefono_tel: "+5491131809499",
  email: "info@lmindustrial.com.ar",
  envios: "Envíos a todo el país",
  ga4: "G-VMTZYT8BEQ",
  marcas: ["Genebre", "ODE", "Intor", "Eurocontrol", "Madas", "Thermoval", "Brahma", "Danfoss", "Honeywell",
    "Satronic", "Resideo", "Siemens", "ALRE", "Novus", "Fantini Cosmi", "Dwyer", "Griswold"],
};
```

En `eleventy.config.js`, agregar el import y los filtros (después del `addFilter("recortar", …)`):
```js
import { urlProducto, urlWhatsapp, mensajeProducto, destacados } from "./lib/catalogo.js";
// ...
  eleventyConfig.addFilter("urlProducto", urlProducto);
  eleventyConfig.addFilter("urlWhatsapp", urlWhatsapp);
  eleventyConfig.addFilter("mensajeProducto", mensajeProducto);
  eleventyConfig.addFilter("destacados", destacados);
```

- [ ] **Paso 6: Punto de control**

Correr: `npm test && npx @11ty/eleventy`
Esperado: pruebas en verde; compila sin errores (todavía no hay páginas).

---

### Tarea 4: Logo SVG y favicons

**Archivos:**
- Crear: `sitio-nuevo/src/_includes/parciales/logo.njk`, `sitio-nuevo/src/assets/img/favicon.svg`
- Generar: `sitio-nuevo/src/assets/img/favicon-32.png`, `sitio-nuevo/src/assets/img/apple-touch-icon.png`
- Borrar: `sitio-nuevo/src/assets/.keep`

**Interfaces:**
- Produce: `{% include "parciales/logo.njk" %}`, un SVG en línea que usa `currentColor`; el color lo pone el CSS. Su texto usa la tipografía de la página.

Geometría del isotipo, relevada del PNG original (`lm/img/logos/Logo_LM_transparente.png`) en una caja de 141×134:
- Pata izquierda de 22 de ancho, con degradé de 35 % a 100 % de opacidad.
- Base de 22 de alto, con la esquina inferior izquierda redondeada (radio 7).
- Pata derecha de 22 × 95.
- La "V" de la M baja desde la parte superior de ambas patas hasta un vértice redondeado en (70.5, 92).

- [ ] **Paso 1: Crear `parciales/logo.njk`**

```njk
<svg class="logo" viewBox="0 0 480 134" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="logo-degrade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="currentColor" stop-opacity=".35"/>
      <stop offset=".8" stop-color="currentColor" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <path d="M0 0h22v112H0z" fill="url(#logo-degrade)"/>
  <g fill="currentColor">
    <path d="M0 112h141v22H7a7 7 0 0 1-7-7z"/>
    <path d="M119 0h22v95h-22z"/>
    <path d="M0 0h22.7l47.8 60 47.8-60H141L74.5 87q-4 5.5-8 0z"/>
    <text x="165" y="60" font-size="50" font-weight="700" letter-spacing="1">LM</text>
    <text x="165" y="118" font-size="50" font-weight="400" letter-spacing="1">INDUSTRIAL</text>
  </g>
</svg>
```

- [ ] **Paso 2: Crear `src/assets/img/favicon.svg` (solo el isotipo)**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 153 146">
  <defs>
    <linearGradient id="d" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#135a56" stop-opacity=".35"/>
      <stop offset=".8" stop-color="#135a56"/>
    </linearGradient>
  </defs>
  <path d="M0 0h22v112H0z" fill="url(#d)"/>
  <g fill="#135a56">
    <path d="M0 112h141v22H7a7 7 0 0 1-7-7z"/>
    <path d="M119 0h22v95h-22z"/>
    <path d="M0 0h22.7l47.8 60 47.8-60H141L74.5 87q-4 5.5-8 0z"/>
  </g>
</svg>
```

- [ ] **Paso 3: Generar los PNG**

Correr:
```bash
cd /Users/ezequiel/Downloads/lm/sitio-nuevo/src/assets/img
magick -background none -density 600 favicon.svg -resize 32x32 favicon-32.png
magick -background white -density 600 favicon.svg -resize 140x140 -gravity center -extent 180x180 apple-touch-icon.png
rm -f ../.keep
```
Esperado: `favicon-32.png` (32×32, fondo transparente) y `apple-touch-icon.png` (180×180, fondo blanco). Verificar los tamaños con `magick identify favicon-32.png apple-touch-icon.png` y abrir `apple-touch-icon.png` con la herramienta Read. Si el degradé de la pata izquierda no se ve (algunos renderizadores de ImageMagick ignoran `stop-opacity`), generar los PNG con Chrome: `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --window-size=180,180 --default-background-color=ffffffff --screenshot=apple-touch-icon.png "file://$PWD/favicon.svg"` y reducir la copia de 32 px con `magick apple-touch-icon.png -resize 32x32 favicon-32.png`.

- [ ] **Paso 4: Comparar contra el original**

Crear `/private/tmp/claude-501/-Users-ezequiel-Downloads-lm/15430ed0-22f4-4972-a600-752e43000d6e/scratchpad/logo-comparacion.html` con este contenido:
```html
<!doctype html><meta charset="utf-8"><style>body{margin:0;display:flex;gap:40px;padding:30px;background:#135a56;color:#fff;font-family:"IBM Plex Sans",Arial}</style>
<img src="/Users/ezequiel/Downloads/lm/img/logos/Logo_LM_transparente.png" style="height:300px">
<div style="height:300px;width:600px">SVG_AQUI</div>
```
Reemplazar `SVG_AQUI` por el contenido de `logo.njk` (sin tocar el SVG). Capturar:
```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --allow-file-access-from-files --window-size=1100,380 --screenshot=/private/tmp/claude-501/-Users-ezequiel-Downloads-lm/15430ed0-22f4-4972-a600-752e43000d6e/scratchpad/logo-comparacion.png file:///private/tmp/claude-501/-Users-ezequiel-Downloads-lm/15430ed0-22f4-4972-a600-752e43000d6e/scratchpad/logo-comparacion.html
```
Abrir la captura con la herramienta Read y comparar el isotipo: proporciones de las patas, ángulo de la V, degradé y esquina redondeada.
- **Si el SVG difiere a simple vista:** ajustar las coordenadas del isotipo en `logo.njk` y `favicon.svg` (siempre los dos iguales) y repetir la captura.
- **El texto** va en otra tipografía a propósito; tiene que quedar alineado a la derecha del isotipo, "LM" arriba e "INDUSTRIAL" abajo, como en `lm/img/logos/lm_ind.jpg`.

- [ ] **Paso 5: Punto de control**

Correr: `npm test && npx @11ty/eleventy && ls _site/assets/img`
Esperado: `apple-touch-icon.png favicon-32.png favicon.svg`.

---

### Tarea 5: Hoja de estilos

**Archivos:**
- Crear: `sitio-nuevo/src/assets/css/estilos.css`

**Interfaces:**
- Produce las clases que usan las plantillas de las Tareas 6 a 8:
  - Estructura y utilidades: `contenedor`, `seccion`, `visualmente-oculto`, `saltar`, `intro`.
  - Botones: `boton` con las variantes `--primario` y `--secundario`.
  - Encabezado: `encabezado`, `encabezado__barra`, `encabezado__logo`, `encabezado__whatsapp`, `encabezado__whatsapp-texto`, `buscador` y `buscador--grande`.
  - Navegación: `navegacion`, `navegacion__movil`, `navegacion__escritorio`, `navegacion__item`, `navegacion__sub`. Migas: `migas`.
  - Grillas y tarjetas: `grilla`, `grilla--productos`, `grilla--categorias`, `grilla--portada`; `tarjeta` con `__foto`, `__cuerpo`, `__marca`, `__nombre`, `__specs` y `__boton`; `tarjeta-categoria` con `__foto` y `__nombre`.
  - Filtros: `filtros`, `filtros__grupo`, `filtros__titulo`, `filtros__vacio`, `chip`.
  - Producto: `producto` con `__foto`, `__info`, `__marca`, `__descripcion`, `__acciones`, `__specs` y `__caracteristicas`; `tabla-specs`.
  - Inicio: `portada`, `portada__interior`, `portada__bajada`, `franja-marcas`, `marcas`, `pasos`, `acciones`.
  - Otras páginas: `contacto` con `contacto__titulo`, `lista-categorias` y `faq`.
  - Pie: `pie`, `pie__grilla`, `pie__marca`, `pie__titulo`, `pie__lista`.

- [ ] **Paso 1: Crear `src/assets/css/estilos.css`**

```css
@font-face { font-family: "IBM Plex Sans"; font-style: normal; font-weight: 400; font-display: swap; src: url("/assets/fuentes/plex-400.woff2") format("woff2"); }
@font-face { font-family: "IBM Plex Sans"; font-style: normal; font-weight: 600; font-display: swap; src: url("/assets/fuentes/plex-600.woff2") format("woff2"); }
@font-face { font-family: "IBM Plex Sans"; font-style: normal; font-weight: 700; font-display: swap; src: url("/assets/fuentes/plex-700.woff2") format("woff2"); }

:root {
  --verde: #135a56;
  --verde-oscuro: #104a47;
  --fondo: #f5f7f7;
  --superficie: #ffffff;
  --texto: #1d2324;
  --texto-2: #4a5556;
  --borde: #e0e6e6;
  --borde-fuerte: #cfd8d7;
  --radio: 8px;
  --ancho: 1200px;
  --fuente: "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
}

*, *::before, *::after { box-sizing: border-box; }
[hidden] { display: none !important; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; font-family: var(--fuente); font-size: 16px; line-height: 1.55; color: var(--texto); background: var(--fondo); }
img, svg { display: block; max-width: 100%; height: auto; }
a { color: var(--verde); }
a:hover { color: var(--verde-oscuro); }
:focus-visible { outline: 3px solid var(--verde); outline-offset: 2px; }
h1, h2, h3 { line-height: 1.2; margin: 0 0 .5em; }
h1 { font-size: clamp(1.6rem, 1.2rem + 1.6vw, 2.2rem); font-weight: 700; }
h2 { font-size: 1.35rem; font-weight: 700; }
h3 { font-size: 1rem; font-weight: 600; }
p { margin: 0 0 1em; }

.contenedor { width: 100%; max-width: var(--ancho); margin-inline: auto; padding-inline: 16px; }
.seccion { padding-block: 24px 40px; }
.intro { max-width: 760px; color: var(--texto-2); font-size: 1.05rem; }
.visualmente-oculto { position: absolute !important; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.saltar { position: absolute; left: 8px; top: -60px; z-index: 20; background: var(--verde); color: #fff; padding: 8px 12px; border-radius: 4px; }
.saltar:focus { top: 8px; color: #fff; }

/* Botones */
.boton { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 10px 16px; border-radius: 6px; border: 1.5px solid transparent; font: 600 .95rem/1.2 var(--fuente); text-decoration: none; cursor: pointer; }
.boton svg { width: 20px; height: 20px; flex: none; }
.boton--primario { background: var(--verde); color: #fff; }
.boton--primario:hover { background: var(--verde-oscuro); color: #fff; }
.boton--secundario { background: var(--superficie); color: var(--texto); border-color: var(--borde-fuerte); }
.boton--secundario:hover { border-color: var(--verde); color: var(--verde); }
.acciones { display: flex; flex-wrap: wrap; gap: 10px; }

/* Encabezado */
.encabezado { position: sticky; top: 0; z-index: 10; background: var(--superficie); border-bottom: 1px solid var(--borde); }
.encabezado__barra { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; grid-template-areas: "logo buscador whatsapp"; align-items: center; gap: 16px; padding-block: 10px; }
.encabezado__logo { grid-area: logo; color: var(--verde); display: block; }
.encabezado__logo .logo { height: 40px; width: auto; }
.encabezado__whatsapp { grid-area: whatsapp; }
.buscador { grid-area: buscador; display: flex; max-width: 620px; width: 100%; }
.buscador input { flex: 1; min-width: 0; min-height: 44px; padding: 8px 12px; border: 1.5px solid var(--borde-fuerte); border-right: 0; border-radius: 6px 0 0 6px; background: #fff; color: var(--texto); font: inherit; }
.buscador input:focus { outline: none; border-color: var(--verde); box-shadow: 0 0 0 2px rgb(19 90 86 / .25); }
.buscador button { min-width: 48px; padding: 0 14px; border: 0; border-radius: 0 6px 6px 0; background: var(--verde); color: #fff; cursor: pointer; display: grid; place-items: center; font: 600 .95rem var(--fuente); }
.buscador button svg { width: 20px; height: 20px; }
.buscador--grande input { min-height: 52px; font-size: 1.05rem; }
@media (max-width: 760px) {
  .encabezado { position: static; }
  .encabezado__barra { grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "logo whatsapp" "buscador buscador"; gap: 10px; }
  .encabezado__logo .logo { height: 34px; }
  .encabezado__whatsapp { min-width: 44px; padding-inline: 12px; }
  .encabezado__whatsapp-texto { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .buscador { max-width: none; }
}

/* Navegación */
.navegacion { background: var(--verde); }
.navegacion ul { list-style: none; margin: 0; padding: 0; }
.navegacion__escritorio.contenedor { padding-inline: 16px; }
.navegacion__movil { display: none; }
.navegacion__escritorio { display: flex; gap: 2px; }
.navegacion__item { position: relative; }
.navegacion__item > a { display: block; padding: 11px 12px; color: #e8f2f1; font-weight: 600; font-size: .92rem; text-decoration: none; }
.navegacion__item > a:hover, .navegacion__item:focus-within > a { color: #fff; background: var(--verde-oscuro); }
.navegacion__sub { display: none; position: absolute; left: 0; top: 100%; min-width: 290px; max-height: 70vh; overflow: auto; padding: 6px 0 !important; background: #fff; border: 1px solid var(--borde); border-radius: 0 0 var(--radio) var(--radio); box-shadow: 0 8px 24px rgb(0 0 0 / .12); }
.navegacion__item:hover .navegacion__sub, .navegacion__item:focus-within .navegacion__sub { display: block; }
.navegacion__item:last-child .navegacion__sub, .navegacion__item:nth-last-child(2) .navegacion__sub { left: auto; right: 0; }
.navegacion__sub a { display: block; padding: 8px 16px; color: var(--texto); font-size: .92rem; text-decoration: none; }
.navegacion__sub a:hover { background: var(--fondo); color: var(--verde); }
@media (max-width: 1000px) {
  .navegacion__escritorio { display: none; }
  .navegacion__movil { display: block; }
  .navegacion__movil summary { display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 10px 16px; color: #fff; font-weight: 600; cursor: pointer; list-style: none; }
  .navegacion__movil summary::-webkit-details-marker { display: none; }
  .navegacion__movil summary::before { content: "☰"; font-size: 1.1rem; }
  .navegacion__movil[open] summary::before { content: "✕"; }
  .navegacion__movil > ul { max-height: 75vh; overflow: auto; padding-bottom: 8px; background: #fff; }
  .navegacion__movil > ul > li > a { display: block; padding: 12px 16px; border-top: 1px solid var(--borde); color: var(--verde); font-weight: 700; text-decoration: none; }
  .navegacion__movil ul ul a { display: block; padding: 8px 16px 8px 28px; color: var(--texto); text-decoration: none; }
}

/* Migas */
.migas ol { list-style: none; display: flex; flex-wrap: wrap; gap: 4px; margin: 0; padding: 14px 0 0; font-size: .85rem; color: var(--texto-2); }
.migas li + li::before { content: "›"; margin-right: 4px; color: #7b8788; }
.migas a { color: var(--texto-2); }

/* Grillas y tarjetas */
.grilla { display: grid; gap: 16px; }
.grilla--productos { grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); }
.grilla--categorias { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); margin-bottom: 28px; }
.grilla--portada { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
.tarjeta { display: flex; flex-direction: column; min-width: 0; background: var(--superficie); border: 1px solid var(--borde); border-radius: var(--radio); overflow: hidden; }
.tarjeta__foto { display: block; padding: 10px; background: #fff; border-bottom: 1px solid #eef1f1; }
.tarjeta__foto img { width: 100%; aspect-ratio: 1; object-fit: contain; }
.tarjeta__cuerpo { display: flex; flex: 1; flex-direction: column; gap: 6px; padding: 12px; }
.tarjeta__marca { margin: 0; font-size: .72rem; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--verde); }
.tarjeta__nombre { margin: 0; font-size: .98rem; overflow-wrap: anywhere; }
.tarjeta__nombre a { color: var(--texto); text-decoration: none; }
.tarjeta__nombre a:hover { color: var(--verde); text-decoration: underline; }
.tarjeta__specs { margin: 2px 0 0; font-size: .82rem; color: var(--texto-2); }
.tarjeta__specs div { display: flex; flex-wrap: wrap; gap: 0 4px; }
.tarjeta__specs dt { font-weight: 600; color: var(--texto); }
.tarjeta__specs dt::after { content: ":"; }
.tarjeta__specs dd { margin: 0; overflow-wrap: anywhere; }
.tarjeta__boton { margin-top: auto; }
.tarjeta-categoria { display: flex; flex-direction: column; min-width: 0; background: var(--superficie); border: 1px solid var(--borde); border-radius: var(--radio); overflow: hidden; color: var(--texto); text-decoration: none; }
.tarjeta-categoria__foto { padding: 8px; background: #fff; }
.tarjeta-categoria__foto img { width: 100%; aspect-ratio: 1; object-fit: contain; }
.grilla--portada .tarjeta-categoria__foto img { aspect-ratio: 600 / 250; }
.tarjeta-categoria__nombre { padding: 10px 12px; border-top: 1px solid #eef1f1; font-weight: 600; overflow-wrap: anywhere; }
.tarjeta-categoria:hover { border-color: var(--verde); }
.tarjeta-categoria:hover .tarjeta-categoria__nombre { color: var(--verde); }
@media (max-width: 560px) {
  .grilla--productos, .grilla--categorias { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .grilla--portada { grid-template-columns: minmax(0, 1fr); }
  .tarjeta__cuerpo { padding: 10px; }
  .tarjeta__specs { font-size: .78rem; }
  .tarjeta__boton { padding-inline: 8px; }
}

/* Filtros */
.filtros { display: grid; gap: 8px; margin: 4px 0 18px; }
.filtros__grupo { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.filtros__titulo { margin-right: 4px; font-size: .85rem; font-weight: 600; color: var(--texto-2); }
.chip { min-height: 36px; padding: 6px 12px; border: 1px solid var(--borde-fuerte); border-radius: 999px; background: #fff; color: var(--texto); font: 500 .85rem var(--fuente); cursor: pointer; }
.chip[aria-pressed="true"] { background: var(--verde); border-color: var(--verde); color: #fff; }
.filtros__vacio { color: var(--texto-2); }

/* Producto */
.producto { display: grid; grid-template-columns: minmax(0, 320px) minmax(0, 1fr); gap: 24px 40px; align-items: start; }
.producto__foto { padding: 16px; background: #fff; border: 1px solid var(--borde); border-radius: var(--radio); }
.producto__foto img { width: 100%; aspect-ratio: 1; object-fit: contain; }
.producto__marca { margin: 0 0 6px; font-size: .8rem; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--verde); }
.producto__info h1 { overflow-wrap: anywhere; }
.producto__descripcion { max-width: 680px; color: var(--texto-2); font-size: 1.05rem; }
.producto__acciones { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
.producto__specs, .producto__caracteristicas { grid-column: 1 / -1; }
.tabla-specs { width: 100%; max-width: 820px; border-collapse: collapse; background: var(--superficie); border: 1px solid var(--borde); }
.tabla-specs th, .tabla-specs td { padding: 10px 14px; border-bottom: 1px solid var(--borde); text-align: left; vertical-align: top; font-size: .95rem; overflow-wrap: anywhere; }
.tabla-specs th { width: 38%; background: #fafbfb; font-weight: 600; }
.tabla-specs tr:last-child th, .tabla-specs tr:last-child td { border-bottom: 0; }
.producto__caracteristicas ul { max-width: 820px; margin: 0; padding-left: 1.2em; }
.producto__caracteristicas li { margin-bottom: 4px; }
@media (max-width: 760px) {
  .producto { grid-template-columns: minmax(0, 1fr); }
  .producto__foto { max-width: 280px; }
  .producto__acciones .boton { flex: 1 1 100%; }
  .tabla-specs th { width: 45%; }
  .tabla-specs th, .tabla-specs td { padding: 8px 10px; font-size: .9rem; }
}

/* Inicio */
.portada { background: linear-gradient(180deg, #fff, var(--fondo)); border-bottom: 1px solid var(--borde); }
.portada__interior { padding-block: 40px 36px; }
.portada h1 { max-width: 720px; font-size: clamp(1.8rem, 1.3rem + 2vw, 2.6rem); }
.portada__bajada { max-width: 680px; color: var(--texto-2); font-size: 1.1rem; }
.franja-marcas { padding-block: 28px; background: var(--superficie); border-block: 1px solid var(--borde); }
.marcas { list-style: none; display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; }
.marcas li { padding: 6px 12px; border: 1px solid var(--borde); border-radius: 999px; background: var(--fondo); color: var(--texto-2); font-size: .9rem; font-weight: 600; }
.pasos { list-style: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin: 0 0 20px; padding: 0; counter-reset: paso; }
.pasos li { padding: 16px; background: var(--superficie); border: 1px solid var(--borde); border-radius: var(--radio); counter-increment: paso; }
.pasos li::before { content: counter(paso); display: grid; place-items: center; width: 32px; height: 32px; margin-bottom: 8px; border-radius: 50%; background: var(--verde); color: #fff; font-weight: 700; }

/* Contacto, 404 y preguntas frecuentes */
.contacto { list-style: none; display: grid; gap: 12px; max-width: 520px; margin: 0 0 32px; padding: 0; }
.contacto li { display: flex; flex-wrap: wrap; gap: 4px 12px; align-items: baseline; padding: 14px 16px; background: var(--superficie); border: 1px solid var(--borde); border-radius: var(--radio); }
.contacto__titulo { min-width: 90px; font-weight: 600; color: var(--texto-2); }
.contacto a { font-weight: 600; font-size: 1.05rem; overflow-wrap: anywhere; }
.lista-categorias { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; margin: 24px 0 0; padding: 0; list-style: none; }
.lista-categorias a { display: block; padding: 12px 14px; background: var(--superficie); border: 1px solid var(--borde); border-radius: var(--radio); font-weight: 600; text-decoration: none; }
.faq { max-width: 820px; margin-top: 32px; }
.faq details { margin-bottom: 8px; padding: 0 16px; background: var(--superficie); border: 1px solid var(--borde); border-radius: var(--radio); }
.faq summary { padding: 12px 0; font-weight: 600; cursor: pointer; }
.faq details p { margin: 0 0 12px; color: var(--texto-2); }

/* Buscador (Pagefind) */
#buscar { max-width: 820px; --pagefind-ui-primary: #135a56; --pagefind-ui-text: #1d2324; --pagefind-ui-border: #cfd8d7; --pagefind-ui-border-radius: 6px; --pagefind-ui-font: var(--fuente); }

/* Pie */
.pie { margin-top: 24px; background: #1d2324; color: #d5dcdc; }
.pie__grilla { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 24px; padding-block: 32px; }
.pie a { color: #fff; }
.pie__marca { margin-bottom: 6px; color: #fff; font-size: 1.1rem; font-weight: 700; }
.pie__titulo { margin-bottom: 8px; color: #fff; font-weight: 700; }
.pie__lista { list-style: none; display: grid; gap: 6px; margin: 0; padding: 0; }
@media (max-width: 760px) { .pie__grilla { grid-template-columns: minmax(0, 1fr); } }
```

- [ ] **Paso 2: Punto de control**

Correr: `npx @11ty/eleventy && test -s _site/assets/css/estilos.css && echo ok`
Esperado: `ok`.

---

### Tarea 6: Plantilla base, encabezado, navegación, pie e inicio

**Archivos:**
- Crear en `sitio-nuevo/src/_includes/`: `base.njk`, `parciales/encabezado.njk`, `parciales/navegacion.njk`, `parciales/migas.njk`, `parciales/pie.njk`, `parciales/pasos.njk`, `parciales/icono-whatsapp.njk`, `parciales/icono-lupa.njk`, `parciales/tarjeta-categoria.njk`
- Crear en `sitio-nuevo/src/`: `index.njk`, `contacto.njk`, `buscar.njk`, `404.njk`, `robots.njk`
- Prueba: `sitio-nuevo/tests/sitio/sitio.test.js`

**Interfaces:**
- Consume: `catalogo`, `sitio`, los filtros de la Tarea 3, el shortcode `foto` y el logo.
- Produce:
  - `base.njk` lee las variables de página `titulo`, `descripcion`, `canonica` (opcional), `noindexar` (opcional) e `indexar` (opcional; pone `data-pagefind-body` en `<main>`), más los bloques `head` y `contenido`.
  - `parciales/migas.njk` lee la variable `migas`.
  - `parciales/tarjeta-categoria.njk` lee `c` y `ancho` (opcional, 250 por defecto).

- [ ] **Paso 1: Escribir las pruebas del sitio que fallan**

`tests/sitio/sitio.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  const html = leer("index.html");
  assert.equal((html.match(/class="tarjeta-categoria"/g) ?? []).length, 6);
  assert.equal((html.match(/<picture>/g) ?? []).length, 6);
});
```

Correr: `npm run build && npm run test:sitio`
Esperado: FAIL (no hay páginas generadas).

- [ ] **Paso 2: Crear `base.njk`**

```njk
<!doctype html>
<html lang="es-AR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ titulo }}</title>
  <meta name="description" content="{{ descripcion }}">
  <link rel="canonical" href="{{ sitio.url }}{{ canonica or page.url }}">
  {% if sitio.entorno == "prueba" or noindexar %}<meta name="robots" content="noindex, nofollow">{% endif %}
  <link rel="preload" href="/assets/fuentes/plex-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/css/estilos.css">
  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/assets/img/favicon-32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
  <meta name="theme-color" content="#135a56">
  {% block head %}{% endblock %}
</head>
<body>
  <a class="saltar" href="#contenido">Saltar al contenido</a>
  {% include "parciales/encabezado.njk" %}
  <main id="contenido"{% if indexar %} data-pagefind-body{% endif %}>
    {% block contenido %}{% endblock %}
  </main>
  {% include "parciales/pie.njk" %}
</body>
</html>
```

- [ ] **Paso 3: Crear los parciales**

`parciales/icono-whatsapp.njk`:
```njk
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.66 15l-1.3 4.76 4.88-1.28A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-2.9.76.78-2.83-.2-.3A8.2 8.2 0 1 1 12 20.2z"/><path d="M16.6 14.1c-.25-.13-1.48-.73-1.7-.81-.23-.09-.4-.13-.56.12-.17.25-.64.81-.79.98-.14.17-.29.19-.54.06a6.8 6.8 0 0 1-3.37-2.94c-.25-.44.25-.4.72-1.34.08-.16.04-.3-.02-.43l-.76-1.83c-.2-.48-.4-.41-.56-.42h-.48a.92.92 0 0 0-.67.31 2.8 2.8 0 0 0-.87 2.08 4.86 4.86 0 0 0 1.02 2.59 11.1 11.1 0 0 0 4.26 3.76c1.58.68 2.2.74 3 .62.48-.07 1.48-.6 1.69-1.19.2-.58.2-1.08.14-1.19-.06-.1-.22-.16-.47-.29z"/></svg>
```

`parciales/icono-lupa.njk`:
```njk
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>
```

`parciales/encabezado.njk`:
```njk
<header class="encabezado">
  <div class="contenedor encabezado__barra">
    <a class="encabezado__logo" href="/" aria-label="LM Industrial, ir al inicio">{% include "parciales/logo.njk" %}</a>
    <form class="buscador" action="/buscar.html" method="get" role="search">
      <label class="visualmente-oculto" for="q">Buscar producto, marca o modelo</label>
      <input id="q" name="q" type="search" placeholder="Buscar producto, marca o modelo" autocomplete="off">
      <button type="submit"><span class="visualmente-oculto">Buscar</span>{% include "parciales/icono-lupa.njk" %}</button>
    </form>
    <a class="boton boton--primario encabezado__whatsapp" href="{{ sitio.whatsapp | urlWhatsapp('Hola, quiero hacer una consulta.') }}" target="_blank" rel="noopener">
      {% include "parciales/icono-whatsapp.njk" %}<span class="encabezado__whatsapp-texto">WhatsApp {{ sitio.telefono_visible }}</span>
    </a>
  </div>
  {% include "parciales/navegacion.njk" %}
</header>
```

`parciales/navegacion.njk` (sin JavaScript: `<details>` en celular, `:hover`/`:focus-within` en escritorio):
```njk
<nav class="navegacion" aria-label="Categorías de productos">
  <details class="navegacion__movil">
    <summary>Categorías</summary>
    <ul>
      {% for raiz in catalogo.raices() %}
      <li><a href="/{{ raiz.slug }}.html">{{ raiz.nombre }}</a>
        <ul>{% for h in catalogo.hijos(raiz.slug) %}<li><a href="/{{ h.slug }}.html">{{ h.nombre }}</a></li>{% endfor %}</ul>
      </li>
      {% endfor %}
    </ul>
  </details>
  <ul class="contenedor navegacion__escritorio">
    {% for raiz in catalogo.raices() %}
    <li class="navegacion__item">
      <a href="/{{ raiz.slug }}.html">{{ raiz.nombre }}</a>
      <ul class="navegacion__sub">{% for h in catalogo.hijos(raiz.slug) %}<li><a href="/{{ h.slug }}.html">{{ h.nombre }}</a></li>{% endfor %}</ul>
    </li>
    {% endfor %}
  </ul>
</nav>
```

`parciales/migas.njk`:
```njk
{% if migas and migas.length > 1 %}
<nav class="contenedor migas" aria-label="Ruta">
  <ol>{% for m in migas %}<li>{% if loop.last %}<span aria-current="page">{{ m.nombre }}</span>{% else %}<a href="{{ m.url }}">{{ m.nombre }}</a>{% endif %}</li>{% endfor %}</ol>
</nav>
{% endif %}
```

`parciales/pasos.njk`:
```njk
<ol class="pasos">
  <li><strong>Buscá el producto</strong> y revisá su ficha técnica.</li>
  <li><strong>Escribinos por WhatsApp o mail</strong> con el modelo, la medida y la cantidad.</li>
  <li><strong>Te cotizamos y enviamos</strong> a todo el país.</li>
</ol>
```

`parciales/pie.njk`:
```njk
<footer class="pie">
  <div class="contenedor pie__grilla">
    <div>
      <p class="pie__marca">LM Industrial</p>
      <p>{{ sitio.descripcion }}</p>
    </div>
    <div>
      <p class="pie__titulo">Contacto</p>
      <ul class="pie__lista">
        <li><a href="{{ sitio.whatsapp | urlWhatsapp('Hola, quiero hacer una consulta.') }}" target="_blank" rel="noopener">WhatsApp {{ sitio.telefono_visible }}</a></li>
        <li><a href="tel:{{ sitio.telefono_tel }}">Teléfono {{ sitio.telefono_visible }}</a></li>
        <li><a href="mailto:{{ sitio.email }}">{{ sitio.email }}</a></li>
        <li>{{ sitio.envios }}</li>
        <li><a href="/contacto.html">Cómo comprar</a></li>
      </ul>
    </div>
    <div>
      <p class="pie__titulo">Productos</p>
      <ul class="pie__lista">{% for raiz in catalogo.raices() %}<li><a href="/{{ raiz.slug }}.html">{{ raiz.nombre }}</a></li>{% endfor %}</ul>
    </div>
  </div>
</footer>
```

`parciales/tarjeta-categoria.njk` (usa `{% foto %}`, así que se incluye siempre dentro de `asyncEach`):
```njk
<a class="tarjeta-categoria" href="/{{ c.slug }}.html">
  <span class="tarjeta-categoria__foto">{% foto c.imagen, "", ancho or 250 %}</span>
  <span class="tarjeta-categoria__nombre">{{ c.nombre }}</span>
</a>
```

- [ ] **Paso 4: Crear las páginas**

`src/index.njk`:
```njk
---
titulo: "LM Industrial | Válvulas e insumos industriales con envíos a todo el país"
descripcion: "Válvulas industriales, vapor, control de quemadores, automatización neumática, instrumentos de medición y anti incendio. Consultas por WhatsApp y envíos a todo el país."
canonica: "/"
---
{% extends "base.njk" %}
{% block contenido %}
<section class="portada">
  <div class="contenedor portada__interior">
    <h1>Válvulas e insumos industriales</h1>
    <p class="portada__bajada">Válvulas, vapor, control de quemadores, automatización neumática e instrumentos de medición. {{ sitio.envios }}.</p>
    <form class="buscador buscador--grande" action="/buscar.html" method="get" role="search">
      <label class="visualmente-oculto" for="q-portada">Buscar producto, marca o modelo</label>
      <input id="q-portada" name="q" type="search" placeholder="Buscá por producto, marca o modelo (ej: Genebre 2025)">
      <button type="submit">Buscar</button>
    </form>
  </div>
</section>
<section class="contenedor seccion">
  <h2>Productos</h2>
  {% set ancho = 600 %}
  <div class="grilla grilla--portada">{% asyncEach c in catalogo.raices() %}{% include "parciales/tarjeta-categoria.njk" %}{% endeach %}</div>
</section>
<section class="franja-marcas">
  <div class="contenedor">
    <h2>Marcas que comercializamos</h2>
    <ul class="marcas">{% for m in sitio.marcas %}<li>{{ m }}</li>{% endfor %}</ul>
  </div>
</section>
<section class="contenedor seccion">
  <h2>Cómo comprar</h2>
  {% include "parciales/pasos.njk" %}
  <p class="acciones">
    <a class="boton boton--primario" href="{{ sitio.whatsapp | urlWhatsapp('Hola, quiero hacer una consulta.') }}" target="_blank" rel="noopener">{% include "parciales/icono-whatsapp.njk" %} Escribinos por WhatsApp</a>
    <a class="boton boton--secundario" href="mailto:{{ sitio.email }}">{{ sitio.email }}</a>
  </p>
</section>
{% endblock %}
```

`src/contacto.njk`:
```njk
---
titulo: "Contacto | LM Industrial"
descripcion: "Consultas por WhatsApp al 11 3180-9499 o por mail a info@lmindustrial.com.ar. Envíos a todo el país."
permalink: "contacto.html"
---
{% extends "base.njk" %}
{% block contenido %}
{% set migas = [{ nombre: "Inicio", url: "/" }, { nombre: "Contacto", url: "/contacto.html" }] %}
{% include "parciales/migas.njk" %}
<section class="contenedor seccion">
  <h1>Contacto</h1>
  <p class="intro">Atendemos consultas por WhatsApp, teléfono y mail. {{ sitio.envios }}.</p>
  <ul class="contacto">
    <li><span class="contacto__titulo">WhatsApp</span><a href="{{ sitio.whatsapp | urlWhatsapp('Hola, quiero hacer una consulta.') }}" target="_blank" rel="noopener">{{ sitio.telefono_visible }}</a></li>
    <li><span class="contacto__titulo">Teléfono</span><a href="tel:{{ sitio.telefono_tel }}">{{ sitio.telefono_visible }}</a></li>
    <li><span class="contacto__titulo">Mail</span><a href="mailto:{{ sitio.email }}">{{ sitio.email }}</a></li>
  </ul>
  <h2>Cómo comprar</h2>
  {% include "parciales/pasos.njk" %}
</section>
{% endblock %}
```

`src/buscar.njk`:
```njk
---
titulo: "Buscar | LM Industrial"
descripcion: "Buscá productos por nombre, marca o modelo."
permalink: "buscar.html"
noindexar: true
---
{% extends "base.njk" %}
{% block head %}<link rel="stylesheet" href="/pagefind/pagefind-ui.css">{% endblock %}
{% block contenido %}
<section class="contenedor seccion">
  <h1>Buscar</h1>
  <div id="buscar"></div>
</section>
<script src="/pagefind/pagefind-ui.js"></script>
<script>
  const ui = new PagefindUI({ element: "#buscar", showImages: false, showSubResults: false });
  const q = new URLSearchParams(location.search).get("q");
  if (q) ui.triggerSearch(q);
</script>
{% endblock %}
```

`src/404.njk`:
```njk
---
titulo: "Página no encontrada | LM Industrial"
descripcion: "La página que buscás no existe o cambió de lugar."
permalink: "404.html"
noindexar: true
---
{% extends "base.njk" %}
{% block contenido %}
<section class="contenedor seccion">
  <h1>No encontramos esa página</h1>
  <p class="intro">Puede que el enlace haya cambiado. Probá con el buscador o elegí una categoría.</p>
  <form class="buscador buscador--grande" action="/buscar.html" method="get" role="search">
    <label class="visualmente-oculto" for="q-404">Buscar producto, marca o modelo</label>
    <input id="q-404" name="q" type="search" placeholder="Buscar producto, marca o modelo">
    <button type="submit">Buscar</button>
  </form>
  <ul class="lista-categorias">{% for c in catalogo.raices() %}<li><a href="/{{ c.slug }}.html">{{ c.nombre }}</a></li>{% endfor %}</ul>
</section>
{% endblock %}
```

`src/robots.njk`:
```njk
---
permalink: "robots.txt"
eleventyExcludeFromCollections: true
---
{% if sitio.entorno == "produccion" %}User-agent: *
Allow: /
Sitemap: {{ sitio.url }}/sitemap.xml
{% else %}User-agent: *
Disallow: /
{% endif %}
```

- [ ] **Paso 5: Categorías provisorias para que la prueba de las 55 URLs se pueda correr**

Todavía no existe la página de categoría (Tarea 7). Para esta tarea, correr las pruebas salteando las que dependen de ella:

Correr: `npm run build && node --test --test-name-pattern="h1|títulos|canónica|no indexable|nunca se indexan|inicio muestra" "tests/sitio/*.test.js"`
Esperado: esas 6 pruebas en verde. "las 55 URLs" y "enlaces internos" fallan hasta la Tarea 7, porque los enlaces del menú apuntan a categorías que todavía no se generan.

- [ ] **Paso 6: Mirar el resultado**

Correr: `npx @11ty/eleventy --serve --port 8080` (en segundo plano). Abrir `http://localhost:8080/` con una captura de Chrome sin ventana, a 1366 y a 390 de ancho:
```bash
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; D=/private/tmp/claude-501/-Users-ezequiel-Downloads-lm/15430ed0-22f4-4972-a600-752e43000d6e/scratchpad
"$C" --headless=new --disable-gpu --hide-scrollbars --window-size=1366,1800 --screenshot=$D/t6-inicio-desk.png http://localhost:8080/
"$C" --headless=new --disable-gpu --hide-scrollbars --window-size=390,1800 --screenshot=$D/t6-inicio-mob.png http://localhost:8080/
```
Revisar las capturas con Read: logo nítido y verde, buscador, WhatsApp, barra de categorías, 6 tarjetas con foto, marcas, pasos y pie. Cortar el servidor.

- [ ] **Paso 7: Punto de control**

Correr: `npm test`
Esperado: en verde.

---

### Tarea 7: Página de categoría con filtros

**Archivos:**
- Crear: `sitio-nuevo/src/categoria.njk`, `sitio-nuevo/src/categoria.11tydata.js`, `sitio-nuevo/src/_includes/parciales/tarjeta-producto.njk`, `sitio-nuevo/src/assets/js/filtros.js`
- Modificar: `sitio-nuevo/tests/sitio/sitio.test.js` (agregar pruebas)

**Interfaces:**
- Consume: `catalogo.migas/hijos/productos/facetas`, los filtros `urlProducto` y `destacados`, `tarjeta-categoria.njk`.
- Produce:
  - `parciales/tarjeta-producto.njk` lee `p` y se incluye dentro de `asyncEach`. Genera `<article class="tarjeta" data-material data-conexion>`.
  - Marcado de filtros: `[data-filtros]` (oculto por defecto), `[data-faceta="material|conexion"]`, `button[data-valor]` con `aria-pressed`, `[data-grilla]` y `[data-vacio]`.

- [ ] **Paso 1: Agregar las pruebas que fallan**

Al final de `tests/sitio/sitio.test.js`:
```js
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
```

Correr: `npm run build && npm run test:sitio`
Esperado: FAIL (no existen las páginas de categoría).

- [ ] **Paso 2: Crear `parciales/tarjeta-producto.njk`**

```njk
<article class="tarjeta"{% if p.filtros %} data-material="{{ p.filtros.material }}" data-conexion="{{ p.filtros.conexion }}"{% endif %}>
  <a class="tarjeta__foto" href="{{ p | urlProducto }}" tabindex="-1" aria-hidden="true">{% foto p.imagen, p.nombre %}</a>
  <div class="tarjeta__cuerpo">
    {% if p.marca %}<p class="tarjeta__marca">{{ p.marca }}{% if p.modelo %} · {{ p.modelo }}{% endif %}</p>{% endif %}
    <h3 class="tarjeta__nombre"><a href="{{ p | urlProducto }}">{{ p.nombre }}</a></h3>
    {% if p.ficha %}
    <dl class="tarjeta__specs">{% for s in p | destacados %}<div><dt>{{ s.clave }}</dt><dd>{{ s.valor }}</dd></div>{% endfor %}</dl>
    {% endif %}
    <a class="boton boton--secundario tarjeta__boton" href="{{ p | urlProducto }}">{% if p.ficha %}Ficha{% else %}Ficha PDF{% endif %}</a>
  </div>
</article>
```

- [ ] **Paso 3: Crear `categoria.11tydata.js` y `categoria.njk`**

`src/categoria.11tydata.js`:
```js
export default {
  indexar: true,
  eleventyComputed: {
    titulo: (d) => d.cat.titulo_seo,
    descripcion: (d) => d.cat.descripcion_seo,
  },
};
```

`src/categoria.njk`:
```njk
---
pagination:
  data: categorias
  size: 1
  alias: cat
permalink: "{{ cat.slug }}.html"
---
{% extends "base.njk" %}
{% block contenido %}
{% set migas = catalogo.migas(cat.slug) %}
{% include "parciales/migas.njk" %}
<section class="contenedor seccion">
  <h1>{{ cat.nombre }}</h1>
  {% if cat.intro %}<p class="intro">{{ cat.intro }}</p>{% endif %}

  {% set hijos = catalogo.hijos(cat.slug) %}
  {% if hijos.length %}
  <h2 class="visualmente-oculto">Subcategorías</h2>
  <div class="grilla grilla--categorias">{% asyncEach c in hijos %}{% include "parciales/tarjeta-categoria.njk" %}{% endeach %}</div>
  {% endif %}

  {% set lista = catalogo.productos(cat.slug) %}
  {% set facetas = catalogo.facetas(cat.slug) %}
  {% if lista.length %}
    {% if facetas.length %}
    <div class="filtros" data-filtros hidden>
      {% for f in facetas %}
      <div class="filtros__grupo" role="group" aria-label="Filtrar por {{ f.titulo | lower }}" data-faceta="{{ f.clave }}">
        <span class="filtros__titulo">{{ f.titulo }}:</span>
        <button type="button" class="chip" aria-pressed="true" data-valor="">Todas</button>
        {% for v in f.valores %}<button type="button" class="chip" aria-pressed="false" data-valor="{{ v }}">{{ v }}</button>{% endfor %}
      </div>
      {% endfor %}
    </div>
    {% endif %}
  <h2 class="visualmente-oculto">Productos</h2>
  <div class="grilla grilla--productos" data-grilla>{% asyncEach p in lista %}{% include "parciales/tarjeta-producto.njk" %}{% endeach %}</div>
  <p class="filtros__vacio" data-vacio hidden>No hay productos con esos filtros.</p>
  {% endif %}

  {% if cat.faqs.length %}
  <section class="faq">
    <h2>Preguntas frecuentes</h2>
    {% for f in cat.faqs %}<details><summary>{{ f.pregunta }}</summary><p>{{ f.respuesta }}</p></details>{% endfor %}
  </section>
  {% endif %}
</section>
{% if facetas.length %}<script src="/assets/js/filtros.js" defer></script>{% endif %}
{% endblock %}
```

- [ ] **Paso 4: Crear `src/assets/js/filtros.js`**

```js
const grilla = document.querySelector("[data-grilla]");
const panel = document.querySelector("[data-filtros]");
const vacio = document.querySelector("[data-vacio]");

if (grilla && panel) {
  const activos = {};
  panel.hidden = false;
  panel.addEventListener("click", (evento) => {
    const chip = evento.target.closest("button[data-valor]");
    if (!chip) return;
    const grupo = chip.closest("[data-faceta]");
    grupo.querySelectorAll("button[data-valor]").forEach((b) => b.setAttribute("aria-pressed", String(b === chip)));
    activos[grupo.dataset.faceta] = chip.dataset.valor;
    let visibles = 0;
    grilla.querySelectorAll(".tarjeta").forEach((tarjeta) => {
      const coincide = Object.entries(activos).every(([clave, valor]) => !valor || tarjeta.dataset[clave] === valor);
      tarjeta.hidden = !coincide;
      if (coincide) visibles += 1;
    });
    vacio.hidden = visibles > 0;
  });
}
```

- [ ] **Paso 5: Correr las pruebas**

Correr: `npm run build && npm run test:sitio`
Esperado: todas en verde, incluidas "las 55 URLs" y "enlaces internos". Si "fotos" falla con 0, un bucle con `{% foto %}` quedó como `{% for %}`: cambiarlo por `asyncEach`.

- [ ] **Paso 6: Mirar el resultado**

Capturas a 1366 y 390 de `http://localhost:8080/valvula-esferica.html` y `/valvulas-industriales.html` (mismo método que en la Tarea 6). Revisar migas, subcategorías, tarjetas "Ficha PDF" (todavía sin fichas) y grilla de 2 columnas en celular.

- [ ] **Paso 7: Punto de control**

Correr: `npm test && npm run test:sitio`
Esperado: en verde.

---

### Tarea 8: Página de producto

**Archivos:**
- Crear: `sitio-nuevo/src/producto.njk`, `sitio-nuevo/src/producto.11tydata.js`
- Modificar: `sitio-nuevo/tests/sitio/sitio.test.js`

**Interfaces:**
- Consume: `catalogo.fichas`, `catalogo.migasProducto`, `catalogo.relacionados`, los filtros `urlWhatsapp`, `mensajeProducto` y `recortar`, `tarjeta-producto.njk`.
- Produce: `/productos/{id}.html` por cada ficha.

- [ ] **Paso 1: Agregar las pruebas que fallan**

```js
test("cada ficha tiene su página en /productos/", () => {
  for (const p of fichas) assert.ok(existsSync(path.join(SITE, "productos", `${p.id}.html`)), p.id);
});

test("el WhatsApp de cada ficha nombra el producto (acentos y comillas intactos)", () => {
  for (const p of fichas) {
    const html = leer(`productos/${p.id}.html`);
    const textos = [...html.matchAll(/href="https:\/\/wa\.me\/5491131809499\?text=([^"]+)"/g)].map(([, t]) => decodeURIComponent(t));
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
```

Mientras no haya fichas (se cargan en la Tarea 10), estas pruebas pasan sin revisar nada. Para ejercitarlas ahora, agregar una ficha de prueba temporal: en `src/_data/productos.json`, a la entrada de `GENEBRE-Valvula-Esferica-2025.pdf` sumarle exactamente los campos del ejemplo del spec (sección 6: `id`, `marca`, `modelo`, `nombre`, `descripcion`, `specs`, `destacados`, `caracteristicas`, `fuente`) más `"ficha": true` y `"filtros": { "material": "Inox", "conexion": "Roscada" }`. En la Tarea 10 esa entrada se revisa contra el PDF como las demás.

Correr: `npm run build && npm run test:sitio`
Esperado: FAIL en "cada ficha tiene su página".

- [ ] **Paso 2: Crear `producto.11tydata.js` y `producto.njk`**

`src/producto.11tydata.js`:
```js
import { recortar } from "../lib/texto.js";

export default {
  indexar: true,
  eleventyComputed: {
    titulo: (d) => `${d.p.nombre} – ${d.p.marca} ${d.p.modelo} | LM Industrial`,
    descripcion: (d) => recortar(d.p.descripcion, 155),
  },
};
```

`src/producto.njk`:
```njk
---
pagination:
  data: catalogo.fichas
  size: 1
  alias: p
permalink: "productos/{{ p.id }}.html"
---
{% extends "base.njk" %}
{% block contenido %}
{% set migas = catalogo.migasProducto(p) %}
{% include "parciales/migas.njk" %}
<article class="contenedor seccion producto">
  <div class="producto__foto">{% foto p.imagen, p.nombre %}</div>
  <div class="producto__info">
    <p class="producto__marca">{{ p.marca }} · {{ p.modelo }}</p>
    <h1>{{ p.nombre }}</h1>
    <p class="producto__descripcion">{{ p.descripcion }}</p>
    <div class="producto__acciones">
      <a class="boton boton--primario" href="{{ sitio.whatsapp | urlWhatsapp(p | mensajeProducto) }}" target="_blank" rel="noopener">{% include "parciales/icono-whatsapp.njk" %} Consultar por WhatsApp</a>
      <a class="boton boton--secundario" href="/{{ p.pdf }}" target="_blank" rel="noopener">Descargar ficha PDF</a>
    </div>
  </div>
  <section class="producto__specs">
    <h2>Especificaciones</h2>
    <table class="tabla-specs"><tbody>{% for s in p.specs %}<tr><th scope="row">{{ s.clave }}</th><td>{{ s.valor }}</td></tr>{% endfor %}</tbody></table>
  </section>
  {% if p.caracteristicas.length %}
  <section class="producto__caracteristicas">
    <h2>Características</h2>
    <ul>{% for c in p.caracteristicas %}<li>{{ c }}</li>{% endfor %}</ul>
  </section>
  {% endif %}
</article>
{% set relacionados = catalogo.relacionados(p) %}
{% if relacionados.length %}
<section class="contenedor seccion">
  <h2>Productos relacionados</h2>
  <div class="grilla grilla--productos">{% asyncEach p in relacionados %}{% include "parciales/tarjeta-producto.njk" %}{% endeach %}</div>
</section>
{% endif %}
{% endblock %}
```

- [ ] **Paso 3: Correr las pruebas**

Correr: `npm run build && npm run test:sitio`
Esperado: todo en verde, incluida la página de la Genebre 2025.

- [ ] **Paso 4: Mirar el resultado**

Capturas a 1366 y 390 de `/productos/genebre-2025-valvula-esferica-inox-3-piezas-roscada.html`. Revisar foto, marca y modelo, H1, descripción, los dos botones (en celular, a lo ancho), la tabla sin desbordes y las características.

- [ ] **Paso 5: Punto de control**

Correr: `npm test && npm run test:sitio`
Esperado: en verde.

---

### Tarea 9: Verificación de fichas contra el PDF

**Archivos:**
- Crear: `sitio-nuevo/lib/verificacion.js`, `sitio-nuevo/scripts/verificar-fichas.js`
- Prueba: `sitio-nuevo/tests/unit/verificacion.test.js`

**Interfaces:**
- Produce:
  - `normalizar(texto)`, `extraerNumeros(texto) → string[]` (sin signo; comas decimales como punto; fracciones `1/2`).
  - `verificarFicha(ficha, textoPdf) → { ok: boolean, no_encontrados: string[] }`.
  - El script escribe `verificacion` en cada ficha y termina con código 1 si queda alguna ficha sin verificar y sin `revision_manual: "ok"`.

- [ ] **Paso 1: Escribir la prueba que falla**

`tests/unit/verificacion.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { extraerNumeros, verificarFicha } from "../../lib/verificacion.js";

test("extrae números normalizando guiones, signos, comas decimales, fracciones y superíndices", () => {
  assert.deepEqual(extraerNumeros("−25 °C a +180 °C"), ["25", "180"]);
  assert.deepEqual(extraerNumeros("Presión 0,5 bar"), ["0.5"]);
  assert.deepEqual(extraerNumeros('Medidas ½" a 1 ¼"'), ["1/2", "1", "1/4"]);
  assert.deepEqual(extraerNumeros("19 Kg/cm2"), ["19", "2"]);
  assert.deepEqual(extraerNumeros("19 kg/cm²"), ["19", "2"]);
  assert.deepEqual(extraerNumeros("Acero inox 1.4408 (CF8M)"), ["1.4408", "8"]);
});

test("verificarFicha aprueba cuando todos los números están en el PDF", () => {
  const pdf = "ARTICULO: 2025\n10. Presión de trabajo máxima 63 bar.\n11. Temperatura de trabajo –25 ºC + 180 ºC.";
  const ficha = { modelo: "2025", descripcion: "Válvula de esfera.", specs: [{ clave: "Presión máxima de trabajo", valor: "63 bar" }, { clave: "Temperatura de trabajo", valor: "−25 °C a +180 °C" }], caracteristicas: [] };
  assert.deepEqual(verificarFicha(ficha, pdf), { ok: true, no_encontrados: [] });
});

test("verificarFicha marca los números que no están en el PDF", () => {
  const pdf = "ARTICULO: 2025 Presión de trabajo máxima 63 bar";
  const ficha = { modelo: "2025", specs: [{ clave: "Presión", valor: "64 bar" }], caracteristicas: ["Hasta 250 °C"] };
  assert.deepEqual(verificarFicha(ficha, pdf), { ok: false, no_encontrados: ["64", "250"] });
});
```

- [ ] **Paso 2: Correr y ver que falla**

Correr: `npm test`
Esperado: FAIL con `Cannot find module '.../lib/verificacion.js'`.

- [ ] **Paso 3: Implementar `lib/verificacion.js`**

```js
const FRACCIONES = { "½": "1/2", "¼": "1/4", "¾": "3/4", "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8" };

export function normalizar(texto) {
  return texto
    .replace(/[½¼¾⅛⅜⅝⅞]/g, (f) => FRACCIONES[f])
    .normalize("NFKC")
    .replace(/⁄/g, "/")
    .replace(/[−–—‐]/g, "-")
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function extraerNumeros(texto) {
  return [...normalizar(texto).matchAll(/\d+\s*\/\s*\d+|\d+(?:\.\d+)?/g)].map((m) => m[0].replace(/\s+/g, ""));
}

export function verificarFicha(ficha, textoPdf) {
  const enPdf = new Set(extraerNumeros(textoPdf));
  const fuentes = [ficha.modelo ?? "", ficha.descripcion ?? "", ...(ficha.specs ?? []).map((s) => s.valor), ...(ficha.caracteristicas ?? [])];
  const no_encontrados = [...new Set(fuentes.flatMap(extraerNumeros))].filter((n) => !enPdf.has(n));
  return { ok: no_encontrados.length === 0, no_encontrados };
}
```

- [ ] **Paso 4: Correr y ver que pasa**

Correr: `npm test`
Esperado: en verde.

- [ ] **Paso 5: Script `scripts/verificar-fichas.js`**

```js
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
  const texto = execFileSync("pdftotext", ["-layout", path.join(RAIZ, p.pdf), "-"], { encoding: "utf8" });
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
```

Correr: `npm run verificar-fichas`
Esperado: `✓ genebre-2025-valvula-esferica-inox-3-piezas-roscada` y `Todas las fichas verificadas`, porque la ficha provisoria de la Tarea 8 usa datos reales del PDF.

- [ ] **Paso 6: Punto de control**

Correr: `npm test`
Esperado: en verde.

---

### Tarea 10: Fichas y textos de Válvulas esféricas y Comandos

**Archivos:**
- Modificar: `sitio-nuevo/src/_data/productos.json` (18 entradas), `sitio-nuevo/src/_data/categorias.json` (2 entradas)
- Prueba: `sitio-nuevo/tests/unit/datos.test.js`

**Interfaces:**
- Consume: la forma de producto de la Tarea 2, el ejemplo de ficha del spec (sección 6) y `slugificar`.
- Produce: 18 productos con `ficha: true`. Cada uno tiene `id`, `marca`, `modelo`, `nombre`, `descripcion`, `specs`, `destacados`, `caracteristicas`, `fuente` y `verificacion`; `filtros` solo en las válvulas, y `revision_manual` si corresponde.

Los 18 PDFs:
- `valvula-esferica` (14): los 14 PDFs de `catalogos/Valvula-Esferica/` que lista esa categoría en `categorias.json`. `INTOR-Valvula-Esferica.pdf` es escaneado.
- `valvula-esferica-comandos` (4): `catalogos/Valvula-Esferica/Comandos-Manuales/GENEBRE-Reductor-Manual-a-Volante-VE-5984.pdf`, `GENEBRE-Palanca-con-Retorno-a-Resorte-5985.pdf`, `GENEBRE-Extensor-para-Valvula-Man-5330-5332.pdf` y `GENEBRE-Extensor-para-Valvula-Aut-5334.pdf`.

- [ ] **Paso 1: Escribir la prueba de datos que falla**

`tests/unit/datos.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { slugificar } from "../../lib/texto.js";

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
  for (const p of fichas) {
    const donde = p.pdf;
    for (const campo of ["marca", "modelo", "nombre", "descripcion"]) assert.ok(typeof p[campo] === "string" && p[campo].trim(), `${donde}: ${campo}`);
    assert.equal(p.id, slugificar(`${p.marca} ${p.modelo} ${p.nombre}`), `${donde}: id`);
    assert.ok(p.descripcion.length >= 60 && p.descripcion.length <= 400, `${donde}: descripción de ${p.descripcion.length} caracteres`);
    assert.ok(Array.isArray(p.specs) && p.specs.length >= 2, `${donde}: specs`);
    for (const s of p.specs) assert.ok(s.clave && s.valor, `${donde}: spec vacía`);
    assert.ok(p.destacados.length >= 1 && p.destacados.length <= 3, `${donde}: destacados`);
    for (const d of p.destacados) assert.ok(p.specs.some((s) => s.clave === d), `${donde}: destacado "${d}" no está en specs`);
    assert.ok(Array.isArray(p.caracteristicas), `${donde}: características`);
    assert.ok(["texto", "imagen"].includes(p.fuente), `${donde}: fuente`);
    for (const [clave, valor] of Object.entries(p.filtros ?? {})) {
      assert.ok(["material", "conexion"].includes(clave), `${donde}: filtro ${clave}`);
      assert.ok(valor.length <= 20, `${donde}: valor de filtro largo`);
    }
    assert.ok(!/distribuidor oficial/i.test(JSON.stringify(p)), `${donde}: dice "distribuidor oficial"`);
  }
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
```

Correr: `npm test`
Esperado: FAIL solo en "fase 1" (17 PDFs sin ficha y sin intro).

- [ ] **Paso 2: Extraer y cargar cada ficha**

Para **cada uno** de los 17 PDFs restantes (y revisar la 2025 cargada en la Tarea 8):

1. Leer el PDF:
   - Con texto: `pdftotext -layout "/Users/ezequiel/Downloads/lm/<pdf>" - | head -80`.
   - Escaneado (`INTOR-Valvula-Esferica.pdf`): `pdftoppm -r 110 -png "/Users/ezequiel/Downloads/lm/<pdf>" /private/tmp/claude-501/-Users-ezequiel-Downloads-lm/15430ed0-22f4-4972-a600-752e43000d6e/scratchpad/intor-esf`, y leer las imágenes con la herramienta Read.
2. En la entrada existente de `productos.json` (buscarla por `pdf`), **conservar** `pdf`, `imagen`, `categorias` y `categoria_principal`, y **completar**:
   - `ficha: true`. `marca`: tal como la escribe la marca ("Genebre", "Intor").
   - `modelo`: el artículo del PDF ("2025", "2526A", "2040 / 2041").
   - `nombre`: "Válvula esférica" + material + rasgo distintivo + conexión, en oración y sin la marca. Por ejemplo: "Válvula esférica inox 3 piezas roscada".
   - `descripcion`: 2 o 3 oraciones (60 a 400 caracteres) con lo que es y lo que la distingue, solo con datos del PDF.
   - `specs`: en este orden, las que estén en el PDF: "Material del cuerpo", "Extremos", "Normas", "Presión máxima de trabajo", "Temperatura de trabajo", "Medidas disponibles", "Asientos", "Juntas", "Accionamiento". Unidades como en el PDF, con formato "63 bar" y "−25 °C a +180 °C".
   - `destacados`: 3 claves; por defecto "Material del cuerpo", "Presión máxima de trabajo" y "Temperatura de trabajo". Si falta alguna, la siguiente más útil para elegir.
   - `caracteristicas`: los puntos del PDF que no son números de specs ("Paso total", "Eje inexpulsable", "Montaje directo de actuador ISO 5211").
   - `filtros` (solo las 14 válvulas, no los comandos):
     - `material`: uno de "Inox", "Acero carbono", "Latón".
     - `conexion`: uno de "Roscada", "Bridada", "Socket weld", "Soldar".
   - `fuente`: `"texto"` o `"imagen"`.
   - `id`: `slugificar(marca + " " + modelo + " " + nombre)`. Calcularlo con `node -e 'import("./lib/texto.js").then(m=>console.log(m.slugificar(process.argv[1])))' "Genebre 2025 Válvula esférica inox 3 piezas roscada"`.
3. Nada de datos que el PDF no diga: ni aplicaciones, ni equivalencias, ni precios.

- [ ] **Paso 3: Verificar contra los PDFs**

Correr: `npm run verificar-fichas`
Esperado: una línea `✓` o `✗` por ficha. Para cada `✗`:
- **Si el número salió mal:** corregir la ficha.
- **Si es correcto pero el PDF lo escribe distinto** (por ejemplo, una medida que figura en una tabla con otro formato): confirmarlo en el PDF y agregar `"revision_manual": "ok"`.
- **La Intor escaneada:** comparar cada dato con las imágenes y agregar `"revision_manual": "ok"`.

Repetir hasta `Todas las fichas verificadas`.

- [ ] **Paso 4: Textos de las dos categorías**

En `categorias.json`, entrada `valvula-esferica`:
```json
"titulo_seo": "Válvulas esféricas inox, acero y latón | LM Industrial",
"descripcion_seo": "Válvulas esféricas Genebre e Intor en inox, acero al carbono y latón: roscadas, bridadas, socket weld y de 3 vías. Fichas técnicas y consultas por WhatsApp.",
"intro": "Válvulas de esfera para cierre rápido de un cuarto de vuelta, en acero inoxidable, acero al carbono y latón. Hay versiones roscadas, bridadas y socket weld, de 2 y 3 piezas y de 3 vías, varias con montaje directo de actuador ISO 5211. Marcas Genebre e Intor, con envíos a todo el país."
```

Entrada `valvula-esferica-comandos`:
```json
"titulo_seo": "Comandos y accesorios para válvulas esféricas | LM Industrial",
"descripcion_seo": "Reductores manuales a volante, palancas con retorno a resorte y extensores para válvulas esféricas Genebre. Fichas técnicas y consultas por WhatsApp.",
"intro": "Accesorios para accionar y adaptar válvulas esféricas: reductores manuales a volante, palancas con retorno a resorte y extensores para válvulas manuales y automatizadas. Marca Genebre, con envíos a todo el país."
```

Chequear cada afirmación de las dos `intro` contra las fichas cargadas: materiales, conexiones, 2 y 3 piezas, 3 vías, ISO 5211 y marcas. Si alguna no se cumple, quitarla del texto.

- [ ] **Paso 5: Correr todo**

Correr: `npm test && npm run build && npm run test:sitio`
Esperado: todo en verde; `_site/productos/` con 18 páginas.

---

### Tarea 11: Pruebas en navegador y capturas

**Archivos:**
- Crear: `sitio-nuevo/tests/servidor.js`, `sitio-nuevo/tests/navegador.mjs`, `sitio-nuevo/tests/capturas.mjs`

**Interfaces:**
- Consume: `_site/` compilado con Pagefind, `src/_data/productos.json` y el Chrome instalado.
- Produce: `iniciarServidor() → Promise<{ url, cerrar }>`, que sirve `_site/` y además `/catalogos/*` desde la carpeta vieja; ante un 404 devuelve `404.html`. `npm run test:navegador` termina con código 1 si falla algo. `npm run capturas` genera PNG en `sitio-nuevo/capturas/`.

- [ ] **Paso 1: Servidor estático para pruebas**

`tests/servidor.js`:
```js
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(AQUI, "../_site");
const VIEJO = path.resolve(AQUI, "../..");
const TIPOS = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
  ".wasm": "application/wasm", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".woff2": "font/woff2", ".pdf": "application/pdf",
};

export function iniciarServidor() {
  return new Promise((resolve) => {
    const servidor = createServer(async (req, res) => {
      let ruta = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (ruta.endsWith("/")) ruta += "index.html";
      const base = ruta.startsWith("/catalogos/") ? VIEJO : SITE;
      const archivo = path.join(base, ruta);
      if (!archivo.startsWith(base)) { res.writeHead(403); res.end(); return; }
      try {
        const cuerpo = await readFile(archivo);
        res.writeHead(200, { "content-type": TIPOS[path.extname(archivo).toLowerCase()] ?? "application/octet-stream" });
        res.end(cuerpo);
      } catch {
        res.writeHead(404, { "content-type": TIPOS[".html"] });
        res.end(await readFile(path.join(SITE, "404.html")).catch(() => "404"));
      }
    });
    servidor.listen(0, "127.0.0.1", () => resolve({ url: `http://127.0.0.1:${servidor.address().port}`, cerrar: () => servidor.close() }));
  });
}
```

- [ ] **Paso 2: Pruebas en navegador**

`tests/navegador.mjs`:
```js
import puppeteer from "puppeteer-core";
import { readFileSync } from "node:fs";
import { iniciarServidor } from "./servidor.js";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const fichas = JSON.parse(readFileSync(new URL("../src/_data/productos.json", import.meta.url), "utf8")).filter((p) => p.ficha);
const { url, cerrar } = await iniciarServidor();
const navegador = await puppeteer.launch({ executablePath: CHROME, headless: true });
const pag = await navegador.newPage();
let fallas = 0;

async function prueba(nombre, fn) {
  try { await fn(); console.log(`✓ ${nombre}`); } catch (e) { fallas += 1; console.log(`✗ ${nombre}: ${e.message}`); }
}
function afirmar(condicion, mensaje) { if (!condicion) throw new Error(mensaje); }

async function buscar(q) {
  await pag.goto(`${url}/buscar.html?q=${encodeURIComponent(q)}`);
  await pag.waitForFunction(() => {
    const m = document.querySelector(".pagefind-ui__message");
    return m && !/^Buscando/.test(m.textContent);
  }, { timeout: 15000 });
  return pag.$$eval(".pagefind-ui__result-link", (as) => as.map((a) => a.getAttribute("href")));
}

await prueba('búsqueda "2025" encuentra la Genebre 2025', async () => {
  const r = await buscar("2025"); afirmar(r.some((h) => h.includes("genebre-2025")), JSON.stringify(r));
});
await prueba('búsqueda sin acentos: "valvula esferica"', async () => {
  const r = await buscar("valvula esferica"); afirmar(r.some((h) => h.includes("valvula-esferica")), JSON.stringify(r.slice(0, 5)));
});
await prueba('búsqueda en mayúsculas: "ESFÉRICA"', async () => {
  const r = await buscar("ESFÉRICA"); afirmar(r.length > 0, "sin resultados");
});
await prueba('búsqueda "genebre"', async () => {
  const r = await buscar("genebre"); afirmar(r.length > 0, "sin resultados");
});
await prueba('búsqueda "solenoide gas" encuentra la categoría', async () => {
  const r = await buscar("solenoide gas"); afirmar(r.some((h) => h.includes("valvula-solenoide-gas")), JSON.stringify(r.slice(0, 5)));
});
await prueba("búsqueda sin resultados", async () => {
  const r = await buscar("zzzqqqxx"); afirmar(r.length === 0, JSON.stringify(r));
});
await prueba("el buscador del encabezado lleva a la página de búsqueda", async () => {
  await pag.goto(`${url}/valvula-esferica.html`);
  await pag.type("#q", "2526A");
  await Promise.all([pag.waitForNavigation(), pag.keyboard.press("Enter")]);
  afirmar(pag.url().includes("/buscar.html?q=2526A"), pag.url());
});
await prueba("filtros de válvulas esféricas", async () => {
  await pag.goto(`${url}/valvula-esferica.html`);
  const total = await pag.$$eval(".grilla--productos .tarjeta", (ts) => ts.length);
  await pag.click('[data-faceta="material"] button[data-valor="Inox"]');
  const visibles = await pag.$$eval(".grilla--productos .tarjeta:not([hidden])", (ts) => ts.map((t) => t.dataset.material));
  afirmar(visibles.length > 0 && visibles.length < total, `visibles ${visibles.length} de ${total}`);
  afirmar(visibles.every((m) => m === "Inox"), JSON.stringify(visibles));
  await pag.click('[data-faceta="material"] button[data-valor=""]');
  const todas = await pag.$$eval(".grilla--productos .tarjeta:not([hidden])", (ts) => ts.length);
  afirmar(todas === total, `después de "Todas": ${todas} de ${total}`);
});

await pag.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await prueba("el menú de celular abre y muestra las categorías", async () => {
  await pag.goto(`${url}/`);
  await pag.click(".navegacion__movil summary");
  const visibles = await pag.$$eval(".navegacion__movil a", (as) => as.filter((a) => a.offsetParent !== null).length);
  afirmar(visibles >= 6, `${visibles} enlaces visibles`);
});
const rutas = ["/", "/valvula-esferica.html", "/valvulas-industriales.html", "/valvula-esferica-comandos.html", "/contacto.html", "/404.html", "/buscar.html?q=esferica", ...fichas.map((p) => `/productos/${p.id}.html`)];
for (const ruta of rutas) {
  await prueba(`sin scroll horizontal a 390 px: ${ruta}`, async () => {
    await pag.goto(url + ruta, { waitUntil: "networkidle0" });
    const ancho = await pag.evaluate(() => document.documentElement.scrollWidth);
    afirmar(ancho <= 390, `scrollWidth ${ancho}`);
  });
}

await navegador.close();
cerrar();
console.log(fallas ? `${fallas} prueba(s) fallaron` : "Todas las pruebas de navegador pasaron");
process.exit(fallas ? 1 : 0);
```

Correr: `npm run build && npm run test:navegador`
Esperado: todas `✓`. Si falla una de scroll horizontal, sacar una captura de esa ruta a 390 y corregir el CSS (normalmente con `min-width: 0` u `overflow-wrap: anywhere` en el elemento que desborda). No relajar la prueba.

- [ ] **Paso 3: Capturas**

`tests/capturas.mjs`:
```js
import puppeteer from "puppeteer-core";
import { mkdirSync, readFileSync } from "node:fs";
import { iniciarServidor } from "./servidor.js";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const primeraFicha = JSON.parse(readFileSync(new URL("../src/_data/productos.json", import.meta.url), "utf8")).find((p) => p.ficha);
const paginas = {
  inicio: "/", categoria: "/valvula-esferica.html", rama: "/valvulas-industriales.html",
  producto: `/productos/${primeraFicha.id}.html`, contacto: "/contacto.html", buscar: "/buscar.html?q=esferica", "404": "/404.html",
};
const pantallas = { escritorio: { width: 1366, height: 900 }, celular: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } };

mkdirSync(new URL("../capturas/", import.meta.url), { recursive: true });
const { url, cerrar } = await iniciarServidor();
const navegador = await puppeteer.launch({ executablePath: CHROME, headless: true });
const pag = await navegador.newPage();
for (const [nombrePantalla, viewport] of Object.entries(pantallas)) {
  await pag.setViewport(viewport);
  for (const [nombre, ruta] of Object.entries(paginas)) {
    await pag.goto(url + ruta, { waitUntil: "networkidle0" });
    const archivo = new URL(`../capturas/${nombre}-${nombrePantalla}.png`, import.meta.url).pathname;
    await pag.screenshot({ path: archivo, fullPage: true });
    console.log(archivo);
  }
}
await navegador.close();
cerrar();
```

Correr: `npm run capturas`
Esperado: 14 PNG en `capturas/`. Revisar cada una con la herramienta Read:
- Nada superpuesto ni cortado.
- Fotos presentes.
- Logo nítido.
- Tipografía IBM Plex cargada (se nota en la "g" y la "a").
- Botones de al menos 44 px de alto en celular.
- Contraste legible.

Corregir el CSS y repetir hasta que estén bien.

- [ ] **Paso 4: Punto de control**

Correr: `npm test && npm run build && npm run test:sitio && npm run test:navegador`
Esperado: todo en verde.

---

### Tarea 12: Infraestructura del sitio de prueba y script de publicación

**Archivos:**
- Crear: `sitio-nuevo/infra/redirecciones.js`, `sitio-nuevo/infra/eventos/apex.json`, `sitio-nuevo/infra/eventos/genebre.json`, `sitio-nuevo/infra/eventos/normal.json`, `sitio-nuevo/infra/crear-prueba.sh`, `sitio-nuevo/deploy.sh`
- Genera: `sitio-nuevo/infra/prueba.env`

**Interfaces:**
- Consume: la cuenta `318986392550` (perfil `lmindustrial`), el OAC `E3GDB1IR4X7WM4`, la función `lmindustrial-redirect-www`, la zona `Z02059532OAILISFF7HJ` y la distribución de producción `E1G0Z14KWZAS06` (solo en `deploy.sh produccion`).
- Produce: el bucket `lmindustrial-com-ar-nuevo`, la política de encabezados `lmindustrial-noindex`, la distribución de prueba y `infra/prueba.env` con `DIST_PRUEBA=…`, `DOMINIO_PRUEBA=…` y `CERT_PRUEBA=…`.

- [ ] **Paso 1: Función con redirecciones**

`infra/redirecciones.js`:
```js
var REDIRECCIONES = {
  '/Genebre-valvula-esferica.html': '/valvula-esferica.html',
  '/Genebre-valvula-mariposa.html': '/valvula-mariposa.html',
  '/Genebre-Ode-valvula-solenoide.html': '/valvula-solenoide.html'
};

function handler(event) {
  var request = event.request;
  var host = request.headers.host ? request.headers.host.value : '';
  var esApex = host === 'lmindustrial.com.ar';
  var destino = REDIRECCIONES[request.uri];
  if (!esApex && !destino) return request;

  var qs = [];
  for (var k in request.querystring) {
    var p = request.querystring[k];
    if (p.multiValue) { p.multiValue.forEach(function (v) { qs.push(k + '=' + v.value); }); }
    else { qs.push(k + '=' + p.value); }
  }
  var base = esApex ? 'https://www.lmindustrial.com.ar' : '';
  var loc = base + (destino || request.uri) + (qs.length ? '?' + qs.join('&') : '');
  return { statusCode: 301, statusDescription: 'Moved Permanently', headers: { location: { value: loc } } };
}
```

`infra/eventos/apex.json`:
```json
{"version":"1.0","context":{"eventType":"viewer-request"},"viewer":{"ip":"1.2.3.4"},"request":{"method":"GET","uri":"/presion.html","querystring":{"a":{"value":"1"}},"headers":{"host":{"value":"lmindustrial.com.ar"}},"cookies":{}}}
```
`infra/eventos/genebre.json`:
```json
{"version":"1.0","context":{"eventType":"viewer-request"},"viewer":{"ip":"1.2.3.4"},"request":{"method":"GET","uri":"/Genebre-valvula-esferica.html","querystring":{},"headers":{"host":{"value":"nuevo.lmindustrial.com.ar"}},"cookies":{}}}
```
`infra/eventos/normal.json`:
```json
{"version":"1.0","context":{"eventType":"viewer-request"},"viewer":{"ip":"1.2.3.4"},"request":{"method":"GET","uri":"/valvula-esferica.html","querystring":{},"headers":{"host":{"value":"www.lmindustrial.com.ar"}},"cookies":{}}}
```

- [ ] **Paso 2: Script de creación (se corre una sola vez)**

`infra/crear-prueba.sh`:
```bash
#!/bin/bash
# Crea el sitio de prueba de LM Industrial: bucket privado + CloudFront con noindex.
set -euo pipefail
cd "$(dirname "$0")"
export AWS_PROFILE=lmindustrial
[ "$(aws sts get-caller-identity --query Account --output text)" = "318986392550" ] || { echo "Perfil equivocado: no es la cuenta de LM Industrial"; exit 1; }
[ -f prueba.env ] && { echo "prueba.env ya existe: el sitio de prueba ya fue creado"; exit 1; }

BUCKET=lmindustrial-com-ar-nuevo
OAC_ID=E3GDB1IR4X7WM4
FUNCION=lmindustrial-redirect-www
ZONA=Z02059532OAILISFF7HJ

# 1. Bucket privado y cifrado
aws s3api create-bucket --bucket $BUCKET --region us-east-1 >/dev/null
aws s3api put-public-access-block --bucket $BUCKET --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3api put-bucket-encryption --bucket $BUCKET --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
aws s3api put-bucket-tagging --bucket $BUCKET --tagging 'TagSet=[{Key=proyecto,Value=lmindustrial}]'

# 2. Función con redirecciones (compartida con producción), probada antes de publicar
ETAG=$(aws cloudfront describe-function --name $FUNCION --query ETag --output text)
ETAG=$(aws cloudfront update-function --name $FUNCION --if-match "$ETAG" --function-config Comment="apex a www y redirecciones",Runtime=cloudfront-js-2.0 --function-code fileb://redirecciones.js --query ETag --output text)
probar() { aws cloudfront test-function --name $FUNCION --if-match "$ETAG" --stage DEVELOPMENT --event-object fileb://eventos/$1.json --query TestResult.FunctionOutput --output text; }
probar apex    | grep -q '"value":"https://www.lmindustrial.com.ar/presion.html?a=1"' || { echo "Falla: apex"; exit 1; }
probar genebre | grep -q '"value":"/valvula-esferica.html"'                          || { echo "Falla: Genebre"; exit 1; }
probar normal  | grep -q '"uri":"/valvula-esferica.html"'                             || { echo "Falla: normal"; exit 1; }
aws cloudfront publish-function --name $FUNCION --if-match "$ETAG" >/dev/null
FN_ARN=$(aws cloudfront describe-function --name $FUNCION --stage LIVE --query FunctionSummary.FunctionMetadata.FunctionARN --output text)

# 3. Política de encabezados: no indexar
POLITICA=$(aws cloudfront create-response-headers-policy --response-headers-policy-config '{"Name":"lmindustrial-noindex","Comment":"Sitio de prueba: no indexar","CustomHeadersConfig":{"Quantity":1,"Items":[{"Header":"X-Robots-Tag","Value":"noindex, nofollow","Override":true}]}}' --query ResponseHeadersPolicy.Id --output text)

# 4. Distribución
cat > distribucion-prueba.json <<EOF
{
  "CallerReference": "lmindustrial-nuevo-$(date +%s)",
  "Comment": "Sitio de prueba lmindustrial (nuevo)",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "PriceClass": "PriceClass_All",
  "HttpVersion": "http2and3",
  "IsIPV6Enabled": true,
  "Origins": { "Quantity": 1, "Items": [ {
    "Id": "s3-nuevo",
    "DomainName": "$BUCKET.s3.us-east-1.amazonaws.com",
    "OriginAccessControlId": "$OAC_ID",
    "S3OriginConfig": { "OriginAccessIdentity": "" }
  } ] },
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3-nuevo",
    "ViewerProtocolPolicy": "redirect-to-https",
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "ResponseHeadersPolicyId": "$POLITICA",
    "Compress": true,
    "AllowedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"], "CachedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"] } },
    "FunctionAssociations": { "Quantity": 1, "Items": [ { "EventType": "viewer-request", "FunctionARN": "$FN_ARN" } ] }
  },
  "CustomErrorResponses": { "Quantity": 2, "Items": [
    { "ErrorCode": 403, "ResponsePagePath": "/404.html", "ResponseCode": "404", "ErrorCachingMinTTL": 60 },
    { "ErrorCode": 404, "ResponsePagePath": "/404.html", "ResponseCode": "404", "ErrorCachingMinTTL": 60 }
  ] }
}
EOF
read DIST_ID DIST_ARN DIST_DOMINIO < <(aws cloudfront create-distribution --distribution-config file://distribucion-prueba.json --query "Distribution.[Id,ARN,DomainName]" --output text)
aws cloudfront tag-resource --resource "$DIST_ARN" --tags "Items=[{Key=proyecto,Value=lmindustrial}]"

# 5. Permiso de lectura del bucket solo para esta distribución
aws s3api put-bucket-policy --bucket $BUCKET --policy "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"AllowCloudFrontOAC\",\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"cloudfront.amazonaws.com\"},\"Action\":\"s3:GetObject\",\"Resource\":\"arn:aws:s3:::$BUCKET/*\",\"Condition\":{\"StringEquals\":{\"AWS:SourceArn\":\"$DIST_ARN\"}}}]}"

# 6. Certificado para nuevo.lmindustrial.com.ar (se valida solo cuando el dominio delegue a Route 53)
CERT=$(aws acm request-certificate --region us-east-1 --domain-name nuevo.lmindustrial.com.ar --validation-method DNS --key-algorithm RSA_2048 --tags Key=proyecto,Value=lmindustrial --query CertificateArn --output text)
VNOMBRE=""
for intento in 1 2 3 4 5 6 7 8; do
  sleep 5
  read VNOMBRE VVALOR < <(aws acm describe-certificate --region us-east-1 --certificate-arn "$CERT" --query "Certificate.DomainValidationOptions[0].ResourceRecord.[Name,Value]" --output text)
  [ -n "$VNOMBRE" ] && [ "$VNOMBRE" != "None" ] && break
done
[ -n "$VNOMBRE" ] && [ "$VNOMBRE" != "None" ] || { echo "ACM no publicó el registro de validación"; exit 1; }
aws route53 change-resource-record-sets --hosted-zone-id $ZONA --change-batch "{\"Changes\":[{\"Action\":\"UPSERT\",\"ResourceRecordSet\":{\"Name\":\"$VNOMBRE\",\"Type\":\"CNAME\",\"TTL\":300,\"ResourceRecords\":[{\"Value\":\"$VVALOR\"}]}}]}" >/dev/null

printf "DIST_PRUEBA=%s\nDOMINIO_PRUEBA=%s\nCERT_PRUEBA=%s\n" "$DIST_ID" "$DIST_DOMINIO" "$CERT" > prueba.env
cat prueba.env
echo "Listo. La distribución tarda unos minutos en desplegarse."
```

Correr: `chmod +x infra/crear-prueba.sh && ./infra/crear-prueba.sh`
Esperado: termina imprimiendo `DIST_PRUEBA=E…`, `DOMINIO_PRUEBA=d….cloudfront.net` y `CERT_PRUEBA=arn:…`. Si falla alguna prueba de la función, no se publica: revisar `redirecciones.js`.

- [ ] **Paso 3: Script de publicación `deploy.sh`**

```bash
#!/bin/bash
# Publica el sitio nuevo. Uso: ./deploy.sh prueba | ./deploy.sh produccion --confirmar
set -euo pipefail
cd "$(dirname "$0")"
export AWS_PROFILE=lmindustrial   # cuenta 318986392550 (LM Industrial)

case "${1:-}" in
  prueba)
    source infra/prueba.env
    BUCKET=lmindustrial-com-ar-nuevo; DIST_ID=$DIST_PRUEBA ;;
  produccion)
    [ "${2:-}" = "--confirmar" ] || { echo "Para publicar en producción: ./deploy.sh produccion --confirmar"; exit 1; }
    BUCKET=lmindustrial-com-ar-sitio; DIST_ID=E1G0Z14KWZAS06 ;;
  *) echo "Uso: ./deploy.sh prueba | ./deploy.sh produccion --confirmar"; exit 1 ;;
esac

SITIO="$1" npm run build
npm test
SITIO="$1" npm run test:sitio

aws s3 sync _site/ "s3://$BUCKET/" --delete --exclude "catalogos/*" --exclude "img/opt/*" --cache-control "max-age=3600"
aws s3 sync _site/img/opt/ "s3://$BUCKET/img/opt/" --delete --cache-control "max-age=31536000, immutable"
aws s3 sync ../catalogos/ "s3://$BUCKET/catalogos/" --exclude "*Thumbs.db" --cache-control "max-age=86400"
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" --query Invalidation.Id --output text
echo "Publicado en $1."
```

Correr: `chmod +x deploy.sh`

- [ ] **Paso 4: Punto de control**

Correr: `AWS_PROFILE=lmindustrial aws cloudfront get-distribution --id "$(grep DIST_PRUEBA infra/prueba.env | cut -d= -f2)" --query Distribution.Status --output text`
Esperado: `Deployed` (esperar si dice `InProgress`).

---

### Tarea 13: Publicar en prueba y verificar

**Archivos:** ninguno nuevo.

- [ ] **Paso 1: Publicar**

Correr: `./deploy.sh prueba`
Esperado: build, pruebas en verde, subidas y `Publicado en prueba.`

- [ ] **Paso 2: Verificar el sitio publicado**

```bash
source infra/prueba.env; U="https://$DOMINIO_PRUEBA"
curl -sI "$U/" | grep -iE "^(HTTP|x-robots-tag)"                                  # 200 y noindex, nofollow
curl -s "$U/robots.txt"                                                             # Disallow: /
curl -sI "$U/Genebre-valvula-esferica.html" | grep -iE "^(HTTP|location)"           # 301 → /valvula-esferica.html
curl -sI "$U/no-existe.html" | grep -iE "^HTTP"                                     # 404
curl -s -o /dev/null -w "%{http_code}\n" "$U/catalogos/Valvula-Esferica/GENEBRE-Valvula-Esferica-2025.pdf"   # 200
curl -s -o /dev/null -w "%{http_code}\n" "$U/productos/genebre-2025-valvula-esferica-inox-3-piezas-roscada.html"  # 200
for f in $(ls /Users/ezequiel/Downloads/lm/*.html | xargs -n1 basename | grep -v copia | grep -v '^Genebre-'); do c=$(curl -s -o /dev/null -w "%{http_code}" "$U/$f"); [ "$c" = 200 ] || echo "FALLA $f $c"; done; echo "55 URLs revisadas"
```
Esperado: exactamente los códigos de los comentarios, y ninguna línea `FALLA`.

- [ ] **Paso 3: Lighthouse (informativo en esta fase)**

```bash
source infra/prueba.env; mkdir -p capturas
for ruta in "" valvula-esferica.html productos/genebre-2025-valvula-esferica-inox-3-piezas-roscada.html; do
  npx --yes lighthouse "https://$DOMINIO_PRUEBA/$ruta" --quiet --chrome-flags="--headless=new" --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=capturas/lh.json >/dev/null
  node -e 'const r=require("./capturas/lh.json");console.log(process.argv[1]||"inicio",Object.fromEntries(Object.entries(r.categories).map(([k,v])=>[k,Math.round(v.score*100)])),"crawlable:",r.audits["is-crawlable"].score)' "$ruta"
done
```
Esperado: rendimiento, accesibilidad y buenas prácticas ≥ 90. El puntaje de SEO **va a salir bajo en prueba** por el `noindex`, que es buscado: la auditoría `is-crawlable` da 0. Anotar los números y cualquier otra auditoría de SEO o accesibilidad que falle; lo que no sea `is-crawlable` se corrige ahora.

- [ ] **Paso 4: Entrega para aprobación**

Mandarle al usuario la URL `https://$DOMINIO_PRUEBA/`, qué mirar (inicio, Válvulas esféricas, una ficha, el buscador, el celular) y aclarar que el resto de las categorías todavía muestra "Ficha PDF" hasta la Fase 2. Pedir la aprobación del diseño o los cambios.

---

### Tarea 14 (condicional): Dominio `nuevo.lmindustrial.com.ar`

Hacer solo cuando el registro de `.ar` publique los nameservers de la cuenta `318986392550` y el certificado de prueba esté emitido. Verificar con:
`AWS_PROFILE=lmindustrial aws acm describe-certificate --region us-east-1 --certificate-arn "$(grep CERT_PRUEBA infra/prueba.env | cut -d= -f2)" --query Certificate.Status --output text` → `ISSUED`.

**Archivos:**
- Crear: `sitio-nuevo/infra/dominio-prueba.sh`

- [ ] **Paso 1: Script**

```bash
#!/bin/bash
# Conecta nuevo.lmindustrial.com.ar al sitio de prueba (una sola vez, con el certificado ya emitido).
set -euo pipefail
cd "$(dirname "$0")"
export AWS_PROFILE=lmindustrial
source prueba.env
ZONA=Z02059532OAILISFF7HJ
[ "$(aws acm describe-certificate --region us-east-1 --certificate-arn "$CERT_PRUEBA" --query Certificate.Status --output text)" = "ISSUED" ] || { echo "El certificado todavía no está emitido"; exit 1; }

aws cloudfront get-distribution-config --id "$DIST_PRUEBA" > dist-actual.json
ETAG=$(node -p 'require("./dist-actual.json").ETag')
node -e '
const d = require("./dist-actual.json").DistributionConfig;
d.Aliases = { Quantity: 1, Items: ["nuevo.lmindustrial.com.ar"] };
d.ViewerCertificate = { ACMCertificateArn: process.argv[1], SSLSupportMethod: "sni-only", MinimumProtocolVersion: "TLSv1.2_2021", CertificateSource: "acm" };
require("fs").writeFileSync("dist-nueva.json", JSON.stringify(d));
' "$CERT_PRUEBA"
aws cloudfront update-distribution --id "$DIST_PRUEBA" --if-match "$ETAG" --distribution-config file://dist-nueva.json --query Distribution.Status --output text

for tipo in A AAAA; do
  aws route53 change-resource-record-sets --hosted-zone-id $ZONA --change-batch "{\"Changes\":[{\"Action\":\"UPSERT\",\"ResourceRecordSet\":{\"Name\":\"nuevo.lmindustrial.com.ar\",\"Type\":\"$tipo\",\"AliasTarget\":{\"HostedZoneId\":\"Z2FDTNDATAQYW2\",\"DNSName\":\"$DOMINIO_PRUEBA\",\"EvaluateTargetHealth\":false}}}]}" >/dev/null
done
rm -f dist-actual.json dist-nueva.json
echo "DOMINIO_PRUEBA=nuevo.lmindustrial.com.ar" >> prueba.env
echo "Listo: https://nuevo.lmindustrial.com.ar (en unos minutos)"
```

Nota: `prueba.env` queda con dos líneas `DOMINIO_PRUEBA=`; al hacer `source`, gana la última.

- [ ] **Paso 2: Correr y verificar**

Correr: `chmod +x infra/dominio-prueba.sh && ./infra/dominio-prueba.sh`
Después, cuando la distribución diga `Deployed`: `curl -sI https://nuevo.lmindustrial.com.ar/ | grep -iE "^(HTTP|x-robots-tag)"`
Esperado: `HTTP/2 200` y `x-robots-tag: noindex, nofollow`.
