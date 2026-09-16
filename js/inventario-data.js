// inventario-data.js
// Catálogos de herramientas y materiales, y lógica pura de consolidación.
//
// Los catálogos salen de "LISTA DE HERRAMIENTAS.xlsx" que entregó el cliente.
// La hoja registra por ítem: CANTIDAD repartida en BUENO / REGULAR / MALO,
// más una observación (y el serial en los equipos de prueba). Por eso el
// inventario NO guarda "un estado" por herramienta: guarda cuántas hay de
// cada estado, que es lo que permite pedir reposiciones con números.

export const ESTADOS_HERRAMIENTA = ["bueno", "regular", "malo"];

/**
 * Unidad de medida de cada material. El cliente todavía no las definió, así que
 * el catálogo las trae vacías: la interfaz solo las muestra cuando existen.
 * Para llenarlas basta agregar `unidad: "metros"` al ítem correspondiente.
 */
export function unidadDe(material) {
  return String(material?.unidad ?? "").trim();
}

export const ETIQUETA_ESTADO = {
  bueno: "Bueno",
  regular: "Regular",
  malo: "Malo",
};


export const CATEGORIAS_HERRAMIENTAS = [
  "HERRAMIENTAS BÁSICAS",
  "EQUIPOS DE PRUEBA",
  "KIT DE EMPALME GPON",
  "KIT DE FUSION DE FIBRA OPTICA",
  "HERRAMIENTAS Y FACILIDADES DE FIBRA OPTICA",
  "HERRAMIENTAS EVENTUALES / INTERURBANAS",
  "EQUIPOS DE PROTECCION PERSONAL",
];

/** Cada herramienta: { id, nombre, categoria, serial }.
 * `serial` indica si la planilla original pide número de serie. */
