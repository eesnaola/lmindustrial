import { test } from "node:test";
import assert from "node:assert/strict";
import { slugificar, oracion, recortar } from "../../lib/texto.js";

test("slugificar quita acentos, símbolos y espacios", () => {
  assert.equal(slugificar("Genebre 2025 Válvula esférica inox 3 piezas, roscada"), "genebre-2025-valvula-esferica-inox-3-piezas-roscada");
  assert.equal(slugificar('Ñandú 1/2" PN16'), "nandu-1-2-pn16");
  assert.equal(slugificar("  --Hola--  "), "hola");
});

test("oracion pasa a minúscula salvo la primera letra, siglas, números y marcas", () => {
  assert.equal(oracion("Válvula Esférica Inox Roscada"), "Válvula esférica inox roscada");
  assert.equal(oracion("Válvula Esférica Latón ISO-5211"), "Válvula esférica latón ISO-5211");
  assert.equal(oracion("Válvula Esférica Inox 2000 WOG"), "Válvula esférica inox 2000 WOG");
  assert.equal(oracion("Válvula Esférica Intor", ["Intor"]), "Válvula esférica Intor");
  assert.equal(oracion("Presostato Fantini Cosmi", ["Fantini Cosmi"]), "Presostato Fantini Cosmi");
});

test("recortar corta en una palabra y agrega puntos suspensivos", () => {
  assert.equal(recortar("corto", 155), "corto");
  assert.equal(recortar("uno dos tres cuatro", 10), "uno dos…");
  assert.equal(recortar("unapalabralarguísima", 8), "unapala…");
});
