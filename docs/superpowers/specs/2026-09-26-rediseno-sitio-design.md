# Rediseño de lmindustrial.com.ar — Documento de diseño

Fecha: 2026-09-26 · Estado: para revisión

## 1. Objetivo

Rehacer el sitio de LM Industrial (distribuidor de válvulas, vapor, control de quemadores, automatización neumática, instrumentos de medición y anti incendio) para lograr, con igual prioridad:

1. **Más consultas** por WhatsApp, teléfono y mail.
2. **Aparecer en Google y en asistentes de IA** (SEO + GEO) cuando alguien busca un producto, un modelo o una marca.
3. **Que los clientes encuentren rápido la ficha técnica** que necesitan.

Se publica primero en un sitio de prueba; recién con la aprobación del cliente reemplaza al sitio actual.

## 2. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Dirección visual | "A · Catálogo técnico": claro, ordenado, buscador arriba, ficha resumida en cada tarjeta |
| Tarjeta de producto | Solo botón **"Ficha"** (sin "Cotizar") |
| "Ficha" abre | **Página propia del producto** (HTML) con especificaciones y descarga del PDF |
| Contenido de productos | Extraído de los PDFs por Claude; se muestra solo lo que dice el PDF |
| Mantenimiento | Lo hace Claude a pedido → sitio generado a partir de archivos de datos |
| Generador | **Eleventy** (plantillas Nunjucks) + **Pagefind** (buscador estático) |
| Sitio de prueba | Bucket y CloudFront propios en `nuevo.lmindustrial.com.ar`, bloqueado para buscadores |
| Marcas | "Marcas que comercializamos". **No** usar "distribuidor oficial" |
| Datos del negocio | WhatsApp y teléfono 11 3180-9499 · info@lmindustrial.com.ar · envíos a todo el país · sin dirección ni atención al público · sin datos de trayectoria |
| Logo | Se redibuja en SVG, idéntico al actual (no hay archivo original) |
| WhatsApp en ficha | Sí: botón "Consultar por WhatsApp" con el producto ya escrito en el mensaje |

## 3. Alcance

**Incluye:** plantilla y diseño nuevos; 54 páginas de categoría con la misma URL; ~261 páginas de producto nuevas; páginas de marcas, contacto, búsqueda y 404; logo SVG; SEO técnico, datos estructurados y GEO; analítica de consultas; infraestructura del sitio de prueba; pase a producción con vuelta atrás.

**No incluye:** precios, stock ni carrito; formulario con envío de mail (se reemplaza por WhatsApp, teléfono y mail); panel de administración; fotos nuevas; versión en inglés; blog.

## 4. Arquitectura

```
lm/                         ← carpeta actual (sitio viejo, sigue funcionando)
├── catalogos/              ← 261 PDFs, se reutilizan tal cual
├── img/                    ← fotos actuales, se reutilizan
├── deploy.sh               ← deploy del sitio viejo (excluye sitio-nuevo/ y docs/)
├── docs/superpowers/specs/ ← este documento
└── sitio-nuevo/
    ├── package.json        ← eleventy, @11ty/eleventy-img, pagefind
    ├── eleventy.config.js
    ├── deploy.sh           ← ./deploy.sh prueba | produccion
    ├── scripts/            ← extracción de PDFs y verificaciones
    ├── src/
    │   ├── _data/          ← sitio.json, categorias.json, productos.json, marcas.json
    │   ├── _includes/      ← layouts y componentes (Nunjucks)
    │   ├── assets/         ← CSS, JS, fuentes, logo SVG
    │   └── *.njk           ← plantillas de página
    └── _site/              ← salida generada (no se edita)
```

- **Build:** `npx @11ty/eleventy` genera `_site/`, después `npx pagefind --site _site` genera el índice del buscador.
- **Variable de entorno `SITIO=prueba|produccion`:** en prueba el `robots.txt` bloquea todo y el analytics no se carga. La URL canónica siempre es `https://www.lmindustrial.com.ar/...`.
- **PDFs:** no se copian a `_site`. El deploy los sincroniza aparte desde `lm/catalogos/`, en la misma ruta `/catalogos/...`.
- **Fotos:** `lm/img/` se copia tal cual para que las URLs viejas de imágenes sigan andando. Además, eleventy-img genera versiones WebP para las páginas nuevas.
- **Sin frameworks CSS ni jQuery.** Una hoja de estilos propia (objetivo < 25 KB) y JavaScript mínimo (menú móvil, filtros, carga diferida del buscador).

## 5. URLs y navegación