export const HERRAMIENTAS = [
  // ── HERRAMIENTAS BÁSICAS ──
  { id: "herramientas-basic--alicate-de-5-posiciones", nombre: "Alicate de 5 posiciones", categoria: "HERRAMIENTAS BÁSICAS", serial: false },
  { id: "herramientas-basic--alicate-para-electricista-c-forro-8", nombre: "Alicate para electricista c/forro 8\"", categoria: "HERRAMIENTAS BÁSICAS", serial: false },
  { id: "herramientas-basic--bolso-cilindrico-de-empalme-tipo-liniero", nombre: "Bolso cilindrico de empalme (Tipo liniero", categoria: "HERRAMIENTAS BÁSICAS", serial: false },
  { id: "herramientas-basic--caja-de-herramientas-metalica-o-bolso", nombre: "Caja de herramientas metálica o Bolso", categoria: "HERRAMIENTAS BÁSICAS", serial: false },
  { id: "herramientas-basic--cargador-para-pilas-recargables-aa-y-aaa", nombre: "Cargador para pilas recargables AA y AAA", categoria: "HERRAMIENTAS BÁSICAS", serial: false },
  { id: "herramientas-basic--cortador-de-cable-cable-cutter", nombre: "Cortador de Cable / Cable Cutter", categoria: "HERRAMIENTAS BÁSICAS", serial: false },
  { id: "herramientas-basic--destornillador-de-estria", nombre: "Destornillador de Estria", categoria: "HERRAMIENTAS BÁSICAS", serial: false },
  { id: "herramientas-basic--destornillador-de-paleta", nombre: "Destornillador de Paleta", categoria: "HERRAMIENTAS BÁSICAS", serial: false },
  { id: "herramientas-basic--destornilladores-juego-de-varias-piezas", nombre: "Destornilladores - Juego de varias piezas", categoria: "HERRAMIENTAS BÁSICAS", serial: false },
  { id: "herramientas-basic--destornilladores-set-de-puntas-magneticas", nombre: "Destornilladores - Set de puntas magnéticas", categoria: "HERRAMIENTAS BÁSICAS", serial: false },
  { id: "herramientas-basic--destornilladores-de-copa-juego", nombre: "Destornilladores de copa - Juego", categoria: "HERRAMIENTAS BÁSICAS", serial: false },
  { id: "herramientas-basic--escalera-dielectrica-extensible-24-peldanos", nombre: "Escalera dieléctrica extensible 24 peldaños", categoria: "HERRAMIENTAS BÁSICAS", serial: false },
  { id: "herramientas-basic--escalera-dielectrica-extensible-32-peldanos", nombre: "Escalera dieléctrica extensible 32 peldaños", categoria: "HERRAMIENTAS BÁSICAS", serial: false },
  { id: "herramientas-basic--escalera-dielectrica-tipo-tijera-de-6-tramos", nombre: "Escalera dieléctrica tipo tijera de 6 tramos", categoria: "HERRAMIENTAS BÁSICAS", serial: false },
  { id: "herramientas-basic--exacto-para-cortar", nombre: "Exacto para cortar", categoria: "HERRAMIENTAS BÁSICAS", serial: false },
  { id: "herramientas-basic--faro-piloto", nombre: "Faro piloto", categoria: "HERRAMIENTAS BÁSICAS", serial: false },
  { id: "herramientas-basic--flejadora-para-fleje-de-acero-inoxidable", nombre: "Flejadora para fleje de acero inoxidable", categoria: "HERRAMIENTAS BÁSICAS", serial: false },
  { id: "herramientas-basic--lampara-para-la-cabeza-de-perfil-delgado-o-miner", nombre: "Lampara para la cabeza de perfil delgado o minera", categoria: "HERRAMIENTAS BÁSICAS", serial: false },
  { id: "herramientas-basic--llave-ajustable-o-inglesa-10", nombre: "Llave ajustable o inglesa 10\"", categoria: "HERRAMIENTAS BÁSICAS", serial: false },
  { id: "herramientas-basic--llaves-allen-juego-10-piezas", nombre: "Llaves Allen - Juego 10 piezas", categoria: "HERRAMIENTAS BÁSICAS", serial: false },
  { id: "herramientas-basic--martillo-saca-clavo-16-onzas", nombre: "Martillo saca clavo 16 Onzas", categoria: "HERRAMIENTAS BÁSICAS", serial: false },
  { id: "herramientas-basic--mecate-3-8-20m", nombre: "Mecate 3/8\" 20m", categoria: "HERRAMIENTAS BÁSICAS", serial: false },
  { id: "herramientas-basic--mecha-para-concreto-3-8-x-12-pulgadas", nombre: "Mecha para concreto 3/8 x 12 pulgadas", categoria: "HERRAMIENTAS BÁSICAS", serial: false },
  { id: "herramientas-basic--mechas-de-concreto-desde-1-4-hasta-1-2-juego", nombre: "Mechas de concreto desde 1/4\" hasta 1/2\" - Juego", categoria: "HERRAMIENTAS BÁSICAS", serial: false },
  { id: "herramientas-basic--pata-de-cabra-barra-de-demolicion-24-600mm", nombre: "Pata de cabra / Barra de demolición 24\" 600mm", categoria: "HERRAMIENTAS BÁSICAS", serial: false },
  { id: "herramientas-basic--piqueta-alicate-de-corte-diagonal-de-6", nombre: "Piqueta/ Alicate de corte diagonal de 6", categoria: "HERRAMIENTAS BÁSICAS", serial: false },
  { id: "herramientas-basic--reflector-led-recargable-portatil-de-10w", nombre: "Reflector LED recargable portátil de 10W", categoria: "HERRAMIENTAS BÁSICAS", serial: false },
  { id: "herramientas-basic--taladro-atornillador-recargable-inalambrica", nombre: "Taladro / Atornillador recargable/ Inalámbrica", categoria: "HERRAMIENTAS BÁSICAS", serial: false },
  { id: "herramientas-basic--connector-clear-pen-sc", nombre: "Connector Clear Pen SC", categoria: "HERRAMIENTAS BÁSICAS", serial: false },
  { id: "herramientas-basic--connector-clear-pen-lc", nombre: "Connector Clear Pen LC", categoria: "HERRAMIENTAS BÁSICAS", serial: false },

  // ── EQUIPOS DE PRUEBA ──
  { id: "equipos-de-prueba--laptop-dell-vostro-3520-bolso-para-laptop", nombre: "Laptop/ DELL/ Vostro 3520 + Bolso para Laptop", categoria: "EQUIPOS DE PRUEBA", serial: true },
  { id: "equipos-de-prueba--analizador-digital-personal-pda-sin-otdr", nombre: "Analizador Digital Personal (PDA) sin OTDR", categoria: "EQUIPOS DE PRUEBA", serial: true },
  { id: "equipos-de-prueba--analizador-digital-personal-pda-con-otdr", nombre: "Analizador Digital Personal (PDA) con OTDR", categoria: "EQUIPOS DE PRUEBA", serial: true },
  { id: "equipos-de-prueba--mini-ups-12v-capacidad-8000-10000mah", nombre: "Mini UPS 12V Capacidad 8000 - 10000Mah", categoria: "EQUIPOS DE PRUEBA", serial: true },
  { id: "equipos-de-prueba--otdr-con-puerto-sc-upc-con-power-meter-y-vfl", nombre: "OTDR con puerto SC/UPC con Power Meter y VFL", categoria: "EQUIPOS DE PRUEBA", serial: true },
  { id: "equipos-de-prueba--bobina-de-lanzamiento-otdr-sc-upc-sc-apc", nombre: "Bobina de lanzamiento - OTDR - SC/UPC SC/APC", categoria: "EQUIPOS DE PRUEBA", serial: true },
  { id: "equipos-de-prueba--router-belkin-rt3200-wifi-6", nombre: "Router / BELKIN / RT3200 - WiFi 6", categoria: "EQUIPOS DE PRUEBA", serial: true },

  // ── KIT DE EMPALME GPON ──
  { id: "kit-de-empalme-gpo--bolso-maletin", nombre: "Bolso / Maletín", categoria: "KIT DE EMPALME GPON", serial: false },
  { id: "kit-de-empalme-gpo--cleaver", nombre: "Cleaver", categoria: "KIT DE EMPALME GPON", serial: false },
  { id: "kit-de-empalme-gpo--pela-cable-fibra-stripper-fibra", nombre: "Pela cable fibra / Stripper Fibra", categoria: "KIT DE EMPALME GPON", serial: false },
  { id: "kit-de-empalme-gpo--pela-drop", nombre: "Pela Drop", categoria: "KIT DE EMPALME GPON", serial: false },
  { id: "kit-de-empalme-gpo--power-metter", nombre: "Power Metter", categoria: "KIT DE EMPALME GPON", serial: false },
  { id: "kit-de-empalme-gpo--vfl", nombre: "VFL", categoria: "KIT DE EMPALME GPON", serial: false },

  // ── KIT DE FUSION DE FIBRA OPTICA ──
  { id: "kit-de-fusion-de-f--fusionadora-con-kit-de-empalme-de-tipo-fusion-or", nombre: "Fusionadora con Kit de empalme de tipo fusión ORIENTEK T45", categoria: "KIT DE FUSION DE FIBRA OPTICA", serial: false },
  { id: "kit-de-fusion-de-f--fusion-splicer", nombre: "Fusión Splicer", categoria: "KIT DE FUSION DE FIBRA OPTICA", serial: false },
  { id: "kit-de-fusion-de-f--cleaver", nombre: "Cleaver", categoria: "KIT DE FUSION DE FIBRA OPTICA", serial: false },
  { id: "kit-de-fusion-de-f--dispensador-de-alcohol", nombre: "Dispensador de alcohol", categoria: "KIT DE FUSION DE FIBRA OPTICA", serial: false },
  { id: "kit-de-fusion-de-f--pela-cable-fibra-stripper-fibra", nombre: "Pela cable fibra / Stripper Fibra", categoria: "KIT DE FUSION DE FIBRA OPTICA", serial: false },
  { id: "kit-de-fusion-de-f--stripper-buffer", nombre: "Stripper Buffer", categoria: "KIT DE FUSION DE FIBRA OPTICA", serial: false },
  { id: "kit-de-fusion-de-f--tijera-cortadora-de-kevlar", nombre: "Tijera cortadora de kevlar", categoria: "KIT DE FUSION DE FIBRA OPTICA", serial: false },
  { id: "kit-de-fusion-de-f--toallitas-para-limpiar-fibra-caja", nombre: "Toallitas para limpiar fibra - Caja", categoria: "KIT DE FUSION DE FIBRA OPTICA", serial: false },

  // ── HERRAMIENTAS Y FACILIDADES DE FIBRA OPTICA ──
  { id: "herramientas-y-fac--bombona-de-gas-y-pico", nombre: "Bombona de Gas y Pico", categoria: "HERRAMIENTAS Y FACILIDADES DE FIBRA OPTICA", serial: false },
  { id: "herramientas-y-fac--mesa", nombre: "Mesa", categoria: "HERRAMIENTAS Y FACILIDADES DE FIBRA OPTICA", serial: false },
  { id: "herramientas-y-fac--pinza-para-instalacion-y-desinstalacion-de-conec", nombre: "Pinza para instalación y desinstalación de conectores SC y LC", categoria: "HERRAMIENTAS Y FACILIDADES DE FIBRA OPTICA", serial: false },
  { id: "herramientas-y-fac--sangrador-de-buffer-de-fibra-optica", nombre: "Sangrador de buffer de fibra óptica", categoria: "HERRAMIENTAS Y FACILIDADES DE FIBRA OPTICA", serial: false },
  { id: "herramientas-y-fac--silla", nombre: "Silla", categoria: "HERRAMIENTAS Y FACILIDADES DE FIBRA OPTICA", serial: false },

  // ── HERRAMIENTAS EVENTUALES / INTERURBANAS ──
  { id: "herramientas-event--barreton", nombre: "Barretón", categoria: "HERRAMIENTAS EVENTUALES / INTERURBANAS", serial: false },
  { id: "herramientas-event--cizalla", nombre: "Cizalla", categoria: "HERRAMIENTAS EVENTUALES / INTERURBANAS", serial: false },
  { id: "herramientas-event--machete", nombre: "Machete", categoria: "HERRAMIENTAS EVENTUALES / INTERURBANAS", serial: false },
  { id: "herramientas-event--mariota-de-fibra-de-vidrio-150m-diametro-11mm-5", nombre: "Mariota de fibra de vidrio 150m, diámetro 11mm 5", categoria: "HERRAMIENTAS EVENTUALES / INTERURBANAS", serial: false },
  { id: "herramientas-event--mini-motosierra-6-bl-inalambrico-20v", nombre: "Mini Motosierra 6\" BL Inalámbrico 20V", categoria: "HERRAMIENTAS EVENTUALES / INTERURBANAS", serial: false },
  { id: "herramientas-event--motosierra-de-cadena-a-gasolina-24", nombre: "Motosierra de cadena a gasolina 24\"", categoria: "HERRAMIENTAS EVENTUALES / INTERURBANAS", serial: false },
  { id: "herramientas-event--pala", nombre: "Pala", categoria: "HERRAMIENTAS EVENTUALES / INTERURBANAS", serial: false },
  { id: "herramientas-event--hacha", nombre: "Hacha", categoria: "HERRAMIENTAS EVENTUALES / INTERURBANAS", serial: false },
  { id: "herramientas-event--pala-draga", nombre: "Pala Draga", categoria: "HERRAMIENTAS EVENTUALES / INTERURBANAS", serial: false },
  { id: "herramientas-event--pico", nombre: "Pico", categoria: "HERRAMIENTAS EVENTUALES / INTERURBANAS", serial: false },
  { id: "herramientas-event--rotomartillo-bl-inalambrico-20v-linea-p20s", nombre: "Rotomartillo BL inalambrico 20V Linea P20S", categoria: "HERRAMIENTAS EVENTUALES / INTERURBANAS", serial: false },
  { id: "herramientas-event--senorita-de-guaya", nombre: "Señorita de guaya", categoria: "HERRAMIENTAS EVENTUALES / INTERURBANAS", serial: false },

  // ── EQUIPOS DE PROTECCION PERSONAL ──
  { id: "equipos-de-protecc--arnes-corporal-de-seguridad-con-soporte-lumbar", nombre: "Arnés corporal de seguridad, con soporte lumbar", categoria: "EQUIPOS DE PROTECCION PERSONAL", serial: false },
  { id: "equipos-de-protecc--botas-de-caucho-cana-alta", nombre: "Botas de caucho caña alta", categoria: "EQUIPOS DE PROTECCION PERSONAL", serial: false },
  { id: "equipos-de-protecc--botas-de-seguridad", nombre: "Botas de seguridad", categoria: "EQUIPOS DE PROTECCION PERSONAL", serial: false },
  { id: "equipos-de-protecc--botiquin-de-primeros-auxilios", nombre: "Botiquín de primeros auxilios", categoria: "EQUIPOS DE PROTECCION PERSONAL", serial: false },
  { id: "equipos-de-protecc--casco-de-seguridad-con-barbiquejo", nombre: "Casco de seguridad con barbiquejo", categoria: "EQUIPOS DE PROTECCION PERSONAL", serial: false },
  { id: "equipos-de-protecc--casco-de-seguridad-anticaida", nombre: "Casco de seguridad anticaida", categoria: "EQUIPOS DE PROTECCION PERSONAL", serial: false },
  { id: "equipos-de-protecc--cono-de-seguridad-vial", nombre: "Cono de seguridad vial", categoria: "EQUIPOS DE PROTECCION PERSONAL", serial: false },
  { id: "equipos-de-protecc--eslinga-de-absorcion-de-impacto", nombre: "Eslinga de absorción de impacto", categoria: "EQUIPOS DE PROTECCION PERSONAL", serial: false },
  { id: "equipos-de-protecc--eslinga-de-posicionamiento", nombre: "Eslinga de posicionamiento", categoria: "EQUIPOS DE PROTECCION PERSONAL", serial: false },
  { id: "equipos-de-protecc--extintor-de-pas-de-5-lb", nombre: "Extintor de PaS de 5 lb", categoria: "EQUIPOS DE PROTECCION PERSONAL", serial: false },
  { id: "equipos-de-protecc--guantes-anticorte", nombre: "Guantes anticorte", categoria: "EQUIPOS DE PROTECCION PERSONAL", serial: false },
  { id: "equipos-de-protecc--guantes-de-carolina", nombre: "Guantes de Carolina", categoria: "EQUIPOS DE PROTECCION PERSONAL", serial: false },
  { id: "equipos-de-protecc--lentes-de-seguridad-claros", nombre: "Lentes de seguridad claros", categoria: "EQUIPOS DE PROTECCION PERSONAL", serial: false },
  { id: "equipos-de-protecc--lentes-de-seguridad-oscuros", nombre: "Lentes de seguridad oscuros", categoria: "EQUIPOS DE PROTECCION PERSONAL", serial: false },
  { id: "equipos-de-protecc--termo-de-agua-15-litros", nombre: "Termo de agua 15 litros", categoria: "EQUIPOS DE PROTECCION PERSONAL", serial: false },
  { id: "equipos-de-protecc--detector-de-voltaje-sin-contacto-tipo-lapiz", nombre: "Detector de voltaje sin contacto (Tipo lápiz", categoria: "EQUIPOS DE PROTECCION PERSONAL", serial: false },
];

