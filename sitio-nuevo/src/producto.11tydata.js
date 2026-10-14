import { recortar } from "../lib/texto.js";
import { marcaVisible } from "../lib/catalogo.js";

export default {
  indexar: true,
  eleventyComputed: {
    titulo: (d) => `${d.p.nombre} – ${marcaVisible(d.p)} ${d.p.modelo} | LM Industrial`,
    descripcion: (d) => recortar(d.p.descripcion, 155),
  },
};
