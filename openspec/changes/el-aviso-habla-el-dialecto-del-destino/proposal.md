---
artefacto: proposal
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
informado: PO / Builder 2
estado: en-ejecucion
---

# El aviso de versión habla el dialecto del destino

## Por qué

El aviso de versión (`actions/aviso-version`) es la única prosa del marco que viaja
directo a los consumidores, y hoy **mezcla dos dialectos en el mismo mensaje**.
`construirMensaje` escribe su propio encuadre con **un** asterisco
(`*Qué tiene que hacer un consumidor:*`, `aviso-version.mjs:253` antes de este change),
que es negrita en el dialecto de Slack (mrkdwn), y pega debajo el cuerpo del
`CHANGELOG.md`, escrito en Markdown con **dos** (`**...**`), que es negrita en Teams y
Discord. Ningún destino renderiza el mensaje entero bien: en Slack el cuerpo muestra
los asteriscos dobles a la vista; en un destino Markdown el encuadre sale en itálica.

Medido el 2026-09-17 sobre este árbol, armando el aviso de cada sección del
`CHANGELOG.md` con la action tal como estaba y contando lo que un destino Slack
mostraría: **18 de 19 secciones llegarían sucias, con 870 `**` a la vista**
fuera del código (la 1.0.0 es la única limpia). El destino de Projects todavía no está
configurado (`AVISO_VERSION_DESTINO` no existe, `docs/16-auditoria-cierre-v1.md`,
hallazgo 12), así que esto no le llegó a nadie — todavía.

**Origen en Rigel** —el marco del que Projects se bifurcó el 2026-08-24—, donde el
mismo aviso se rompió cinco veces sobre su canal real (Slack). No hubo change
archivado: fueron commits directos.

| Defecto | Incidente en Rigel | Commit |
|---|---|---|
| `**` literales en Slack; el mensaje mezclaba dialectos | 1.15.0, 2026-09-02: 12 líneas afectadas | `8b073e0` (1.16.0) |
| La preferencia cargada como **secret** y no como variable: `vars.*` no la ve, el aviso cayó al default sin decirlo | 2026-09-02, descubierto con una captura del canal | `04070a4` (1.16.0) |
| Slack no renderiza negrita que cruce un salto de línea, y el CHANGELOG está cortado a ~80 columnas | 1.15.0: 3 de 11 negritas cruzaban | `b6c689b` (1.16.0) |
| mrkdwn no tiene tablas: barras y guiones a la vista | 2026-09-02 | `a94ad84` (1.16.0) |
| La negrita que envuelve código salía cruzada con la vecina, porque la conversión partía el texto por los spans de código | 2.0.0 y 2.3.0, a sus tres consumidores, issue #358 (2026-09-09); un comentario afirmaba que el caso «hoy no aparece» y 18 de 30 entradas lo tenían | `683343a` (2.4.0) |

Se porta **con el quinto arreglo ya puesto**: traer la conversión sin él sería portar
un defecto medido. Y con dos cosas que Rigel no hizo, medidas acá:

- **La continuación de un ítem de lista también se junta.** El desenvuelto de Rigel
  junta sólo párrafos de prosa; su propio comentario declara que una viñeta envuelta
  conserva su corte. El `CHANGELOG.md` de Projects escribe casi todo en viñetas
  envueltas: con el desenvuelto de Rigel, **7 secciones seguirían sucias con 27
  negritas partidas**; con el de este change, **0**.
- **El script sabe si alguien declaró el dialecto.** En Rigel el input tenía
  `default: markdown` y el workflow `|| 'markdown'`, así que el script no podía
  distinguir «se eligió markdown» de «quedó en el lugar equivocado». Acá el input no
  tiene default —un valor, un lugar, igual que `limite` desde el lote 8— y el
  `::notice::` lo dice. El workflow del marco, además, detecta el secret mal cargado
  sin leer su valor.

## Qué cambia

1. **`actions/aviso-version` acepta el input opcional `formato`** (`markdown` |
   `mrkdwn`), sin default en `action.yml`; vacío cae en `FORMATO_POR_DEFECTO`
   (`markdown`). Otro valor es **rojo**, sin payload, con el arreglo.
