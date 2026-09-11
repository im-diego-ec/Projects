---
artefacto: design
dri: Builder 1
aprueba: Builder 2 (builder par)
estado: pendiente-de-revision
---

# Design — la-evidencia-del-ensayo-viaja

## Clasificación de distribución

| Pieza | Forma | Por qué |
|---|---|---|
| `.claude/skills/projects-release/SKILL.md` | canónico | procedimiento del marco; un proyecto no lo hereda |
| `.claude/skills/projects-validar-consumidor/SKILL.md` | canónico | ídem |
| `pruebas/docs/evidencia-del-ensayo.test.mjs` | canónico | banco del marco |

Nada viaja al consumidor.

## Dónde vive la evidencia: tres opciones

**(a) Un comentario en el PR del ensayo.** Lo que había. Descartado por
construcción: el paso 5 cierra ese PR con `--delete-branch`.

**(b) Un archivo nuevo, tipo `docs/ensayos.md`.** Descartado. Sería una superficie
más que alguien tiene que acordarse de mirar y de verificar, o sea otro guardrail
que depende de la memoria. El marco ya tiene demasiadas páginas que nadie cruza.

**(c) El `CHANGELOG.md`.** Elegida. Ya se verifica, ya viaja a las notas
publicadas por el paso 6, y ya es obligatorio en el PR que introduce el cambio.
La evidencia se cuelga de una superficie con compuerta en vez de crear una nueva.

## Identificar la evidencia por forma, no por volumen

La verificación anterior medía `.body | length`. Un cuerpo largo y sin evidencia
pasaba; uno corto con la terna, no. Se reemplaza por un `grep -Eo` que busca la
**forma** del dato: `corrida [0-9]{6,}` y `[0-9a-f]{40}`.

**El límite, declarado:** esto acredita que hay un id y un SHA escritos, no que
correspondan a esta versión. Falsificarlo es posible escribiendo cualquier número
de 40 dígitos hexadecimales. Lo que compra es que **no se pueda olvidar en
silencio**, que era el modo de falla real —cero de 19 releases—, no fraude.
Prometer más sería exactamente el defecto que este change cierra.

## Por qué NO se quitó el `--delete-branch`

Es la solución tentadora y es peor: conservar la rama conserva el **pin temporal
al SHA**, y `AGENTS.md` prohíbe apuntar a un SHA fuera del ensayo —el pin «se
revierte en el mismo PR que lo introdujo»—. Un caso del banco fija que el cierre
sigue existiendo, para que nadie cierre este hueco abriendo aquél.

## Por qué el banco cruza las dos skills

El defecto original **fue** una divergencia entre dos documentos que describen el
mismo procedimiento en momentos distintos: uno suponía escrito lo que el otro no
escribía. Un banco que sólo mirara el paso 6 dejaría volver el mismo defecto por
el otro lado.