export const CATEGORIAS_MATERIALES = [
  "ULTIMA MILLA",
  "GPON",
  "CONSTRUCCIÓN",
  "PLANTA INTERNA",
];

/** Cada material: { id, nombre, categoria }. El id es el código del almacén. */
export const MATERIALES_USO_DIARIO = [
  // ── ULTIMA MILLA ──
  { id: "GPON-EQU-FO-035", nombre: "ONU / ONT MODELO HG8310M (INFRAESTRUCTURA) (PROHAM)", categoria: "ULTIMA MILLA" },
  { id: "GPON-EQU-FO-222", nombre: "ONU ROUTER / ONT ROUTER XG-PON HUAWEI HN8145X6 (INFRAESTRUCTURA)", categoria: "ULTIMA MILLA" },
  { id: "GPON-EQU-FO-220", nombre: "ONU / ONT MODELO XZ000-G7 TP-LINK (INFRAESTRUCTURA)", categoria: "ULTIMA MILLA" },
  { id: "GOP-CON-FAS-002", nombre: "FAST CONECTOR SC/APC (INFRAESTRUCTURA)", categoria: "ULTIMA MILLA" },
  { id: "GOP-CON-FAS-004", nombre: "FAST CONECTOR SC/UPC (INFRAESTRUCTURA)", categoria: "ULTIMA MILLA" },
  { id: "GOP-PAT-COR-025", nombre: "PATCH CORD SC/APC - SC/UPC 1M SIMPLEX (INFRAESTRUCTURA)", categoria: "ULTIMA MILLA" },
  { id: "GPON-HRR-FO-100", nombre: "CAJA TERMINAL FIBER DROP ROSETAS (INFRAESTRUCTURA)", categoria: "ULTIMA MILLA" },
  { id: "GOP-PAT-COR-003", nombre: "PATCH CORD LAN UTP ETHERNET RJ45 CAT-5 (1 MTS) (INFRAESTRUCTURA)", categoria: "ULTIMA MILLA" },
  { id: "FIBR-OPT-DRO-010", nombre: "FIBRA OPTICA DE 1 HILOS FIBER DROP (INFRAESTRUCTURA) (CARRETE)", categoria: "ULTIMA MILLA" },
  { id: "GOP-PAT-COR-027", nombre: "PATCH CORD SC/APC - SC/UPC 3M SIMPLEX (INFRAESTRUCTURA)", categoria: "ULTIMA MILLA" },
  { id: "GPO-GRA-DRO-002", nombre: "GRAPA PARA CABLE DROP (INFRAESTRUCTURA)", categoria: "ULTIMA MILLA" },
  { id: "GOP-PAT-COR-032", nombre: "PATCH CORD SC/APC - SC/APC 1M INFRAESTRUCTURA", categoria: "ULTIMA MILLA" },
  { id: "FER-HER-RAM-007", nombre: "RAMPLUG VERDE 1/4\" (INFRAESTRUCTURA)", categoria: "ULTIMA MILLA" },
  { id: "FER-TOR-ACE-006", nombre: "TORNILLO PARA RAMPLUNG VERDE O AZUL 8X1 (INFRAESTRUCTURA)", categoria: "ULTIMA MILLA" },
  { id: "AIR-SER-PAP-094", nombre: "TIRRO BLANCO 1\"", categoria: "ULTIMA MILLA" },

  // ── GPON ──
  { id: "HX-C-144", nombre: "MANGA MDT CIERRE 144 HILOS", categoria: "GPON" },
  { id: "GLOBATEL FO129", nombre: "CAJA DE DISTRIBUCIÓN DE F.O. PARA FTTH, CON CAPACIDAD HASTA 16 PUERTOS OUTDOOR IP65 (NAP), PARA INSTALACIÓN EN CABLE CON 4 PUERTOS DE ENTRADA/SALIDA DE CABLE MDT", categoria: "GPON" },
  { id: "HX-FDB-16", nombre: "FDB DE 16 PUERTOS PARA MDU COLOR BLANCO", categoria: "GPON" },
  { id: "HX-FDB-8", nombre: "FDB DE 8 PUERTOS PARA EDIFICIO MDU COLOR BLANCO", categoria: "GPON" },
  { id: "GOP-SPL-OPT-002", nombre: "SPLITTER OPTICO 1X16 SC APC MDT", categoria: "GPON" },
  { id: "GOP-SPL-OPT-005", nombre: "SPLITTER OPTICO 1X8 SC APC PARA LOS NAP MDT", categoria: "GPON" },
  { id: "GOP-SPL-OPT-004", nombre: "SPLITTER OPTICO 1X4 SC APC", categoria: "GPON" },
  { id: "GOP-SPL-OPT-003", nombre: "SPLITTER OPTICO 1X2 SC APC", categoria: "GPON" },
  { id: "GOP-SPL-OPT-001", nombre: "SPLITTER 1X8 VIAS PLC SIN CONECTOR, PARA FUSION DIRECTA PARA LAS MANGAS O CAJA DE EMPALME", categoria: "GPON" },
  { id: "GOP-CON-ENF-002", nombre: "ENFRENTADOR SC/APC CON TOPE, PARA ROSETAS Y FDB (INFRAESTRUCTURA) MDT", categoria: "GPON" },
  { id: "GOP-CON-ENF-004", nombre: "ENFRENTADOR SC/APC SIN TOPE, PARA MDU BLANCO", categoria: "GPON" },
  { id: "FER-PAQ-TIR-001", nombre: "TIRRAP MEDIANO 20 CM", categoria: "GPON" },
  { id: "FER-PAQ-TIR-002", nombre: "TIRRAP DE AMARRE PLÁSTICO PEQUEÑO NEGRO, MEDIDAS: 2.5 x 100MM (PAQUETE DE 100UND)", categoria: "GPON" },

  // ── CONSTRUCCIÓN ──
  { id: "GPON-CAB-FO-020", nombre: "FIBRA OPTICA DE 24 HILOS ADSS SPAN DE 100M (CARRETE)", categoria: "CONSTRUCCIÓN" },
  { id: "FIBR-OPT-12H-004", nombre: "FIBRA OPTICA DE 12 HILOS ADSS SPAN DE 100M (CARRETE)", categoria: "CONSTRUCCIÓN" },
  { id: "GPON-HER-FO-029", nombre: "HERRAJE DE ANCLAJE PLASTICO PARA CABLE ADSS DE 9MM A 12MM MDT", categoria: "CONSTRUCCIÓN" },
  { id: "PA-1500", nombre: "HERRAJE DE ANCLAJE PLASTICO PARA CABLE ADSS DE 7MM A 9MM MDT", categoria: "CONSTRUCCIÓN" },
  { id: "preformado-de-10-a-10-9-mm-para-de-fibra-optica", nombre: "PREFORMADO DE 10 A 10.9 MM PARA DE FIBRA OPTICA DE 200 SPAN (FIBRA ECUATORIANA)", categoria: "CONSTRUCCIÓN" },
  { id: "GPON-HER-FO-058", nombre: "SOPORTE DE SUSPENSION TIPO J PARA DOS CABLE DE 5MM A 8MM MDT", categoria: "CONSTRUCCIÓN" },
  { id: "GPON-HER-FO-056", nombre: "SOPORTE DE SUSPENSION TIPO J PARA DOS CABLE DE 15MM A 20MM", categoria: "CONSTRUCCIÓN" },
  { id: "GPON-HER-FO-059", nombre: "FLEJE DE ACERO DE 3/4\" POR MTS MDT", categoria: "CONSTRUCCIÓN" },
  { id: "HX-HC-20-T-304", nombre: "HEBILLAS PARA FLEJE DE 3/4\" MDT", categoria: "CONSTRUCCIÓN" },
  { id: "HX-UPC-2KN", nombre: "BRACKETS SOPORTE DE ANCLAJE DE ALUMINIO MBL 2KN MDT", categoria: "CONSTRUCCIÓN" },
  { id: "GPON-HER-FO-009", nombre: "ARGOLLA REDONDA PARA PARED-CANCAMO", categoria: "CONSTRUCCIÓN" },

  // ── PLANTA INTERNA ──
  { id: "GOP-PAT-COR-005", nombre: "PATCH CORD LC/APC TO LC/APC SIMPLEX SMF 2M", categoria: "PLANTA INTERNA" },
  { id: "PATCH CORD LC/UPC 1METRO", nombre: "PATCHCORD LC/UPC - LC/UPC DE 1MTS SIMPLEX", categoria: "PLANTA INTERNA" },
  { id: "GOP-PAT-COR-004", nombre: "PATCH CORD LC UPC - SC UPC 10 METROS DUPLEX", categoria: "PLANTA INTERNA" },
  { id: "GOP-PAT-COR-030", nombre: "PATCH CORD SC/UPC - LC/UPC 3 MTS", categoria: "PLANTA INTERNA" },
  { id: "GOP-PAT-COR-029", nombre: "PATCH CORD SC/UPC - LC/UPC 10M", categoria: "PLANTA INTERNA" },
  { id: "GOP-PAT-COR-007", nombre: "PATCH CORD LC/UPC - LC/UPC MODE 3M DUPLEX", categoria: "PLANTA INTERNA" },
  { id: "enfrentador-lc-upc-lc-upc-con-tope-duplex-sm", nombre: "ENFRENTADOR LC/UPC - LC/UPC CON TOPE, DUPLEX, SM", categoria: "PLANTA INTERNA" },
  { id: "GOP-CON-FAS-001", nombre: "FAST CONECTOR LC/UPC", categoria: "PLANTA INTERNA" },
];

