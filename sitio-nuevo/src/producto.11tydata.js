import { recortar } from "../lib/texto.js";
import { marcaYModelo } from "../lib/catalogo.js";

export default {
  indexar: true,
  eleventyComputed: {
    titulo: (d) => `${d.p.nombre} – ${marcaYModelo(d.p)} | LM Industrial`,
    descripcion: (d) => recortar(d.p.descripcion, 155),
  },
};
