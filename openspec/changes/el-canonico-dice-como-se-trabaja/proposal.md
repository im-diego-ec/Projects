---
artefacto: proposal
dri: Builder 1
aprueba: PO (el delta de gobierno-contribucion) y revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
                              # la capability de gobernanza del trabajo la gatea
                              # el PO por CODEOWNERS; el desvio de la revision
                              # cruzada no la toca. El delta de calidad-codigo
                              # (el presupuesto) es tecnico
informado: PO / Builder 2
estado: en-ejecucion
---

# el-canonico-dice-como-se-trabaja — Proposal

> **Versión del insumo contra la que se escribió** (la regla que este mismo change
> agrega): el plan del porte de Rigel del 2026-09-17, lote 11, y las decisiones
> D1-D9 del PO del mismo día. Lo que llegue después alimenta al change siguiente,
> salvo que contradiga lo de acá.

## Why

La porción del marco de la constitución es lo único que **cada sesión de cada
proyecto carga sin que nadie la invoque**. Tres conductas que Rigel aprendió caras
todavía no están ahí, y una cuarta está escrita de una forma que no se puede cumplir
antes del merge.

### 1. La revisión sin meta, que gira en círculo (Rigel 1.8.0, `revision-con-meta`)

Medido en la primera adopción desde cero de Rigel (2026-08-24 al 27, observación
`O24`, change archivado `2026-08-30-revision-con-meta`, commits `2ed0d6c`,
`63b941d`): **40 horas de reloj** —20 del builder, 20 del PO—, **10 documentos de
resolución del PO en cuatro días**, cinco versiones del catálogo. Cuando por fin se
clasificaron los pendientes contra lo que el change especificaba, quedaban **seis
bloqueantes abiertos y ninguno tocaba los 24 escenarios**: el change cerró el mismo
día que cambió la meta. Las horas del PO no se fueron en decidir; se fueron en
contestar lotes de preguntas que un agente armó sin filtrar.

En Projects el riesgo es mayor, no menor: la vía no técnica pone a un PO que no
escribe código frente a un agente que reporta todo lo que encuentra. **Hoy ninguno
de los cuatro identificadores existe en el marco** (`git grep` de los cuatro ids: cero
resultados).

### 2. «Terminado en local y no cerrado», un estado que Projects produce a propósito (Rigel 1.9.0, `dev-alcanzable`)

La definición de terminado exige «desplegado por la promoción y verificado». Un
repositorio sin ambiente no puede cumplir esa cláusula, y en Projects ese
repositorio es legítimo por diseño: `ninguna` es una plataforma admitida y de
primera clase (`60-infra-plataforma-secretos.md`, regla `ninguna-es-una-respuesta`),
y la decisión D6 del PO del 2026-09-17 lo confirma: *«no desplegar» sigue siendo un
estado legítimo*. Con eso, Done es inalcanzable y el estado no tiene nombre: cada
bloque es un incumplimiento silencioso o un `[x]` que miente. El segundo consumidor
de Rigel acumuló siete bloques así, después catorce (commits `f97cb6d`, `c736b37`,
`4b71b50`), y la primera redacción de la regla confundió bloque con tarea: el caso
real tenía 92 tareas en `[x]` hechas de verdad.

### 3. El PR final «cierra» el issue macro, que es un hecho de después del merge (Rigel 1.18.0, `enlace-antes-del-merge`)

