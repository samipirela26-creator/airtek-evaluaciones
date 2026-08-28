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

Se ejecutan también en CI (GitHub Actions) en cada push/PR — ver
[.github/workflows/ci.yml](.github/workflows/ci.yml). Para probar sin Firebase con
datos de ejemplo, existe además el modo `preview/` (ver [preview/README.md](preview/README.md)).
