import path from "node:path";
import { fileURLToPath } from "node:url";
import Image from "@11ty/eleventy-img";
import { recortar } from "./lib/texto.js";
import { urlProducto, urlWhatsapp, mensajeProducto, destacados } from "./lib/catalogo.js";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, "..");

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ [path.join(RAIZ, "img")]: "img" });
  for (const peso of [400, 600, 700]) {
    eleventyConfig.addPassthroughCopy({
      [`node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-${peso}-normal.woff2`]: `assets/fuentes/plex-${peso}.woff2`,
    });
  }

  eleventyConfig.addAsyncShortcode("foto", async (src, alt, ancho = 250, prioritaria = false) => {
    const meta = await Image(path.join(RAIZ, src), {
      widths: [ancho],
      formats: ["webp", "jpeg"],
      outputDir: path.join(AQUI, "_site/img/opt/"),
      urlPath: "/img/opt/",
      // Nombre del original en vez de un hash: el buscador indexa el nombre de la imagen de cada página.
      filenameFormat: (id, origen, ancho, formato) => `${path.parse(origen).name}-${ancho}.${formato}`,
    });
    // La foto prioritaria es la principal de la página: se la indica al buscador como imagen del resultado.
    const carga = prioritaria ? { fetchpriority: "high", "data-pagefind-meta": "image[src], image_alt[alt]" } : { loading: "lazy" };
    return Image.generateHTML(meta, { alt, decoding: "async", ...carga });
  });

  eleventyConfig.addFilter("recortar", recortar);
  eleventyConfig.addFilter("codificarRuta", (ruta) => encodeURI(ruta));
  eleventyConfig.addFilter("urlProducto", urlProducto);
  eleventyConfig.addFilter("urlWhatsapp", urlWhatsapp);
  eleventyConfig.addFilter("mensajeProducto", mensajeProducto);
  eleventyConfig.addFilter("destacados", destacados);

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    templateFormats: ["njk"],
    htmlTemplateEngine: "njk",
  };
}
