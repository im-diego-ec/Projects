---
artefacto: proposal
dri: Builder 1
aprueba: PO  # toca `gobierno-contribucion`: quién aprueba qué es el modelo operativo
informado: PO / Builder 2
estado: en-ejecucion
---

# El arranque no supone el shell ni la cuenta

## Por qué

Projects ofrece arrancar desde Windows —hay un `arrancar.cmd` para quien no programa— y
desde cuentas personales y de organización. En los dos ejes el arranque daba cosas por
sentadas, y todas fallaban en silencio o con un mensaje que culpaba a la persona. Medido el
2026-09-18 sobre el árbol del carril (main más los lotes 0b, 22 y 23):

- **El archivo de valores escrito desde Windows PowerShell no se leía.** El esqueleto de
  `--ejemplo` con los tres bytes `EF BB BF` adelante —lo que deja `Out-File -Encoding utf8`,
  o `>` en algunas máquinas— hacía salir a `projects init` con 1 y
  `::error::no pude leer ...: Unexpected token '﻿' ... is not valid JSON`; con UTF-16 LE —el
  `>` de Windows PowerShell 5.1— igual. El archivo se ve perfecto en el editor y el mensaje
  se lee como si la persona lo hubiera llenado mal. La guía técnica lo esquivaba declarando
  5.1 no soportado.
- **En una organización, nadie comprobaba que el PO que `CODEOWNERS` nombra exista en su
  equipo.** El andamio le da proposal y specs al equipo `EQUIPO_PO`; si ese equipo está
  vacío, si todos sus miembros son también builders, si tiene más de una persona fuera de
  builders o si la única no es el `PO` declarado, GitHub no asigna a nadie o deja que un
  builder satisfaga el gate del PO, y no lo dice. `projects init` escribía ese archivo sin
  preguntarle nada a GitHub; `docs/05-arrancar-tecnico.md:340-363` (antes de este cambio) lo
  advertía en prosa, con un conteo escrito a mano (`--jq 'length'   # hoy: 0`) y con el
  estado de **otra organización** —el equipo `po` vacío, un project «Roadmap del área»,
  handles de terceros—, residuo del fork que le describía al lector una cuenta que no es la
  suya.
- **El pre-push validaba el pipeline con un verde más débil que el del CI.** Corría el
  `actionlint` del `PATH`, en cualquier versión, sin mirar si había shellcheck. Medido con
  actionlint 1.7.12: un workflow con `run: echo '$HOME no se expande'` da el SC2016 con
  shellcheck y **sale 0 sin decir nada** sin él. Y el rojo del CI mandaba a «instalar
  actionlint X» sin nada en el repo que lo hiciera posible.
- **Los comandos que el andamio manda correr suponían bash.** La verificación final de
  `plantilla/AGENTS.md` era `grep -rnE ... --exclude-dir=...`, que no corre en PowerShell ni
  en cmd. Y `plantilla/.github/proteccion-main.md` pedía copiar un `<id>` a mano entre tres
  comandos —en bash `<id>` ni siquiera es un argumento: es una redirección— sin decir que
  `--jq '...'` en PowerShell se parte por los espacios.
- **Las reglas diferidas del andamio no decían cuándo se vuelven a mirar.** La tabla tenía
  motivo y no condición («se enciende cuando haya una segunda persona»). El requirement
  «Branch protection documentada como paso manual» de `gobierno-contribucion` ya exige «el
  disparador concreto que la activaría»: el andamio no lo traía. Y no decía cuál encender
  primero, que es la que desactiva el gate del PO (aprobaciones = 0).
- **Un cero de `grep` sobre prosa con tildes se leía como verificación.** Medido con git 2.54:
  `LC_ALL=C git grep -c 'revisi.n trimestral'` da 0 sobre un archivo que lo dice dos veces;
  con un locale UTF-8 da 2. El mismo comando cuenta distinto según la máquina.

**Origen en Rigel**, adaptado:

- 1.14.0, change archivado `2026-09-01-arranque-ejecutable`: commit d7e5e63 (la herramienta
  lee el archivo aunque traiga BOM; T1 de la adopción del 2026-08-24, medido el 2026-09-01) y
  commit b8836af (el PO como «equipo po menos builders», exactamente uno; la guía lista
  logins en vez de contar contra una cifra).
- 1.8.0, commits 0629661 y 7886e79 (primera adopción, 2026-08-24/27: los comandos del
  ruleset encadenan el id y declaran shell POSIX; la verificación final pasa a `git grep`; la
  tabla de diferidas suma la condición que la reactiva).
- 2.7.0, commit 218e5f6 (issue #439, 2026-09-13: actionlint local con el pin del CI, dos
  viajes de CI en una sesión, el segundo por un SC2016).
