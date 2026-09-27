#!/bin/bash
# Conecta nuevo.lmindustrial.com.ar al sitio de prueba (una sola vez, con el certificado ya emitido).
set -euo pipefail
cd "$(dirname "$0")"
export AWS_PROFILE=lmindustrial
source prueba.env
ZONA=Z02059532OAILISFF7HJ
[ "$(aws acm describe-certificate --region us-east-1 --certificate-arn "$CERT_PRUEBA" --query Certificate.Status --output text)" = "ISSUED" ] || { echo "El certificado todavía no está emitido"; exit 1; }

aws cloudfront get-distribution-config --id "$DIST_PRUEBA" > dist-actual.json
ETAG=$(node -p 'require("./dist-actual.json").ETag')
node -e '
const d = require("./dist-actual.json").DistributionConfig;
d.Aliases = { Quantity: 1, Items: ["nuevo.lmindustrial.com.ar"] };
d.ViewerCertificate = { ACMCertificateArn: process.argv[1], SSLSupportMethod: "sni-only", MinimumProtocolVersion: "TLSv1.2_2021", CertificateSource: "acm" };
require("fs").writeFileSync("dist-nueva.json", JSON.stringify(d));
' "$CERT_PRUEBA"
aws cloudfront update-distribution --id "$DIST_PRUEBA" --if-match "$ETAG" --distribution-config file://dist-nueva.json --query Distribution.Status --output text

for tipo in A AAAA; do
  aws route53 change-resource-record-sets --hosted-zone-id $ZONA --change-batch "{\"Changes\":[{\"Action\":\"UPSERT\",\"ResourceRecordSet\":{\"Name\":\"nuevo.lmindustrial.com.ar\",\"Type\":\"$tipo\",\"AliasTarget\":{\"HostedZoneId\":\"Z2FDTNDATAQYW2\",\"DNSName\":\"$DOMINIO_PRUEBA\",\"EvaluateTargetHealth\":false}}}]}" >/dev/null
done
rm -f dist-actual.json dist-nueva.json
echo "DOMINIO_PRUEBA=nuevo.lmindustrial.com.ar" >> prueba.env
echo "Listo: https://nuevo.lmindustrial.com.ar (en unos minutos)"
