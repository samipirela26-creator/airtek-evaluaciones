# Airtek · Sistema de Evaluación de Técnicos

App web (HTML/CSS/JavaScript + Firebase) para que **supervisores** evalúen a sus
**técnicos** con un formulario que el **coordinador** podrá variar. Sin servidor
propio: Firebase es el backend. Se publica en **GitHub Pages**.

## Roles
- **Coordinador:** ve todas las evaluaciones (y a futuro edita el formulario y gestiona usuarios).
- **Supervisor:** crea evaluaciones de sus técnicos.
- **Técnico:** es evaluado; firma en pantalla. No necesita cuenta.

## Estructura
```
index.html          Login
panel.html          Panel según rol (lista de evaluaciones)
evaluacion.html     Formulario de evaluación
bitacora.html       Registro de actividades del supervisor
bitacora-tablero.html  Tablero de bitácora de campo (coordinador)
inventario.html     Inventario de herramientas y materiales por técnico
reporte-herramientas.html  Consolidado para pedir reposiciones (coordinador)
js/firebase.js      Config de Firebase  ← AQUÍ pegas tus claves
js/plantilla.js     El formulario definido como datos (editable a futuro)
js/session.js       Sesión y roles
js/login.js         Lógica del login
js/panel.js         Lógica del panel
js/evaluacion.js    Render del formulario, puntajes y guardado
css/styles.css      Estilos
```

## Puesta en marcha (una sola vez)

### 1. Crear proyecto Firebase
1. Entra a https://console.firebase.google.com y crea un proyecto.
2. **Authentication → Sign-in method →** activa **Correo electrónico/contraseña**.
3. **Firestore Database →** Crear base de datos → modo **producción**.
4. **⚙️ Configuración del proyecto → Tus apps → Web (</>)** → registra la app.
5. Copia el objeto `firebaseConfig` y pégalo en `js/firebase.js`.

### 2. Crear usuarios (coordinador y supervisores)
Por ahora los usuarios se crean a mano (aún no hay pantalla de registro):
1. **Authentication → Users → Add user** (correo + contraseña). Copia el **UID**.
2. En **Firestore**, crea la colección `usuarios` y un documento con **ID = ese UID**:
   ```
   nombre: "Juan Pérez"
   rol: "supervisor"        // o "coordinador"
   ```
   Repite por cada supervisor y por el coordinador.

### 3. Reglas de seguridad de Firestore
En **Firestore → Reglas**, pega el contenido de `firestore.rules` y publica.
Esto asegura que solo usuarios autenticados lean/escriban, que un supervisor no
pueda hacerse pasar por otro, y que solo el coordinador vea todo.

### 4. Publicar en GitHub Pages
1. Crea un repo en GitHub y sube esta carpeta.
2. **Settings → Pages → Source: `main` / carpeta `/root`.**
3. La URL queda como `https://TU-USUARIO.github.io/TU-REPO/`.

## Índice de Firestore
La primera vez que un supervisor abra su panel, Firestore puede pedir un índice
(combina `where` + `orderBy`). El error en la consola (F12) trae un **enlace
directo**: ábrelo, crea el índice y listo.

## Puntajes
Cada respuesta tiene un valor (Mala=1 … Excelente=4; Ninguno=1 … Avanzado=4).
"No Aplica" no cuenta. Se guarda el promedio por sección y el **promedio general**
(sobre 4), que se muestra en el panel — base para medir la eficiencia.

## Bitácora, métricas e inventarios

Además de las evaluaciones, la app registra la **actividad de campo** y el
**inventario de los técnicos** (ver `specs/002-metricas-e-inventarios/`).

- Los supervisores registran actividades en `bitacora.html`, indicando el día en
  que las hicieron. Las bitácoras anteriores a esa versión no traen fecha
  propia: se les muestra la de carga marcada con `~` porque es aproximada.
- El coordinador ve el **Tablero de Bitácora**, filtra por fecha, supervisor y
  zona, y exporta todo a un CSV que abre en Excel (lleva BOM UTF-8, por eso los
  acentos salen bien).
- El **inventario de herramientas** guarda, por técnico y herramienta, cuántas
  unidades hay en estado bueno, regular y malo. Con eso el
  **Requerimiento de Herramientas** responde cuántas unidades hay que reponer.
- El **material de uso diario** se registra como entregas con fecha, para ver el
  consumo en el tiempo.

Los catálogos (84 herramientas y 47 materiales) están en `js/inventario-data.js`
y salen de la planilla del cliente. Para cambiarlos hay que editar ese archivo.

En el inventario de herramientas, un **0 escrito** significa "se revisó y no
tiene", distinto de un campo en blanco, que significa "no se revisó". El reporte
del coordinador distingue las dos cosas.

### Jornadas que cruzan la medianoche

Una jornada de 22:00 a 02:00 se guarda con **la fecha en que comenzó** y sus 4
horas cuentan completas en ese día, como se cuenta un turno en nómina. No se
reparten entre los dos días.

Por eso el formulario pide "fecha en que **comenzó** la actividad", y si alguien
registra antes de las 6 de la mañana le ofrece el día anterior — que es cuando
más se confunde la gente. El tablero del coordinador avisa cuántas jornadas del
período cruzaron la medianoche, para que el cierre de mes se entienda.

