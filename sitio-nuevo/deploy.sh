#!/bin/bash
# Publica el sitio nuevo. Uso: ./deploy.sh prueba | ./deploy.sh produccion --confirmar
set -euo pipefail
cd "$(dirname "$0")"
export AWS_PROFILE=lmindustrial   # cuenta 318986392550 (LM Industrial)

case "${1:-}" in
  prueba)
    source infra/prueba.env
    BUCKET=lmindustrial-com-ar-nuevo; DIST_ID=$DIST_PRUEBA ;;
  produccion)
    [ "${2:-}" = "--confirmar" ] || { echo "Para publicar en producción: ./deploy.sh produccion --confirmar"; exit 1; }
    BUCKET=lmindustrial-com-ar-sitio; DIST_ID=E1G0Z14KWZAS06
    [ "$(aws s3api get-bucket-versioning --bucket "$BUCKET" --query Status --output text)" = "Enabled" ] || { echo "Activá el versionado de $BUCKET antes de publicar en producción (permite volver atrás)"; exit 1; } ;;
  *) echo "Uso: ./deploy.sh prueba | ./deploy.sh produccion --confirmar"; exit 1 ;;
esac

SITIO="$1" npm run build
npm test
SITIO="$1" npm run test:sitio

aws s3 sync _site/ "s3://$BUCKET/" --delete --exclude "catalogos/*" --exclude "img/opt/*" --cache-control "max-age=3600"
aws s3 sync _site/img/opt/ "s3://$BUCKET/img/opt/" --delete --cache-control "max-age=86400"
aws s3 sync ../catalogos/ "s3://$BUCKET/catalogos/" --exclude "*Thumbs.db" --cache-control "max-age=86400"
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" --query Invalidation.Id --output text
echo "Publicado en $1."