// ───────────────────────────────────────────────────────────────
// Lógica pura: normalización, validación y consolidado
// ───────────────────────────────────────────────────────────────

const HERRAMIENTA_POR_ID = new Map(HERRAMIENTAS.map((h) => [h.id, h]));

export function buscarHerramienta(id) {
  return HERRAMIENTA_POR_ID.get(id) || null;
}

/** Entero >= 0. Cualquier basura cuenta como 0. */
export function aEntero(v) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Normaliza un renglón de herramienta a { id, bueno, regular, malo, cantidad, serial, observacion }. */
export function normalizarRenglon(renglon = {}) {
  const bueno = aEntero(renglon.bueno);
  const regular = aEntero(renglon.regular);
  const malo = aEntero(renglon.malo);
  return {
    id: renglon.id,
    bueno,
    regular,
    malo,
    cantidad: bueno + regular + malo,
    serial: String(renglon.serial ?? "").trim(),
    observacion: String(renglon.observacion ?? "").trim(),
  };
}

/**
 * ¿El supervisor escribió algo en este renglón?
 * Un "0" tecleado ES un dato: significa "revisé y no tiene ninguna". Un campo
 * en blanco significa "no lo revisé". Distinguirlos es lo que permite que el
 * coordinador sepa si un faltante está confirmado o simplemente sin auditar.
 */
