---
artefacto: design
dri: Builder 1
aprueba: Builder 2 (builder par)
estado: pendiente-de-revision
---

# Design — el-piso-del-reusable-se-mide

## Clasificación de distribución

| Pieza | Forma | Por qué |
|---|---|---|
| `pruebas/andamio/piso-del-reusable.test.mjs` | canónico | banco del marco |

No se toca ningún archivo distribuido: la compuerta **lee** los tres, no los
reescribe. Por eso el impacto en consumidores es cero y el change es puramente
aditivo.

## Se compara «al menos», no «exactamente»

La compuerta exige que lo documentado **cubra** lo que el reusable pide, no que
coincida carácter por carácter. Conceder de más es una decisión del consumidor
—discutible, pero suya— y no es el modo de falla que esto ataja. El modo de falla
es quedarse **corto**, que rompe el pipeline de alguien que copió el bloque de
buena fe.

## Por qué se leen los tres y no sólo el que viaja

El de `plantilla/` es el más caro si se queda corto, porque nace roto en cada
proyecto nuevo. Pero los otros dos son los que la gente **lee** para entender la
regla, y un ejemplo desactualizado enseña la versión vieja. Los tres son la misma
declaración en tres superficies; que exista una cuarta divergente es el defecto.

## Lo que deliberadamente NO se verifica

La **consecuencia** que los bloques describen —qué pasa exactamente cuando el
permiso falta— no se toca. Medirla exige una corrida real de CI con el permiso
recortado. Escribir una consecuencia nueva sin esa medición sería cambiar una
descripción posiblemente vieja por otra posiblemente falsa; el proposal lo declara
con destino en vez de dejarlo mudo.

Esta compuerta ataja lo que sí es medible desde el banco: que el **conjunto de
permisos** documentado no envejezca.
