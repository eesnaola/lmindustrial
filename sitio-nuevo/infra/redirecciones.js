var REDIRECCIONES = {
  '/Genebre-valvula-esferica.html': '/valvula-esferica.html',
  '/Genebre-valvula-mariposa.html': '/valvula-mariposa.html',
  '/Genebre-Ode-valvula-solenoide.html': '/valvula-solenoide.html'
};

function handler(event) {
  var request = event.request;
  var host = request.headers.host ? request.headers.host.value : '';
  var esApex = host === 'lmindustrial.com.ar';
  var destino = REDIRECCIONES[request.uri];
  if (!esApex && !destino) return request;

  var qs = [];
  for (var k in request.querystring) {
    var p = request.querystring[k];
    if (p.multiValue) { p.multiValue.forEach(function (v) { qs.push(k + '=' + v.value); }); }
    else { qs.push(k + '=' + p.value); }
  }
  var base = esApex ? 'https://www.lmindustrial.com.ar' : '';
  var loc = base + (destino || request.uri) + (qs.length ? '?' + qs.join('&') : '');
  return { statusCode: 301, statusDescription: 'Moved Permanently', headers: { location: { value: loc } } };
}
