#!/bin/bash
# ATENCIÓN: publica el SITIO VIEJO (archivos de esta carpeta) sobre producción, pisando el sitio nuevo.
# Usar solo para volver atrás. El sitio actual se publica con sitio-nuevo/deploy.sh o con el CI de GitHub.
# Sube el sitio a S3 y limpia la caché de CloudFront.
# Uso: ./deploy.sh   (desde esta carpeta, con la AWS CLI configurada)
set -e
export AWS_PROFILE=lmindustrial   # cuenta 318986392550 (LM Industrial)
cd "$(dirname "$0")"

BUCKET=lmindustrial-com-ar-sitio
DIST_ID=E1G0Z14KWZAS06

aws s3 sync . "s3://$BUCKET" --delete --cache-control "max-age=3600" \
  --exclude ".*" --exclude "*/.*" --exclude "LICENSE" --exclude "README.md" \
  --exclude "gulpfile.js" --exclude "package.json" --exclude "deploy.sh" \
  --exclude "less/*" --exclude "scss/*" --exclude "mail/*" \
  --exclude "index - copia.html" --exclude "*backUp*" --exclude "*Thumbs.db" \
  --exclude "docs/*" --exclude "sitio-nuevo/*"

aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" \
  --query 'Invalidation.Status' --output text
echo "Listo. Los cambios se ven en 1-2 minutos."
