// tests/smoke.test.js
// Pruebas de humo sin dependencias (node:test). No usan red ni Firebase:
// solo validan sintaxis y consistencia de los archivos estáticos.

const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');

/** Lista recursiva de archivos con una extensión, saltando node_modules/.git. */
function listar(dir, ext, acc = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name === '.git') continue;
        const abs = path.join(dir, e.name);
        if (e.isDirectory()) listar(abs, ext, acc);
        else if (e.name.endsWith(ext)) acc.push(abs);
    }
    return acc;
}

// ── 1. Todos los .js compilan (Node detecta ESM automáticamente) ──────
test('todos los .js pasan node --check', () => {
    const archivos = listar(RAIZ, '.js');
    assert.ok(archivos.length > 0, 'debería haber archivos .js');
    for (const archivo of archivos) {
        execFileSync(process.execPath, ['--check', archivo]);
    }
});

// ── 2. Los archivos de configuración JSON parsean ─────────────────────
test('los .json de configuración parsean', () => {
    for (const rel of ['manifest.json', 'firebase.json', '.firebaserc']) {
        const abs = path.join(RAIZ, rel);
        if (!fs.existsSync(abs)) continue;
        JSON.parse(fs.readFileSync(abs, 'utf8')); // lanza si está roto
    }
});

// ── 3. Cada <script src="..."> del HTML apunta a un archivo existente ──
test('los scripts referenciados en el HTML existen', () => {
    const htmls = listar(RAIZ, '.html');
    let revisados = 0;
    for (const html of htmls) {
        const contenido = fs.readFileSync(html, 'utf8');
        const dirHtml = path.dirname(html);
        const re = /<script[^>]*\ssrc="([^"]+)"/g;
        let m;
        while ((m = re.exec(contenido)) !== null) {
            const src = m[1];
            if (/^https?:\/\//.test(src)) continue; // CDN externo, no local
            // Ruta absoluta ("/js/x.js") = relativa a la raíz del sitio (repo);
            // ruta relativa = relativa a la carpeta del propio HTML.
            const destino = src.startsWith('/')
                ? path.join(RAIZ, src)
                : path.resolve(dirHtml, src);
            assert.ok(
                fs.existsSync(destino),
                `${path.relative(RAIZ, html)} referencia un script inexistente: ${src}`
            );
            revisados++;
        }
    }
    assert.ok(revisados > 0, 'debería haber al menos un <script src> local');
});

// ── 4. Cada <a href="..."> local del HTML apunta a un archivo existente ──
// Los enlaces entre páginas son la forma en que se navega la app: un href roto
// (una página nueva mal enlazada desde el panel) no lo detecta nada más.
test('los enlaces locales del HTML existen', () => {
    const htmls = listar(RAIZ, '.html');
    let revisados = 0;
    for (const html of htmls) {
        const contenido = fs.readFileSync(html, 'utf8');
        const dirHtml = path.dirname(html);
        const re = /<a[^>]*\shref="([^"]+)"/g;
        let m;
        while ((m = re.exec(contenido)) !== null) {
            const href = m[1];
            // Externos, anclas, correos y teléfonos no se revisan.
            if (/^(https?:|mailto:|tel:|#|javascript:)/.test(href)) continue;
            const destino = href.split(/[?#]/)[0];
            if (!destino) continue;
            const abs = destino.startsWith('/')
                ? path.join(RAIZ, destino)
                : path.resolve(dirHtml, destino);
            assert.ok(
                fs.existsSync(abs),
                `${path.relative(RAIZ, html)} enlaza a un archivo inexistente: ${href}`
            );
            revisados++;
        }
    }
    assert.ok(revisados > 0, 'debería haber al menos un enlace local');
});

// ── 5. Las páginas nuevas están enlazadas desde algún sitio ─────────────
// Una página a la que no se llega es una página que no existe para el usuario.
test('las páginas del módulo están enlazadas desde el panel', () => {
    const panel = fs.readFileSync(path.join(RAIZ, 'js', 'panel.js'), 'utf8');
    for (const pagina of ['bitacora-tablero.html', 'inventario.html', 'reporte-herramientas.html']) {
        assert.ok(panel.includes(pagina), `nadie enlaza a ${pagina} desde el panel`);
    }
});
