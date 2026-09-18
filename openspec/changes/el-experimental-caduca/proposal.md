---
artefacto: proposal
dri: Builder 1
aprueba: PO
informado: PO / Builder 2
estado: en-ejecucion
---

# El estado experimental caduca por fecha, y el canónico que cambia gana versión

`aprueba` es el PO porque el delta de `gobierno-contribucion` cambia cómo se gobierna
un change, y esa capability la gatea él (`AGENTS.md`, «El flujo, y quién aprueba
qué»). El delta de `calidad-codigo` es maquinaria de builders y va además por la
revisión adversarial con lentes independientes que reemplaza al review cruzado
mientras el marco tenga un solo mantenedor.

## Por qué

**Una fecha que nadie lee vence en silencio, y faltaban cuatro días.**
`capa-descubrimiento` se declara `experimental: true` con
`veredicto_antes_de: 2026-09-21` en seis de sus artefactos
(`proposal.md:8-9`, `design.md:7-8`, `tasks.md:7-8` y tres de `piloto/`, medido sobre
`f6a01ac`). El paso que haría cumplir esa fecha era la tarea 4.1 **del propio
change**, abierta, y `grep -rn veredicto_antes_de .github/workflows/` no devolvía
nada. `openspec/config.yaml:50-53` decía que los dos campos «van juntos» y que un
change experimental sin fecha «es permanente por defecto», sin que nada lo
comprobara. `docs/16-auditoria-cierre-v1.md:700-704` ya lo había anotado: «nada lo va
a poner en rojo si la fecha pasa». Hoy es 2026-09-17.

**Y la compuerta dependía del piloto que tenía que juzgar.** El requirement «El
estado experimental de un change caduca por fecha» vivía en el delta de
`capa-descubrimiento`, cuyo propio `design.md` (D7) decía que, si el veredicto salía
amarillo o rojo, «se rescata a un change propio». O sea que un descarte del piloto se
llevaba la compuerta con el directorio, salvo que alguien se acordara de rescatarla.
Este change la rescata antes del veredicto, no después.

**El segundo hueco es del canónico, y su propio banco lo confiesa.**
`actions/constitucion/pruebas/huella-del-canonico.test.mjs` ata el texto del canónico
a su número: la última entrada de `versiones[]` del manifiesto lleva el sha256 de los
`.md` que publica. Caza «cambió el texto y nadie movió la versión», incluso un
renombrado. Pero su mensaje de error dice «NO se arregla pegando la huella nueva sobre
la vieja», y nada lo verificaba. Medido el 2026-09-17 sobre el árbol de `f6a01ac`:
con una regla nueva en `40-fronteras.md` y la huella pegada sobre la entrada de la
1.7.0, los **418 casos** de `actions/` dan **verde**. El rojo caería río abajo: un
consumidor al día con esa versión recibe el texto nuevo bajo el número viejo y su job
`constitucion` falla con «difiere del texto que el marco publica para la versión
1.7.0», en un repositorio que no hizo nada.

**Origen en Rigel.** Rigel 1.14.0, commit `08f3b2e` (2026-09-01), bloque 4 de su
`capa-descubrimiento`: el paso «Estado experimental con fecha de veredicto» en el job
`openspec` de su `marco-ci.yml` con un banco de 12 casos, y el job
`canonico-versionado` en su `ci.yml` con un banco de 9. El motivo del segundo es su
medición del 2026-08-21 (D11): con una regla nueva en el cuerpo y el manifiesto
intacto, 203 casos de la constitución en verde y el consumidor al día en rojo. En
Projects esa mitad ya la cierra la huella (commit `dad5566`); lo que faltaba es la
otra.

**La decisión del PO que este change ejecuta (D3, 2026-09-17).** La fecha de
`capa-descubrimiento` se corre al **2026-10-15**, con el motivo escrito, en el mismo
change que estrena la compuerta. Sin eso, el propio Projects queda en rojo el
2026-09-22: medido con el paso nuevo sobre el árbol de `f6a01ac` y `HOY_ISO=2026-09-22`,
sale 1 con «capa-descubrimiento se declaró experimental con veredicto_antes_de:
2026-09-21, esa fecha ya pasó».

## Qué cambia

