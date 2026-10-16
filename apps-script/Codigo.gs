/**
 * Recibe las fotos que suben los invitados de los XV de Sofía y las guarda en Drive.
 *
 * Despliegue: Implementar → Aplicación web · Ejecutar como: Yo · Acceso: Cualquier usuario.
 * Así el invitado no inicia sesión: el script escribe con los permisos de la dueña/dueño.
 *
 * La página (docs/index.html) manda UNA foto por petición, como JSON en un POST con
 * Content-Type text/plain (para que el navegador no haga preflight CORS, que Apps Script no
 * contesta).
 */

// ID de la carpeta "XV Sofía – Fotos de invitados" (lo que va después de /folders/ en la URL).
const ID_CARPETA = '1SwZBM51J5RsVjJdRDbTVlfhJO8FBKHvD';

// Base64 infla ~33 %; Apps Script corta las peticiones cerca de 50 MB. 35 MB reales ≈ 47 MB.
const TAMANO_MAXIMO_BYTES = 35 * 1024 * 1024;

const TIPOS_PERMITIDOS = /^(image|video)\//;

// Para correr a mano desde el editor: pide los permisos de Drive y confirma que el ID sirve.
function probarCarpeta() {
  console.log('Carpeta encontrada: ' + DriveApp.getFolderById(ID_CARPETA).getName());
}

function doGet() {
  return responder({ ok: true, mensaje: 'Servicio de fotos XV Sofía activo' });
}

function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);
    const tipo = String(datos.tipo || '');
    if (!TIPOS_PERMITIDOS.test(tipo)) {
      return responder({ ok: false, error: 'Solo se aceptan fotos y videos' });
    }

    const bytes = Utilities.base64Decode(String(datos.datosBase64 || ''));
    if (bytes.length === 0) {
      return responder({ ok: false, error: 'El archivo llegó vacío' });
    }
    if (bytes.length > TAMANO_MAXIMO_BYTES) {
      return responder({ ok: false, error: 'El archivo supera los 35 MB' });
    }

    const nombreArchivo = sanear(datos.archivo, 120) || 'foto';
    const carpeta = obtenerCarpetaInvitado(sanear(datos.nombre, 60) || 'Sin nombre');
    carpeta.createFile(Utilities.newBlob(bytes, tipo, nombreArchivo));

    return responder({ ok: true });
  } catch (error) {
    console.error(error);
    return responder({ ok: false, error: 'No se pudo guardar el archivo' });
  }
}

/**
 * Busca o crea la subcarpeta del invitado. El candado evita que dos subidas simultáneas del
 * mismo nombre creen dos carpetas iguales; se suelta enseguida para no frenar a los demás
 * (la escritura del archivo queda fuera del candado).
 */
function obtenerCarpetaInvitado(nombre) {
  const raiz = DriveApp.getFolderById(ID_CARPETA);
  const candado = LockService.getScriptLock();
  candado.waitLock(20000);
  try {
    const existentes = raiz.getFoldersByName(nombre);
    return existentes.hasNext() ? existentes.next() : raiz.createFolder(nombre);
  } finally {
    candado.releaseLock();
  }
}

// Quita caracteres problemáticos en nombres de Drive y recorta el largo.
function sanear(texto, largoMaximo) {
  return String(texto || '')
    .replace(/[\u0000-\u001f\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, largoMaximo);
}

function responder(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}
