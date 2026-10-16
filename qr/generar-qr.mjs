// Genera el QR de las invitaciones en PNG (para imprenta/Canva) y SVG (vectorial).
// Uso: npm run generar [-- https://otra-url]
import { mkdir } from 'node:fs/promises';
import QRCode from 'qrcode';
import { URL_FOTOS, CARPETA_SALIDA, RUTA_PNG, RUTA_SVG } from './config.mjs';

const url = process.argv[2] || URL_FOTOS;

// Corrección "Q" (25 %): aguanta manchas o dobleces del papel sin volver el QR demasiado denso.
// Margen de 4 módulos: es el mínimo del estándar; sin él muchos lectores fallan al imprimir.
const opciones = {
  errorCorrectionLevel: 'Q',
  margin: 4,
  color: { dark: '#000000', light: '#ffffff' },
};

await mkdir(CARPETA_SALIDA, { recursive: true });
await QRCode.toFile(RUTA_PNG, url, { ...opciones, type: 'png', width: 2000 });
await QRCode.toFile(RUTA_SVG, url, { ...opciones, type: 'svg' });

console.log(`QR generado para ${url}`);
console.log(`  ${RUTA_PNG}`);
console.log(`  ${RUTA_SVG}`);
