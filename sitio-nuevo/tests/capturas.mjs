import puppeteer from "puppeteer-core";
import { mkdirSync, readFileSync } from "node:fs";
import { iniciarServidor } from "./servidor.js";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const primeraFicha = JSON.parse(readFileSync(new URL("../src/_data/productos.json", import.meta.url), "utf8")).find((p) => p.ficha);
const paginas = {
  inicio: "/", categoria: "/valvula-esferica.html", rama: "/valvulas-industriales.html",
  producto: `/productos/${primeraFicha.id}.html`, contacto: "/contacto.html", buscar: "/buscar.html?q=esferica", "404": "/404.html",
};
const pantallas = { escritorio: { width: 1366, height: 900 }, celular: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } };

mkdirSync(new URL("../capturas/", import.meta.url), { recursive: true });
const { url, cerrar } = await iniciarServidor();
const navegador = await puppeteer.launch({ executablePath: CHROME, headless: true });
const pag = await navegador.newPage();
for (const [nombrePantalla, viewport] of Object.entries(pantallas)) {
  await pag.setViewport(viewport);
  for (const [nombre, ruta] of Object.entries(paginas)) {
    await pag.goto(url + ruta, { waitUntil: "networkidle0" });
    // Recorre la página para que carguen las fotos con loading="lazy" antes de la captura completa.
    await pag.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
      window.scrollTo(0, 0);
    });
    await pag.waitForNetworkIdle({ idleTime: 300, timeout: 10000 }).catch(() => {});
    const archivo = new URL(`../capturas/${nombre}-${nombrePantalla}.png`, import.meta.url).pathname;
    await pag.screenshot({ path: archivo, fullPage: true });
    console.log(archivo);
  }
}
await navegador.close();
cerrar();
