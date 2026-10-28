import { resumir } from "../lib/texto.js";
import { marcaYModelo, tituloFicha } from "../lib/catalogo.js";

export default {
  indexar: true,
  eleventyComputed: {
    titulo: (d) => tituloFicha(d.p),
    // Empieza por marca y modelo (citada sola, se sabe de qué producto habla) y no corta a mitad de frase.
    descripcion: (d) => resumir(`${marcaYModelo(d.p)}: ${d.p.descripcion}`, 160),
  },
};
