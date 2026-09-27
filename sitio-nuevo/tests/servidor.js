import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(AQUI, "../_site");
const VIEJO = path.resolve(AQUI, "../..");
const TIPOS = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
  ".wasm": "application/wasm", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".woff2": "font/woff2", ".pdf": "application/pdf",
};

export function iniciarServidor() {
  return new Promise((resolve) => {
    const servidor = createServer(async (req, res) => {
      let ruta = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (ruta.endsWith("/")) ruta += "index.html";
      const base = ruta.startsWith("/catalogos/") ? VIEJO : SITE;
      const archivo = path.join(base, ruta);
      if (!archivo.startsWith(base)) { res.writeHead(403); res.end(); return; }
      try {
        const cuerpo = await readFile(archivo);
        res.writeHead(200, { "content-type": TIPOS[path.extname(archivo).toLowerCase()] ?? "application/octet-stream" });
        res.end(cuerpo);
      } catch {
        res.writeHead(404, { "content-type": TIPOS[".html"] });
        res.end(await readFile(path.join(SITE, "404.html")).catch(() => "404"));
      }
    });
    servidor.listen(0, "127.0.0.1", () => resolve({ url: `http://127.0.0.1:${servidor.address().port}`, cerrar: () => servidor.close() }));
  });
}
