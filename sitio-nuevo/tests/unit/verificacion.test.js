import { test } from "node:test";
import assert from "node:assert/strict";
import { extraerNumeros, verificarFicha } from "../../lib/verificacion.js";

test("extrae números normalizando guiones, signos, comas decimales, fracciones y superíndices", () => {
  assert.deepEqual(extraerNumeros("−25 °C a +180 °C"), ["25", "180"]);
  assert.deepEqual(extraerNumeros("Presión 0,5 bar"), ["0.5"]);
  assert.deepEqual(extraerNumeros('Medidas ½" a 1 ¼"'), ["1/2", "1", "1/4"]);
  assert.deepEqual(extraerNumeros("19 Kg/cm2"), ["19", "2"]);
  assert.deepEqual(extraerNumeros("19 kg/cm²"), ["19", "2"]);
  assert.deepEqual(extraerNumeros("Acero inox 1.4408 (CF8M)"), ["1.4408", "8"]);
});

test("verificarFicha aprueba cuando todos los números están en el PDF", () => {
  const pdf = "ARTICULO: 2025\n10. Presión de trabajo máxima 63 bar.\n11. Temperatura de trabajo –25 ºC + 180 ºC.";
  const ficha = { modelo: "2025", descripcion: "Válvula de esfera.", specs: [{ clave: "Presión máxima de trabajo", valor: "63 bar" }, { clave: "Temperatura de trabajo", valor: "−25 °C a +180 °C" }], caracteristicas: [] };
  assert.deepEqual(verificarFicha(ficha, pdf), { ok: true, no_encontrados: [] });
});

test("verificarFicha marca los números que no están en el PDF", () => {
  const pdf = "ARTICULO: 2025 Presión de trabajo máxima 63 bar";
  const ficha = { modelo: "2025", specs: [{ clave: "Presión", valor: "64 bar" }], caracteristicas: ["Hasta 250 °C"] };
  assert.deepEqual(verificarFicha(ficha, pdf), { ok: false, no_encontrados: ["64", "250"] });
});