2. **El mensaje habla un solo dialecto**: el encuadre que escribe el script pasa por el
   mismo dialecto que el cuerpo. En `markdown` el cuerpo del CHANGELOG no se toca; en
   `mrkdwn` se traduce negrita, tachado, enlaces y encabezados, las tablas llegan como
   lista etiquetada y los párrafos y viñetas cortados se juntan en una línea. El código,
   cercado o en línea, no se toca nunca; la negrita que lo envuelve queda emparejada.
3. **Cada corrida emite un `::notice::`** con el dialecto usado y si fue declarado o es
   el default, y el resumen de la corrida lo repite.
4. **El workflow propio del marco** (`.github/workflows/aviso-version.yml`) pasa
   `vars.AVISO_VERSION_FORMATO` sin fallback y advierte con `::warning::` si existe un
   **secret** con ese nombre.
5. **La compuerta del largo** (`herramientas/aviso-entra-en-el-mensaje.mjs`) mide cada
   dialecto que la action acepta y nombra el que no entra.
6. **Bancos**: `actions/aviso-version/pruebas/dialecto.test.mjs` (nuevo, incluye un
   barrido contra el `CHANGELOG.md` real) y la compuerta por dialecto.

## Qué NO cambia

- **El destino sigue sin cablearse.** La traducción es de dialecto, no de proveedor.
- **El límite sigue en 3500**, en un solo lugar.
- **Ningún `output` de la action cambia.**

## Impacto en los proyectos consumidores

Hay **tres consumidores reales, todos en `@v1.9.6`** (`custodia-bingo`,
`plantilla-sitio`, `plantilla-aplicacion`). Consumen `marco-ci`, `constitucion`,
`censo-fuentes`, `cobertura-diff` y el `desplegar.yml` del andamio: **ninguno invoca
`actions/aviso-version`** (medido para el porte el 2026-09-17, el mismo dato que usa el
change del lote 8). Aun así la action es referenciable y su contrato se trata como tal:

- **Input nuevo `formato`, opcional.** Quien no lo pasa no se rompe. Es **MINOR** y,
  por AGENTS.md («cambiar el contrato de un workflow reusable ya publicado»),
  **requiere el OK humano antes del release** — queda como tarea abierta.
- **El encuadre del mensaje por default pasa de `*` a `**`.** Es el arreglo de la
  mezcla de dialectos, no un cambio de default: el default ya era markdown para el
  cuerpo, y ahora el encuadre lo acompaña. Medido: en `markdown`, sobre las 19
  secciones del CHANGELOG, el mensaje nuevo difiere del que arma el script del lote 8
  **sólo** en su línea de encuadre (+2 caracteres; son dos líneas posibles, una por
  rama). Contra la 1.9.6 publicada la versión trae además los cambios del lote 8 —el
  primer párrafo y las viñetas BREAKING enteras—, y los nombra su entrada. Un consumidor que ya mande a **Slack** lo nota —esa línea pasa a
  mostrar los asteriscos, como ya los mostraba el cuerpo— y el arreglo es una línea:
  `formato: mrkdwn` (en el workflow del marco, la **variable** de repositorio
  `AVISO_VERSION_FORMATO`, pestaña Variables y no Secrets). Va dicho en «Para
  consumidores».
- **Un `::notice::` nuevo por corrida** y una línea nueva en el resumen: diagnóstico,
  no contrato.

**Contrato: minor. Distribución:** referenciado (la action) y canónico (compuerta,
workflow propio, bancos, documentación). Detalle en el design.

## Dependencia de integración

El `aprueba:` de este change cita el desvío de review del marco («un solo mantenedor,
ver AGENTS.md»), y **ese desvío no está declarado en esta rama**: lo declara el change
`el-marco-declara-su-desvio-de-review` del carril L1 del porte. Este change **se integra
después de ese, o junto con él** (tarea 8.8). La guarda que lo pone rojo en un PR a
`main` —`pruebas/ci-del-marco/aprueba-cita-lo-que-existe.test.mjs`— llega con el
arreglo del change `que-es-breaking`.
