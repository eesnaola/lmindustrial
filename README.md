# LM Industrial — sitio web

Sitio de **https://www.lmindustrial.com.ar**.

- **¿Querés cambiar un texto del sitio?** Seguí la guía [COMO-EDITAR.md](COMO-EDITAR.md). No hace falta instalar nada.
- Cada cambio que llega a `main` se prueba y se publica solo (GitHub Actions → "Publicar en producción").

## Qué hay en este repositorio

- `sitio-nuevo/`: el sitio actual (Eleventy + Pagefind). Detalles técnicos en [sitio-nuevo/README.md](sitio-nuevo/README.md).
- `catalogos/` e `img/`: los PDFs de los productos y las fotos, que usa el sitio actual.
- `docs/`: diseño, plan y reglas para armar fichas de productos.
- Los `.html`, `css/`, `js/`, `vendor/` sueltos en la raíz son el **sitio viejo** (plantilla "Agency" de Start Bootstrap, licencia MIT: ver [LICENSE](LICENSE)). Ya no se publica; queda como referencia.
