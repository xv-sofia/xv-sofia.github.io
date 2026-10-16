# XV Sofía — QR para que los invitados suban fotos

El QR impreso en las invitaciones lleva a una página donde los invitados suben, **sin iniciar
sesión**, las fotos y videos de la fiesta. Se guardan en una carpeta del Drive de Kevin.

## Arquitectura

```
QR ─► https://kevinguerrero8.github.io/xv-sofia/   docs/index.html (GitHub Pages, estática)
          │ fetch POST, una foto por petición, JSON con base64, Content-Type text/plain
          ▼
      Apps Script (apps-script/Codigo.gs) · Ejecutar como: Yo · Acceso: Cualquier usuario
          │ DriveApp
          ▼
      Drive / carpeta ID_CARPETA / <nombre del invitado>/
```

- **El QR apunta a Pages, nunca al Apps Script.** Ya está impreso: el backend se puede cambiar
  editando `URL_SCRIPT` en la página sin tocar el QR. No cambiar el nombre del repo `xv-sofia`
  ni de la cuenta de GitHub: rompería todos los QR impresos.
- `text/plain` y sin `xhr.upload.onprogress`: cualquiera de las dos cosas contrarias dispara un
  preflight CORS que Apps Script no responde. Por eso no hay porcentaje por foto, solo
  "Subiendo…" + contador.
- Se suben originales, sin comprimir. El nombre del invitado (opcional) crea una subcarpeta; el
  `LockService` evita carpetas duplicadas cuando llegan dos subidas del mismo nombre a la vez.

## Archivos

- `docs/index.html` — la página. Constante `URL_SCRIPT` arriba del `<script>`; si está vacía la
  página muestra "todavía no está conectada" y deshabilita el botón.
- `apps-script/Codigo.gs` — se pega a mano en script.google.com (no hay clasp). Constante
  `ID_CARPETA`.
- `qr/` — `npm run generar` y `npm run verificar` (Node, paquetes `qrcode`, `jsqr`, `pngjs`).
  La URL impresa vive en `qr/config.mjs`. Corrección de errores Q, margen 4, PNG 2000 px.
- `salida/` — `qr-fotos-xv-sofia.png` y `.svg`, listos para la invitación.

## Estado (2026-10-15)

- [x] Página, Apps Script y QR escritos. QR generado y decodificado OK con la URL de Pages.
- [x] Página probada en navegador a 390 px con `fetch` simulado: subida, rechazo del servidor
      (no reintenta), PDF y archivo >35 MB rechazados en el cliente, reintento ante corte de red.
- [x] Carpeta de Drive creada; su ID ya está en `Codigo.gs`. Carpeta y Apps Script viven en una
      cuenta de Gmail dedicada a la fiesta (no la personal de Kevin); permisos autorizados y
      `probarCarpeta()` OK.
- [x] Apps Script desplegado (implementación `v1`) y su URL `/exec` puesta en `URL_SCRIPT`.
      Probado con curl: GET ok, imagen guardada, PDF y archivo vacío rechazados, CORS
      `access-control-allow-origin: *` en la redirección y en la respuesta final. Subida real
      desde el navegador OK (2 JPEG de 1 MB ≈ 5 s c/u; 15 MB ≈ 16 s). Las pruebas quedaron en la
      subcarpeta "Prueba Claude" de Drive: borrarla antes de la fiesta.
- [ ] `git init` + repo público `KevinGuerrero8/xv-sofia` + activar Pages desde rama `main`,
      carpeta `/docs`. La página está en `docs/` justamente porque Pages solo publica desde la
      raíz o `/docs`: así la URL es `/xv-sofia/` y coincide con el QR.
- [ ] Prueba real de punta a punta desde celulares (Android + iPhone, HEIC, video) **antes de
      imprimir**.

## Límites conocidos

- Archivos de más de 35 MB (videos largos) no entran: Apps Script corta cerca de 50 MB por
  petición y base64 infla 33 %. La página sugiere mandarlos por WhatsApp. Si se cambia el
  límite, cambiarlo en los dos archivos.
- Cuota de Drive gratis: 15 GB compartidos con Gmail/Fotos. Revisar espacio antes de la fiesta.
- Al redesplegar el script usar "Administrar implementaciones → editar → nueva versión": crear
  una *nueva implementación* cambia la URL `/exec`.
- Cualquiera con el enlace puede subir; solo se valida tipo (image/video) y tamaño.
