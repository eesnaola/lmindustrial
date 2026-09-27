import { test } from "node:test";
import assert from "node:assert/strict";
import { crearCatalogo, urlProducto, urlWhatsapp, mensajeProducto, destacados } from "../../lib/catalogo.js";

const categorias = [
  { slug: "raiz", nombre: "Raíz", padre: null, hijos: ["hija"], productos: [], imagen: "a.jpg" },
  { slug: "hija", nombre: "Hija", padre: "raiz", hijos: [], productos: ["c/a.pdf", "c/b.pdf", "c/c.pdf", "c/d.pdf", "c/e.pdf", "c/f.pdf"], imagen: "b.jpg" },
];
const P = (pdf, extra = {}) => ({ pdf, imagen: "x.jpg", nombre: `Producto ${pdf}`, marca: "Genebre", ficha: false, categoria_principal: "hija", categorias: ["hija"], ...extra });
const productos = [
  P("c/a.pdf", { ficha: true, id: "a", modelo: "2025", filtros: { material: "Inox", conexion: "Roscada" }, specs: [{ clave: "Material", valor: "Inox" }], destacados: ["Material", "Inexistente"] }),
  P("c/b.pdf", { ficha: true, id: "b", modelo: "2034", filtros: { material: "Acero carbono", conexion: "Roscada" } }),
  P("c/c.pdf", { ficha: true, id: "c", modelo: "2027", filtros: { material: "Inox", conexion: "Roscada" } }),
  P("c/d.pdf"), P("c/e.pdf"), P("c/f.pdf"),
];
const cat = crearCatalogo(categorias, productos);

test("raíces, hijos y productos en orden", () => {
  assert.deepEqual(cat.raices().map((c) => c.slug), ["raiz"]);
  assert.deepEqual(cat.hijos("raiz").map((c) => c.slug), ["hija"]);
  assert.deepEqual(cat.productos("hija").map((p) => p.pdf), ["c/a.pdf", "c/b.pdf", "c/c.pdf", "c/d.pdf", "c/e.pdf", "c/f.pdf"]);
  assert.deepEqual(cat.fichas.map((p) => p.id), ["a", "b", "c"]);
});

test("migas de categoría y de producto", () => {
  assert.deepEqual(cat.migas("hija"), [
    { nombre: "Inicio", url: "/" }, { nombre: "Raíz", url: "/raiz.html" }, { nombre: "Hija", url: "/hija.html" },
  ]);
  assert.deepEqual(cat.migasProducto(productos[0]).at(-1), { nombre: "Producto c/a.pdf", url: "/productos/a.html" });
});

test("urlProducto: con ficha va a su página; sin ficha, al PDF", () => {
  assert.equal(urlProducto(productos[0]), "/productos/a.html");
  assert.equal(urlProducto(productos[3]), "/c/d.pdf");
});

test("facetas: solo con 6+ productos y 2+ valores; ignora productos sin ficha", () => {
  assert.deepEqual(cat.facetas("hija"), [{ clave: "material", titulo: "Material", valores: ["Acero carbono", "Inox"] }]);
  assert.deepEqual(cat.facetas("raiz"), []);
});

test("relacionados: misma categoría principal, con ficha, sin el propio", () => {
  assert.deepEqual(cat.relacionados(productos[0]).map((p) => p.id), ["b", "c"]);
});

test("destacados ignora claves que no están en specs", () => {
  assert.deepEqual(destacados(productos[0]), [{ clave: "Material", valor: "Inox" }]);
  assert.deepEqual(destacados(productos[3]), []);
});

test("WhatsApp codifica acentos, comillas de pulgada, barras y guiones largos", () => {
  assert.equal(
    urlWhatsapp("5491131809499", 'Hola, quiero consultar por Genebre 2025 – Válvula 1/2" inox'),
    "https://wa.me/5491131809499?text=Hola%2C%20quiero%20consultar%20por%20Genebre%202025%20%E2%80%93%20V%C3%A1lvula%201%2F2%22%20inox",
  );
  assert.equal(mensajeProducto(productos[0]), "Hola, quiero consultar por Genebre 2025 – Producto c/a.pdf");
});

test("una categoría inexistente da un error claro", () => {
  assert.throws(() => cat.migas("no-existe"), /Categoría inexistente: no-existe/);
});
