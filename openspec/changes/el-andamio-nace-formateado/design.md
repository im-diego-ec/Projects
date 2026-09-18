# Design — el-andamio-nace-formateado

## Contexto

El sujeto de la garantía no es `plantilla/` sino **el repositorio que nace**. Entre
uno y otro, `projects init` hace tres cosas que cambian el texto: poda bloques por
forma, plataforma y tipo de cuenta; sustituye marcadores por valores de largo
arbitrario; y reescribe el archivo de valores. Cada una rompía el formato por su
cuenta, y las tres quedaban tapadas por el paso `formateado` del arranque. Rigel
aprendió la mitad de esto con un andamio sin formas ni podas (su commit c8b4fff lo
dice: «el control mide el destino, no `plantilla/`»); Projects tiene las dos
mitades.

## Decisiones

### D1 — El pin del formateador es exacto y la medición lo deriva

`plantilla/package.json` declara `"prettier": "3.9.6"`, y el paso del CI del marco
lee esa declaración (`node -p 'require("./plantilla/package.json")…'`) y sale rojo
si no es `x.y.z`. Las dos mitades hacen falta: con el pin exacto y la versión
escrita en el paso, alguien tiene que mantener dos números iguales (Rigel los
tuvo distintos); con la derivación y un rango, el paso mide la versión que
escribió el andamio y cada proyecto instala la que haya salido el día que nace.

**Por qué 3.9.6 y no la última.** Es el piso del rango que el andamio ya declaraba,
la versión con la que se midió todo este change, y no sube el pin de nada: lo
estrecha. Medido el 2026-09-17: 3.9.7 y 3.9.8 formatean `plantilla/` igual que
3.9.6 (los mismos 15 archivos en rojo antes, cero después), y 3.9.8 tenía horas de
publicada. Subirlo es un PR de Dependabot en el proyecto, como cualquier
dependencia.

**Descartado:** medir con la versión que resuelva `npx prettier` sin pin (la
medición dependería del día, que es el defecto); traer un lockfile en el andamio
para fijar la versión (un lockfile no convive con marcadores, y el lote 23 del
porte decide cómo nace el lockfile en cada camino).

### D2 — El CI del marco mide el andamio Y cada destino

Paso nuevo en el job `higiene` de `.github/workflows/ci.yml`: instala el
formateador derivado fuera del árbol y con el registro explícito, corre
`prettier --check .` con `plantilla/` como CWD, y después instancia **cada
combinación** de forma × plataforma × tipo de cuenta (las listas se derivan de
`FORMAS`, `PLATAFORMAS` y `TIPOS_DE_CUENTA` de la herramienta) dos veces —con los
valores del ejemplo, más cortos que sus marcadores, y con valores largos cerca del
máximo de cada forma— y corre el formateador en cada destino.

- **Por qué los dos sujetos.** `plantilla/README.md` (la guía del andamio) no
  viaja, y un destino limpio no dice nada de ella; un andamio limpio no dice nada de
  lo que la herramienta escribe encima. Medido: con el andamio formateado y la
  herramienta sin tocar, los 24 destinos seguían en rojo.
- **Por qué con `--sin-arranque`.** El arranque formatea: con él, el paso mediría
  al formateador y no al andamio.
- **Por qué `--sin-herramientas` alcanza.** Medido una vez con las herramientas
  (el `openspec init` del pin y el render de la constitución): los archivos que
  generan quedan fuera por `.prettierignore` o ya pasan, y los rojos eran los
  mismos tres. El paso no depende de que npm sirva el CLI de OpenSpec.
- **Por qué en `ci.yml` y no en `marco-ci.yml`.** Mide el andamio del marco; en un
  consumidor, el árbol es el del consumidor y el paso no tendría qué medir. Vive
  junto al paso de actionlint del andamio, que ya instancia las formas por la misma
  razón.
- **Por qué en rojo y no en aviso.** No viaja a ningún consumidor: el único afectado
  es quien rompe el formato del andamio en un PR del marco. D1 del PO («una
  compuerta nueva se exige en rojo») aplica sin excepción.

**Descartado:** medir solo `plantilla/` como Rigel (ciego a la mitad del defecto,
medido); correr prettier en el banco de `pruebas/` (dependería de la red: el banco
prueba la orquestación con un `npm` y un `prettier` falsos y el formato real lo
prueba el CI); un subconjunto de combinaciones (el paso completo tarda 22 s
locales, y una forma nueva entra sola solo si se recorren todas).

### D3 — La herramienta escribe con la forma del formateador

