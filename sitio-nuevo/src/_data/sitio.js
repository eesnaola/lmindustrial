import { readFileSync } from "node:fs";

const SUPERFICIE_LOGO = 4800;
const ALTO_MAXIMO_LOGO = 46;

export default {
  entorno: process.env.SITIO === "produccion" ? "produccion" : "prueba",
  url: "https://www.lmindustrial.com.ar",
  nombre: "LM Industrial",
  descripcion: "LM Industrial comercializa válvulas e insumos industriales en Argentina, con envíos a todo el país.",
  whatsapp: "5491131809499",
  telefono_visible: "11 3180-9499",
  telefono_tel: "+5491131809499",
  email: "info@lmindustrial.com.ar",
  envios: "Envíos a todo el país",
  ga4: "G-VMTZYT8BEQ",
  // Marcas con logo propio y productos en el catálogo, ordenadas por cantidad de productos.
  // Logos recortados por scripts/preparar-logos.sh; el ancho se calcula para igualar la superficie visual.
  marcas: [
    ["Genebre", "genebre"], ["Intor", "intor"], ["Brahma", "brahma"], ["Honeywell", "honeywell"], ["Novus", "novus"],
    ["Satronic", "satronic"], ["Danfoss", "danfoss"], ["ALRE", "alre"], ["Thermoval", "thermoval"], ["Fantini Cosmi", "fantini_cosmi"],
  ].map(([nombre, archivo]) => {
    const logo = `sitio-nuevo/fuentes-img/marcas/${archivo}.png`;
    const png = readFileSync(new URL(`../../fuentes-img/marcas/${archivo}.png`, import.meta.url));
    const proporcion = png.readUInt32BE(16) / png.readUInt32BE(20);
    const alto = Math.min(Math.sqrt(SUPERFICIE_LOGO / proporcion), ALTO_MAXIMO_LOGO);
    return { nombre, logo, ancho: Math.round(alto * proporcion) };
  }),
};
