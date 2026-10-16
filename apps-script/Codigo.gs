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
const ID_CARPETA = '1gZ3lZl8M1W6d32cWe7gbKj6TtNuGNvWC';

// Base64 infla ~33 %; Apps Script corta las peticiones cerca de 50 MB. 35 MB reales ≈ 47 MB.
const TAMANO_MAXIMO_BYTES = 35 * 1024 * 1024;

const TIPOS_PERMITIDOS = /^(image|video)\//;

// La página le pone a cada archivo un ID propio. A veces la respuesta de un POST no llega al
// celular aunque el archivo sí se guardó; la página reintenta, y con este registro el reintento
// no duplica la foto. 6 h es el máximo que permite CacheService y sobra para cualquier reintento.
const FORMATO_ID_SUBIDA = /^[A-Za-z0-9-]{8,64}$/;
const SEGUNDOS_REGISTRO = 6 * 60 * 60;

// Para correr a mano desde el editor: pide los permisos de Drive y confirma que el ID sirve.
function probarCarpeta() {
  console.log('Carpeta encontrada: ' + DriveApp.getFolderById(ID_CARPETA).getName());
}

// Sin parámetros: prueba de vida. Con ?id=…: la página pregunta si ese archivo ya se guardó
// antes de volver a mandarlo entero.
function doGet(e) {
  const idSubida = leerIdSubida(e && e.parameter && e.parameter.id);
  if (idSubida) {
    return responder({ ok: true, existe: yaSeGuardo(idSubida) });
  }
  return responder({ ok: true, mensaje: 'Servicio de fotos XV Sofía activo' });
}

function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);
    const idSubida = leerIdSubida(datos.idSubida);
    if (idSubida && yaSeGuardo(idSubida)) {
      return responder({ ok: true, repetido: true });
    }

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
    if (idSubida) {
      CacheService.getScriptCache().put(idSubida, '1', SEGUNDOS_REGISTRO);
    }

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

// Devuelve el ID solo si tiene el formato que genera la página; si no, '' (sin protección).
function leerIdSubida(valor) {
  const id = String(valor || '');
  return FORMATO_ID_SUBIDA.test(id) ? id : '';
}

function yaSeGuardo(idSubida) {
  return CacheService.getScriptCache().get(idSubida) !== null;
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
