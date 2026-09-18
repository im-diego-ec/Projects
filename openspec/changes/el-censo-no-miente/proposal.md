---
artefacto: proposal
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
informado: PO / Builder 2
estado: en-ejecucion
---

# El censo no miente

## Por qué

`openspec/cobertura-de-requirements.md` es la página que contesta la única pregunta que
importa del contrato del marco: *¿esto se cumple porque alguien se acuerda, o porque hay
una compuerta?* Su estructura ya se mantiene sola —el banco
`pruebas/docs/cobertura-de-requirements.test.mjs` exige que sus capabilities, sus filas y
sus números salgan de medir el árbol—, pero lo que dice **de cada fila** no. Medido el
2026-09-17 en este árbol, tenía cuatro defectos, y los cuatro van en la dirección que
nadie audita: la de afirmar menos, o más, de lo que hay.

1. **La ausencia era gratis.** 25 filas decían `**ninguno**` y nada más —17 del contrato
   vivo y 8 de capabilities en vuelo—, sin la propiedad que impide verificarlas ni el
   lugar donde vive el trabajo que falta. Un requirement que nadie miró y uno cuya
   compuerta nadie supo construir se leían igual.
2. **El mapa estaba viejo, otra vez.** Releídas una por una, **nueve** de esas 25 filas ya
   tenían una compuerta parcial —seis del contrato y tres en vuelo—: cinco llegaron con el
   despliegue de dos ambientes y la promoción, después de la medición anterior, y las otras
   cuatro eran bancos que ya existían y nadie había cruzado con la página. Es el mismo defecto que la propia página registra del 2026-08-24 (tres filas
   durante una semana), y ningún rojo lo vio.
3. **Las mitades se contaban como enteros.** 13 filas eran `**parcial**`, y el resumen y los
   encabezados las sumaban a «con compuerta» sin decir cuántas eran mitades.
4. **Nada preguntaba si una compuerta corre.** La página puede citar cualquier cosa de
   `actions/` como compuerta, y nadie comprobaba que esa action la invoque algún `uses:`.
   El caso existe hoy: **`actions/carril-docs` no la invoca ningún workflow** del marco ni
   del andamio. Ninguna fila la cita, así que la página no mentía; pero nada lo impedía, y
   nada decía que había una pieza publicada sin nadie que la corra.

Y un defecto al lado, que es el mismo mecanismo: **la excepción de `@v1` de
`pruebas/andamio/pinado.test.mjs` no vence.** Existe por una decisión de distribución
pendiente —retirar o no el último `@v1` vivo—, y una excepción que espera una decisión sin
fecha es permanente por defecto. *(Nota de la integración del porte, 2026-09-18: el change
`guardrail-deltas-por-version-exacta`, de otro carril, retiró esa excepción entera al pinar
la línea a la versión exacta. Al juntar los carriles, el vencimiento quedó para las
excepciones de alcanzables, y `pinado.test.mjs` solo comparte el lector de la versión.)*

**De dónde viene.** Rigel —el repo hermano del que este marco trae mejoras— cerró los
cuatro con su censo de compuertas, en cinco pasos:

| Rigel | Qué cerró | Origen | Commits de allá |
|---|---|---|---|
| 2.0.0, change `censo-honesto` (2026-09-05) | la ausencia de compuerta deja de ser gratis: declara su propiedad o su destino, y un motivo de esfuerzo no cuenta | hallazgo #297 y una clasificación adversarial: de 45 requirements sin compuerta, 44 eran verificables y 17 ya tenían máquina | a568e33, 7ce8037, 6a47010 |
| 2.2.0 (2026-09-07) | banco de actions alcanzables: toda action publicada la invoca algún `uses:` o se declara | issue #375: dos requirements publicados como sostenidos por una compuerta que no corría | dd73280, 1ad69e7, 1826f67 |
| 2.4.0, change `el-numero-del-censo` (2026-09-09) | la tabla distingue los estados de la ausencia, y publica cuántas coberturas son mitades | issues #376 (15 de 41 sostenidos solo por mitades) y #379 | f18c617, b372d9c, ed66da3 |
| 2.5.0, change `el-ambiente-se-exige` (2026-09-11) | las excepciones de alcanzables declaran `vigenteEn` y vencen al cortar versión | en el release 2.5.0 las dos vencieron y el banco las cobró | fa84c09, 69f512a |
| 2.6.0 (2026-09-12) | un solo lector de «qué actions alcanza algún `uses:`», y el censo deja de contar las que nadie invoca | issue #457, medido el 2026-09-10: 43 de 77 con las declaraciones de una action sin invocar, 41 de 77 sin ellas | c6d2f5e |

