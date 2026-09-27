#!/bin/bash
# Genera los logos de marcas recortados (sin márgenes blancos) a partir de ../img/logos.
set -euo pipefail
cd "$(dirname "$0")/.."
O=../img/logos; D=fuentes-img/marcas; mkdir -p "$D"
recortar() { magick "$O/$1" -fuzz 8% -trim +repage "$D/$2.png"; }
recortar genebre.jpg genebre
magick "$O/intor_logo.jpg" -crop 100x62+0+0 +repage -fuzz 8% -trim +repage "$D/intor.png"   # solo el óvalo, sin el lema
recortar brahma.jpg brahma
recortar honeywell_logo.jpg honeywell
recortar novus.jpg novus
recortar satronic.jpg satronic
recortar danfoss_logo.jpg danfoss
recortar alre.jpg alre
recortar thermoval_logo.jpg thermoval
recortar fantini_cosmi.jpg fantini_cosmi
