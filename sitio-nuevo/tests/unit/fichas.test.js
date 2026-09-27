import { test } from "node:test";
import assert from "node:assert/strict";
import { validarFicha, MATERIALES, CONEXIONES } from "../../lib/fichas.js";

const buena = {
  pdf: "catalogos/X/GENEBRE-2025.pdf", ficha: true,
  id: "genebre-2025-valvula-esferica-inox-3-piezas-roscada",
  marca: "Genebre", modelo: "2025", nombre: "Válvula esférica inox 3 piezas roscada",
  descripcion: "Válvula de esfera de paso total en 3 piezas, cuerpo de acero inoxidable CF8M y extremos roscados ISO 7-1.",
  specs: [{ clave: "Material del cuerpo", valor: "Inox" }, { clave: "Presión máxima de trabajo", valor: "63 bar" }],
  destacados: ["Material del cuerpo", "Presión máxima de trabajo"],
  caracteristicas: ["Paso total"],
  filtros: { material: "Inox", conexion: "Roscada" },
  fuente: "texto",
};

test("una ficha correcta no tiene problemas", () => {
  assert.deepEqual(validarFicha(buena), []);
});

test("detecta id que no coincide con marca, modelo y nombre", () => {
  assert.deepEqual(validarFicha({ ...buena, id: "otra-cosa" }), ["id debería ser genebre-2025-valvula-esferica-inox-3-piezas-roscada"]);
});

test("detecta campos faltantes, descripción fuera de rango y destacados inexistentes", () => {
  const problemas = validarFicha({ ...buena, marca: "", descripcion: "Corta.", destacados: ["No existe"] });
  assert.ok(problemas.includes("falta marca"));
  assert.ok(problemas.some((p) => p.startsWith("descripción de 6 caracteres")));
  assert.ok(problemas.includes('destacado "No existe" no está en specs'));
});

test("los filtros usan el vocabulario acordado", () => {
  assert.ok(MATERIALES.includes("Inox") && CONEXIONES.includes("Roscada"));
  assert.deepEqual(validarFicha({ ...buena, filtros: { material: "Acero Inoxidable 316" } }), ['material "Acero Inoxidable 316" fuera del vocabulario']);
  assert.deepEqual(validarFicha({ ...buena, filtros: { color: "Rojo" } }), ["filtro desconocido: color"]);
});

test("rechaza 'distribuidor oficial', precios y fuente inválida", () => {
  const problemas = validarFicha({ ...buena, descripcion: buena.descripcion + " Somos distribuidor oficial.", caracteristicas: ["Precio: USD 100"], fuente: "otra" });
  assert.ok(problemas.includes('dice "distribuidor oficial"'));
  assert.ok(problemas.includes("menciona precios"));
  assert.ok(problemas.includes("fuente debe ser texto o imagen"));
});
