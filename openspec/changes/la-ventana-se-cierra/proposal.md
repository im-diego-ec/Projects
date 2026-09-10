---
artefacto: proposal
dri: Builder 1
aprueba: Builder 2 (builder par)  # change técnico de `calidad-codigo`
informado: PO / Builder 2
estado: pendiente-de-revision
---

# La ventana de gracia de la cobertura se cierra el 2026-09-30, y hasta hoy nadie era su dueño

## Por qué

`actions/cobertura-diff/medir-cobertura-diff.mjs:127` tiene una fecha viva:

```js
const VENTANA_DE_GRACIA_HASTA = "2026-09-30";
```

Pasada esa fecha, un paquete por debajo del mínimo **sin deuda declarada** deja
de pasar con aviso y **nace rojo**. El código lo hace solo, sin que nadie toque
una línea — que es exactamente el diseño.

**Lo que faltaba es el dueño.** Los dos pendientes que quedaron vivos al archivar
`2026-08-19-calidad-fail-closed` —el 4.5c y el 4.5d— hablan de esta fecha, y
ninguno dice **dónde** vive ese trabajo. Un pendiente archivado sin destino es
indistinguible de un olvido: al 2026-09-10 faltaban **20 días** y ningún change
activo se hacía **cargo** de ella.

> **«Nombrar» y «hacerse cargo» no son lo mismo, y la diferencia decide la
> compuerta.** `ventana-vencida` **sí nombra** esta fecha — precisamente para
> declarar que *no la toca*. Por eso lo que sale de acá exige un marcador explícito
> y no una coincidencia de texto: la primera versión de la compuerta cruzaba
> «aparece en algún change activo» y pasaba en verde por el motivo equivocado.

Este change es ese destino.

## Los dos pendientes, resueltos de distinta forma

**4.5d — la limpieza: es real y entra acá.** Borrar `VENTANA_DE_GRACIA_HASTA` y
su rama en `veredictoDePaquete` una vez pasada la fecha. Es un PR que **no cambia
comportamiento**: para entonces la ventana ya está cerrada por fecha, así que
quitar el código sólo saca una rama muerta.

**4.5c — no aplica en Projects, y hay que decirlo.** Manda mergear
`feat/cobertura-web-funciones-80` en el repo del consumidor, o declarar la deuda
de su paquete `web`. **Ese consumidor no existe en Projects:** la rama es de
Rigel, el marco del que Projects se bifurcó el 2026-08-24, y
`docs/14-consumidores.md` no tiene una sola fila. No hay paquete `web` bajo el
mínimo porque no hay repo que lo tenga.

Se marca como **no bloqueante, con la razón escrita**, que es una de las tres
salidas válidas. Inventarle un destino sería peor: una tarea que apunta a un
repositorio inexistente no se distingue de una que nadie hizo.

## Qué cambia además: que la próxima no nazca huérfana

Una compuerta nueva que exige que **toda fecha de gracia viva en el código de
producción esté nombrada por un change activo**. Hoy hay exactamente una, así que
la compuerta nace verde y con poco que medir — y ese es el momento correcto de
ponerla, no cuando haya cinco.

Sin ella, esto se repite: una fecha se escribe con buen criterio, el change que
la introdujo se archiva, y la fecha queda corriendo sola sin nadie que la mire.

## La decisión que este change NO toma

**Si la ventana se cierra o se extiende.** El proposal asume que se cierra, que
es el diseño original y lo correcto: extenderla sería aflojar un mínimo de
cobertura sin haber medido nada nuevo. Pero es una decisión, y ahora tiene dónde
tomarse y quién la tome, en vez de ocurrir por vencimiento.

## Impacto en los proyectos consumidores

**Hoy: ninguno.** Projects tiene cero consumidores, así que la ventana no está
aflojándole nada a nadie. Cuando exista el primero, hereda la regla ya cerrada.
Es PATCH.
