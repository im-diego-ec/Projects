---
artefacto: proposal
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
informado: PO / Builder 2
estado: en-ejecucion
---

# Rojo primero, y no solo en el código

## Por qué

El marco ya exige TDD con **rojo evidenciado en local**, y esa regla funciona para el
código de aplicación. El problema es su ALCANCE: la regla dice «código», y el marco está
hecho de tres cosas más que nadie prueba así — compuertas, reglas e informes.

**La auditoría de cierre de la v1 de este marco puso el número**
(`docs/16-auditoria-cierre-v1.md`, corrida del 2026-08-20): de **20 propiedades** que los PRs de ese cierre afirmaban sobre sí mismos,
**13 eran falsas**, cada una refutada con un comando y su código de salida. No fueron
trece descuidos distintos: fue el mismo, trece veces. Ninguna de las trece se había visto
fallar antes de declararse verdadera. Tres formas, con nombre:

- **Un check que nadie hizo fallar.** El paso «Constitución del marco al día» devolvía
  exit 0, sin error y sin warning, contra un consumidor sin artefacto y con la fecha
  vencida. La ausencia de datos se estaba leyendo como éxito.
- **Una verificación que no podía fallar.** Una comprobación contaba las líneas de salida
  de una herramienta para decidir si había hallazgos; cuando la herramienta no pudo abrir
  el archivo, la salida quedó vacía y la comprobación informó «0 hallazgos».
- **Reglas que nunca tuvieron compuerta**, leídas igual de firmes que las que sí.

Este change estuvo abierto con **0 de 11 tareas** desde entonces. Rigel —el repo
hermano del que este marco trae mejoras— lo implementó entero y lo corrigió dos veces, y
lo que se trae acá es eso, adaptado:

