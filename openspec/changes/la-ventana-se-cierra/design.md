---
artefacto: design
dri: Builder 1
aprueba: Builder 2 (builder par)
estado: pendiente-de-revision
---

# Design — la-ventana-se-cierra

## Clasificación de distribución

| Pieza | Forma | Por qué |
|---|---|---|
| `actions/cobertura-diff/medir-cobertura-diff.mjs` | **referenciado** | los consumidores la ejecutan; la limpieza del 4.5d la toca después del 2026-09-30 |
| `openspec/changes/archive/2026-08-19-calidad-fail-closed/tasks.md` | canónico | historia del marco |
| `pruebas/ci-del-marco/ventanas-con-dueno.test.mjs` | canónico | banco del marco |

## Por qué se edita un `tasks.md` ya archivado

El archive es historia y no se reescribe **a la ligera**. Acá no se cambia lo que
pasó: se agrega el dato que faltaba —dónde vive el trabajo que quedó vivo—, que
es precisamente lo que convierte un pendiente en algo distinto de un olvido.
Ninguna tarea cambia de estado ni se tilda: se anotan.

La alternativa era dejar el archive intacto y llevar el registro aparte. Se
descarta por lo de siempre: una segunda superficie que alguien tiene que
acordarse de cruzar.

## La compuerta, y por qué se pone ahora que hay una sola fecha

Escanea el código de producción buscando fechas de gracia y exige que cada una
esté nombrada por un change activo. Hoy encuentra **una**, así que nace verde.

Poner una compuerta cuando el problema ya es grande obliga a arreglar N casos
antes de poder estrenarla; ponerla con N=1 la estrena gratis. Y el caso negativo
se puede demostrar igual, con una fecha sintética.

**La primera versión de esta compuerta estaba mal, y el banco lo demostró.**
Cruzaba «la fecha aparece en algún archivo de un change activo». Pasaba en verde
—por el motivo equivocado—: `ventana-vencida` nombra `2026-09-30` justamente para
declarar que **no la toca**. Una compuerta que no distingue «es dueño» de «la
menciona al pasar» afirma más de lo que verifica, que es la primera clase de
defecto del catálogo.

La versión que quedó exige un **marcador explícito** —`DUENO DE LA FECHA: <fecha>`—
en el `tasks.md` del change que se hace cargo. Adoptar una fecha pasa a ser un
acto deliberado y no una coincidencia de texto.

**El límite que sí queda:** la compuerta comprueba que alguien se declaró dueño,
no que esté haciendo algo al respecto. Un marcador en un change abandonado la
satisface. Lo que compra es que la fecha no venza **huérfana**, que era el modo de
falla real.

## Por qué el 4.5c se declara y no se resuelve

Manda mergear una rama de un repositorio consumidor. Projects tiene **cero
consumidores** —`docs/14-consumidores.md` está vacío— y la rama es de Rigel, el
marco del que este se bifurcó. El sujeto de la tarea no existe acá.

Las tres salidas válidas para un pendiente son tildarlo, darle destino, o
declarar que no bloquea con su razón. Darle destino sería inventar: apuntaría a
un repositorio que no está. Se declara.
