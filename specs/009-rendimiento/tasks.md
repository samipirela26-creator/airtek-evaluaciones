# Tareas — Spec 009: Rendimiento

> Marcadas como hechas porque la spec se escribió después de implementar.

- [x] **T1: La fuente deja de pedirse en cadena**
  - **RF**: RF-1, RF-2
  - **Archivos**: `css/1-base.css`, `css/login.css`, las 15 páginas
  - **Verificado**: en producción la fuente arranca a los 333ms a la vez que el
    CSS, contra los 479ms de antes. El login carga 400–800 sin el 900 y el
    wordmark lo sigue sintetizando: cero caras de peso 900 cargadas en esa
    página, como antes.

- [x] **T2: El service worker deja de esperar a la red para css y js**
  - **RF**: RF-3, RF-4
  - **Archivos**: `service-worker.js`
  - **Verificado**: el usuario confirma que moverse entre pantallas es
    instantáneo. La estrategia en sí **no se pudo verificar en el navegador de
    pruebas**, donde el service worker no llega a registrarse.
  - **Corregido sobre la marcha**: en la primera versión también las páginas
    salían de la caché, y eso hacía que un despliegue no se viera hasta la
    segunda visita. Le pasó al usuario con su propio crédito en el login.

- [x] **T3: El perfil deja de pedirse a Firestore en cada clic**
  - **RF**: RF-5, RF-6
  - **Archivos**: `js/session.js`, `js/perfil.js`

- [x] **T4: Google Sign-In se carga al tocar el botón**
  - **RF**: RF-7
  - **Archivos**: `js/firebase.js`, `js/login.js`
  - **Verificado**: de 1734ms a 262ms en el login desplegado; ni `gapi` ni el
    iframe aparecen al cargar. Persistencia `LOCAL` conservada y
    `onAuthStateChanged` resuelve.

- [x] **T5: Las consultas se acotan por fecha en el servidor**
  - **RF**: RF-8, RF-9, RF-10
  - **Archivos**: `js/consultas.js`, `js/bitacora-tablero.js`,
    `js/dashboard.js`, `dashboard.html`, `firestore.indexes.json`,
    `firebase.json`
  - **Verificado**: el tablero pasó de 6 a 7 actividades al pedir "Todo", o sea
    que fue a buscar las viejas de verdad. Métricas muestra sus 5 evaluaciones.
    Los dos índices compuestos **desplegados y confirmados** en el proyecto.

- [x] **T6: Entrar con Google no da de alta a nadie**
  - **RF**: RF-11, RF-12
  - **Archivos**: `js/login.js`
  - **Hecho cuando**: una cuenta de Google sin perfil en `usuarios` recibe un
    mensaje que dice qué hacer, en vez de entrar y toparse con un alerta en el
    panel. No se borra ninguna cuenta de Auth automáticamente.

## Pendiente

- [ ] Fusionar o eliminar la cuenta duplicada de Firebase Auth del usuario
  (quedaron dos para el mismo correo: una con contraseña y otra con Google).
  Es una acción de consola, no de código.
- [ ] `panel.js` sigue con 16 consultas sin `limit`. No crecen con el tiempo
  como las de evaluaciones y bitácoras, así que no es urgente.
- [ ] Verificar la estrategia del service worker en un navegador normal.
