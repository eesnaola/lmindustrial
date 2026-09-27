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
