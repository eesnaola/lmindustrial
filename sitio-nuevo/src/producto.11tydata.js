import { resumir } from "../lib/texto.js";
import { marcaYModelo } from "../lib/catalogo.js";

export default {
  indexar: true,
  eleventyComputed: {
    titulo: (d) => `${d.p.nombre} – ${marcaYModelo(d.p)} | LM Industrial`,
    // Empieza por marca y modelo (citada sola, se sabe de qué producto habla) y no corta a mitad de frase.
    descripcion: (d) => resumir(`${marcaYModelo(d.p)}: ${d.p.descripcion}`, 160),
  },
};