**Lo que se trae, y lo que no.** No se trae el censo por marcas de Rigel
(`herramientas/censo-compuertas.mjs` y las marcas `rigel:*` en los specs): el change
`rojo-primero` ya decidió que el censo de requirements de este marco es uno solo, la
página, y lo que se trae es la **regla**, aplicada a la página y a su banco. Tampoco se
trae el censo por nacidos y adoptados (`la-compuerta-llega-o-se-declara`), que es otro
lote del porte.

## Qué cambia

- **Toda fila sin compuerta declara su estado**, en una de tres formas, y el banco de la
  página mide lo que cada una afirma: ``**pendiente** → change `<nombre>` `` (el change existe
  vivo y nombra al requirement), `**no verificable** — <propiedad>` (y no es un motivo de
  esfuerzo), o `**sin destino**, vigente en X.Y.Z — <texto>` (la versión es la publicada;
  al cortar otra, vence). La cuarta forma —`**ninguno**` pelado— es rojo. El tercer estado
  es de este marco: allá el destino era un issue, y acá tiene que poder comprobarse sin red.
- **Las nueve filas viejas pasan a parcial**, con lo que las pone en rojo y lo que no.
- **Cada encabezado y el resumen publican cuántas compuertas son parciales**, como
  subconjunto, y el resumen publica cuántos requirements hay en cada estado de ausencia.
- **Una compuerta que no corre no cuenta**: una fila con compuerta que cita un archivo de
  `actions/<x>/`, o un paso que solo vive ahí, es rojo si ningún `uses:` invoca `<x>`. Y
  toda fila con compuerta tiene que citar una ruta o un paso.
- **Banco nuevo de actions alcanzables** (`pruebas/andamio/actions-alcanzables.test.mjs`),
  que comparte el lector del alcance con el de la página
  (`pruebas/alcance-de-las-actions.mjs`). **`carril-docs` se declara, no se cablea**, con su
  motivo y su versión (design D4).
- **Las excepciones que existen por una ventana vencen con la versión**: las de alcanzables
  (y la de `@v1` de `pinado.test.mjs`, hasta que `guardrail-deltas-por-version-exacta` la
  retiró), con un solo lector de la versión publicada (`pruebas/vigencia.mjs`).
- **Cuatro requirements nuevos en `calidad-codigo`** que fijan lo anterior como contrato del
  marco.

## Impacto en los proyectos consumidores

**Ninguno, y es verificable por dónde vive cada pieza.** Todo lo que cambia son bancos del
marco (`pruebas/`), la página de cobertura (`openspec/`) y cuatro requirements canónicos
que hablan de la superficie que publica la cobertura **del marco**. Ningún workflow reusable,
ninguna action y ningún archivo del andamio cambian: los tres consumidores reales, todos en
`@v1.9.6` (`custodia-bingo`, `plantilla-sitio`, `plantilla-aplicacion`), no reciben nada ni
tienen nada que hacer. No hace falta versión propia; va en la próxima que se corte.

**El costo cae en el release del marco, y es a propósito.** Al cortar la versión siguiente,
once filas «sin destino» de la página y la excepción de `carril-docs` se ponen
rojas en el pull request del release (la de `@v1` ya no existe: ver la nota de arriba). Cada una tiene su arreglo escrito en el mensaje del
rojo. Es la fricción que convierte «nadie lo decidió» en una decisión firmada.

## Distribución

Nada viaja: bancos del marco, una página que no es canónica (es una medición fechada) y un
delta canónico sobre `calidad-codigo`. La clasificación pieza por pieza está en el design.
Contrato: **sin contrato**. No rompe a ningún adoptante.
