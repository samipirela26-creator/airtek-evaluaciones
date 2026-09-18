# Reemplazar a una persona por otra en una cuenta existente

Cuándo se usa: alguien deja su puesto (supervisor o coordinador) y otra
persona lo reemplaza, y querés que la persona nueva **herede todo** lo que
tenía la vieja — sus evaluaciones ya hechas, bitácoras, técnicos e
inventario — sin perder ni mover un solo documento.

## Por qué funciona así

En Firestore, todo lo que crea un supervisor (`evaluaciones`, `bitacoras`,
`tecnicos`, `inventario_herramientas`, `inventario_materiales`) queda
enlazado a su **UID** de Firebase Authentication, no a su correo. El UID no
cambia nunca aunque cambies el correo de la cuenta.

Por eso la forma correcta de reemplazar a una persona **no es crear una
cuenta nueva** para la que entra. Si hicieras eso, tendría un UID distinto
y ningún dato viejo la seguiría — quedaría con las manos vacías y el
historial de la persona anterior huérfano. Lo que hay que hacer es cambiar
el **correo y la contraseña de la cuenta que ya existe**, dejando el mismo
UID. Todo lo demás sigue enlazado solo.

## El problema: la consola de Firebase no deja editar el correo

En `Authentication → Usuarios`, el menú de cada cuenta solo ofrece
**Restablecer contraseña**, **Inhabilitar cuenta** y **Borrar cuenta**. No
hay botón para editar el correo — ni ahí ni haciendo clic en la fila. Eso
solo se puede hacer con el **Admin SDK**, con un script corto que se corre
una vez.

## Procedimiento

### 1. Conseguir la clave de administrador

`Firebase → ⚙️ Configuración del proyecto → Cuentas de servicio → Generar
nueva clave privada`. Se descarga un `.json`.

> **Esta clave da acceso total de administrador a toda la base** (leer y
> escribir cualquier cosa, crear o borrar cualquier cuenta). Reglas fijas:
> - Nunca la pegues en un chat, un commit, un log ni ningún lugar que quede
>   guardado. Se usa local, desde tu propia terminal.
> - Si en algún momento se expone por accidente, tratala como comprometida:
>   revocala de inmediato en **Google Cloud Console → IAM y administración →
>   Cuentas de servicio → [la cuenta] → Claves → borrar esa clave** — no
>   alcanza con borrar el archivo, la clave sigue siendo válida hasta que se
>   revoca ahí.
> - Borrá el archivo `.json` de tu computadora en cuanto termines.

### 2. Correr el script que cambia correo y contraseña

Guardá esto como `scripts/reemplazar-usuario.mjs` (o en cualquier carpeta
local) y corré `npm install firebase-admin` si no lo tenés:

```javascript
// Cambia el correo y la contrasena de una cuenta de Firebase Authentication,
// dejando el MISMO UID. Uso:
//   node reemplazar-usuario.mjs /ruta/a/clave-servicio.json
import { readFileSync } from 'node:fs';
import readline from 'node:readline';
import admin from 'firebase-admin';

const keyPath = process.argv[2];
if (!keyPath) {
  console.error('Uso: node reemplazar-usuario.mjs /ruta/a/clave-servicio.json');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(readFileSync(keyPath, 'utf8'))),
});

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

(async () => {
  const uid = (await ask('UID de la cuenta a modificar (la de la persona que se va): ')).trim();
  const email = (await ask('Correo nuevo (el de la persona que entra): ')).trim();
  const password = (await ask('Contrasena nueva: ')).trim();

  const antes = await admin.auth().getUser(uid);
  console.log(`\nCuenta encontrada: ${antes.email}  (UID ${antes.uid})`);

  const confirmar = await ask(`Vas a cambiarla a "${email}" con una contrasena nueva. Escribi SI para continuar: `);
  if (confirmar.trim().toUpperCase() !== 'SI') {
    console.log('Cancelado. No se toco nada.');
    rl.close();
    return;
  }

  await admin.auth().updateUser(uid, { email, password });
  console.log(`\nListo. La cuenta ${uid} ahora tiene el correo: ${email}`);
  console.log('El UID no cambio, asi que todo lo que ya estaba enlazado a esa cuenta en Firestore sigue intacto.');
  rl.close();
})().catch((err) => {
  console.error('\nError:', err.message);
  process.exit(1);
});
```

El UID de la cuenta vieja lo sacás de `Authentication → Usuarios`, columna
**UID del usuario**.

### 3. Actualizar el nombre en `usuarios/{uid}`

En `Firestore → usuarios`, abrí el documento cuyo ID es ese mismo UID.
Cambiá **solo** el campo `nombre`, al de la persona nueva. **No toques
`rol` ni `coordinadorUid`** — se quedan igual, porque la persona nueva
hereda el mismo puesto y el mismo coordinador.

> **No escribas comillas dentro de ningún valor** — ni en `nombre`, ni en
> `rol`, ni en `coordinadorUid`. Cuando esta guía (o cualquier instrucción)
> te muestra `rol: "supervisor"`, las comillas son solo para señalar que es
> texto — el valor real que va en el campo es `supervisor`, sin nada más.
> La consola de Firestore ya le pone sus propias comillas al mostrarlo; si
> además escribís las tuyas, el campo queda literalmente con comillas de
> más adentro del texto. Revisá **los tres campos**, uno por uno, antes de
> seguir — es fácil corregir uno y olvidarse de los otros dos.
>
> Cada campo con comillas de más rompe algo distinto, y ninguno de los dos
> síntomas te avisa del otro:
> - **`rol` con comillas de más:** la persona entra bien, el encabezado
>   muestra su nombre y su rol, pero **cualquier botón la rebota de vuelta
>   al panel**. Pasa porque `js/panel.js` compara
>   `perfil.rol === "supervisor"` — si el valor guardado tiene comillas de
>   más, la comparación nunca es cierta, cae en la rama equivocada del
>   panel, y cada página con `protegerPagina(rol, ...)` la devuelve a
>   `panel.html` al no reconocer ese rol.
> - **`coordinadorUid` con comillas de más:** la persona nueva entra bien y
>   usa su panel sin problema, pero **su coordinador no la ve** en "Mis
>   supervisores". Pasa porque la regla de Firestore compara
>   `resource.data.coordinadorUid == request.auth.uid` — con comillas de
>   más nunca es igual, así que la lectura se niega en silencio (el
>   coordinador ni se entera de que existe ese documento). Este es el más
>   fácil de pasar por alto, porque a la persona nueva todo le funciona.

### 4. Verificar

Iniciá sesión con el correo y la contraseña nuevos. Confirmá:
- El encabezado muestra el nombre correcto y el rol correcto (sin comillas
  de más, ver arriba).
- El panel que aparece es el que corresponde a ese rol (el de supervisor
  muestra "Mis técnicos"; el de coordinador, "Mis supervisores").
- Los botones no rebotan a ningún lado.
- **Además, entrá con la cuenta del coordinador** y confirmá que la persona
  nueva aparece en "Mis supervisores". Este paso es el que se olvida, porque
  todo lo anterior puede estar perfecto y este solo fallar.

### 5. Limpieza

Borrá el archivo `.json` de la clave que descargaste en el paso 1.

## Resumen de lo que NO hay que hacer

- **No crear una cuenta nueva** para la persona que entra. Se queda sin
  historial y el de la persona anterior queda huérfano.
- **No buscar un botón de "editar correo"** en `Authentication → Usuarios`.
  No existe; hace falta el script del Admin SDK.
- **No escribir comillas dentro de los valores** al editar campos en
  Firestore.
