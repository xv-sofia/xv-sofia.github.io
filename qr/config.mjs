import { fileURLToPath } from 'node:url';

// URL que queda impresa en las invitaciones. Apunta a la página (GitHub Pages), no al Apps
// Script: así se puede cambiar el backend sin reimprimir nada.
export const URL_FOTOS = 'https://xv-sofia.github.io/';

// fileURLToPath y no .pathname: la carpeta "XV Sofia" tiene un espacio que quedaría como %20.
export const CARPETA_SALIDA = fileURLToPath(new URL('../salida/', import.meta.url));
export const RUTA_PNG = CARPETA_SALIDA + 'qr-fotos-xv-sofia.png';
export const RUTA_SVG = CARPETA_SALIDA + 'qr-fotos-xv-sofia.svg';
