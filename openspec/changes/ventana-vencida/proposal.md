---
artefacto: proposal
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md) # NO el `dri`: hasta el 2026-08-24 este campo decía
                              # `Builder 1`, o sea el propio autor, y un autor que se
                              # aprueba a sí mismo no es un review. Con
                              # `required_approving_review_count` en `0` y
                              # `require_code_owner_review` en `false`, nada más lo
                              # detiene. Sigue sin ser el PO: su gate en este repo está
                              # acotado a la capability de gobernanza
                              # (.github/CODEOWNERS, últimas líneas) y este delta es
                              # técnico
informado: PO / Builder 2
estado: en-ejecucion  # volvió de aprobado-en-sesion el 2026-09-17: el delta cambió
                      # (la excepción opt-in salió del spec) y espera la revisión
                      # adversarial antes del archive
---

# ventana-vencida — Proposal

## Why

La ventana de gracia de la constitución existe por una razón que **está escrita**, y
esa razón **caducó**. El spec vivo la justifica así (`openspec/specs/calidad-codigo/spec.md`,
línea 267):

> «**El marco se consume por un tag móvil**, así que una verificación nueva aparece en
> el pipeline de cada proyecto sin que nadie la haya leído: por eso se estrena en modo
> aviso.»

Eso dejó de ser cierto el **2026-08-21**, cuando la distribución pasó a **versión
exacta**. Desde entonces ninguna verificación nueva aparece en el pipeline de nadie: llega
dentro de un **PR de bump de Dependabot**, y el rojo aparece ahí, donde se lee antes de
mergear. **El «modo aviso» ERA el PR.** La ventana de 28 días quedó como una segunda capa
de amortiguación sobre un mecanismo que ya amortiguaba, y su único efecto medible hoy es
otro: **un repo puede estar atrasado y verde durante cuatro semanas**, que es exactamente
el estado que el marco no quería.

Medido, hoy 2026-08-22, sobre el único consumidor real:

| Hecho | Valor |
| --- | --- |
| Versión del marco que consume | `1.4.1` |
| Versión que declara su artefacto | `1.3.0` |
| Versiones del canónico pendientes de adoptar | `1.4.2` y `1.6.0` |
| Veredicto de la verificación hoy | **aviso**, exit 0 |
| Fecha desde la cual sería rojo | 2026-09-19 |

O sea: un repo dos versiones atrás de la constitución del área, con reglas que sus agentes
no están leyendo, y el pipeline diciendo que está bien.

Y hay un segundo efecto, más silencioso: la fecha que ese repo ve **no sale de la versión
que le llega**, sale de la **entrada pendiente más vieja** (`versionPendienteMasVieja`).
Así que quien corta una versión no controla la ventana que su consumidor va a percibir:
la hereda de un release anterior. Una compuerta cuya fecha nadie decide en el momento de
publicar no es una decisión, es una inercia.

## What Changes

Se retira la **política**, no la **capacidad**.

- **Se va el piso obligatorio de 28 días** (`DIAS_DE_GRACIA_MINIMOS`) y con él la puerta
  de atrás `"urgente": true`, que existía solo para saltarse ese piso. Una puerta a una
  puerta que ya no está es ruido que enseña a ignorar avisos.
- **Todas las entradas del manifiesto pasan a `exigible_desde` = `publicada`.** Un cambio
  del canónico es exigible el día que se publica. `publicada` sigue guardando la fecha
  real de cada versión: no se reescribe historia, se cambia una política, y el campo de
  política se alinea con ella.
- **El camino de aviso SOBREVIVE, como opt-in.** `AGENTS.md` línea 163 sigue diciendo que
  un endurecimiento «se estrena en modo aviso»; borrar el mecanismo dejaría esa regla sin
  forma de cumplirse. Queda disponible para el caso en que alguien de verdad quiera
  estrenar algo con fecha, y deja de aplicarse por defecto a cada cambio de texto.
- **La propiedad se escribe en un spec vivo**, donde hoy no está: el comportamiento del
  artefacto de la constitución vive solo en código y en la documentación de su action. Un
  contrato que nadie enunció es un contrato que nadie puede revisar.

## Impact

- **Para un repo que no toca nada: cero.** Su pin es exacto e inmutable. Es la razón por
  la que esto NO es breaking según el test operativo del propio marco («un repo que hoy
  pasa, mañana falla **sin tocar una línea**»): imposible con versión exacta.
- **Para el PR de bump: el rojo llega antes.** El consumidor que hoy vería amarillo con
  una fecha, ve rojo con el arreglo escrito, y el arreglo es el mismo en los dos casos:
  bajar el artefacto que su propio job ya sube, o correr el modo `escribir`. Va nombrado
  en «Para consumidores».
- **Para el proyecto que arranca el 2026-08-24: cero, en los dos escenarios.** Un repo
  nuevo nace con su artefacto al día, así que nunca hay nada pendiente y nunca se imprime
  una fecha. Esto no lo desbloquea ni lo cambia.