export function fueEscrito(renglon = {}) {
  return ["bueno", "regular", "malo", "serial", "observacion"].some((k) => {
    const v = renglon[k];
    return v !== null && v !== undefined && String(v).trim() !== "";
  });
}

/** Se guardan los renglones que el supervisor tocó, incluidos los que puso en cero. */
export function renglonesConDatos(renglones) {
  return (renglones || []).filter(fueEscrito).map(normalizarRenglon);
}

/**
 * Valor para pintar en un input: "" si nunca se escribió, el número si sí.
 * Sin esto un 0 guardado volvería a la pantalla como campo vacío y el
 * supervisor no sabría si su auditoría quedó registrada.
 */
export function valorParaCampo(v) {
  if (v === null || v === undefined || String(v).trim() === "") return "";
  return aEntero(v);
}

/**
 * Consolida los inventarios de varios técnicos en un reporte por herramienta.
 * Entrada: [{ tecnicoNombre, items: [{ id, bueno, regular, malo, ... }] }]
 * Salida ordenada por urgencia: primero lo que tiene más unidades malas.
 */
export function resumirHerramientas(inventarios) {
  const acc = new Map();

  (inventarios || []).forEach((inv) => {
    (inv?.items || []).forEach((renglon) => {
      const r = normalizarRenglon(renglon);
      if (!r.id) return;

      const cat = buscarHerramienta(r.id);
      if (!acc.has(r.id)) {
        acc.set(r.id, {
          id: r.id,
          // Si el ítem ya no está en el catálogo (se renombró), se conserva
          // el registro para no perder unidades del reporte.
          nombre: cat ? cat.nombre : r.id,
          categoria: cat ? cat.categoria : "SIN CATEGORÍA",
          total: 0,
          bueno: 0,
          regular: 0,
          malo: 0,
          tecnicos: 0,   // cuántos tienen al menos una unidad
          auditados: 0,  // cuántos fueron revisados, tengan o no
        });
      }
      const fila = acc.get(r.id);
      fila.total += r.cantidad;
      fila.bueno += r.bueno;
      fila.regular += r.regular;
      fila.malo += r.malo;
      fila.auditados += 1;
      if (r.cantidad > 0) fila.tecnicos += 1;
    });
  });

  return [...acc.values()].sort(
    (a, b) => b.malo - a.malo || b.regular - a.regular || a.nombre.localeCompare(b.nombre)
  );
}

