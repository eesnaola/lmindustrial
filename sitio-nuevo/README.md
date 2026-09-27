# Sitio nuevo de LM Industrial

Generado con Eleventy. Los datos están en `src/_data/categorias.json` y `src/_data/productos.json`. Esos dos archivos son la única fuente de verdad: las fichas se editan ahí (después correr `npm run verificar-fichas`).

- `npm run dev`: servidor local con recarga (sin buscador).
- `npm run build`: genera `_site/` y el índice del buscador. Por defecto es la versión de prueba; `SITIO=produccion npm run build` genera la de producción.
- `npm test`: pruebas de lógica y datos. `npm run test:sitio`: pruebas del sitio generado. `npm run test:navegador`: buscador, filtros y celular en Chrome.
- `npm run verificar-fichas`: compara los números de cada ficha con su PDF.
- `./deploy.sh prueba`: publica en el sitio de prueba. `./deploy.sh produccion --confirmar`: publica en producción.
- Todo lo de AWS usa el perfil `lmindustrial` (cuenta 318986392550).
- `infra/`: scripts de la infraestructura del sitio de prueba (se corren una sola vez) y la función de redirecciones de CloudFront.
- Reglas para armar fichas nuevas: `../docs/fichas/INSTRUCCIONES.md`; decisiones pendientes del cliente: `../docs/fichas/notas-fase2.md`.
- **CI:** cada push a `main` corre todas las pruebas y, si pasan, publica en producción (`.github/workflows/publicar.yml`). GitHub entra a AWS con el rol `lmindustrial-github-deploy` (OIDC, solo rama `main`), sin claves guardadas. Guía para no técnicos: `../COMO-EDITAR.md`.
