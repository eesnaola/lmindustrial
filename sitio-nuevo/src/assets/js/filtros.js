const grilla = document.querySelector("[data-grilla]");
const panel = document.querySelector("[data-filtros]");
const vacio = document.querySelector("[data-vacio]");

if (grilla && panel) {
  const activos = {};
  panel.hidden = false;
  panel.addEventListener("click", (evento) => {
    const chip = evento.target.closest("button[data-valor]");
    if (!chip) return;
    const grupo = chip.closest("[data-faceta]");
    grupo.querySelectorAll("button[data-valor]").forEach((b) => b.setAttribute("aria-pressed", String(b === chip)));
    activos[grupo.dataset.faceta] = chip.dataset.valor;
    let visibles = 0;
    grilla.querySelectorAll(".tarjeta").forEach((tarjeta) => {
      const coincide = Object.entries(activos).every(([clave, valor]) => !valor || tarjeta.dataset[clave] === valor);
      tarjeta.hidden = !coincide;
      if (coincide) visibles += 1;
    });
    vacio.hidden = visibles > 0;
  });
}
