---
artefacto: design
dri: Builder 1
aprueba: Builder 2 (builder par)
estado: pendiente-de-revision
---

# Design — el-gate-del-po-se-declara

## Clasificación de distribución

| Pieza | Forma | Por qué |
|---|---|---|
| `herramientas/projects-asistente.mjs` | canónico | corre desde el clon; el proyecto recibe su salida |
| `pruebas/init/asistente.test.mjs` | canónico | banco del marco |

Lo que viaja al proyecto es **una línea más en su archivo de desvíos**, no código.

## Por qué `openspec-roles` y no una regla nueva

El banco del marco exige que todo desvío nombre una regla que **exista** en el
canónico —lo cazó en el primer intento, con un id inventado—. `openspec-roles` es
exactamente la que declara la separación: *«{{PO}} es el PO — dueño del qué y el
por qué... {{BUILDER_1}} y {{BUILDER_2}} son builders — dueños del cómo»*. Cuando
las dos plantillas se resuelven a la misma persona, esa regla es la que deja de
cumplirse.

## Dos motivos y no uno

La tentación es un solo texto que sirva para los dos casos. No sirve, y el
problema no es de estilo: **con compañero, decir «es una sola persona» es falso**.

Un desvío se lee mucho después de escribirse, por alguien que decide si todavía
corresponde. Si el motivo describe una situación que no es la del proyecto, esa
persona no tiene forma de saber que la salida existía desde el día uno. El caso
con compañero **nombra a la otra persona** y pone la revisión en «ahora».

## Por qué NO se arregló asignando el rol automáticamente

Con compañero, el asistente podría poner `PO: r.BUILDER_2` y cerrar el hueco sin
desvío. Se descarta: **quién decide el qué es una decisión del equipo**, no del
andamio. Elegirla por ellos —y en silencio— es el mismo defecto que este change
cierra, con el signo cambiado. El andamio declara el hueco y nombra la salida; la
decisión es de las dos personas.

## La guarda contra la confusión

El caso `MUERDE` exige que los dos desvíos —revisión cruzada y separación de
roles— existan **por separado** y sin repetidos. Sin él, alguien podría satisfacer
la propiedad reusando el desvío de revisión cruzada, que apaga otra cosa: aquél la
aprobación ajena **entre builders**, éste el gate del PO **sobre los contratos**.