> Al agregar las colecciones de inventario hay que **publicar de nuevo
> `firestore.rules`**, o las escrituras fallarán por permisos insuficientes.

### Respaldo

El root tiene un botón **⬇️ Respaldo** que descarga un JSON con todas las
colecciones. Pregunta si incluir las fotos: con fotos el archivo queda completo
pero puede pesar decenas de megas; sin fotos es rápido y liviano.

**Si agregas una colección al sistema, agrégala también a
`COLECCIONES_RESPALDO` en [js/panel.js](js/panel.js).** Esa lista se quedó atrás
una vez —se escribió antes de que existieran las bitácoras y los inventarios— y
durante meses el respaldo dio una falsa sensación de seguridad. Hay una prueba
que compara la lista contra las colecciones que el código realmente usa y falla
si falta alguna.

> No existe una función de restauración: el respaldo es el archivo JSON y
> recuperar sería a mano. Sirve para no perder los datos, no para volver atrás
> con un clic.

### Fotos de las bitácoras

Cada foto se comprime en el navegador a **WebP de 1024px** (con respaldo a JPEG
si el navegador no soporta WebP) y se guarda como **documento aparte** en
`bitacoras/{id}/fotos`. El documento de la bitácora solo lleva `numFotos`.

Se hace así por dos razones: un documento de Firestore no puede pasar de 1 MiB,
y el tablero del coordinador se descargaba las imágenes enteras solo para
graficar horas.

Las bitácoras anteriores a este cambio guardan las fotos en un campo `imagenes`
dentro del documento. Para moverlas:

```bash
# 1. Respaldo desde el panel del root (botón "⬇️ Respaldo")
# 2. Prueba en seco — no escribe nada:
GOOGLE_APPLICATION_CREDENTIALS=/ruta/clave.json \
  node scripts/migrar-fotos.mjs --proyecto airtek-evaluaciones
# 3. De verdad:
GOOGLE_APPLICATION_CREDENTIALS=/ruta/clave.json \
  node scripts/migrar-fotos.mjs --proyecto airtek-evaluaciones --aplicar
```

El script es idempotente: correrlo dos veces no duplica nada.

> **Hoy ninguna pantalla muestra las fotos**, solo las cuenta. Los supervisores
> están subiendo evidencia que nadie puede ver. Es un agujero funcional
> conocido, pendiente de decidir con el coordinador.

## Próximos pasos (fase 2)
- Editor de formulario para el coordinador (leer la plantilla desde Firestore).
- Pantalla de gestión de usuarios.
- Reportes/estadísticas por supervisor y por técnico.
- Exportar evaluación a PDF.

## Desarrollo y pruebas

No hay paso de build: es HTML/CSS/JS servido tal cual. Para probar en local:

```bash
npm run serve   # sirve el sitio en http://localhost:8080 (python3 -m http.server)
npm test        # pruebas de humo (no usan red ni Firebase)
```

Las pruebas (`tests/`, runner integrado de Node, sin dependencias) verifican que:

- todos los `.js` compilan (`node --check`),
- los `.json` de configuración (`manifest.json`, `firebase.json`, `.firebaserc`) parsean,
- cada `<script src>` local del HTML apunta a un archivo que existe.

### Avisar a los usuarios qué cambió

Cuando alguien entra por primera vez después de una entrega, ve arriba del panel
una tarjeta con los cambios que le tocan **según su rol**. Se muestra una sola
vez por navegador y se cierra con "Entendido".

Para la próxima entrega, agrega una entrada arriba del arreglo `VERSIONES` en
[js/novedades.js](js/novedades.js):

```javascript
{
  version: "2.1.0",
  fecha: "2026-10-20",
  titulo: "Lo que salió esta vez",
  cambios: {
    todos: ["Lo que le sirve a cualquiera"],
    supervisor: ["Lo que solo usa el supervisor"],
    coordinador: ["Lo que solo usa el coordinador"],
  },
}
```

Escríbelo en lenguaje de usuario: **qué puede hacer ahora que antes no podía**.
Nada de nombres de archivos ni de funciones — lo lee un supervisor en su
teléfono. Hay una prueba que falla si se cuela jerga técnica.

Lo de `todos` va en tercera persona, porque lo leen supervisores y coordinadores
por igual y no todos registran bitácoras.

### Pruebas de las reglas de Firestore

Las reglas de seguridad se prueban contra el **emulador de Firebase**, en un
proyecto ficticio que nunca toca la base real:

```bash
npm run test:rules   # levanta el emulador, corre las pruebas y lo apaga
npm run emu          # lo deja corriendo para trabajar a mano
```

Necesita Java (`sudo apt install default-jre`). Viven en `tests-reglas/`, aparte
de `tests/`, para que `npm test` siga funcionando sin emulador.

Existen porque una vez se publicaron reglas que nadie había ejecutado y traían
un hueco de permisos. **Si tocas `firestore.rules`, corre estas pruebas.**

Se ejecutan también en CI (GitHub Actions) en cada push/PR — ver
[.github/workflows/ci.yml](.github/workflows/ci.yml). Para probar sin Firebase con
datos de ejemplo, existe además el modo `preview/` (ver [preview/README.md](preview/README.md)).
