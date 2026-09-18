---
artefacto: proposal
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
informado: PO / Builder 2
estado: en-ejecucion
---

# Los bancos dicen qué cayó y no dependen de la máquina

## Por qué

El marco confía en sus bancos para todo: cada regla que «falla sola» falla porque un
banco la pone roja. Este change trae de Rigel seis arreglos a esos bancos. Son defectos
**latentes** acá (ninguno mordió todavía en Projects), y todos tienen la misma forma:
**el veredicto de un banco depende de algo que no es el árbol**, o **un banco rojo no
dice lo que vio**. Además son el prerrequisito de las compuertas que ejecutan scripts
sacados del YAML (lotes 17 y 24 del porte).

Lo que pasó en Rigel, con su fecha y su commit:

- **Un rojo que no decía nada** (issue #476 de Rigel, 2026-09-12 y 2026-09-14). Un banco
  intermitente cayó en CI con un solo rastro, `not ok 373 ... AssertionError`: no decía
  cuál de sus cuatro aserciones cayó ni con qué valores. Pasa porque `assert.match` y
  `assert.doesNotMatch`, **con** mensaje, imprimen solo el mensaje y **pierden el input**.
  Rigel lo cerró con `porque(motivo, evidencia)` (c22595c, 2.6.0) y con una herramienta que
  pone rojo el PR que agrega aserciones así (d71c40c, 2.8.x).
- **El resultado cambiaba según la máquina** (c38e542, 2026-09-14). Trece de dieciséis
  casos se pusieron rojos con `fatal: no tag message?` en la máquina de quien publica.
  La causa: el repo de juguete de los bancos apagaba la firma de commits y **no la de tags**.
- **El instrumento que reproduce intermitencias mintió dos veces** (b047c16, c38e542,
  0448928; PR #540 de Rigel, **todavía abierto**: su estado final se verificó el
  2026-09-17 en la rama `fix/el-instrumento-pierde-su-medicion`, un solo commit sobre
  main). Primero dijo «REPRODUJO» 40 de 40 veces por fallas de su propio entorno. Después
  murió por timeout en la vuelta 38 sin decir cuántas llevaba.
- **Dos lectores del mismo campo decían cosas distintas** (ac55ddc, 2.6.0, issue #368).
  Se ataron comparando su **comportamiento** sobre una tabla de entradas.
- **El extractor de pasos devolvía el script del vecino** (c12f831, 1.17.5, 2026-09-03).
  Cortaba solo en `- name:`. Si el paso siguiente arrancaba con `- id:` o `- uses:`, se
  pasaba de largo.
- **Una continuación de línea cortada** (cffa81f, 1.12.0, 2026-08-31). Un comentario
  quedó entre `node script.mjs \` y sus argumentos. `bash -n` no dijo nada, y el comando
  corrió sin argumentos en el runner de un consumidor.

**Y el porte encontró dos defectos más al medir, que no son de Rigel:**

1. **La herramienta de Rigel tal cual tenía un falso negativo del 14% en este árbol.**
   Contra el AST de un parser de verdad: ella contaba 246 aserciones ciegas y el AST
   contaba 285. Las 39 que no veía venían después de una regex con una comilla adentro,
   que el blanqueo de cadenas tomaba por el comienzo de una cadena. Se arregló, y ahora
   las dos cuentas coinciden línea por línea.
2. **Los dos lectores de un desvío de `permiso` divergen hoy en el árbol publicado.** El
   banco que los ata encontró cuatro casos el día que se escribió. Con `"2026-02-30"`, el
   paso «Permisos del agente sin escritura» de `marco-ci.yml` avisa «la action ya lo da por
   ERROR», y la action lo acepta: el aviso **miente**. Y un desvío que nombra `regla` y
   `permiso` a la vez la action lo rechaza (`desvio-ambiguo`), mientras el paso lo absorbe
   **en silencio**.

## Qué cambia

- `pruebas/porque.mjs` (nuevo): `porque(motivo, evidencia)` es compartido por todos los bancos.
- `pruebas/aserciones-con-evidencia.mjs` (nuevo) y el job `aserciones-con-evidencia` de
  `ci.yml`. Un PR que toca un banco con aserciones que tapan su evidencia sale **rojo**, con
  archivo y línea. La deuda del resto del árbol se publica en cada corrida y no bloquea.
- `pruebas/marco-ci/util.mjs`: el repo de juguete apaga también `tag.gpgsign`.
- `.github/workflows/reproducir-intermitente.yml` (nuevo). Es un instrumento por
  `workflow_dispatch` que repite un banco N veces, en el grupo con que lo corre `ci.yml`.
  Trae la vuelta cero, una línea por vuelta, el presupuesto declarado y un verde que se
  declara como cota.
- `pruebas/marco-ci/extraer.mjs`: el límite de un paso es **cualquier** ítem de la lista de
  pasos, y también el fin de la lista.
- `pruebas/marco-ci/sintaxis-de-los-run.test.mjs`: se agrega el control de las
  continuaciones cortadas.
- `pruebas/marco-ci/desvio-de-permiso-una-sola-norma.test.mjs` (nuevo). Ata los dos
  lectores de `permiso` por comportamiento, corriendo el paso real.
- `.github/workflows/marco-ci.yml`, paso «Permisos del agente sin escritura». La fecha se
  valida con el **mismo** predicado que `esFecha`. Un desvío que nombra también una regla
  **avisa**.

## Distribución

| Pieza | Forma |
|---|---|
| bancos, `porque.mjs`, la herramienta, `ci.yml`, `reproducir-intermitente.yml` | **no viaja**: banco y CI propios del marco |
| el paso «Permisos del agente sin escritura» de `marco-ci.yml` | **referenciado**: llega a cada consumidor con el bump |
| el delta de `calidad-codigo` | **canónico** |

## Impacto en los proyectos consumidores

Hay tres consumidores reales, todos en `@v1.9.6`: `custodia-bingo`, `plantilla-sitio` y
`plantilla-aplicacion`. **Solo les llega el cambio del paso de permisos**, con el PR de
Dependabot de la versión que lo incluya. Solo cambian dos anotaciones, y **ningún
veredicto**:

- Un desvío con una fecha como `2026-02-30`, que la action ya aceptaba, **deja de avisar**.
  El aviso anterior afirmaba un error que no existía.
- Un desvío que nombra `regla` y `permiso` a la vez **empieza a avisar** (`Desvio de permiso
  ambiguo`). Sigue absorbiendo, como los demás desvíos incompletos: el modo aviso del change
  `un-solo-predicado-del-desvio` no se toca.

Nada se pone rojo y nada se pone verde. **Contrato: patch**, una corrección de
comportamiento dentro del contrato. **No rompe a nadie.**

Lo que **no** se hace acá, porque sería breaking: exigir que la fecha de un desvío
**exista** (hoy los dos lectores aceptan el 30 de febrero). Es un endurecimiento de los dos
lectores a la vez y va con la línea v2 (D1 del PO; lote 38 del porte).