| Rigel | Qué trajo | Commits de allá |
|---|---|---|
| 1.11.0, change `rojo-primero` (archivado 2026-08-30) | bancos para nueve compuertas que nadie había visto fallar; la plantilla de PR pide comando y exit code | 26ae22a, 33d588d, d4b294e, e3bf131, ecd195a, 1a7ba67, eaab6b6, eeb01f4, ac628ab |
| 2.0.0, change `censo-honesto` (2026-09-05) | el censo mira también lo que el andamio reparte, y cinco compuertas del andamio ganan banco | 64f6ebd |
| 2.4.0, change `el-numero-del-censo` (2026-09-09, issue #341) | un paso con `continue-on-error` no cuenta como la compuerta de un requirement | e1f75d0, ea69e3f, 0f82f3a, b372d9c, 6328133 |

**Lo que el porte encontró al medir en este árbol, y no viene de Rigel:**

- **El censo de pasos sin banco miraba 17 pasos de un solo archivo.** Hay **112** en
  **15** superficies (`.github/workflows/`, `plantilla/.github/workflows/`,
  `actions/*/action.yml`). Al abrirlo, y después de declarar como deuda o como «sin rojo»
  lo que lo era, **16 pasos** quedaron sin estado: compuertas sin banco y sin deuda
  declarada. Entre ellos el veredicto del andamio —el check que el ruleset de cada proyecto
  nacido de él exige— y los cuatro pasos del andamio que Rigel ya había bancado.
- **La cita por nombre contaba de más.** Un paso contaba como «con banco» si su nombre
  aparecía en cualquier `.test.mjs`, comentarios incluidos. Con varias superficies, eso
  daba por corridos a los homónimos: el paso de Terraform de `marco-ci.yml` salía citado
  porque el banco del paso homónimo del andamio lo nombraba, y **nadie corre el suyo**, que
  tiene guardas propias.
- **Una cláusula de una compuerta se cumplía con un comentario.** El paso «El andamio
  reparte el umbral del total del marco» exigía el texto `all: true` en la configuración
  de cobertura del andamio. vitest retiró esa opción en su mayor 4 y el andamio la sacó,
  con un comentario que explica el retiro y **nombra `all: true` dos veces**: el paso
  pasaba en verde por ese comentario. Lo encontró el banco nuevo del paso, en su primer
  caso rojo.

## Qué cambia

1. **Bancos para las compuertas que no lo tenían.** Salen de la deuda declarada «Exigir
   OpenSpec en el repo», «Validacion estricta de changes y specs», «Definiciones de pipeline
   validas», «Censo de fuentes cableado» y «El andamio reparte el umbral del total del
   marco». El andamio gana banco para «El arbol arranca limpio», «Todo paquete declara los
   scripts de verificacion», «Verificar cada paquete», su «Veredicto» y «Verificar que el
   bot esta configurado». Cada banco corre el script real, extraído del YAML, y se lo vio
   morder saboteando la compuerta.
2. **El censo de pasos mira todas las superficies y distingue deuda de «sin rojo».**
   Cada paso cae en un estado: con banco, deuda (lógica propia sin caso, con motivo, que
   sale por `::warning::` en cada corrida), sin rojo propio (plomería, invocación directa de
   una herramienta, o aviso, con tipo y motivo), action del marco o action de terceros
   (declaradas una vez cada una). Una cita cuenta solo si es una cadena literal, y un
   homónimo necesita que el banco diga de qué archivo.
3. **Un paso que no puede fallar no es compuerta.** Un `continue-on-error` distinto de
   `false`, en el paso o en su job, obliga a declararlo sin rojo en el censo de pasos, y
   pone rojo el banco de la página de cobertura si esa página lo cita como la compuerta de
   un requirement.
4. **La cláusula del umbral se corrige**: exige el alcance (`include:`) en vez de la
   opción retirada, y solo en código, no en comentarios.
5. **Las dos plantillas de PR** —la del marco y la del andamio— piden el comando y su
   exit code, con un ejemplo, y un campo «No medido».
6. **Tres requirements nuevos en `calidad-codigo`**, con las correcciones de
   `censo-honesto` y `el-numero-del-censo` que aplican a este modelo.

**Lo que NO se trae de Rigel, por decisión de builders:** `herramientas/censo-compuertas.mjs`
ni las marcas `rigel:rojo` / `rigel:sin-rojo` / `rigel:cubre` en los YAML. El censo de
requirements de este marco es uno solo, `openspec/cobertura-de-requirements.md`, y el de
pasos es el banco que se deriva del árbol. Tener dos censos sería tener dos fuentes de
verdad. Tampoco los tres estados de ausencia, la cobertura por mitades ni el alcance de
cada compuerta (nacidos contra adoptados): van en el change del lote siguiente del porte
(`el-censo-no-miente`), sobre la página de cobertura.

## Impacto en los consumidores

Hay **tres** consumidores reales, todos en `@v1.9.6` (`custodia-bingo`, `plantilla-sitio`,
`plantilla-aplicacion`).

- **Lo referenciado que cambia es un solo paso de `marco-ci.yml`**, «El andamio reparte el
  umbral del total del marco», y en un consumidor ese paso toma su camino inerte (no
  distribuye el comparador de cobertura): imprime el mismo `::notice::` y sale 0. **Ningún
  veredicto de consumidor cambia.** Solo cambia para un repo que reparta el andamio y el
  comparador, que hoy es únicamente este.
- **La plantilla de PR del andamio es scaffold**: la recibe un proyecto que nace desde
  ahora. Los tres consumidores no la reciben sola; pueden copiar la sección de evidencia si
  quieren, y no hacerlo no los pone rojos.
- **Todo lo demás son bancos del marco y su plantilla de PR**: no viajan.

**Para consumidores: nada.** No es breaking: no hay input, output, permiso ni nombre de
job que cambie, y ningún repo que hoy pasa falla mañana.

## Qué NO cambia

- **No se prohíben las reglas sin check.** Una regla que solo puede sostener el criterio
  humano sigue siendo válida; lo que cambia es que se sepa cuál es.
- **No se toca el TDD del código de aplicación.** Esa regla ya funciona.
- **No se agrega ninguna compuerta que enrojezca un repo consumidor hoy verde.** Las
  compuertas nuevas son bancos del propio marco.
