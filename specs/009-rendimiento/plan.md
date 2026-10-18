# Plan técnico — Spec 009

> Escrito de forma retroactiva, igual que la spec. Describe lo implementado.

## Decisiones y por qué

| Decisión | Razón |
|---|---|
| La fuente por `<link>` y no por `@import` | Un `@import` serializa: el navegador baja la hoja, la parsea, y recién ahí descubre la fuente. Medido en producción, la fuente arrancaba a los 479ms justo cuando el CSS terminaba a los 478. Con `<link>` arranca a los 333, a la vez. |
| Al login se le deja su lista de pesos exacta (sin el 900) | `.brand-text` y `.mobile-brand-logo-text` piden `font-weight: 900` y el navegador lo venía sintetizando desde el 800. Cargar el 900 de verdad habría cambiado el wordmark, y el login está congelado. |
| Service worker: red para páginas, caché para lo demás | Primero se pasó TODO a caché, HTML incluido, y estuvo mal: tras cada despliegue la primera visita mostraba la página vieja — al usuario le pasó con su propio crédito en el login. Una página pesa pocos KB y esperar por ella no se siente; lo pesado son cuatro hojas de estilo y una veintena de módulos, y eso sí sale de la copia. |
| El perfil se cachea 5 minutos, no toda la sesión | Toda la sesión dejaría a alguien inhabilitado navegando hasta cerrar la pestaña. Cinco minutos acota la mentira de la interfaz sin devolver la ida y vuelta a cada clic. Las reglas de Firestore mandan igual. |
| `initializeAuth()` en vez de `getAuth()` | `getAuth()` arma la autenticación con el resolvedor de ventanas emergentes ya puesto, y eso arrastra `gapi` más un iframe oculto en **cada** página. Sin resolvedor, se carga recién al tocar el botón. |
| Acotar por fecha en el servidor, no en el navegador | Es el mismo principio de las listas acotadas de la spec 008, una capa más abajo. El tablero se bajaba todas las bitácoras de la historia para mostrar las de este mes, y ese número sólo sube. |
| Caída de vuelta si falta el índice | Un índice compuesto se despliega aparte (`firebase deploy --only firestore:indexes`). Si el código llegara antes que el índice, la pantalla se rompería. Con la caída de vuelta queda lenta, que es recuperable. |
| Entrar con Google no da de alta, y **no borra** la cuenta huérfana | Dejar entrar a cualquiera con una cuenta de Google y toparlo en el panel con "no tenés perfil" no explica nada. Pero borrarle la cuenta de Auth automáticamente es irreversible: la cuenta huérfana no puede leer ni escribir nada —las reglas lo impiden— así que queda y se borra a mano si molesta. |

## Cambios

- **`css/1-base.css`, `css/login.css`**: fuera el `@import`.
- **Las 15 páginas**: `<link>` de la fuente, `preconnect` a `fonts.googleapis`,
  `fonts.gstatic` y `www.gstatic`, y `modulepreload` de `firebase.js` y
  `session.js`, que están al fondo de la cadena de imports.
- **`service-worker.js`**: red para `.html`, caché con revalidación detrás para
  el resto.
- **`js/session.js`**: `cargarPerfil(uid, { usarCache })` con caché de 5
  minutos en `sessionStorage`, más `olvidarPerfil()`. `protegerPagina()` la usa.
- **`js/perfil.js`**: olvida el perfil al renombrarse.
- **`js/firebase.js`**: `initializeAuth()` sin resolvedor, con la misma
  persistencia que usaba `getAuth()`.
- **`js/login.js`**: el resolvedor se pasa a `signInWithPopup`; comprobación de
  perfil tras entrar con Google; mensajes propios para
  `account-exists-with-different-credential` y `operation-not-allowed`.
- **`js/consultas.js`**: `traerPorLotes()` acepta piso de fecha, con caída de
  vuelta; `haceMeses()`.
- **`js/bitacora-tablero.js`**: baja 12 meses y amplía bajo demanda.
- **`js/dashboard.js`**: ventana de 12 meses, dicha en `dashboard.html`.
- **`firestore.indexes.json`** (nuevo) y **`firebase.json`**: los dos índices
  compuestos, versionados.
- **`preview/generar.sh`**: ignora los `modulepreload` (con ruta relativa daban
  404 bajo `/preview/` y precargaban los módulos reales que el importmap
  reemplaza por mocks).
- **`preview/mock-firestore.js`**: comparaba un timestamp contra un `Date` como
  si fueran texto, así que toda consulta acotada por fecha daba cero filas. Sin
  esto no se podía verificar nada de lo anterior.

## Riesgos

- **Perder la sesión iniciada de todo el mundo.** Era el riesgo real de
  `initializeAuth()`. Mitigado pasando la misma lista de persistencia que
  `getAuth()` usa por omisión, y verificado: persistencia `LOCAL`.
- **Romper el login.** Verificado valor computado por valor computado contra el
  estado anterior: campos de 54px, radio 16px, letra 15.2px, `h1` 31.2px/800,
  la fila "Recordarme" con su `margin-bottom: 6px` heredado.
- **Que un despliegue no se vea.** Pasó, con el HTML cacheado. Arreglado.
- **Que el índice llegue después que el código.** Mitigado con la caída de
  vuelta.
- **Mentir en los números.** La mejora del service worker **no se pudo
  verificar**: no se registra en el panel del navegador usado para probar.
  Las mejoras de la fuente y de Google Sign-In sí están medidas en producción.
