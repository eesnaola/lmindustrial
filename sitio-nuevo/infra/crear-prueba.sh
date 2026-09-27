#!/bin/bash
# Crea el sitio de prueba de LM Industrial: bucket privado + CloudFront con noindex.
set -euo pipefail
cd "$(dirname "$0")"
export AWS_PROFILE=lmindustrial
[ "$(aws sts get-caller-identity --query Account --output text)" = "318986392550" ] || { echo "Perfil equivocado: no es la cuenta de LM Industrial"; exit 1; }
[ -f prueba.env ] && { echo "prueba.env ya existe: el sitio de prueba ya fue creado"; exit 1; }

BUCKET=lmindustrial-com-ar-nuevo
OAC_ID=E3GDB1IR4X7WM4
FUNCION=lmindustrial-redirect-www
ZONA=Z02059532OAILISFF7HJ

# 1. Bucket privado y cifrado
aws s3api create-bucket --bucket $BUCKET --region us-east-1 >/dev/null
aws s3api put-public-access-block --bucket $BUCKET --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3api put-bucket-encryption --bucket $BUCKET --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
aws s3api put-bucket-tagging --bucket $BUCKET --tagging 'TagSet=[{Key=proyecto,Value=lmindustrial}]'

# 2. Función con redirecciones (compartida con producción), probada antes de publicar
ETAG=$(aws cloudfront describe-function --name $FUNCION --query ETag --output text)
ETAG=$(aws cloudfront update-function --name $FUNCION --if-match "$ETAG" --function-config Comment="apex a www y redirecciones",Runtime=cloudfront-js-2.0 --function-code fileb://redirecciones.js --query ETag --output text)
probar() { aws cloudfront test-function --name $FUNCION --if-match "$ETAG" --stage DEVELOPMENT --event-object fileb://eventos/$1.json --query TestResult.FunctionOutput --output text; }
probar apex    | grep -q '"value":"https://www.lmindustrial.com.ar/presion.html?a=1"' || { echo "Falla: apex"; exit 1; }
probar genebre | grep -q '"value":"/valvula-esferica.html"'                          || { echo "Falla: Genebre"; exit 1; }
probar normal  | grep -q '"uri":"/valvula-esferica.html"'                             || { echo "Falla: normal"; exit 1; }
aws cloudfront publish-function --name $FUNCION --if-match "$ETAG" >/dev/null
FN_ARN=$(aws cloudfront describe-function --name $FUNCION --stage LIVE --query FunctionSummary.FunctionMetadata.FunctionARN --output text)

# 3. Política de encabezados: no indexar
POLITICA=$(aws cloudfront create-response-headers-policy --response-headers-policy-config '{"Name":"lmindustrial-noindex","Comment":"Sitio de prueba: no indexar","CustomHeadersConfig":{"Quantity":1,"Items":[{"Header":"X-Robots-Tag","Value":"noindex, nofollow","Override":true}]}}' --query ResponseHeadersPolicy.Id --output text)

# 4. Distribución
cat > distribucion-prueba.json <<EOF
{
  "CallerReference": "lmindustrial-nuevo-$(date +%s)",
  "Comment": "Sitio de prueba lmindustrial (nuevo)",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "PriceClass": "PriceClass_All",
  "HttpVersion": "http2and3",
  "IsIPV6Enabled": true,
  "Origins": { "Quantity": 1, "Items": [ {
    "Id": "s3-nuevo",
    "DomainName": "$BUCKET.s3.us-east-1.amazonaws.com",
    "OriginAccessControlId": "$OAC_ID",
    "S3OriginConfig": { "OriginAccessIdentity": "" }
  } ] },
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3-nuevo",
    "ViewerProtocolPolicy": "redirect-to-https",
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "ResponseHeadersPolicyId": "$POLITICA",
    "Compress": true,
    "AllowedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"], "CachedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"] } },
    "FunctionAssociations": { "Quantity": 1, "Items": [ { "EventType": "viewer-request", "FunctionARN": "$FN_ARN" } ] }
  },
  "CustomErrorResponses": { "Quantity": 2, "Items": [
    { "ErrorCode": 403, "ResponsePagePath": "/404.html", "ResponseCode": "404", "ErrorCachingMinTTL": 60 },
    { "ErrorCode": 404, "ResponsePagePath": "/404.html", "ResponseCode": "404", "ErrorCachingMinTTL": 60 }
  ] }
}
EOF
read DIST_ID DIST_ARN DIST_DOMINIO < <(aws cloudfront create-distribution --distribution-config file://distribucion-prueba.json --query "Distribution.[Id,ARN,DomainName]" --output text)
aws cloudfront tag-resource --resource "$DIST_ARN" --tags "Items=[{Key=proyecto,Value=lmindustrial}]"

# 5. Permiso de lectura del bucket solo para esta distribución
aws s3api put-bucket-policy --bucket $BUCKET --policy "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"AllowCloudFrontOAC\",\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"cloudfront.amazonaws.com\"},\"Action\":\"s3:GetObject\",\"Resource\":\"arn:aws:s3:::$BUCKET/*\",\"Condition\":{\"StringEquals\":{\"AWS:SourceArn\":\"$DIST_ARN\"}}}]}"

# 6. Certificado para nuevo.lmindustrial.com.ar (se valida solo cuando el dominio delegue a Route 53)
CERT=$(aws acm request-certificate --region us-east-1 --domain-name nuevo.lmindustrial.com.ar --validation-method DNS --key-algorithm RSA_2048 --tags Key=proyecto,Value=lmindustrial --query CertificateArn --output text)
VNOMBRE=""
for intento in 1 2 3 4 5 6 7 8; do
  sleep 5
  read VNOMBRE VVALOR < <(aws acm describe-certificate --region us-east-1 --certificate-arn "$CERT" --query "Certificate.DomainValidationOptions[0].ResourceRecord.[Name,Value]" --output text)
  [ -n "$VNOMBRE" ] && [ "$VNOMBRE" != "None" ] && break
done
[ -n "$VNOMBRE" ] && [ "$VNOMBRE" != "None" ] || { echo "ACM no publicó el registro de validación"; exit 1; }
aws route53 change-resource-record-sets --hosted-zone-id $ZONA --change-batch "{\"Changes\":[{\"Action\":\"UPSERT\",\"ResourceRecordSet\":{\"Name\":\"$VNOMBRE\",\"Type\":\"CNAME\",\"TTL\":300,\"ResourceRecords\":[{\"Value\":\"$VVALOR\"}]}}]}" >/dev/null

printf "DIST_PRUEBA=%s\nDOMINIO_PRUEBA=%s\nCERT_PRUEBA=%s\n" "$DIST_ID" "$DIST_DOMINIO" "$CERT" > prueba.env
cat prueba.env
echo "Listo. La distribución tarda unos minutos en desplegarse."
