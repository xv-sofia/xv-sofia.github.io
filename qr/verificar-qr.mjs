// Decodifica el PNG generado y confirma que contiene exactamente la URL esperada.
// Uso: npm run verificar [-- https://otra-url]
import { readFile } from 'node:fs/promises';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { URL_FOTOS, RUTA_PNG } from './config.mjs';

const esperada = process.argv[2] || URL_FOTOS;
const imagen = PNG.sync.read(await readFile(RUTA_PNG));
const leido = jsQR(new Uint8ClampedArray(imagen.data), imagen.width, imagen.height);

if (!leido) {
  console.error('✗ No se pudo leer ningún QR en el PNG');
  process.exit(1);
}
if (leido.data !== esperada) {
  console.error(`✗ El QR dice "${leido.data}" y se esperaba "${esperada}"`);
  process.exit(1);
}
console.log(`✓ QR versión ${leido.version} leído correctamente: ${leido.data}`);