- 2.5.0, change archivado `2026-09-10-pendientes-con-destino`, commit 89e89c7 (hallazgo H3:
  el cero falso de `git grep` con un `.` sobre una tilde).

**Lo que la medición de acá corrige de Rigel**, y por eso no es una copia:

- La verificación con `git grep -nE` a secas —la de Rigel— solo mira lo rastreado, y la
  sección se llama «antes del primer commit»: medido, un marcador en un archivo sin
  commitear no aparece y el comando sale 1. Va con `--untracked`.
- «git grep compara bytes» es cierto en `LC_ALL=C` y falso en un locale UTF-8.
- Rigel baja shellcheck de un release que **no publica checksums** (medido: los 13 assets de
  la v0.11.0) y lo ejecuta sin verificar; y en Windows no lo intenta pero tampoco lo apaga,
  así que con shellcheck en el `PATH` se cuelga igual.
- Projects no **deriva** el PO: lo declara. Se porta la propiedad —exactamente uno fuera de
  builders, y es el declarado—, no la derivación.

## Qué cambia

1. **`projects init` lee el archivo de valores con cualquiera de las tres BOM** que puede
   poner un shell de Windows (UTF-8, UTF-16 LE y BE), sacándola por bytes; un JSON roto
   sigue fallando con su error (`leerValores`, en las tres lecturas de `main()`).
2. **En una organización, `projects init` contrasta el PO contra los equipos** al terminar:
   lista los miembros de `EQUIPO_PO` y `EQUIPO_BUILDERS` (solo lectura) y avisa si fuera de
   builders no queda exactamente una persona, o si no es el `PO` declarado. «No pude mirar»
   se dice con su motivo y el comando para mirarlo a mano. En una cuenta personal no
   pregunta nada. El mismo control, a pedido: `projects-doctor --valores <archivo>`.
3. **`herramientas/actionlint-local.mjs`** corre actionlint en la versión que declara
   `version_actionlint` de `marco-ci.yml`, verifica su checksum, usa el shellcheck del `PATH`
   pasándolo explícito, dice cuándo su verde es más débil que el del CI, apaga la integración
   que se cuelga en Windows y tiene techo de tiempo. El hook `pre-push` lo usa en vez del
   binario del `PATH` (hallazgos bloquean; «no pude correr» avisa y deja empujar). El rojo
   del paso de actionlint de `marco-ci.yml` nombra la herramienta.
4. **Andamio**: la verificación final de `plantilla/AGENTS.md` pasa a
   `git grep --untracked -nE "..."`; `proteccion-main.md` encadena el id por el nombre del
   ruleset, declara shell POSIX con el error que da PowerShell, y su tabla de diferidas suma
   «Condición que la reactiva» con la aprobación requerida marcada como la primera.
5. **Documentación**: `docs/05` deja de describir otra organización en la fase 1 (lista
   logins, comprueba por tipo de cuenta, remite al control automático) y corrige lo que
   afirmaba de 5.1 y la BOM; `docs/11` suma la regla 11 (el cero falso de `grep` sobre
   tildes), su fila del backlog y, en la regla 7, el comando de actionlint local.

## Distribución

- **Herramienta del marco** (no viaja al proyecto): `projects-init.mjs`,
  `projects-doctor.mjs`, `actionlint-local.mjs`, `hooks/pre-push`.
- **Referenciado**: solo el texto de un `::error::` de `marco-ci.yml`.
- **Scaffold**: `plantilla/AGENTS.md` y `plantilla/.github/proteccion-main.md`.
- **Canónico**: deltas ADDED en `calidad-codigo` y `gobierno-contribucion`.
- **Regenerado**: nada.

## Impacto en los consumidores

Los tres consumidores reales (`custodia-bingo`, `plantilla-sitio`, `plantilla-aplicacion`,
todos en `@v1.9.6`) **no reciben nada nuevo en su pipeline**: el único cambio referenciado es
el texto de un mensaje de error. Ningún input, secret, output, permiso ni nombre de job se
mueve. Contrato: **patch**.

- Lo de la herramienta llega a quien arranca un proyecto nuevo con un clon del marco en esta
  versión. En una organización, el arranque puede imprimir un `::warning::` nuevo sobre el
  PO: es aviso, no cambia el código de salida.
- Lo del scaffold llega a los proyectos que nacen desde esta versión. Uno existente que lo
  quiera copia la sección «Contrastar lo escrito» y la tabla de diferidas de
  `plantilla/.github/proteccion-main.md`; el ítem 4 de «Antes del primer commit» ya lo borró
  quien terminó el bootstrap.
- Quien tenga el hook `pre-push` instalado por enlace simbólico lo recibe con `git pull`; la
  primera vez baja actionlint (necesita red; sin red avisa y deja empujar).