/** Totales generales del reporte. */
export function totalesHerramientas(resumen) {
  return (resumen || []).reduce(
    (t, f) => ({
      total: t.total + f.total,
      bueno: t.bueno + f.bueno,
      regular: t.regular + f.regular,
      malo: t.malo + f.malo,
    }),
    { total: 0, bueno: 0, regular: 0, malo: 0 }
  );
}

/** Lo que hay que reponer: unidades malas. Lo regular se vigila, no se repone. */
export function porReponer(resumen) {
  return (resumen || []).filter((f) => f.malo > 0);
}

export const COLUMNAS_CSV_REQUERIMIENTOS = [
  { clave: "categoria", titulo: "Categoría" },
  { clave: "nombre", titulo: "Herramienta / Equipo" },
  { clave: "total", titulo: "Total en campo" },
  { clave: "bueno", titulo: "Buenas" },
  { clave: "regular", titulo: "Regulares (vigilar)" },
  { clave: "malo", titulo: "Malas (reponer)" },
  { clave: "tecnicos", titulo: "Técnicos que la tienen" },
  { clave: "auditados", titulo: "Técnicos revisados" },
];

export const COLUMNAS_CSV_MATERIALES = [
  { clave: "fecha", titulo: "Fecha" },
  { clave: "supervisorNombre", titulo: "Supervisor" },
  { clave: "tecnicoNombre", titulo: "Técnico" },
  { clave: "categoria", titulo: "Categoría" },
  { clave: "codigo", titulo: "Código" },
  { clave: "nombre", titulo: "Material" },
  { clave: "cantidad", titulo: "Cantidad entregada" },
  { clave: "nota", titulo: "Nota" },
];

/** Aplana las entregas de material a una fila por ítem, para el CSV. */
export function aplanarEntregas(entregas) {
  const filas = [];
  (entregas || []).forEach((e) => {
    (e.items || []).forEach((it) => {
      const cantidad = aEntero(it.cantidad);
      if (!cantidad) return;
      filas.push({
        fecha: e.fecha || "",
        supervisorNombre: e.supervisorNombre || "",
        tecnicoNombre: e.tecnicoNombre || "",
        categoria: it.categoria || "",
        codigo: it.id || "",
        nombre: it.nombre || "",
        cantidad,
        nota: e.nota || "",
      });
    });
  });
  return filas;
}
