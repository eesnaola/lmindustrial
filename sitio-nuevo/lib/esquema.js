// Datos estructurados (JSON-LD de schema.org) de cada tipo de página, armados con los mismos datos que se muestran.
// Regla: nada que no esté en la página. Sin precio no hay Offer (Google lo tomaría como dato falso).
import { urlProducto } from "./catalogo.js";

const absoluta = (sitio, ruta) => new URL(ruta, sitio.url + "/").href;
const ids = (sitio) => ({
  organizacion: `${sitio.url}/#organizacion`,
  sitio: `${sitio.url}/#sitio`,
});

function comunes(sitio) {
  const id = ids(sitio);
  return [
    {
      "@type": "Organization",
      "@id": id.organizacion,
      name: sitio.nombre,
      ...(sitio.razon_social ? { legalName: sitio.razon_social } : {}),
      ...(sitio.cuit ? { taxID: sitio.cuit } : {}),
      url: `${sitio.url}/`,
      logo: absoluta(sitio, "/assets/img/apple-touch-icon.png"),
      description: sitio.descripcion,
      email: sitio.email,
      telephone: sitio.telefono_tel,
      // Solo localidad: la dirección no se publica.
      ...(sitio.localidad
        ? { address: { "@type": "PostalAddress", addressLocality: sitio.localidad, addressRegion: sitio.provincia, addressCountry: "AR" } }
        : {}),
      ...(sitio.instagram || sitio.google_maps ? { sameAs: [sitio.instagram, sitio.google_maps].filter(Boolean) } : {}),
      areaServed: { "@type": "Country", name: "Argentina" },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "sales",
        telephone: sitio.telefono_tel,
        email: sitio.email,
        areaServed: "AR",
        availableLanguage: ["es"],
      },
    },
    {
      "@type": "WebSite",
      "@id": id.sitio,
      name: sitio.nombre,
      url: `${sitio.url}/`,
      inLanguage: "es-AR",
      publisher: { "@id": id.organizacion },
    },
  ];
}

// Copia exacta de las migas visibles; el último ítem (la página actual) va sin URL, como pide Google.
export function migasEsquema(sitio, migas) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: migas.map((m, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: m.nombre,
      ...(i < migas.length - 1 ? { item: absoluta(sitio, m.url) } : {}),
    })),
  };
}

function pagina(sitio, tipo, url, nombre, extra = {}) {
  const id = ids(sitio);
  return {
    "@type": tipo,
    "@id": `${url}#pagina`,
    url,
    name: nombre,
    inLanguage: "es-AR",
    isPartOf: { "@id": id.sitio },
    ...extra,
  };
}

export function esquemaInicio(sitio, { titulo, descripcion }) {
  const url = `${sitio.url}/`;
  return grafo(sitio, [pagina(sitio, "WebPage", url, titulo, { description: descripcion, about: { "@id": ids(sitio).organizacion } })]);
}

export function esquemaContacto(sitio, { titulo, descripcion, ruta, migas }) {
  const url = absoluta(sitio, ruta);
  return grafo(sitio, [
    pagina(sitio, "ContactPage", url, titulo, { description: descripcion, about: { "@id": ids(sitio).organizacion } }),
    migasEsquema(sitio, migas),
  ]);
}

export function esquemaEmpresa(sitio, { titulo, descripcion, ruta, migas }) {
  const url = absoluta(sitio, ruta);
  return grafo(sitio, [
    pagina(sitio, "AboutPage", url, titulo, { description: descripcion, about: { "@id": ids(sitio).organizacion } }),
    migasEsquema(sitio, migas),
  ]);
}

// Página de texto común (por ejemplo, la política de privacidad).
export function esquemaPagina(sitio, { titulo, descripcion, ruta, migas }) {
  const url = absoluta(sitio, ruta);
  return grafo(sitio, [pagina(sitio, "WebPage", url, titulo, { description: descripcion }), migasEsquema(sitio, migas)]);
}

// Categoría: la lista de lo que se ve en la grilla (productos o, si no hay, subcategorías), en el mismo orden.
export function esquemaCategoria(sitio, { cat, descripcion, ruta, migas, hijos, productos }) {
  const url = absoluta(sitio, ruta);
  const elementos = productos.length
    ? productos.map((p) => ({ name: p.nombre, url: absoluta(sitio, urlProducto(p)) }))
    : hijos.map((c) => ({ name: c.nombre, url: absoluta(sitio, `/${c.slug}.html`) }));
  return grafo(sitio, [
    pagina(sitio, "CollectionPage", url, cat.nombre, {
      description: descripcion,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: elementos.length,
        itemListElement: elementos.map((e, i) => ({ "@type": "ListItem", position: i + 1, ...e })),
      },
    }),
    migasEsquema(sitio, migas),
  ]);
}

export function esquemaProducto(sitio, { p, ruta, migas, imagen }) {
  const url = absoluta(sitio, ruta);
  const producto = {
    "@type": "Product",
    "@id": `${url}#producto`,
    name: p.nombre,
    url,
    description: p.descripcion,
    ...(imagen ? { image: [absoluta(sitio, imagen)] } : {}),
    // "Genérica" no es una marca: se omite.
    ...(p.marca && p.marca !== "Genérica" ? { brand: { "@type": "Brand", name: p.marca } } : {}),
    ...(p.modelo ? { model: p.modelo } : {}),
    ...((p.specs ?? []).length
      ? { additionalProperty: p.specs.map((s) => ({ "@type": "PropertyValue", name: s.clave, value: s.valor })) }
      : {}),
    subjectOf: { "@type": "DigitalDocument", name: `Ficha técnica: ${p.nombre}`, encodingFormat: "application/pdf", url: absoluta(sitio, `/${p.pdf}`) },
  };
  return grafo(sitio, [
    pagina(sitio, "ItemPage", url, p.nombre, { mainEntity: { "@id": producto["@id"] } }),
    producto,
    migasEsquema(sitio, migas),
  ]);
}

function grafo(sitio, nodos) {
  return { "@context": "https://schema.org", "@graph": [...comunes(sitio), ...nodos] };
}

// Serializa para un <script type="application/ld+json">: "<" escapado para que ningún texto pueda cerrar el script.
export function jsonLd(objeto) {
  return JSON.stringify(objeto).replace(/</g, "\\u003c");
}
