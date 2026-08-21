# Rojo primero, y no solo en el código

## Por qué

El marco ya exige TDD con **rojo evidenciado en local**, y esa regla funciona: el
código de aplicación de los proyectos del área no acumula defectos de los que se
descubren tarde. El problema es su ALCANCE. La regla dice «código», y el marco
está hecho de tres cosas más que nadie prueba así: compuertas, reglas e informes.

La auditoría de cierre de la versión 1 puso el número. De **20 propiedades** que
los PRs del cierre afirmaban sobre sí mismos, **13 eran falsas**, cada una
refutada con un comando y su código de salida. No fueron trece descuidos
distintos: fueron el mismo, trece veces. Ninguna de las trece había sido vista
fallar antes de declararse verdadera.

Los tres casos, con nombre:

- **Un check que nadie hizo fallar.** El paso «Constitución del marco al día»
  devolvía **exit 0, sin error y sin warning**, contra un consumidor sin
  artefacto y con la fecha ya vencida. El check existía, estaba escrito y se
  leía bien. Nadie construyó nunca el caso que debía ponerlo rojo, así que nadie
  descubrió que no lo ponía. La ausencia de datos se estaba leyendo como éxito.

- **Una verificación que no podía fallar.** Una comprobación de este mismo
  esfuerzo contaba las líneas de salida de una herramienta para decidir si había
  hallazgos. Cuando la herramienta no pudo abrir el archivo, la salida quedó
  vacía y la comprobación informó «0 hallazgos». Una verificación que interpreta
  el silencio como aprobación no es una verificación.

- **Reglas que nunca tuvieron compuerta.** De **39 requirements** de los specs
  vivos, alrededor de **6** tienen un check que los verifique. Las otras 33 se
  leen igual de firmes en el documento y no las sostiene nada. Ya pasó una vez y
  está escrito: el spec `calidad-codigo` prometía que un paquete sin lint sería
  señalado por CI y ningún check lo implementaba.

La generalización es una sola frase: **nada cuenta como verificado hasta que se
lo vio fallar por el motivo correcto**. Es la misma disciplina que ya aplicamos
al código, aplicada a lo que el marco produce de verdad.

## Qué cambia

Tres propiedades nuevas en `calidad-codigo`, todas verificables:

1. **Una compuerta nueva no se estrena sin su caso rojo demostrado.** Quien
   agrega un check agrega también la entrada que lo pone en rojo, y el pipeline
   comprueba que esa entrada efectivamente lo pone en rojo. Un check cuyo caso
   negativo pasa en verde es un check roto, y hoy es indistinguible de uno sano.

2. **Una afirmación de comportamiento se acredita por código de salida.** Lo que
   un PR, un informe o un documento afirma sobre una propiedad verificable viaja
   con el comando y su exit code. Contar líneas de salida o buscar un texto no
   acredita nada.

3. **Una regla sin compuerta se declara como tal.** No se prohíbe que exista
   —el marco necesita reglas que hoy solo puede sostener una persona—, pero deja
   de leerse como si estuviera enforzada. La diferencia entre 6 y 39 tiene que
   estar publicada, no deducirse leyendo el CI.

## Qué NO cambia

- **No se prohíben las reglas sin check.** Una regla que solo puede sostener el
  criterio humano sigue siendo válida; lo que cambia es que se sepa cuál es.
- **No se toca el TDD del código de aplicación.** Esa regla ya funciona y se
  queda como está; esto la extiende, no la reemplaza.
- **No se agrega una compuerta que enrojezca repos hoy verdes sin aviso.** La
  regla del marco sobre estrenos breaking se respeta: el consumidor primero, la
  compuerta después.
