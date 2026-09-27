# Fichas de producto de LM Industrial — instrucciones para un lote

LM Industrial (Argentina) comercializa válvulas e insumos industriales. Su sitio nuevo muestra, para cada producto, una **ficha**: nombre claro, descripción corta, tabla de especificaciones y características, **extraídas del PDF de catálogo del producto**. Tu trabajo es armar las fichas de los PDFs de tu lote.

## Regla principal

**Solo datos que estén en el PDF.** Nada de aplicaciones, equivalencias, ventajas o cifras que el PDF no diga. Si un dato no está, no va. Nunca precios, stock, plazos de entrega (algunos PDFs tienen columna "P.V.P."; ignorala) ni la frase "distribuidor oficial". Tomá la parte en castellano (muchos PDFs son bilingües).

## Entradas y salida

- Tu lote: `/Users/ezequiel/Downloads/lm/.superpowers/fichas-fase2/entrada-N.json`. Cada elemento tiene `pdf` (ruta relativa a `/Users/ezequiel/Downloads/lm/`), `nombre_actual` (como figura hoy en el sitio, a veces abreviado), `marca_segun_archivo` (deducida del nombre del archivo, puede ser null o errónea), `categoria_nombre` y `escaneado` (true si el PDF es una imagen sin texto).
- Ejemplos de fichas terminadas (seguí este formato y este tono): `ejemplo-valvula.json` y `ejemplo-accesorio.json` en la misma carpeta.
- Tu salida: `/Users/ezequiel/Downloads/lm/.superpowers/fichas-fase2/lote-N.json` — **una lista JSON** con una ficha por cada PDF del lote, en el mismo orden.

## Cómo leer cada PDF

- Con texto: `pdftotext -layout "/Users/ezequiel/Downloads/lm/<pdf>" - 2>/dev/null | head -150` (leé más si hace falta).
- Escaneado: `mkdir -p /private/tmp/claude-501/-Users-ezequiel-Downloads-lm/15430ed0-22f4-4972-a600-752e43000d6e/scratchpad/fase2/lote-N && pdftoppm -r 110 -png "/Users/ezequiel/Downloads/lm/<pdf>" <esa carpeta>/<nombre>` y abrí las imágenes con la herramienta Read.

## Campos de cada ficha

```json
{
  "pdf": "catalogos/…/ARCHIVO.pdf",
  "id": "…",
  "marca": "Genebre",
  "modelo": "2415",
  "nombre": "Válvula de retención wafer inox",
  "descripcion": "…",
  "specs": [{ "clave": "…", "valor": "…" }],
  "destacados": ["…", "…", "…"],
  "caracteristicas": ["…"],
  "filtros": { "material": "Inox", "conexion": "Wafer" },
  "fuente": "texto"
}
```

- **marca**: como la escribe la marca: Genebre, Intor, Honeywell, Brahma, Novus, Satronic, Danfoss, ALRE, Thermoval, Fantini Cosmi, Siemens, Madas, Dungs, Instrubit, Trafag, etc. Tomala del PDF (logo o texto), no solo del nombre del archivo. Si el PDF no muestra ninguna marca, poné `"Genérica"` y reportalo.
- **modelo**: el artículo o modelo del PDF ("2415", "DKG 972", "N1200", "EVPC"). Si el PDF cubre varios modelos, juntalos ("MF2 / MF3") o usá el nombre de la serie ("Serie VE").
- **nombre**: descriptivo, en oración (solo la primera letra en mayúscula, salvo siglas y nombres propios), **sin la marca**: tipo de producto + rasgo distintivo + material o conexión si aplica. Ej: "Válvula de retención wafer inox", "Control de llama para quemadores de gas", "Presostato diferencial para aire". Dos productos de la misma categoría no pueden tener el mismo nombre: agregá lo que los distingue.
- **descripcion**: 2 o 3 oraciones, **entre 60 y 400 caracteres**, qué es y qué lo distingue, solo con datos del PDF. Tono profesional, español rioplatense neutro, sin adjetivos de marketing.
- **specs**: de 2 a ~9 pares clave/valor. Para válvulas, en este orden y solo las que estén: "Material del cuerpo", "Extremos", "Normas", "Presión máxima de trabajo", "Temperatura de trabajo", "Medidas disponibles", "Asientos", "Juntas", "Accionamiento". Para otros productos usá claves naturales ("Alimentación", "Salida", "Rango de medición", "Conexión", "Protección", "Temperatura de trabajo", "Tiempo de seguridad", "Montaje", "Materiales", …). Unidades como en el PDF, con formato `63 bar`, `−25 °C a +180 °C`, `1/2" a 4"`, `230 V CA`.
- **destacados**: de 1 a 3 claves de `specs`, las más útiles para elegir el producto (en válvulas, por defecto material, presión y temperatura).
- **caracteristicas**: puntos del PDF que no son cifras de specs ("Paso total", "Eje inexpulsable", "Rearme manual"). Puede ser lista vacía.
- **filtros**: **solo para válvulas**. `material` uno de: Inox, Acero carbono, Latón, Bronce, Hierro fundido, Hierro dúctil, Aluminio, PVC. `conexion` uno de: Roscada, Bridada, Socket weld, Soldar, Wafer, Lug, Clamp. Si no aplica o no está claro, omití la clave (o todo `filtros`).
- **fuente**: `"texto"` o `"imagen"` (escaneado).
- **id**: se calcula, no se inventa. Desde `/Users/ezequiel/Downloads/lm/sitio-nuevo`: `node -e 'import("./lib/texto.js").then(m=>console.log(m.slugificar(process.argv[1])))' "<marca> <modelo> <nombre>"`.
- **revision_manual**: `"ok"` **solo** en dos casos, después de haber comparado cada valor contra el PDF: (a) PDF escaneado; (b) el verificador marca un número que sí está en el PDF pero escrito distinto (por ejemplo, dos modelos unidos con barra "2040/2041" se leen como fracción; en textos preferí "2040 y 2041").

## Verificación obligatoria

Desde `/Users/ezequiel/Downloads/lm/sitio-nuevo`:

```
node scripts/verificar-lote.js /Users/ezequiel/Downloads/lm/.superpowers/fichas-fase2/lote-N.json
```

Compara cada número de la ficha con el texto del PDF y valida el formato. Corregí hasta que diga `Lote OK`. Si un número "no está en el PDF", normalmente es un error tuyo: revisalo antes de pensar en `revision_manual`.

## Límites

- Escribí **solo** tu `lote-N.json` y las imágenes temporales en tu carpeta del scratchpad. No modifiques ningún otro archivo (en particular `sitio-nuevo/src/_data/productos.json`).
- No corras `npm run build`, `deploy.sh`, `aws`, `npm run inventario`, `npm run verificar-fichas` ni `scripts/aplicar-lotes.js`.
- No lances subagentes.

## Qué devolver al terminar

Un resumen breve: cantidad de fichas, salida final de `verificar-lote.js`, la lista de fichas con `revision_manual` y el motivo, las que quedaron con marca `"Genérica"`, y cualquier PDF cuyo contenido no coincida con `nombre_actual` o que tenga dudas.