- **`jsonParaElArchivo(rel, valor)`** imita las reglas del formateador para JSON
  que estos datos ejercitan: objeto abierto, arreglo en una línea si entra en 100
  columnas **contando la coma que lo sigue**, arreglo abierto si contiene un objeto o
  si son dos o más arreglos u objetos de más de un elemento. Contrastado contra
  prettier 3.9.6 caso por caso, bordes de 100 y 101 columnas incluidos, y contra el
  `.claude/settings.json` real. `package.json` se escribe con `JSON.stringify`
  porque el formateador lo trata con el parser `json-stringify` (también medido).
  Lo usan las tres podas del archivo de valores, la de `.claude/settings.json`, la
  de `package.json`, el asistente (valores, respuestas y desvíos) y la puerta web
  (`projects-puerta.mjs`, cuyo `desvios.json` copia `personalizar.yml` tal cual).
- **`coserCosturas(texto, rel)`** colapsa las corridas de líneas en blanco a una y
  deja un solo salto final, fuera de los bloques de código de markdown, y **solo
  en los archivos que alguna poda cambió**: un archivo intacto ya tiene la forma
  del formateador y reescribirlo arriesga cambiársela.
- **La página de protección** saca las líneas en blanco del principio del bloque de
  la compuerta de producción antes de pegarlo.

**Descartado:** insertar claves sin reserializar, como Rigel (alcanzaba porque
escribía una clave en un archivo; acá son cinco escritores y el asistente arma el
archivo entero); arreglar cada regex de poda para que se coma su línea en blanco
(una docena de regex en cuatro funciones, y cada una tendría que saber qué la
rodea); formatear el destino con prettier desde la herramienta (en el destino
prettier todavía no está instalado; es justo lo que hace el arranque).

### D4 — El markdown que viaja no pone marcadores en tablas ni centinelas pegados

El formateador alinea cada tabla por el ancho de sus celdas: un marcador en una
celda la desalinea al sustituirse, con cualquier ancho fijo, porque el valor lo
elige cada proyecto. Y lee un comentario HTML como bloque propio: un centinela de
poda entre filas de una tabla la parte en pedazos al formatear el andamio, y el
repo nacía con filas convertidas en párrafos (medido). Entonces:

- las carpetas, que son fijas —la herramienta exige que cada `PAQUETE_*` valga su
  carpeta—, se escriben literales en las tablas (`web/src/auth.ts`, `api/`…);
- los dominios, que son libres, salen de la tabla de ambientes a una lista;
- los centinelas de `README-del-proyecto.md` pasan a ser comentarios HTML sueltos,
  con una línea en blanco a cada lado y bloques enteros adentro (una tabla por
  forma en «Estructura», en vez de filas marcadas).

**Descartado:** que la herramienta realinee las tablas después de sustituir
(reimplementar el ancho de prettier, que ya cambió entre versiones: Rigel lo midió
con U+2714); envolver las tablas en `prettier-ignore` (el proyecto heredaría una
zona que ningún formateador vuelve a alinear).

### D5 — El largo máximo del nombre se declara y se mide; lo demás es red

Las líneas de código del esqueleto que llevan el nombre del proyecto se parten en
algún largo: no hay forma estable para cualquier largo (con un nombre de 97
caracteres prettier parte hasta una propiedad de objeto después de los dos
puntos). Se abren `app.ts:28` y `App.test.tsx:44` (objetos abiertos, que prettier
conserva abiertos con cualquier largo que entre) y el log de `server.ts` toma el
nombre de una constante. Medido después: la primera línea que se parte lo hace a
los **70** caracteres (`web/src/App.tsx`, `const NOMBRE_DEL_PROYECTO = "…"`), así
que `LARGO_DE_NOMBRE_MEDIDO = 60` en `projects-init.mjs` deja margen, y es el largo
con el que el paso del CI instancia los valores largos: una línea nueva que se
parta antes lo pone rojo.

Por encima de ese largo —GitHub admite 100— el paso `formateado` del arranque lo
resuelve, y con `--sin-arranque` la herramienta lo **avisa** con `::warning::` y el
comando. Es el único motivo que le queda a ese paso, y por eso se conserva.

**Descartado:** rechazar nombres largos en la validación (la vía web usa el nombre
del repositorio, y rechazarlo rompería `personalizar.yml` por un problema de
formato que tiene arreglo en un comando); reescribir `App.tsx` como objeto para
llegar a 87 caracteres (más código tocado para ganar un margen que ningún nombre
real usa).

### D6 — El formato corre en los dos carriles del andamio

