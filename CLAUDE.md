# XV Sofía — QR para que los invitados suban fotos

El QR impreso en las invitaciones lleva a una página donde los invitados suben, **sin iniciar
sesión**, las fotos y videos de la fiesta. Se guardan en una carpeta del Drive de Kevin.

## Arquitectura

```
QR ─► https://xv-sofia.github.io/   docs/index.html (GitHub Pages, estática)
          │ fetch POST, una foto por petición, JSON con base64, Content-Type text/plain
          ▼
      Apps Script (apps-script/Codigo.gs) · Ejecutar como: Yo · Acceso: Cualquier usuario
          │ DriveApp
          ▼
      Drive / carpeta ID_CARPETA / <nombre del invitado>/
```

- **El QR apunta a Pages, nunca al Apps Script.** Una vez impreso, el backend se puede cambiar
  editando `URL_SCRIPT` en la página sin tocar el QR.
- **El repo vive en la organización `xv-sofia` con nombre `xv-sofia.github.io`** (sitio de
  organización → URL en la raíz). Se hizo así para que el usuario personal de Kevin no aparezca
  en la URL que ven los invitados. No renombrar ni la organización ni el repo: rompería los QR.
- Los textos de la página tratan al invitado de **tú** (no voseo).
- `text/plain` y sin `xhr.upload.onprogress`: cualquiera de las dos cosas contrarias dispara un
  preflight CORS que Apps Script no responde. Por eso no hay porcentaje por foto, solo
  "Subiendo…" + contador.
- **A veces Google guarda la foto pero la respuesta no llega** (pasó desde iPhone y desde
  escritorio; con curl nunca). Por eso: cada intento tiene tope de espera (30 s + 8 s/MB,
  `AbortController`); cada archivo lleva un `idSubida` (UUID del navegador) que el script anota
  en `CacheService` por 6 h; antes de reintentar, la página consulta `GET ?id=` y si ya llegó no
  lo reenvía; y si igual llega un POST repetido, el script responde `repetido: true` sin guardar.
  La latencia de Google varía (de 5 a 23 s para una foto chica en la misma tarde).
- **Huella por archivo** = SHA-256 de los primeros 4 MB + tamaño, en hex (64 caracteres). Se
  usa como `idSubida` y se guarda en `localStorage` (`xv-sofia-subidas`, últimas 3000): si el
  invitado cierra la página a mitad de camino y vuelve a elegir todo, las ya subidas aparecen
  como "Ya estaba subida ✓" sin reenviarse. Si borró los datos del navegador, el script igual
  las descarta durante 6 h (responde `repetido`). Sin verificar en iPhone: si iOS re-codifica
  distinto la misma foto cada vez que se elige, la huella no coincide y se sube duplicada.
- **Segundo plano:** una página web no sube con la app cerrada. En iPhone se congela a los
  segundos de salir y sigue sola al volver; si se cierra la pestaña, lo pendiente se pierde.
  Mitigación: aviso fijo arriba mientras sube + `navigator.wakeLock` (iOS 16.4+, Chrome
  Android) para que la pantalla no se apague; se vuelve a pedir en `visibilitychange`.
- **Safari/WebKit solo concede el primer wake lock con un toque reciente** (transient
  activation); pedirlo después de elegir fotos fallaba en silencio en iPhone (probado por Kevin:
  la pantalla se apagó a los 30 s). Por eso se pide en el `click` de "Elegir fotos"; una vez
  concedido, los pedidos siguientes no necesitan toque. Respaldo: cualquier `click` mientras
  sube lo vuelve a pedir. **`?diagnostico` en la URL** muestra el estado del wake lock y el
  user agent en la página (Playwright/Chrome de escritorio no reproducen iOS).
- Página y script son compatibles en cualquier orden de despliegue: sin `idSubida` el script
  guarda igual, y con el script viejo la consulta `?id=` devuelve la prueba de vida → se reenvía.
