---
artefacto: proposal
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
informado: PO / Builder 2
estado: en-ejecucion
---

# Qué es BREAKING, reescrito para el canal por PR

## Por qué

`AGENTS.md` decía, el 2026-09-17, que endurecer un check «de modo que un repo que hoy
pasa mañana falle» es incompatible, y que «si el endurecimiento es el objetivo, se
estrena en modo aviso y el endurecimiento va en el major siguiente» (`AGENTS.md:163-165`
antes de este change). Y definía MINOR como «un check adicional que no rompe lo verde de
nadie» (`:142-143`). Juntas, las dos frases dicen que **ninguna compuerta nueva se le
puede exigir a nadie hasta la versión mayor siguiente**.

**Esa regla nació de un incidente cuyo mecanismo ya no existe.** El 2026-08-19 un check
nuevo enrojeció un repo que el día anterior pasaba **sin que mediara ningún PR**, porque
el canal era el tag móvil `v1`. El 2026-08-21 el canal pasó a ser el pin exacto por PR de
Dependabot (`AGENTS.md:120-127`): desde ahí el rojo llega dentro de un PR que el
consumidor decide cuándo mergear. La regla sobrevivió a su causa.

Lo que cuesta mantenerla, medido en este árbol:

- **Compuertas que existen y no se le exigen a nadie.** El desvío incompleto de
  `.projects-desvios.json` se estrena avisando «por la regla de `AGENTS.md`»
  (`.github/workflows/marco-ci.yml:3494-3498`, `CHANGELOG.md:443`) aunque su arreglo es
  completar un archivo del propio consumidor. El plan citaba como ejemplo los pines de
  terceros (`.github/workflows/ci.yml:596`); medido, ese aviso vive en el CI propio del
  marco y tiene otro motivo —los SHA se resuelven con red (`:609`)—, así que no depende
  de esta regla.
- **Cada compuerta portada desde Rigel volvería a ser incompatible.** Los lotes que
  portan el piso del token, el dueño del contrato o los pendientes archivados tendrían
  que estrenarse todos en aviso.
- **Una viñeta mal clasificada en `[No publicado]`.** `CHANGELOG.md:74-77` declara
  «BREAKING para quien ya tuviera un sitio generado —hoy, nadie—» el cambio de
  `desplegar.yml`, y lo justifica con esta misma regla. Las dos mitades están mal:
  `desplegar.yml` es andamio y no viaja por el PR de bump, así que no le cambia nada a
  ningún consumidor existente; y sí hay uno con un sitio generado (`plantilla-sitio`, en
  la 1.9.6).

**Origen en Rigel** —el marco del que Projects se bifurcó el 2026-08-24—: versión
**2.0.0**, change archivado **`2026-09-05-linea-v2`**, commits `bd5aeac` (proposal),
`fa4343a` (la reescritura de la política) y `9dfba86` (el runbook). Rigel midió el costo
en un consumidor que pasaba el 100% de las compuertas del marco con cero
infraestructura, y reescribió la regla con una lista cerrada de cuatro casos. Dos cosas
de ese porte no se copian tal cual:

1. **Su lista no tenía el caso del arreglo fuera del árbol.** Una compuerta cuyo arreglo
   es una configuración de GitHub o un acto de administrador no se pone verde con ningún
   commit dentro del PR de bump. La decisión D1 del PO de Projects (2026-09-17) lo nombra
   como excepción: va en aviso o se trata como incompatible. Acá es el caso 5 de la
   lista.
2. **Su regla se copió mal a sus otras superficies.** Rigel reescribió `AGENTS.md` el
   2026-09-04 y su skill de release siguió diciendo lo contrario hasta el 2026-09-06
   (`9dfba86`: «LA DEFINICION DE BREAKING contradecia a AGENTS.md desde el
   2026-09-04»). Nada era rojo. En Projects, la regla vieja estaba en cinco superficies:
   `AGENTS.md`, la plantilla de PR, la skill del release, el glosario y el preámbulo del
   `CHANGELOG.md`.