- **Inicio:** `/` (`index.html`).
- **Categorías:** las 54 URLs actuales, idénticas (`valvula-esferica.html`, `control-llama.html`, etc.). Se mantiene el árbol actual, incluidas las categorías que aparecen en dos ramas (por ejemplo, Vapor reutiliza páginas de Válvulas industriales).
- **Productos:** `/productos/{marca}-{modelo}-{descripcion}.html` (ej: `/productos/genebre-2025-valvula-esferica-inox-3-piezas-roscada.html`). Una sola página por producto aunque esté en varias categorías; las migas de pan usan la categoría principal.
- **Marcas:** `/marcas.html` y `/marcas/{marca}.html`.
- **Otras:** `/contacto.html`, `/buscar.html?q=…`, `/404.html` (CloudFront la usa para 403/404 con código 404).
- **PDFs:** mismas rutas `/catalogos/...`.
- **Redirecciones 301** (en la CloudFront Function existente, que se comparte entre prueba y producción):
  - `Genebre-valvula-esferica.html` → `valvula-esferica.html`
  - `Genebre-valvula-mariposa.html` → `valvula-mariposa.html`
  - `Genebre-Ode-valvula-solenoide.html` → `valvula-solenoide.html`
- **Encabezado:** logo · buscador · botón WhatsApp. **Barra de categorías:** las 6 principales; en escritorio despliegan subcategorías, en celular van en un menú lateral.
- **Migas de pan** en todas las páginas salvo el inicio.

## 6. Modelo de datos

**`sitio.json`:** nombre, URL, WhatsApp (`5491131809499`), teléfono visible (`11 3180-9499`), mail, texto "Envíos a todo el país", ID de GA4 (`G-VMTZYT8BEQ`).

**`categorias.json`:** lista de categorías con:
- `slug`: nombre del archivo actual sin `.html`.
- `nombre` y `h1`.
- `titulo_seo` y `descripcion_seo` (hasta ~155 caracteres).
- `intro`: 2 a 4 oraciones.
- `faqs`: pares pregunta/respuesta, solo en las categorías principales.
- `padre` e `hijos`, estos últimos ordenados como hoy.
- `productos`: IDs en el orden actual.
- `imagen`: la foto actual de la tarjeta.

**`productos.json`:**
```json
{
  "id": "genebre-2025-valvula-esferica-inox-3-piezas-roscada",
  "marca": "Genebre",
  "modelo": "2025",
  "nombre": "Válvula esférica inox 3 piezas roscada",
  "categoria_principal": "valvula-esferica",
  "categorias": ["valvula-esferica"],
  "descripcion": "Válvula de esfera de paso total en 3 piezas, cuerpo de acero inoxidable CF8M y extremos roscados ISO 7-1. Admite montaje directo de actuador según ISO 5211.",
  "specs": [
    {"clave": "Material del cuerpo", "valor": "Acero inoxidable 1.4408 (CF8M)"},
    {"clave": "Extremos", "valor": "Roscados ISO 7-1 (EN 10226-1)"},
    {"clave": "Presión máxima de trabajo", "valor": "63 bar"},
    {"clave": "Temperatura de trabajo", "valor": "−25 °C a +180 °C"}
  ],
  "destacados": ["Material del cuerpo", "Presión máxima de trabajo", "Temperatura de trabajo"],
  "caracteristicas": ["Paso total", "Eje inexpulsable", "Sistema de bloqueo", "Montaje directo de actuador ISO 5211"],
  "pdf": "catalogos/Valvula-Esferica/GENEBRE-Valvula-Esferica-2025.pdf",
  "imagen": "img/iconos/VEInRo.jpg",
  "fuente": "texto",
  "verificacion": {"ok": true, "no_encontrados": []}
}
```
- `destacados`: 3 claves de `specs` que se muestran en la tarjeta.
- `fuente`: `texto` si salió de pdftotext, `imagen` si hubo que leer el PDF escaneado.
- `verificacion`: resultado del chequeo automático de la sección 7.

**`marcas.json`:** `slug`, `nombre`, `logo` (de `img/logos/` si existe), `intro` (1 o 2 oraciones factuales). Los productos de cada marca se calculan a partir de `productos.json`.

## 7. Contenido y verificación

1. **Inventario:** se recorren las tarjetas de las 58 páginas actuales para armar la lista de productos: PDF, foto, nombre actual y categorías donde aparece. Da 261 PDFs distintos.
2. **Extracción:**
   - 243 PDFs con texto: `pdftotext -layout`.
   - 18 escaneados (lista en `scripts/`): se convierten las páginas a imagen y se leen visualmente.
   - Se usa la parte en castellano; los PDFs son bilingües.
