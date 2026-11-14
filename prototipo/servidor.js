/* Servidor local del prototipo, sin dependencias.
   Uso:  node servidor.js          (puerto 8080)
         node servidor.js 9000     (otro puerto)
   Pensado para abrir el prototipo desde un túnel (p. ej. la extensión de túneles de VS Code)
   o desde un móvil de la misma wifi. Solo sirve archivos de esta carpeta. */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PUERTO = Number(process.argv[2]) || 8080;
const RAIZ = __dirname;
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

http.createServer((peticion, respuesta) => {
  let ruta;
  try {
    ruta = decodeURIComponent(peticion.url.split('?')[0]);
  } catch (e) {
    respuesta.writeHead(400).end('Petición no válida');
    return;
  }
  if (ruta.endsWith('/')) ruta += 'index.html';
  const archivo = path.join(RAIZ, path.normalize(ruta));
  // No se sirve nada fuera de la carpeta del prototipo.
  if (!archivo.startsWith(RAIZ + path.sep)) {
    respuesta.writeHead(403).end('Acceso denegado');
    return;
  }
  fs.readFile(archivo, (error, contenido) => {
    if (error) {
      respuesta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No encontrado');
      return;
    }
    respuesta.writeHead(200, {
      'Content-Type': TIPOS[path.extname(archivo).toLowerCase()] || 'application/octet-stream',
      // Sin caché: al cambiar el código, el móvil carga siempre la última versión.
      'Cache-Control': 'no-store'
    });
    respuesta.end(contenido);
  });
}).listen(PUERTO, '0.0.0.0', () => {
  console.log('Football Vibration disponible en http://localhost:' + PUERTO);
  console.log('Deja esta ventana abierta. Para parar el servidor: Ctrl + C.');
});
