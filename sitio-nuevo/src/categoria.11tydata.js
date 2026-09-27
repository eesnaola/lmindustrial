export default {
  indexar: true,
  eleventyComputed: {
    titulo: (d) => d.cat.titulo_seo,
    descripcion: (d) => d.cat.descripcion_seo,
  },
};