- **Las fotos se reducen en el celular** a 2560 px / JPEG 0,85 antes de subir (solo si pasan de
  2560 px o 1,5 MB). Motivo: Apps Script recibe a ~0,5 MB/s y una foto de iPhone de 5 MB tardaba
  12–16 s; reducida tarda ~5 s. En Drive NO quedan los originales y se pierde el EXIF (fecha,
  lugar); la rotación sí se respeta. Si el navegador no puede abrir la imagen (HEIC fuera de
  Safari) o la reducida pesa más, se sube el original. Videos y GIF van tal cual.
- **3 subidas simultáneas por invitado.** Google permite 30 ejecuciones a la vez por cuenta y
  todas corren con la misma: ~10 invitados subiendo a la vez llegan al tope; lo que se pase
  falla y se reintenta solo. Medido: 6 fotos de 4,7 MB en 14 s (antes ~85 s).
- El nombre del invitado (opcional) crea una subcarpeta; el
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
- [x] Migrado a una cuenta de **Google Workspace** (la Gmail gratis original daba poco
      espacio). Workspace sí permitió "Acceso: Cualquier usuario" (probado con curl sin sesión).
      `ID_CARPETA` y `URL_SCRIPT` apuntan a la cuenta nueva; subida real desde la página OK.
- [ ] Workspace comparte el espacio entre toda la organización: ponerle a la cuenta de la fiesta
      un **tope de almacenamiento propio** (admin.google.com → Almacenamiento) para que un
      aluvión de videos no llene el espacio de todos.
- [ ] Archivar la implementación del Apps Script en la cuenta Gmail vieja.
- [x] Apps Script desplegado (implementación `v1`) y su URL `/exec` puesta en `URL_SCRIPT`.
      Probado con curl: GET ok, imagen guardada, PDF y archivo vacío rechazados, CORS
      `access-control-allow-origin: *` en la redirección y en la respuesta final. Subida real
      desde el navegador OK (2 JPEG de 1 MB ≈ 5 s c/u; 15 MB ≈ 16 s). Las pruebas quedaron en la
      subcarpeta "Prueba Claude" de Drive: borrarla antes de la fiesta.
- [x] Publicado en Pages desde `main` + `/docs` (Pages solo publica desde la raíz o `/docs`;
      por eso la página no está en `web/`). Primero estuvo en `KevinGuerrero8/xv-sofia`.
- [x] Repo movido a `xv-sofia/xv-sofia.github.io` (Pages se trasladó solo). Subida real desde
      `https://xv-sofia.github.io/` OK; el QR de `salida/` apunta ahí (versión 3).
- [ ] Prueba real de punta a punta desde celulares (Android + iPhone, HEIC, video) **antes de
      imprimir**.

## Lo que rompería el QR impreso (no hacer)

El QR es estático (la URL va en los píxeles, sin servicio intermedio ni límite de escaneos).
Lo único irrecuperable es perder la URL `https://xv-sofia.github.io/`:
- borrar o renombrar la organización `xv-sofia` o el repo `xv-sofia.github.io`;
- poner el repo **privado** (Pages gratis solo sirve repos públicos);
- borrar la cuenta `KevinGuerrero8` mientras sea la única dueña de la organización.
Cualquier falla del backend (Apps Script, Drive lleno, cuenta de Google) se arregla editando la
página, sin reimprimir.

## Límites conocidos

- Archivos de más de 35 MB (videos largos) no entran: Apps Script corta cerca de 50 MB por
  petición y base64 infla 33 %. La página sugiere mandarlos por WhatsApp. Si se cambia el
  límite, cambiarlo en los dos archivos.
- Cuota de Drive gratis: 15 GB compartidos con Gmail/Fotos. Revisar espacio antes de la fiesta.
- Al redesplegar el script usar "Administrar implementaciones → editar → nueva versión": crear
  una *nueva implementación* cambia la URL `/exec`.
- Cualquiera con el enlace puede subir; solo se valida tipo (image/video) y tamaño.
