# Previsualización local (sin Firebase)

Recorre la app con **datos de ejemplo**, sin login ni usuarios de prueba, para ver
y ajustar el diseño. No toca tu Firebase real y no persiste nada (al recargar vuelve
al ejemplo).

## Cómo usar

```bash
bash preview/servir.sh
```

Luego abre **http://localhost:5510/preview/index.html** — ese es el menú con enlaces a
cada pantalla y a cada rol (coordinador / supervisor / root).

> Está pensada para uso **local** (servida desde la raíz del repo, por eso usa rutas
> absolutas `/css`, `/js`, `/preview`). No está pensada para GitHub Pages.

## Cómo funciona

Las páginas de `preview/` son copias de las reales con un *import map* que redirige
Firebase a mocks en memoria:

- `mock-firebase.js` → reemplaza `js/firebase.js` (db/auth falsos, toast real).
- `mock-session.js` → entra sin login; el rol se elige con `?u=coordinador|supervisor|root`.
- `mock-firestore.js` → Firestore en memoria (query/where/orderBy/etc.).
- `mock-auth.js` → operaciones de auth inertes.
- `seed.js` → **los datos de ejemplo** (usuarios, técnicos, formularios, evaluaciones).

## Al cambiar el HTML de una página real

Vuelve a generar las copias de preview:

```bash
bash preview/generar.sh
```

Para cambiar los datos de ejemplo, edita `preview/seed.js` (no requiere regenerar).
