# DESIGN.md — Sistema de Diseño GESTO Evaluaciones (Edición Exteriores / Campo)

Sistema de diseño semántico fundacional para **GESTO Evaluaciones**. Diseñado específicamente para garantizar máxima legibilidad bajo luz solar directa (uso por técnicos y supervisores en campo), respetando la identidad oficial de la marca y aplicando arquitectura Bento Grid modular.

---

## 1. Filosofía Visual y Atmósfera

* **Modo:** Exteriores / Alto Contraste Antideslumbrante (*Outdoor High-Contrast*).
* **Densidad:** *Field Operational* (espaciados generosos, botones grandes de mínimo 48px para uso con una sola mano o guantes).
* **Composición:** *Bento Grid Modular* (tarjetas con radios redondeados que reflejan la curvatura del logotipo de Airtek).
* **Movimiento:** *Tactile Spring* (sensación física de empuje en botones al presionar, transiciones de 150ms a 200ms sin retrasos innecesarios).

---

## 2. Calibración de Color Oficial (Paleta Exteriores)

Los colores fueron extraídos directamente de los activos vectoriales oficiales de Airtek:

| Token | Nombre Descriptivo | Valor Hex | Función Semántica |
| :--- | :--- | :--- | :--- |
| `--azul-airtek` | Azul Eléctrico Airtek | `#0066FF` | Color insignia oficial. Botones de acción primaria, tarjetas destacadas y pines de ubicación. |
| `--azul-hover` | Azul Cobalto Profundo | `#0047B3` | Estado hover/active de botones primarios y acentos interactivos. |
| `--fondo-campo` | Gris Hielo Antideslumbrante | `#F4F6FA` | Fondo general de la aplicación. Evita el encandilamiento del blanco puro bajo el sol. |
| `--tarjeta-bg` | Blanco Puro Satín | `#FFFFFF` | Superficie de las tarjetas Bento. Ofrece contraste máximo y separación nítida de bloques. |
| `--tarjeta-borde` | Borde Pizarra Claro | `#E2E8F0` | Borde perimetral de 1px en cada tarjeta para definir contornos claros contra el sol. |
| `--texto-primario` | Carbón Navy Ultra-Profundo | `#0F172A` | Títulos, nombres de técnicos y cifras numéricas principales (Contraste 12:1 - WCAG AAA). |
| `--texto-secundario`| Pizarra Medio | `#475569` | Subtítulos, fechas, etiquetas de campos y metadatos. Legible sin desvanecerse en luz diurna. |
| `--ok` | Verde Operativo Campo | `#059669` | Estatus "Aprobado", cuadrilla lista, inventario completo. |
| `--advertencia` | Ámbar Solar | `#EA580C` | Evaluaciones pendientes, observaciones en cuadrilla o stock bajo. |
| `--error` | Rojo Carmesí | `#DC2626` | Fallas críticas, no conformidades o desconexión. |

---

## 3. Tipografía y Jerarquía Numérica

* **Familia Tipográfica:** `"Poppins", system-ui, -apple-system, sans-serif`.
  * Los terminales redondeados de *Poppins* armonizan con la geometría fluida del logotipo oficial de Airtek.
* **Escala y Peso:**
  * **Cifras de Métricas (Hero Stats):** `font-size: 2rem` a `2.5rem`, `font-weight: 800`, color `--texto-primario`.
  * **Títulos de Sección / Tarjeta:** `font-size: 1.1rem`, `font-weight: 700`, color `--texto-primario`.
  * **Etiquetas de Estado / Filtros:** `font-size: 0.85rem`, `font-weight: 600`, `text-transform: uppercase`, `letter-spacing: 0.5px`.
  * **Cuerpo de Texto:** `font-size: 0.95rem`, `font-weight: 400`, color `--texto-secundario`.

---

## 4. Arquitectura de Componentes Bento Grid

### 4.1. Tarjeta Principal (Featured Card — Azul Airtek)
* **Fondo:** `background: var(--azul-airtek)`
* **Texto:** Blanco puro (`#FFFFFF`) con alta luminosidad.
* **Propósito:** Mostrar la tarea o evaluación activa más relevante del técnico (ej. *"Evaluación en curso: Empalme Nodo 04"*).
* **Radio:** `border-radius: 20px`.

### 4.2. Tarjetas de Métricas Rápidas (Stat Cards — Blancas)
* **Fondo:** `background: var(--tarjeta-bg)`
* **Borde:** `border: 1px solid var(--tarjeta-borde)`
* **Sombra:** `box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05)`
* **Disposición:** Cifra grande arriba (`24`), descripción concisa abajo (`Evaluaciones cerradas`).
* **Radio:** `border-radius: 18px`.

### 4.3. Gráficas de Rendimiento Diarias (Micro-Histograma)
* Barras verticales delgadas para cada día de la semana (L, M, M, J, V, S).
* La barra del día en curso utiliza `--azul-airtek`; los días anteriores usan `--tarjeta-borde` o pizarra suave.
* Altura proporcional con etiquetas debajo.

### 4.4. Filtros en Píldora (*Segmented Controls*)
* Contenedor redondeado (`border-radius: 9999px`) con fondo `#E2E8F0`.
* Píldora activa en `--tarjeta-bg` o `--azul-airtek` con transición suave.
* Altura táctil mínima: `40px` a `44px`.

### 4.5. Barra de Navegación Flotante Inferior (*Floating Dock*)
* Ubicada fija en la parte inferior de la pantalla con margen flotante (`bottom: 16px; left: 16px; right: 16px`).
* Forma de cápsula (`border-radius: 30px`), fondo blanco satinado con sombra elevada (`0 10px 25px rgba(0,0,0,0.1)`).
* Iconos SVG estilizados de Airtek con área de toque mínima de `48×48px` para el pulgar.

---

## 5. Simbología y Recursos de Marca

1. **Logotipo GESTO:**
   * Wordmark tipográfico (Poppins, `font-weight: 900`), no una imagen — se resuelve como texto estilizado en cada superficie.
   * En superficies blancas o fondo claro: versión en color oscuro (`#0F172A`) o azul (`#0066FF`).
   * En tarjetas destacadas azules: versión en blanco puro (`#FFFFFF`).
2. **Iconografía de Interfaz:**
   * Exclusivamente iconos SVG con trazo uniforme (2px) y esquinas redondeadas.
   * Prohibido el uso de emojis como iconos funcionales.

---

## 6. Reglas Anti-Slop (Prohibiciones Inquebrantables)

* ❌ **Prohibido el modo oscuro por defecto en pantallas de campo:** La luz del sol vuelve ilegibles los fondos negros.
* ❌ **Prohibido el texto gris claro sobre fondo claro:** Todo texto debe superar un ratio de contraste mínimo de `4.5:1` (objetivo `7:1`).
* ❌ **Prohibido el morado neón o degradados difusos de IA:** Paleta estrictamente corporativa basada en el azul `#0066FF`.
* ❌ **Prohibidos los botones pequeños:** Ningún elemento interactivo puede medir menos de `44px` de alto (ideal `48px`).
* ❌ **Prohibido el desbordamiento horizontal:** El 100% de la interfaz debe mantenerse encuadrada dentro del ancho de la pantalla móvil (`overflow-x: hidden`).
