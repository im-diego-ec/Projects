---
artefacto: proposal
dri: Builder 1
aprueba: PO  # toca `gobierno-contribucion`: cómo se declara y se aprueba una
             # excepción es modelo operativo, y su gate es del PO
informado: PO / Builder 2
estado: pendiente-de-revision
---

# Dos lectores del mismo archivo pedían cosas distintas, y decidía el que corriera

## Por qué

`.projects-desvios.json` —donde se declara una excepción a un permiso— lo leen
**dos** piezas, con predicados distintos:

| Lector | Exige | Si falta |
|---|---|---|
| `actions/constitucion/constitucion.mjs:883-897` | `motivo` + `aprobado_por` + `fecha` AAAA-MM-DD | `::error::` |
| `.github/workflows/marco-ci.yml`, paso «Permisos del agente sin escritura» | `permiso` + `motivo` | absorbe y sigue |

El segundo **lee** `aprobado_por` y no lo mira; `fecha` ni la lee. Una entrada
como `{"permiso":"Bash(gh:*)","motivo":"x"}` —sin aprobador y sin fecha— sale
**roja** por un camino y **verde** por el otro.

**Y se paga justo donde el lector estricto no llega.** La action de la
constitución no corre en todo repositorio; en los que no la ejecutan, el único
validador es el débil. O sea: la excepción sin aprobador ni fecha —exactamente
la que el marco quiere que no exista— pasa muda en el repo donde menos
supervisión hay. Es un fail-open, y `AGENTS.md` los prohíbe: *«hacer ruidoso todo
fail-open»*.

## Qué cambia

El paso ahora **avisa** (`::warning::`) cuando un desvío no dice quién lo aprobó
o no trae fecha válida, nombrando el permiso y diciendo que la action de la
constitución ya lo da por error.

## Por qué avisa y no enrojece

Cerrar el hueco de una es **endurecer un check**: un repo que hoy pasa con un
desvío a medias saldría rojo sin haberlo pedido, y `AGENTS.md` define eso como
breaking —*«endurecer un check de modo que un repo que hoy pasa mañana falle»*—
con la salida escrita: *«se estrena en modo aviso y el endurecimiento va en el
major siguiente»*.

Que no es teórico lo demuestra el propio banco: el caso verde que ya existía
declara desvíos **con aprobador y sin fecha**. Endurecer hoy lo pondría rojo.

**El desvío sigue absorbiendo.** Lo único que cambia es que ahora se ve. Un caso
del banco fija esa absorción de hoy con `exit 0`, para que el día que deje de
absorber sea una decisión y no un accidente.

## Lo que queda declarado y NO entra acá

**El cruce función a función entre los dos predicados.** Lo correcto sería que
hubiera **un** predicado y no dos, pero `marco-ci.yml` es un workflow
**reusable**: cuando lo llama un consumidor, el checkout de ese job trae el árbol
del **consumidor**, no el del marco, así que `constitucion.mjs` no está en disco
y no se puede importar. Unificarlos de verdad exige mover la lectura de desvíos
dentro de la composite action, que es un cambio de contrato de una pieza
publicada.

**Destino:** change propio, junto con el endurecimiento de la mayor siguiente —
son la misma decisión y conviene tomarlas juntas.

Mientras tanto, la validación de desvíos de `constitucion.mjs` **no está
exportada** como función, así que un banco que cruce los dos predicados
mecánicamente tampoco se puede escribir hoy sin refactorizarla. Se declara en vez
de fingir la cobertura.

## Impacto en los proyectos consumidores

**Un aviso nuevo**, en repos que tengan desvíos incompletos. No cambia ningún
veredicto: lo que pasaba en verde sigue en verde. Es MINOR.