**Y una tercera que Rigel no tuvo que resolver: quién lee el arreglo.** En la vía que
Projects ofrece a quien no programa, el que recibe el PR rojo de Dependabot puede no
saber leer un `::error::`. Si la regla nueva se adopta sin más, se degrada en un PR rojo
que nadie mergea. Por eso el arreglo se exige en «Para consumidores» y en el lenguaje de
las páginas para quien no es técnico.

**La decisión de fondo ya está tomada**: es la D1 del PO (2026-09-17) — una compuerta
nueva o endurecida se exige en rojo el día que sale; si su arreglo queda fuera del árbol
del consumidor, va en aviso o se trata como incompatible. Este change la escribe, la hace
coherente en todas las superficies y la ata a dos comprobaciones.

## Qué cambia

- **`AGENTS.md`**: MINOR admite la compuerta cuyo arreglo cabe en el repositorio del
  consumidor; «Qué es BREAKING» pasa a ser una **lista cerrada numerada de cinco casos**
  —los cuatro de contrato y el del arreglo fuera del repositorio—; el andamio queda
  declarado no incompatible; la regla vieja se explica con su incidente y su fecha.
- **`.github/PULL_REQUEST_TEMPLATE.md`**: la pregunta deja de estar atada a `@v1`, las
  casillas son los cinco casos con la misma frase que `AGENTS.md`, y el checklist
  pregunta si el arreglo de una compuerta nueva está escrito en «Para consumidores».
- **`.claude/skills/projects-release/SKILL.md`**: «Elegir el numero» deja de repetir la
  lista (remite a `AGENTS.md`) y suma la cuarta cosa que cobra la compuerta del aviso.
- **`docs/02-glosario.md`** (filas «estreno» y «modo aviso») y **`docs/11-reglas-no-escritas.md`**
  (estado MODO AVISO): dicen la regla nueva y la segunda razón para estrenar en aviso.
- **`herramientas/aviso-entra-en-el-mensaje.mjs`**: cuarta causa de rojo — la sección
  «Para consumidores» de `[No publicado]` o de la versión más alta usa jerga de oficio.
  La lista es la de `pruebas/docs/lectura.mjs`, importada. `ci.yml` nombra la causa.
- **`pruebas/ci-del-marco/que-es-breaking.test.mjs`** (nuevo): la plantilla de PR ofrece
  exactamente la lista de `AGENTS.md`, y ninguna superficie que dicta la regla vuelve a
  decir la vieja.
- **`CHANGELOG.md`** —preámbulo y la viñeta de `:74-77`— NO se edita en esta rama: los
  carriles del porte no tocan ese archivo. El texto viaja en
  `.porte/10-que-es-breaking.patch`, y el caso del banco que lo vigila queda `todo`
  mientras ese parche exista sin aplicar.

## Impacto en los proyectos consumidores

Hay tres consumidores reales, todos en `@v1.9.6`: `custodia-bingo` (marco-ci,
constitución, censo-fuentes, cobertura-diff), `plantilla-sitio` (además `desplegar.yml`)
y `plantilla-aplicacion`.

- **Hoy: nada.** Ninguna pieza referenciada cambia —ni `marco-ci.yml` ni ninguna action—,
  así que el PR de bump que reciban no les cambia ningún veredicto por este change.
- **Desde la próxima versión**: una compuerta nueva cuyo arreglo cabe en su repositorio
  puede llegar **en rojo dentro de su PR de bump**, con el arreglo escrito en «Para
  consumidores» en palabras corrientes. Lo que solo se arregla fuera de su repositorio
  llega avisando o en la línea mayor.
- **`plantilla-sitio`**: su `desplegar.yml` no cambia con el bump; su producción se
  sigue publicando en cada integración a `main` hasta que copie el archivo nuevo. La
  viñeta que decía lo contrario se corrige.

## Distribución y compatibilidad

Nada de este change viaja a un consumidor. `AGENTS.md`, la plantilla de PR, la skill del
release, `docs/`, la herramienta del aviso y los bancos son del repositorio del marco; el
delta de spec es **canónico**. No es incompatible (ningún contrato referenciado cambia) y
no exige ningún permiso nuevo. Lo que cambia es **cómo se clasifica todo cambio futuro**,
y por eso AGENTS.md lo pone en «Pregunta primero» de forma indirecta: el OK humano es la
D1 del PO.
