# Spec 009 — Que moverse entre pantallas sea instantáneo

> **Nota de proceso.** Esta spec se escribió **después** de implementar, no
> antes. El usuario reportó la lentitud y pidió arreglarla de inmediato, y así
> se hizo. `AGENTS.md` exige spec → plan → tareas antes de código; acá el orden
> se invirtió. Se documenta ahora para que el repo quede coherente consigo
> mismo y para que dentro de seis meses se entienda qué se cambió y por qué.

## Contexto y objetivo

Terminada la spec 008 (el rediseño), el usuario probó la app y dijo:
*"le doy a panel, le doy a bitácora, inventario o cualquier botón y es muy
lento, demasiado lento, no es instantáneo y eso no me gusta."*

Era cierto y medible. En la cascada del login desplegado —la página **más
liviana**, la que menos pide— la carga completa tardaba 1734ms, y buena parte
era espera **en fila**: cada recurso descubriéndose sólo después de que
terminara el anterior.

Cuatro causas, medidas en producción:

1. **La fuente se pedía con `@import` dentro del CSS.** El navegador tenía que
   bajar la hoja y parsearla antes de enterarse de que necesitaba Poppins.
   Medido: el CSS terminaba a los 478ms y la fuente arrancaba a los 479.
2. **El service worker era *network-first* para todo.** Cada navegación
   esperaba a la red aunque el archivo ya estuviera guardado. En la calle con
   señal mala, esto era lo que más pesaba.
3. **Cada página pedía el perfil a Firestore.** `cargarPerfil()` corría en cada
   carga: una ida y vuelta al servidor antes de pintar nada, por cada clic.
4. **El login bajaba toda la infraestructura de Google Sign-In** (`gapi` más un
   iframe oculto) aunque nadie tocara el botón: de 706ms a 1734ms, un segundo
   entero en la primera pantalla que ve la gente.

Y una quinta causa, de otra naturaleza: **las pantallas se traían colecciones
enteras y filtraban en el navegador**. Eso no se arregla con caché y empeora
todos los meses a medida que se acumulan evaluaciones y bitácoras.

## Usuarios / actores

Los tres perfiles, pero sobre todo el **supervisor**, que usa la app desde el
teléfono, en la calle y con señal irregular. Para él la diferencia entre
"responde" y "espera" no es estética.

## Decisiones (confirmadas con el usuario)

- **No se convierte la app a una sola página.** Se evaluó: es lo que haría la
  navegación verdaderamente instantánea, y a largo plazo sigue siendo el camino
  correcto. Pero primero se arreglaron las causas no arquitectónicas y se le
  pidió al usuario que lo probara. Su respuesta: *"ahora es instantáneo
  moverme entre paneles"*. Reescribir la navegación de doce módulos sobre una
  app en uso diario, para ganar algo que ya no duele, no se justifica hoy.
- **El perfil se cachea 5 minutos, no toda la sesión.** Si un coordinador
  inhabilita a alguien o le cambia el rol, el cambio tiene que llegar pronto.
  Las reglas de Firestore mandan igual: un perfil viejo en el navegador no
  habilita a escribir nada que el servidor no permita.
- **Métricas de personal pasa a una ventana de 12 meses**, y la pantalla lo
  dice. Acotar callado habría sido mentir por omisión.
- **Entrar con Google autentica, pero no da de alta.** El alta sigue siendo
  por invitación o por un coordinador.

## Requisitos funcionales (notación EARS)

- **RF-1 (UBICUO)**: La tipografía se pedirá desde el `<head>` de cada página
  con `<link>`, nunca con `@import` dentro de una hoja de estilos.
- **RF-2 (UBICUO)**: El login cargará exactamente los mismos pesos de Poppins
  que cargaba antes (400 a 800, sin el 900), para que el wordmark lo siga
  sintetizando desde el 800 y no cambie ni un píxel.
- **RF-3 (DIRIGIDO POR ESTADO)**: Mientras un archivo que no es una página
  (css, js, iconos) esté en la caché, el service worker responderá con la copia
  guardada y bajará la versión nueva en segundo plano.
- **RF-4 (UBICUO)**: Una página (`.html`) se pedirá siempre a la red, con la
  copia guardada como respaldo si no hay señal. Servir páginas desde la caché
  hacía que un despliegue nuevo no se viera hasta la segunda visita.
- **RF-5 (DIRIGIDO POR ESTADO)**: Mientras haya un perfil guardado de menos de
  5 minutos para el uid actual, `protegerPagina()` lo usará en vez de pedirlo a
  Firestore.
- **RF-6 (DIRIGIDO POR EVENTO)**: Cuando el usuario cierre sesión o cambie su
  propio nombre, el perfil guardado se borrará.
- **RF-7 (DIRIGIDO POR EVENTO)**: La infraestructura de Google Sign-In se
  cargará cuando el usuario toque "Continuar con Google", no al abrir la
  página.
- **RF-8 (UBICUO)**: Las consultas que abarcan varios supervisores se acotarán
  por fecha **en el servidor**, no trayendo todo y filtrando en el navegador.
- **RF-9 (DIRIGIDO POR EVENTO)**: Cuando el usuario del tablero de bitácora
  pida fechas más antiguas que lo ya descargado, se irán a buscar en ese
  momento. Dentro de lo ya descargado, filtrar seguirá siendo instantáneo.
- **RF-10 (DIRIGIDO POR ESTADO)**: Mientras falte el índice compuesto que una
  consulta acotada necesita, esa consulta caerá de vuelta a la versión sin
  acotar y lo avisará por consola. Una pantalla lenta es mejor que una rota.
- **RF-11 (DIRIGIDO POR EVENTO)**: Cuando alguien entre con Google y su cuenta
  no tenga perfil en `usuarios`, se cerrará la sesión y se le dirá que pida el
  enlace de invitación a su coordinador.
- **RF-12 (UBICUO)**: No se borrará automáticamente ninguna cuenta de Firebase
  Auth. Borrar la cuenta de alguien es irreversible y no debe pasar solo.

## Requisitos no funcionales

- **Sin dependencias nuevas ni paso de compilación** (Constitución art. 1 y 7).
- **La persistencia de sesión no cambia**: la misma lista que usaba `getAuth()`
  por omisión (IndexedDB primero, localStorage de respaldo). Si cambiara, la
  gente dejaría de quedar con la sesión iniciada.
- **El login sigue idéntico**, píxel a píxel.
- **`npm test` en verde.**

## Fuera de alcance

- Convertir la app a una sola página con router (ver Decisiones).
- `panel.js` sigue con 16 consultas sin `limit`. Son listas acotadas por
  cantidad de personas, no por tiempo, así que no crecen solas como las de
  evaluaciones y bitácoras. Queda pendiente, no urgente.
- Fusionar las dos cuentas de Firebase Auth que quedaron para el mismo correo
  del usuario (una con contraseña, otra con Google).

## Criterios de finalización

- La fuente arranca a la vez que el CSS, no después. **Medido en producción:
  333ms contra 479ms antes.**
- El login carga sin `gapi` ni el iframe de Google. **Medido: de 1734ms a
  262ms.**
- El usuario confirma que moverse entre pantallas se siente instantáneo.
- Los índices compuestos desplegados y verificados en el proyecto.
- El login idéntico a 375px y 1280px, valor computado por valor computado.
- `npm test` en verde.
