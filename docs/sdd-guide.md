# 🧭 Guía SDD para el Agente — Spec-Driven Development desde cero

> **Para el agente:** Este archivo es tu contexto maestro. Léelo completo antes de hacer cualquier cosa. Tu rol es **guiar activamente** al usuario a través del flujo SDD, enseñándole la metodología mientras la aplica. Nunca saltes fases. Nunca escribas código antes de que la spec esté aprobada.

---

## PARTE 1 — ¿Qué es SDD? (Para que lo entiendas y lo expliques)

### Definición

**Spec-Driven Development (SDD)** es una metodología de ingeniería de software donde la **especificación estructurada es la fuente de verdad** — para el humano y para el agente de IA — antes de que exista una sola línea de código.

### El problema que resuelve: Vibe Coding vs SDD

| Vibe Coding ❌ | SDD ✅ |
|---|---|
| "Hazme una app que..." (prompt vago) | Especificación precisa antes de codificar |
| El agente rellena huecos con suposiciones | El agente ejecuta contra un contrato definido |
| El código deriva del intent original | Trazabilidad: cada línea de código tiene un RF que la justifica |
| Los cambios rompen cosas silenciosamente | Los cambios empiezan en la spec, luego van al código |
| Sesiones sin memoria coherente | `AGENTS.md` y `constitution.md` persisten el contexto |

### ¿Por qué funciona?

1. **Elimina la ambigüedad** — el agente no adivina, ejecuta contra requisitos explícitos
2. **Trazabilidad total** — cada feature tiene un RF, cada RF tiene un test
3. **Spec como puerta de validación** — el output del agente se audita contra la spec, no contra intuición
4. **Contexto persistente** — `AGENTS.md` hace que el agente "recuerde" las reglas entre sesiones

### Los 3 niveles de SDD (de menos a más riguroso)

| Nivel | Descripción | Ideal para |
|---|---|---|
| **Spec-First** | Spec por tarea, luego se usa como documentación | Proyectos pequeños o primeras experiencias |
| **Spec-Anchored** | La spec es un documento vivo que evoluciona con el proyecto | La mayoría de proyectos profesionales |
| **Spec-as-Source** | La spec ES la fuente primaria; editas spec, no código | Sistemas críticos o regulados |

> **Para este proyecto**: usaremos **Spec-Anchored**, el estándar profesional.

---

## PARTE 2 — La notación EARS (cómo escribir requisitos)

EARS (**Easy Approach to Requirements Syntax**) fue desarrollada por Alistair Mavin en Rolls-Royce para escribir requisitos sin ambigüedad. Es el corazón técnico de SDD.

### Los 5 patrones EARS

```
1. UBIQUO (comportamiento siempre activo)
   EL SISTEMA <comportamiento permanente>.
   Ejemplo: EL SISTEMA almacenará todos los datos en un único archivo JSON local.

2. DIRIGIDO POR EVENTO (happy path)
   CUANDO <evento/trigger>, EL SISTEMA <respuesta>.
   Ejemplo: CUANDO el usuario ejecute `login`, EL SISTEMA validará credenciales y retornará un token.

3. DIRIGIDO POR ESTADO (comportamiento condicional)
   MIENTRAS <estado/precondición>, EL SISTEMA <comportamiento>.
   Ejemplo: MIENTRAS no exista ningún usuario registrado, EL SISTEMA redirigirá al flujo de registro.

4. COMPORTAMIENTO NO DESEADO (manejo de errores)
   SI <condición de error/entrada inválida>, ENTONCES EL SISTEMA <respuesta de error>.
   Ejemplo: SI el token ha expirado, ENTONCES EL SISTEMA rechazará la petición con código 401.

5. CARACTERÍSTICA OPCIONAL (feature flag o configuración)
   DONDE <condición de feature>, EL SISTEMA <comportamiento>.
   Ejemplo: DONDE el modo debug esté activo, EL SISTEMA imprimirá logs detallados en consola.
```

### Reglas de oro de EARS

- **Un RF = una sola idea** — si necesitas "y" o "pero", divide en dos RFs
- **Sin ambigüedad** — "rápido", "fácil", "amigable" no son requisitos. "< 200ms" sí lo es
- **Verificable** — cualquier RF debe poder tener un test que pase o falle
- **Numerados** — siempre `RF-1`, `RF-2`... para trazabilidad
- Cuando un requisito es complejo (más de 3 precondiciones), usa notación técnica en lugar de EARS

---

## PARTE 3 — Los artefactos SDD (archivos que produces)

### Estructura de proyecto

```
mi-proyecto/
├── AGENTS.md              ← Contexto del agente (lee esto primero en cada sesión)
├── CLAUDE.md              ← (opcional) solo contiene: @AGENTS.md
├── docs/
│   ├── constitution.md    ← Principios innegociables del proyecto
│   └── sdd-guide.md       ← Guía y referencia SDD
└── specs/
    └── 001-nombre-mvp/
        ├── spec.md        ← Los requisitos funcionales (RF-1, RF-2...)
        ├── plan.md        ← Módulos, modelo de datos, decisiones técnicas
        └── tasks.md       ← Tareas T1-TN con checkboxes y criterio "Hecho cuando:"
```

---

## PARTE 4 — El flujo SDD completo (8 fases)

```
Constitución → Spec → Clarificación → Plan → Tareas → Implementación → Validación → Cambio
```

### Fase 1: Constitución
### Fase 2: Especificación (Spec + Entrevista)
### Fase 3: Clarificación (QA de la spec)
### Fase 4: Plan
### Fase 5: Tareas
### Fase 6: Implementación (una tarea cada vez)
### Fase 7: Validación
### Fase 8: Cambio (para futuras iteraciones)

---

## PARTE 5 — Anti-patrones a evitar (errores comunes)
- Specification Theater
- Big Spec Up Front
- Ambiguity Tax
- Spec-Implementation Drift
- Test Homogenization
- Supervision Atrophy

---

## PARTE 6 — Instrucciones para el agente (cómo debes comportarte)

1. Recuérdale el flujo antes de empezar: Constitución → Spec → Clarificación → Plan → Tareas → Implementación → Validación
2. No saltes fases.
3. Una fase a la vez. Termina y obtén aprobación antes de la siguiente.
4. Explica mientras avanzas.
5. En implementación: una tarea, tests, stop.
6. Si algo no está en la spec, pregunta.
7. Recuérdale al usuario que él es el dueño del intent.

---

## PARTE 7 & 8 — Checklist y Prompts
Consulta esta guía cuando sea necesario para auditar o formular prompts.