3. **Armado de la ficha:** Claude completa los campos de la sección 6 **solo con información presente en el PDF**. Si un dato no está, el campo no se incluye.
4. **Verificación automática** (`scripts/verificar-fichas.js`):
   - Extrae todos los números con unidad de `specs` y `caracteristicas` (bar, kg/cm², °C, ", mm, V, W, etc.) y los busca en el texto del PDF, normalizando espacios, comas y guiones.
   - Si falta alguno, la ficha queda con `verificacion.ok = false` y entra en la lista de revisión manual. Las fichas de `fuente: imagen` siempre entran en la lista.
5. **Textos de categoría y FAQs:** contenido técnico general y lo que efectivamente hay en el catálogo de esa categoría. Sin precios, stock, plazos ni promesas comerciales.
6. **Tono:** español rioplatense, profesional y directo.
7. **Revisión del cliente:** por muestreo en el sitio de prueba, más la lista de fichas marcadas. Opcionalmente, una planilla `.xlsx` con todos los datos.

## 8. Diseño visual

- **Colores:** primario `#135a56`, primario oscuro `#104a47`, fondo `#f5f7f7`, superficie `#ffffff`, texto `#1d2324`, texto secundario `#4a5556`, bordes `#e0e6e6`. Contraste mínimo AA.
- **Tipografía:** IBM Plex Sans autoalojada (woff2, subconjunto latino, pesos 400/600/700).
- **Logo:** SVG redibujado del actual: el isotipo "LM" y el texto "LM INDUSTRIAL", en versión verde (para fondo claro) y blanca.
- **Componentes:**
  - Encabezado, barra de categorías, migas de pan, tarjeta de categoría.
  - Tarjeta de producto: foto, "MARCA · MODELO", nombre, 3 especificaciones y botón "Ficha".
  - Tabla de especificaciones, filtros tipo chip, bloque "Cómo comprar", pie.
- **Filtros:** en categorías con 6 o más productos, cuando haya al menos 2 valores distintos de "Material" o "Extremos/Conexión". Filtrado en el navegador.
- **Celular primero:** tarjetas de a 2 por fila, áreas táctiles de al menos 44 px, encabezado compacto (logo, buscar, WhatsApp, menú).

## 9. Páginas

- **Inicio:**
  - Frase de valor y buscador.
  - 6 categorías con sus fotos actuales.
  - Franja "Marcas que comercializamos".
  - "Cómo comprar" en 3 pasos: buscá el producto y su ficha → escribinos por WhatsApp o mail con modelo, medida y cantidad → te cotizamos y enviamos a todo el país.
  - Contacto.
- **Categoría:** migas, H1, intro, subcategorías (si hay), filtros (si aplica), grilla de productos y FAQs (si hay).
- **Producto:**
  - Migas, foto, "MARCA · MODELO", H1 con el nombre, descripción.
  - Botones "Descargar ficha PDF" y "Consultar por WhatsApp". El mensaje prearmado es: "Hola, quiero consultar por {marca} {modelo} – {nombre}".
  - Tabla de especificaciones, características y hasta 4 productos relacionados de la categoría principal.
- **Marcas:** índice con logos; cada marca con intro y sus productos agrupados por categoría.
- **Contacto:** WhatsApp, teléfono, mail, envíos a todo el país y cómo comprar.
- **Buscar:** interfaz de Pagefind con el parámetro `?q=`.
- **404:** mensaje, buscador y categorías.

## 10. SEO técnico

- **Títulos:** únicos por página.
  - Producto: `{nombre} – {marca} {modelo} | LM Industrial`.
  - Categoría: `titulo_seo`.
- **Meta descripción** única por página.
- **Estructura:** un H1 por página, `lang="es-AR"`, `alt` en todas las imágenes (a partir del nombre).
- **URL canónica** absoluta a `https://www.lmindustrial.com.ar/...`.
- **Open Graph** y tarjeta de Twitter, con la foto del producto o una imagen general del sitio.
- **`sitemap.xml` generado:** inicio, categorías, productos, marcas, contacto y PDFs.
- **`robots.txt`:** permite todo (incluidos GPTBot, ClaudeBot, PerplexityBot y Google-Extended) y declara el sitemap.
- **Datos estructurados (JSON-LD):**
  - `Organization` en todas las páginas: nombre, URL, logo, mail, teléfono, `contactPoint` y `areaServed: AR`. Sin dirección.
  - `WebSite` con `SearchAction` hacia `/buscar.html?q={search_term_string}`.
  - `BreadcrumbList` en todas las páginas salvo el inicio.
  - `ItemList` en categorías y marcas.
  - `Product` en cada ficha: `name`, `brand`, `model`/`mpn`, `description`, `image`, `category` y `additionalProperty` con las especificaciones. Sin `offers`.
  - `FAQPage` donde haya FAQs.
- **Rendimiento:**
  - Imágenes WebP con `width`/`height` y `loading="lazy"` debajo del primer pantallazo.
  - CSS crítico mínimo; el JavaScript del buscador se carga recién al usarlo.
  - Caché en CloudFront: `max-age` de 1 hora para HTML y de 1 año para assets con hash.

## 11. GEO

- Todo el contenido en HTML legible sin JavaScript; especificaciones en `<table>` reales.
- La misma descripción del negocio en inicio, contacto, pie y datos estructurados: "LM Industrial comercializa válvulas e insumos industriales en Argentina, con envíos a todo el país; consultas por WhatsApp al 11 3180-9499 o a info@lmindustrial.com.ar".
- **`llms.txt`** en la raíz: descripción del negocio, contacto y lista de categorías y marcas con sus URLs.
- FAQs con respuestas directas en las categorías principales.

## 12. Analítica

- **GA4 `G-VMTZYT8BEQ`** solo en producción. Se elimina Universal Analytics.
- **Eventos:**
  - `click_whatsapp` (parámetros `ubicacion`: encabezado | producto | contacto | pie; `producto`).
  - `click_telefono` y `click_email`.
  - `descarga_ficha` (parámetro `producto`).
  - `search` (parámetro `search_term`).

## 13. Infraestructura

- **Sitio de prueba:**
  - Bucket `lmindustrial-com-ar-nuevo` (privado, OAC existente `E172KWTR9CZJUM`).
  - Distribución CloudFront con la misma configuración que producción, más una *response headers policy* que agrega `X-Robots-Tag: noindex, nofollow`.
  - Dominio `nuevo.lmindustrial.com.ar`, con un certificado ACM propio y un alias en Route 53. Se habilita cuando el DNS esté delegado a Route 53; hasta entonces, se usa la URL `*.cloudfront.net`.
- **Redirecciones:** se agregan las 3 de la sección 5 a la función `lmindustrial-redirect-www` y se asocia la función a ambas distribuciones.
- **`sitio-nuevo/deploy.sh {prueba|produccion}`:**
  1. Build con la variable `SITIO` correspondiente.
  2. `aws s3 sync _site/ → bucket --delete --exclude "catalogos/*"`.
  3. `aws s3 sync ../catalogos/ → bucket/catalogos/`.
  4. Invalidación de CloudFront.
- **Pase a producción:**
  1. Activar el versionado en `lmindustrial-com-ar-web`.
  2. `./deploy.sh produccion`.
- **Vuelta atrás:** correr `lm/deploy.sh` (el del sitio viejo, que sigue en la carpeta).
- **`lm/deploy.sh`:** se agrega `--exclude "sitio-nuevo/*" --exclude "docs/*"`.

## 14. Pruebas y criterios de aceptación

Antes de cada publicación (`scripts/verificar-sitio.js` más Lighthouse):

1. **URLs viejas:** las 55 páginas actuales (inicio + 54 categorías) responden 200 en la misma URL; las 3 `Genebre-…` responden 301 a su categoría; los 261 PDFs responden 200 en la misma ruta.
2. **Productos:** cada uno tiene página, PDF existente, foto existente y al menos una categoría. Toda categoría con productos hoy los sigue teniendo.
3. **Enlaces:** 0 enlaces internos rotos en `_site`.
4. **Datos:** todas las fichas con `verificacion.ok = true` o revisadas a mano. JSON-LD parseable en todas las páginas, con los campos obligatorios de cada tipo.
5. **Lighthouse** (celular) en inicio, `valvula-esferica.html` y una ficha: rendimiento, SEO y accesibilidad ≥ 95; buenas prácticas ≥ 90.
6. **Buscador:** "2025" encuentra la Genebre 2025; "genebre" devuelve productos Genebre; "solenoide gas" devuelve productos de `valvula-solenoide-gas`.
7. **Diseño:** capturas en escritorio (1366 px) y celular (390 px) de inicio, categoría, producto, marcas y contacto.
8. **Prueba bloqueada para buscadores:** el sitio de prueba devuelve `X-Robots-Tag: noindex` y un `robots.txt` con `Disallow: /`.

## 15. Fases

1. **Base:** proyecto Eleventy, logo SVG, estilos, plantillas y la categoría Válvulas esféricas completa (14 productos) en el sitio de prueba → **aprobación del diseño real**.
2. **Fichas:** extracción y verificación de los 261 productos.
3. **Textos:** categorías, FAQs, marcas, inicio y contacto.
4. **SEO/GEO y analítica.**
5. **Control completo** (sección 14) y revisión del cliente.
6. **Pase a producción.**

## 16. Riesgos y dependencias

- **PDFs escaneados (18):** la lectura puede ser menos precisa; todos pasan por revisión manual.
- **Nombres de producto:** se parte de los nombres actuales de las tarjetas; el cliente puede pedir cambios en la revisión.
- **`nuevo.lmindustrial.com.ar`:** depende de que NIC Argentina publique la delegación a Route 53; mientras tanto se usa la URL de CloudFront.
- **Independencia de la migración de DNS:** el pase de `lmindustrial.com.ar` a CloudFront es independiente de este rediseño. El sitio nuevo puede salir antes o después.