1. **Paso nuevo en el job `openspec` de `marco-ci.yml`: «Estado experimental con fecha
   de veredicto».** Un change activo que se declara experimental en cualquier artefacto
   tiene que declarar `veredicto_antes_de`; es rojo si no la declara, si no es una fecha
   que exista, o si ya pasó sin un artefacto con `artefacto: veredicto`. Manda la fecha
   más temprana; el día declarado todavía es verde; el `archive/` no se mira; si no hay
   experimentales es inerte y lo imprime. La fecha de hoy entra por `HOY_ISO` para que
   el banco no dependa del calendario, y el workflow no la setea. No agrega permisos.
   **Tres adaptaciones sobre el de Rigel**, cada una con su caso rojo: el lector de
   frontmatter descarta los comentarios de YAML (con el de Rigel,
   `experimental: true  # ver ...` no era `true` y el change pasaba por no experimental,
   en verde), un `experimental:` que no es booleano es rojo, y una fecha con la forma
   correcta que no existe en el calendario también.
2. **Job nuevo `canonico-versionado` en el `ci.yml` del marco**, que no viaja. Toda
   entrada de `versiones[]` del ancestro común del PR que ya está **publicada** (su
   número no es mayor que el `## [X.Y.Z]` más alto del CHANGELOG de la punta de `main`)
   sigue en la cabeza con la misma `huella_canonico`, o con la misma ausencia de
   huella. O sea que mover el canónico después de publicar exige agregar una entrada:
   `versiones[]` crece. La
   entrada **pendiente** se puede reescribir. `ci-ok` lo espera con la misma asimetría
   que el job del CHANGELOG.
3. **Requirements nuevos**: «El estado experimental de un change caduca por fecha» en
   `gobierno-contribucion` (el que salía del delta de `capa-descubrimiento`, ahora con
   sus escenarios de frontera) y «Una versión publicada de las reglas del marco no
   cambia de texto» en `calidad-codigo`.
4. **`capa-descubrimiento` pierde ese requirement y sus tareas 4.1 a 4.5**, que quedan
   hechas acá, con un puntero en su `tasks.md`; la 6.3 («rescatar el requirement de
   caducidad a un change propio») queda hecha. Y su fecha se corre al 2026-10-15 en los
   seis artefactos que la declaran, con el motivo en su `proposal.md`.
5. **`openspec/config.yaml` deja de describir los dos campos como una convención** y
   dice qué paso la cobra.
6. **El mensaje del banco de la huella** distingue la versión publicada de la pendiente
   y nombra al job nuevo.

**Lo que NO se trae de Rigel, y por qué:**

- **Las marcas `rigel:rojo` que acompañan al paso.** Son de un inventario que Projects
  no tiene; acá la cita del banco la cobra `pruebas/marco-ci/cobertura-de-los-pasos.test.mjs`.
- **La regla literal «si cambia el cuerpo, `versiones[]` crece».** Medida contra una
  entrada pendiente reescrita, sale 1: dos PRs del mismo ciclo que tocan el canónico
  exigirían dos versiones. Y el porte de Rigel en curso la choca de frente: los changes
  previstos `ventana-vencida` y `el-canonico-dice-como-se-trabaja` tocan el canónico, y
  el segundo pide expresamente que todo vaya «en una sola versión».
- **Su dogfooding con la fecha pasada en verde.** Allá lo sostiene un
  `piloto/veredicto.md` que Projects no tiene; acá el control es el contrario: los
  artefactos reales, un día después de su fecha y sin veredicto, dan 1.

## Clasificación y contrato

- **Referenciado:** el paso nuevo de `marco-ci.yml`. Viaja a cada consumidor en su PR
  de bump, dentro de un job existente, sin cambiar el nombre del job (`openspec`), sus
  `inputs`, `secrets`, `outputs` ni permisos.
- **Canónico:** los dos deltas.
- **Interno del marco, no viaja:** el job `canonico-versionado`, los dos bancos, el
  mensaje del banco de la huella y `openspec/config.yaml`.
- **Contrato: minor.** Un check nuevo, inerte para quien no declara un change
  experimental. Por la decisión D1 del PO, una compuerta nueva se exige en rojo el día
  que sale cuando el arreglo está en el árbol del consumidor, y acá lo está: una línea
  de frontmatter.

## Impacto en los consumidores

Hay tres consumidores reales, los tres en `@v1.9.6`.

- **Mientras sigan en la 1.9.6** no cambia nada: el paso llega con el PR de bump.
- **Al mergear el bump**, el job `openspec` corre un paso más, que tarda milisegundos y
  lee `openspec/changes/`. En un repo sin changes experimentales imprime «el paso es
  inerte» y sale 0. Esta sesión no lee los árboles de los consumidores (son
  intocables), así que no está medido si alguno declara `experimental:`; si lo
  declarara sin fecha o con la fecha vencida, el rojo aparece **dentro del PR de bump**,
  con el arreglo escrito.
- **Qué tienen que hacer: nada**, mientras no declaren un change experimental.
- **El job `canonico-versionado` no les llega**: vive en el `ci.yml` del marco.
