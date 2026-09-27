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

const TARJETA = /class="team-member">\s*<a href="([^"]+)"><img src="([^"]+)"[^>]*>(?:<\/img>)?<\/a>\s*<h[34][^>]*>([\s\S]*?)<\/h[34]>/gi;

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