El `ci.yml` del andamio saca `pnpm format:check` de `build_test` a un job `formato`
sin `if:` ni `needs:`, que instala con `--frozen-lockfile --ignore-scripts`, y
`ci-ok` lo exige igual a `success`. El lint se queda en `build_test` porque
necesita el cliente de datos generado. Medido en un destino instalado con
`--ignore-scripts`: `format:check` sale 0 y `lint` sale 1 (ocho errores de tipos
sin resolver).

**Límite conocido, declarado:** un repo nacido por `personalizar.yml` hoy no tiene
lockfile, así que `--frozen-lockfile` falla en `formato` igual que ya fallaba en
`build_test`. No lo introduce este change y lo cierra el lote 23 del porte
(«el-andamio-nace-instalable»), que depende de este.

### D7 — Los caminos «sin paquete» se escriben completos y se atan

`eslint.config.mjs` marca con `// [/FRONT]` el cierre de cada bloque `[FRONT]` —el
de TanStack cierra después del objeto que usa el plugin, que Rigel dejó afuera—, y
la guía del andamio trae los dos caminos con sus seis lugares cada uno, recorridos
hasta `pnpm verificar` en verde en un temporal. La salida de `projects init`
(`CON_LIMPIEZA_MANUAL`) nombra los mismos lugares y remite a la guía.

### D8 — La guía del andamio describe el árbol, atada a él

La sección 4 de `plantilla/README.md` se reescribe como «lo que trae y lo que no»,
con una fila por entrada de la raíz y una columna «Llega» que un banco deriva de
`archivosDelAndamio` por forma y plataforma.

## Clasificación de distribución

| Pieza | Clase | Por qué esa y no otra |
|---|---|---|
| `plantilla/package.json` (pin exacto), `plantilla/.github/workflows/ci.yml` (job `formato`), `plantilla/eslint.config.mjs` (`[/FRONT]`), `plantilla/api/src/app.ts`, `plantilla/api/src/server.ts`, `plantilla/web/src/App.test.tsx`, `plantilla/README-del-proyecto.md`, `plantilla/AGENTS.md` y los archivos solo reformateados | **scaffold** | Son archivos que el proyecto recibe una vez y después son suyos. No pueden ser referenciados: el formato de la portada, el manifiesto y el `ci.yml` del proyecto los decide el proyecto |
| `plantilla/README.md` | **scaffold** (no viaja) | Es la guía del bootstrap: vive en el andamio y se lee desde el marco |
| `herramientas/projects-init.mjs`, `herramientas/projects-puerta.mjs` | **herramienta del marco** | Corren desde el clon del marco y no viajan al proyecto; lo que cambia es lo que escriben |
| Paso «El andamio y lo que el init escribe pasan el formateador» de `.github/workflows/ci.yml` | **CI propio del marco** | Mide el andamio del marco; en un consumidor no habría andamio que medir, así que no puede ser referenciado |
| Delta a `calidad-codigo` | **canónico** | Vive solo en este repo; los proyectos lo cumplen |

No hay nada **regenerado**: no se toca el pin de OpenSpec ni nada que genere su CLI.

## Cómo se cumple solo

| Qué | Check que se pone rojo |
|---|---|
| El andamio y cada destino pasan el formateador, con la versión exacta derivada | Paso «El andamio y lo que el init escribe pasan el formateador» (`.github/workflows/ci.yml`, job `higiene`), con su banco `pruebas/ci-del-marco/formato-del-andamio.test.mjs` |
| Pin exacto y scripts de formato del andamio | `pruebas/andamio/prettier-del-andamio.test.mjs` |
| La herramienta no deja costuras ni reserializa con `JSON.stringify` | `pruebas/init/el-andamio-nace-formateado.test.mjs` (sin red, en la matriz de tres sistemas operativos) |
| Sin marcadores en tablas ni centinelas pegados en el markdown que viaja | `pruebas/andamio/markdown-que-sobrevive-a-la-sustitucion.test.mjs` |
| El formato corre en los dos carriles del andamio | `pruebas/andamio/formato-en-los-dos-carriles.test.mjs` |
| Cada `[FRONT]` tiene su cierre; guía y herramienta nombran los mismos lugares | `pruebas/andamio/caminos-sin-paquete.test.mjs` |
| La sección 4 de la guía describe el árbol | `pruebas/andamio/lo-que-trae-el-andamio.test.mjs` |

**Lo que sigue dependiendo de alguien, declarado:** que los caminos «sin frontend»
y «sin E2E» sigan llegando a verde. El banco ata la lista de lugares y las
cantidades, no corre `pnpm verificar` sobre el camino (necesitaría red e
instalar el árbol). Si el andamio agrega un lugar nuevo que referencia un paquete,
nada lo obliga a sumarse a la lista: es deuda, y se revisa en la revisión
trimestral de divergencia.
