---
artefacto: proposal
dri: Builder 1
aprueba: PO  # `gobierno-contribucion`: quién aprueba qué es el modelo operativo
informado: PO / Builder 2
estado: pendiente-de-revision
---

# El andamio apagaba el gate del PO sin declararlo

## Por qué

`plantilla/.github/CODEOWNERS` lo escribe en su propio encabezado:

> **«el PO NO debe ser miembro del equipo de builders: si lo fuera, podría
> satisfacer su propio gate desde el otro rol y la separación se cae.»**

Y `herramientas/projects-asistente.mjs` (`derivar`) asigna:

```js
BUILDER_1: r.ORG,
PO: r.ORG,
```

**La misma persona, siempre** — trabajando solo **y con compañero**. Cada proyecto
que sale del asistente viola la regla que su propio andamio escribe.

**Lo que lo vuelve silencioso** es la mecánica que el mismo archivo explica dos
párrafos antes: *GitHub solicita review a los owners **excepto al autor**.* En las
rutas de contrato (`openspec/`) el PO es el **único** owner, así que cuando el PO
abre el pull request **no queda nadie asignado**. No hay rojo, no hay aviso: el
gate simplemente no ocurre.

**Era la única regla del marco que el andamio violaba sin declararlo**, y el marco
entero se apoya en la propiedad contraria: *lo que no se activa se declara*. Los
otros seis desvíos existen; éste faltaba.

## Qué cambia

Un séptimo desvío, sobre la regla `openspec-roles` del canónico — la que declara
la separación PO / builders.

**Y se declara distinto según el caso, porque son dos casos distintos:**

| | Motivo | Cuándo se revisa |
|---|---|---|
| **Solo** | No hay a quién darle el rol. Queda apagado y escrito | cuando entre la segunda persona |
| **Con compañero** | El andamio le da el rol al dueño de la cuenta, que es el builder 1. **Acá sí hay salida:** el compañero puede ser el PO | **ahora**: decidirlo |

Decir *«es una sola persona»* cuando son dos sería declarar un **motivo falso**, y
un motivo falso sosteniendo una regla correcta es más difícil de corregir después
que la ausencia del motivo.

## El caso con compañero es el más grave, y no es el que parece

Trabajando solo, la separación de roles **no puede** existir y todos lo saben. Con
compañero, el proyecto **parece** tener separación —hay dos personas, hay dos
handles en el CODEOWNERS— y no la tiene. Eso es peor: nadie va a mirar.

## Impacto en los proyectos consumidores

**Ninguno en su pipeline.** Es un desvío más en el archivo que el arranque escribe.
Un proyecto ya creado no cambia solo; el desvío aparece en los que nazcan desde
acá. Es MINOR.
