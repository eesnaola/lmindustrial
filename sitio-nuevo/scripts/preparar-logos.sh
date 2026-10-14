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
magick "$O/resideo.png" -background white -flatten -trim +repage -resize 520x "$D/resideo.png"   # PNG con transparencia: se aplana sobre blanco
recortar novus.jpg novus
magick "$O/siemens.png" -background white -flatten -crop 400x74+0+0 +repage -fuzz 8% -trim +repage "$D/siemens.png"   # sin la línea "Combustion Controls Division"
magick "$O/landis_gyr.jpg" -fuzz 12% -trim +repage -resize 600x "$D/landis_gyr.png"
recortar satronic.jpg satronic
recortar danfoss_logo.jpg danfoss
recortar alre.jpg alre
recortar thermoval_logo.jpg thermoval
recortar fantini_cosmi.jpg fantini_cosmi
magick -density 119 -background white "$O/famiq.svg" -flatten -fuzz 8% -trim +repage "$D/famiq.png"   # SVG de famiq.com.ar, rasterizado a ~200 px de alto
