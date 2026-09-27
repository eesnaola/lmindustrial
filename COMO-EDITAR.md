# Cómo cambiar algo del sitio de LM Industrial

No hace falta instalar nada: todo se hace desde el navegador, en GitHub.

La idea es simple:

1. Cambiás un texto en un archivo, en GitHub.
2. Guardás el cambio.
3. GitHub revisa que esté todo bien y, en unos 5 minutos, lo publica en **www.lmindustrial.com.ar**.

Si te equivocaste en algo (por ejemplo, borraste una coma), GitHub **no publica** y el sitio queda como estaba. No podés romper el sitio publicado.

---

## Antes de empezar

- Necesitás una cuenta de GitHub con permiso sobre este repositorio. Si no la tenés, pedísela a Ezequiel.
- El repositorio es: **https://github.com/eesnaola/lmindustrial**

> ⚠️ Los archivos `.html` que están sueltos en la carpeta principal son del **sitio viejo**. Ya no se publican: no los toques.
> El sitio actual está dentro de la carpeta **`sitio-nuevo`**.

---

## ¿Qué archivo tengo que abrir?

| Quiero cambiar… | Archivo |
|---|---|
| El teléfono, el WhatsApp, el mail o "Envíos a todo el país" | `sitio-nuevo/src/_data/sitio.js` |
| La descripción o los datos técnicos de un producto | `sitio-nuevo/src/_data/productos.json` |
| El texto de presentación de una categoría | `sitio-nuevo/src/_data/categorias.json` |
| Los textos de la página de inicio | `sitio-nuevo/src/index.njk` |
| Los pasos de "Cómo comprar" | `sitio-nuevo/src/_includes/parciales/pasos.njk` |
| El texto de la página de contacto | `sitio-nuevo/src/contacto.njk` |

---

## Paso a paso

### 1. Abrir el archivo

1. Entrá a https://github.com/eesnaola/lmindustrial.
2. Hacé clic en las carpetas hasta llegar al archivo (por ejemplo `sitio-nuevo` → `src` → `_data` → `productos.json`).
3. Arriba a la derecha del archivo, hacé clic en el **lápiz ✏️** ("Edit this file").

### 2. Encontrar lo que querés cambiar

Hacé clic dentro del texto y apretá **Cmd + F** (Mac) o **Ctrl + F** (Windows). Escribí algo que aparezca cerca de lo que buscás, por ejemplo el nombre del producto tal como se ve en el sitio.

### 3. Cambiar el texto

Cambiá **solo el texto que está entre comillas**. Por ejemplo, en `productos.json`:

```
"descripcion": "Válvula de esfera de paso total en 3 piezas, cuerpo de acero inoxidable CF8M y extremos roscados ISO 7-1.",
```

Podés cambiar lo que está entre las comillas de la derecha. **Reglas de oro:**

- No borres las comillas `"`, las comas `,` ni los signos `{ } [ ]`.
- No cambies lo que está a la izquierda de los dos puntos (`"descripcion":`).
- Si tu texto necesita comillas dobles (por ejemplo, pulgadas: `1/2"`), escribilas con una barra adelante: `1/2\"`.

### 4. Guardar ("commit")

1. Arriba a la derecha, hacé clic en **"Commit changes…"**.
2. En "Commit message" escribí en pocas palabras qué cambiaste (por ejemplo: *Actualizo descripción de la válvula 2025*).
3. Dejá marcada la opción **"Commit directly to the main branch"**.
4. Hacé clic en **"Commit changes"**.

Listo: con eso GitHub empieza a publicar.

---

## Chequear que se publicó

### En GitHub

1. Entrá a la pestaña **"Actions"** del repositorio.
2. Arriba de todo vas a ver **"Publicar en producción"** con tu mensaje:
   - 🟡 **Círculo amarillo**: se está publicando. Tarda unos 5 minutos.
   - ✅ **Tilde verde**: ya está publicado.
   - ❌ **Cruz roja**: algo estaba mal y **no se publicó** (el sitio sigue como antes). Mirá "Si sale la cruz roja", más abajo.

### En el sitio

1. Abrí https://www.lmindustrial.com.ar y andá a la página que cambiaste.
2. Recargá forzando: **Cmd + Shift + R** (Mac) o **Ctrl + F5** (Windows). También podés abrirla en una ventana de incógnito.
3. Si todavía no ves el cambio, esperá unos minutos y volvé a recargar.

---

## Si sale la cruz roja ❌

No pasa nada grave: el sitio no se tocó. Casi siempre es un error de formato, como una coma o una comilla borrada.

1. En **"Actions"**, hacé clic en la corrida con la cruz roja y fijate en qué paso falló.
   - Si falló **"Pruebas de lógica y datos"** o **"Generar el sitio de producción"**, casi seguro hay una coma o comilla de más o de menos en el archivo que editaste.
2. Para ver exactamente qué cambiaste: abrí el archivo y hacé clic en **"History"**. Entrá a tu cambio: lo que borraste aparece en rojo y lo que agregaste, en verde.
3. Corregí el archivo (lápiz ✏️) y volvé a hacer **"Commit changes"**.
4. Si no te das cuenta del error, pedile ayuda a Ezequiel: no hace falta apurarse, el sitio sigue funcionando.

---

## Mejor pedírselo a alguien técnico

Estas cosas tienen más partes que tocar y conviene pedirlas:

- Cambiar el **nombre**, la **marca** o el **modelo** de un producto (también cambia su dirección web).
- Agregar o sacar productos, o cambiar su PDF o su foto.
- Agregar o sacar categorías.
- Cambiar el diseño.

Para cambiar el **teléfono** en `sitio.js` hay que tocar tres líneas juntas, en formatos distintos:

```
whatsapp: "5491131809499",
telefono_visible: "11 3180-9499",
telefono_tel: "+5491131809499",
```

Si no estás seguro, pedilo.