El paso 6 del flujo (`10-openspec.md`) y la regla `github-closes-apunta-al-sub-issue`
(`80-github.md`) dicen que el PR final **cierra** el issue macro. Eso sólo es verdad
después del merge, así que la tarea que lo atestigua no se puede marcar en el PR
que la cumple. En Rigel costó un PR de una línea en dos changes seguidos (#247 y
#261, el segundo cambió un carácter; commit `5f47b28`). Y es la precondición de la
compuerta del enlace (lote 16 del porte): mientras la regla diga «cierra», el PR
final es una excepción obligada del check.

### 4. El presupuesto de líneas se mide mal, y está por agotarse (Rigel 2.0.0, `2c9e5e5`)

`manifiesto.json` declaraba `presupuesto_lineas: 700` sin una palabra de cómo se
cuenta. Medido hoy sobre este árbol, antes de tocarlo: `cat canonico/[0-9]*.md |
wc -l` da **687** —trece de margen— y `leerCanonico()`, que es lo que cobra el
check, da **696**: cuatro de margen. Rigel cayó en el mismo hueco y lo midió el
2026-09-04: su nota declaraba 710 usadas cuando el check contaba 720, y el margen
que se creía de diez era cero. Las reglas de arriba no entran en cuatro líneas.

### 5. Residuos del renombrado que ya viajan

El marco nació de otro, y el nombre de origen se reemplazó mecánicamente. Donde era
parte de un identificador o iba tras un artículo, dejó texto roto que cada proyecto
carga: `90-marca.md` decía que el manual es «la skill **`la organización-design`**»
—una skill que no existe con ese nombre en ningún lado—, «cinco casos en el un
consumidor» y «la Estrella de la organización»; `plantilla/eslint.config.mjs:187`
repetía la skill inexistente. Ningún banco lo veía.

## What Changes

Todo en **una sola versión del canónico, la misma 1.10.0 que abrió
`ventana-vencida`** (número tentativo; lo corrige el release). Cada versión del
canónico deja rojo el PR de bump de cada consumidor hasta que regenera, así que
juntarlas cuesta un rojo en vez de varios.

- **Cuatro reglas nuevas en `40-fronteras.md`, ✅ Siempre**, cada una con su id:
  `revision-declara-su-meta`, `hallazgo-se-clasifica-contra-la-meta`,
  `pregunta-al-po-declara-que-desbloquea` (que nombra al rol por `{{PO}}`, decisión
  D8) y `change-congelado-contra-su-insumo`. Y una remisión de tres líneas en el
  paso de flujo de `10-openspec.md`.
- **La regla `terminado-en-local-y-no-cerrado`, pegada a `definicion-de-done`** en
  `30-git-despliegue.md`: lo abierto es el bloque y no sus tareas, `[~]` si el bloque
  lleva casilla, legítimo y sin vencimiento con plataforma `ninguna`, y tener
  ambiente no cierra lo que quedó atrás. La guía (`docs/09`, §9.d) muestra las formas.
- **El PR final LLEVA `Closes` al issue macro desde que se crea**, en `10-openspec.md`
  y `80-github.md`, sin tocar ningún id. Las dos copias de la skill
  `projects-archive-change` suman la verificación previa al merge
  (`gh pr view <n> --json closingIssuesReferences`) y los dos `Closes` en el ejemplo,
  y `docs/11` deja de listar al PR final como excepción de la futura compuerta.
- **El presupuesto sube de 700 a 738**, con una `presupuesto_nota` que dice cómo se
  mide (`leerCanonico()`, no `wc -l`), de qué se compone la subida y por qué no sale
  ninguna regla. Quedan 733 usadas: cinco de colchón de mantenimiento, que no
  alcanzan para una regla nueva.
- **Los residuos se reescriben** en `90-marca.md` (tres reglas, sin cambiar ningún
  id ni lo que exigen) y en el comentario de `plantilla/eslint.config.mjs`.
- **Tres bancos que se ponen rojos solos**, los tres vistos en rojo sobre el árbol
  anterior: las reglas por id y por lo que dicen
  (`inventario-canonico.test.mjs`), el presupuesto y su nota
  (`presupuesto-del-canonico.test.mjs`) y los residuos del renombrado en lo que viaja
  (`pruebas/andamio/residuos-del-renombrado.test.mjs`).

## Impact

**Hay tres consumidores reales, todos en `@v1.9.6`** (`custodia-bingo`,
`plantilla-sitio`, `plantilla-aplicacion`).

- **Un repo que no mergea el bump no cambia de color.** Su pin es exacto.
- **El PR de bump a la versión que publique la 1.10.0 del canónico llega con el job
  `constitucion` en ROJO**, igual que ya lo anunció `ventana-vencida`: este change no
  suma un rojo, suma texto al mismo. Se arregla en ese PR regenerando el artefacto
  con el modo `escribir` de la versión nueva. El arreglo está dentro del árbol del
  consumidor, así que según D1 va en rojo el día que sale y no es breaking.
- **Ningún id cambia ni desaparece**: un desvío declarado por un consumidor sigue
  resolviendo. Ningún `input`, `output`, job ni permiso cambia.
- **Ningún marcador nuevo**: `{{PO}}` ya lo exige la regla `openspec-roles`.
- **Lo que llega a cada sesión**: cinco reglas más y dos redacciones corregidas.
  Nada que el consumidor tenga que hacer además de regenerar.
- **Scaffold**: la skill y el comentario de ESLint llegan sólo a proyectos nuevos. Un
  proyecto ya nacido conserva su copia de la skill; puede copiar a mano las dos líneas
  nuevas del checklist si quiere la verificación.

**Clasificación**: canónico (la porción del marco, viaja por la action
`constitucion`), scaffold (skill y comentario de ESLint), bancos del marco (no
viajan) y documentación del marco. **Contrato: minor.**

## Fuera de alcance, declarado

- **La compuerta que verifica el cuerpo del PR** (`enlace-en-el-pr`): es el lote 16.
  Este change le deja la precondición escrita.
- **El check de que cada pendiente declare si bloquea** (la mitad cableable de
  `revision-con-meta` en Rigel): es el lote 19. Hasta entonces, las reglas de
  revisión con meta son texto que el agente carga, sin compuerta sobre la conducta.
- **La regla `marca-texto-oscuro-sobre-acento`** sigue hablando del «naranja de
  marca», que es de una marca concreta. La decisión D7 dice que el canónico de marca
  lo pone cada proyecto; eso es el lote 34, y acá sólo se corrigen los residuos sin
  cambiar lo que las reglas exigen.
