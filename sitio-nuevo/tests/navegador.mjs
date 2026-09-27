// $eval y $$eval son de puppeteer: ejecutan la función dentro del navegador de prueba (no es eval de JavaScript).
import puppeteer from "puppeteer-core";
import { readFileSync } from "node:fs";
import { iniciarServidor } from "./servidor.js";

// En la Mac usa el Chrome instalado; en GitHub Actions, el de Linux (CHROME_PATH).
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const fichas = JSON.parse(readFileSync(new URL("../src/_data/productos.json", import.meta.url), "utf8")).filter((p) => p.ficha);
const { url, cerrar } = await iniciarServidor();
const navegador = await puppeteer.launch({ executablePath: CHROME, headless: true, args: process.env.CI ? ["--no-sandbox"] : [] });
const pag = await navegador.newPage();
let fallas = 0;

async function prueba(nombre, fn) {
  try { await fn(); console.log(`✓ ${nombre}`); } catch (e) { fallas += 1; console.log(`✗ ${nombre}: ${e.message}`); }
}
function afirmar(condicion, mensaje) { if (!condicion) throw new Error(mensaje); }

async function buscar(q) {
  await pag.goto(`${url}/buscar.html?q=${encodeURIComponent(q)}`);
  await pag.waitForFunction(() => {
    const m = document.querySelector(".pagefind-ui__message");
    return m && !/^Buscando/.test(m.textContent);
  }, { timeout: 15000 });
  return pag.$$eval(".pagefind-ui__result-link", (as) => as.map((a) => a.getAttribute("href")));
}

await prueba('búsqueda "2025" encuentra la Genebre 2025', async () => {
  const r = await buscar("2025"); afirmar(r.some((h) => h.includes("genebre-2025")), JSON.stringify(r));
});
await prueba("los resultados de búsqueda muestran la foto del producto", async () => {
  await buscar("2025");
  const foto = await pag.$eval(".pagefind-ui__result", (r) => r.querySelector("img")?.getAttribute("src") ?? "");
  afirmar(/\/img\/opt\/VEInRo-250\.(webp|jpeg)$/.test(foto), `foto del primer resultado: "${foto}"`);
});
await prueba('búsqueda sin acentos: "valvula esferica"', async () => {
  const r = await buscar("valvula esferica"); afirmar(r.some((h) => h.includes("valvula-esferica")), JSON.stringify(r.slice(0, 5)));
});
await prueba('búsqueda en mayúsculas: "ESFÉRICA"', async () => {
  const r = await buscar("ESFÉRICA"); afirmar(r.length > 0, "sin resultados");
});
await prueba('búsqueda "genebre"', async () => {
  const r = await buscar("genebre"); afirmar(r.length > 0, "sin resultados");
});
await prueba('búsqueda "solenoide gas" encuentra la categoría', async () => {
  const r = await buscar("solenoide gas"); afirmar(r.some((h) => h.includes("valvula-solenoide-gas")), JSON.stringify(r.slice(0, 5)));
});
await prueba("búsqueda sin resultados", async () => {
  const r = await buscar("zzzqqqxx"); afirmar(r.length === 0, JSON.stringify(r));
});
await prueba("el buscador del encabezado lleva a la página de búsqueda", async () => {
  await pag.goto(`${url}/valvula-esferica.html`);
  await pag.type("#q", "2526A");
  await Promise.all([pag.waitForNavigation(), pag.keyboard.press("Enter")]);
  afirmar(pag.url().includes("/buscar.html?q=2526A"), pag.url());
});
await prueba("filtros de válvulas esféricas", async () => {
  await pag.goto(`${url}/valvula-esferica.html`);
  const total = await pag.$$eval(".grilla--productos .tarjeta", (ts) => ts.length);
  await pag.click('[data-faceta="material"] button[data-valor="Inox"]');
  const visibles = await pag.$$eval(".grilla--productos .tarjeta:not([hidden])", (ts) => ts.map((t) => t.dataset.material));
  afirmar(visibles.length > 0 && visibles.length < total, `visibles ${visibles.length} de ${total}`);
  afirmar(visibles.every((m) => m === "Inox"), JSON.stringify(visibles));
  await pag.click('[data-faceta="material"] button[data-valor=""]');
  const todas = await pag.$$eval(".grilla--productos .tarjeta:not([hidden])", (ts) => ts.length);
  afirmar(todas === total, `después de "Todas": ${todas} de ${total}`);
});

await pag.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await prueba("el menú de celular abre y muestra las categorías", async () => {
  await pag.goto(`${url}/`);
  await pag.click(".navegacion__movil summary");
  const visibles = await pag.$$eval(".navegacion__movil a", (as) => as.filter((a) => a.offsetParent !== null).length);
  afirmar(visibles >= 6, `${visibles} enlaces visibles`);
});
const rutas = ["/", "/valvula-esferica.html", "/valvulas-industriales.html", "/valvula-esferica-comandos.html", "/contacto.html", "/404.html", "/buscar.html?q=esferica", ...fichas.map((p) => `/productos/${p.id}.html`)];
for (const ruta of rutas) {
  await prueba(`sin scroll horizontal a 390 px: ${ruta}`, async () => {
    await pag.goto(url + ruta, { waitUntil: "networkidle0" });
    const ancho = await pag.evaluate(() => document.documentElement.scrollWidth);
    afirmar(ancho <= 390, `scrollWidth ${ancho}`);
  });
}

await navegador.close();
cerrar();
console.log(fallas ? `${fallas} prueba(s) fallaron` : "Todas las pruebas de navegador pasaron");
process.exit(fallas ? 1 : 0);
