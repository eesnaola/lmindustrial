import { recortar } from "../lib/texto.js";

export default {
  indexar: true,
  eleventyComputed: {
    titulo: (d) => `${d.p.nombre} – ${d.p.marca} ${d.p.modelo} | LM Industrial`,
    descripcion: (d) => recortar(d.p.descripcion, 155),
  },
};