- **El output `exigible_desde` de la action se queda.** Se consideró quitarlo —medido: no
  lo consume nadie, ni el andamio ni el consumidor real— y se descartó: quitar un output es
  breaking por la letra de `AGENTS.md` y el beneficio era cero, porque el campo sigue
  existiendo mientras el mecanismo de aviso exista. Solo se corrige su descripción, que
  hoy describe la política que se retira.

## Fuera de alcance, declarado

**La otra ventana no se toca en este change.** `openspec/specs/calidad-codigo/spec.md`
líneas 265-275 tiene la ventana de gracia de la **cobertura**, con cierre el 2026-09-30 y
la misma premisa vencida del tag móvil. Es otro mecanismo, con otro radio (los pisos de
cobertura por paquete) y una fecha que ya está anunciada. Queda **nombrada acá para que no
se pierda**, y se decide aparte: cerrarla antes de tiempo es una decisión sobre deuda de
cobertura, no sobre distribución.

---

## Adenda del 2026-09-17 — el cierre, y lo que se corrigió al cerrarlo

**Por qué se reabre.** El trabajo del bloque 1 está hecho desde la 1.6.0, pero
`tasks.md` marcaba 0 de 7, y al auditarlo contra el árbol aparecieron **nueve textos que
seguían prometiendo la ventana**, en presente. El que más importa está en la porción del
marco que cada proyecto carga en cada sesión:
`actions/constitucion/canonico/20-marco-version.md`, regla `marco-artefacto-al-dia`:
«Un artefacto atrasado avisa primero y falla desde la fecha que el propio aviso
imprime». Es falso desde el 2026-08-22: medido sobre un consumidor de juguete con el
artefacto en 1.7.0, la verificación del árbol termina con `exit=1` y dos `::error::`
«le faltan reglas… ya es un fallo», el mismo día.

**El origen en Rigel.** Rigel archivó este mismo change en su 1.10.0 (2026-08-29,
`794bbaf` y `18591c0`) después de que su auditoría de cierre encontrara el resto de
`action.yml` —«la ventana de gracia **es** para reglas nuevas»— una semana tarde, y dejó
escrita la lección: *contar menciones no distingue la nota histórica del texto que sigue
prometiendo; lo encontró la auditoría, no un check*. Después corrigió la regla del
canónico (2.0.0, `2c9e5e5`, 2026-09-04) y retiró la segunda fecha entera (change
`una-sola-fecha`, `b8359ed`/`c26b29c`/`56c5775`, 2026-09-05).

**Qué cambia respecto de lo aprobado.** Lo aprobado dejaba el aviso con fecha como
**opt-in de quien publica**. La decisión D1 del PO del 2026-09-17 lo cierra: *una
compuerta se exige en rojo el día que sale, salvo que su arreglo quede fuera del árbol
del consumidor*, y regenerar este artefacto queda adentro. Así que:

- **La versión exigible es la publicada, sin excepción**, y eso se escribe en los dos
  specs que hablan de esto: el delta de este change (`calidad-codigo`) y el de
  `reglas-al-dia` (`gobierno-contribucion`, que aprueba el PO).
- **Un banco lo hace cumplir**: `actions/constitucion/pruebas/la-ventana-no-vuelve.test.mjs`
  pone rojo un manifiesto con `exigible_desde` distinto de `publicada`, cualquier
  superficie que repita una de las redacciones vencidas, y la regla del canónico si deja
  de decir que el atraso es rojo.
- **El canónico gana una versión** (1.10.0, número tentativo que corrige el release)
  por la frase corregida. Una línea menos: 697 → 696 de 700.
- **El output `exigible_desde` NO se quita todavía.** Quitar un output es breaking por la
  letra de `AGENTS.md`, y la línea v2 se abre una sola vez con todos los breaking juntos
  (decisión D1 del PO). Hasta entonces sigue publicándose con la misma fecha que
  `publicada`, y el mecanismo de la fecha futura queda en el código, inalcanzable por
  datos.

**Impacto en los consumidores.** Hay **tres reales, todos en `@v1.9.6`** (no cero, como
suponía el plan): su artefacto declara la 1.7.0. El PR de bump a la versión que publique
este canónico **llega con el job `constitucion` en ROJO** —medido en un repo de juguete:
artefacto 1.7.0 contra el árbol, `exit=1`— y se arregla dentro de ese mismo PR
regenerando el artefacto con la versión nueva. No cambia ningún nombre de job, ningún
`input`, ningún `output` ni ningún permiso: un repo que no mergea el bump no cambia de
color. **Riesgo transitorio, preexistente a todo cambio del canónico:** entre el merge a
`main` y el release que mueve el pin del andamio, un proyecto generado desde el clon nace
con el artefacto en 1.10.0 y su CI pinado en `@v1.9.6` lo rechaza como
`artefacto-adelantado` (medido: `exit=1`). Se cierra en el release.

