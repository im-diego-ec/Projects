---
artefacto: proposal
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
informado: PO / Builder 2
estado: en-ejecucion
---

# El andamio nace formateado sin depender del arranque

## Por qué

**El repositorio que reparte el marco nacía con su propio formateador en rojo, y lo
tapaba un paso que no siempre corre.** Medido el 2026-09-17 con prettier 3.9.6 —la
versión que declaraba el andamio— sobre el árbol de `main`:

- **15 archivos de `plantilla/` no pasaban `prettier --check`** con la
  configuración del propio andamio (`.projects-valores.json`, `AGENTS.md`, las dos
  portadas, `docs/`, `sitio/wrangler.jsonc`, `web/src/App.tsx`,
  `web/src/App.test.tsx`, la skill `projects-archive-change`, entre otros). Ningún
  CI del marco corría el formateador sobre el andamio.
- **Instanciado con `--sin-arranque`, el repositorio nacía con `format:check` en
  rojo en las 24 combinaciones** de forma (aplicación, sitio), plataforma (aws,
  supabase, ninguna), tipo de cuenta (usuario, organización) y largo de nombres
  (los del ejemplo y unos largos). `--sin-arranque` es la vía de
  `personalizar.yml`, o sea la puerta de quien no programa: ahí nadie formatea
  después.
- Además de los 15 archivos del andamio, **`projects init` desformateaba lo que
  escribía**: reserializaba `.projects-valores.json` con `JSON.stringify`, que parte
  en cuatro líneas el arreglo `superficies` que el formateador quiere en una; las
  podas por forma, plataforma y tipo de cuenta dejaban dos líneas en blanco
  seguidas (o una al final) donde sacaban un bloque; y la página de protección de
  `main` de un sitio salía con una línea en blanco de más.
- **Dos líneas del esqueleto solo entraban en el ancho con el marcador sin
  resolver**: `plantilla/api/src/app.ts:28` (la respuesta de `/api/health`, 79 +
  el largo del nombre) y `plantilla/web/src/App.test.tsx:44` (su doble, 84 + el
  largo). Con un nombre de proyecto de 22 y de 17 caracteres respectivamente, el
  repo instanciado dejaba de pasar. Y el nombre, en la vía no-coder, es el nombre
  del repositorio: arbitrario.
- **El andamio pinaba un rango** (`"prettier": "^3.9.6"`) y no trae lockfile: el
  formateador de cada proyecto dependía del día en que nacía. El mismo 2026-09-17
  un destino instalado con pnpm 11.23.0 resolvió 3.9.7 (publicada el 16; la 3.9.8
  salió ese día y pnpm todavía no la instala), y ninguna medición del marco podía
  afirmar nada sobre esa versión.
- **El formateador del andamio corría solo en el carril completo**:
  `format:check` vivía dentro de `build_test`, que el carril de docs omite, y el
  `.prettierignore` del andamio sí formatea markdown. Un PR de solo documentación
  podía meter una tabla desalineada en `main` en verde.

El arranque lo tapaba con su paso `formateado` (`pnpm format` antes de verificar),
y ese era el problema: **tapaba**. El primer commit de cada proyecto traía
reformateados archivos que publica el marco, y cualquier camino que no pasara por
ese paso —`--sin-arranque`, un arranque que muere antes, la vía web— nacía rojo
por algo que el proyecto no escribió.

**Origen en Rigel.** Rigel pagó las mismas lecciones antes y se portan adaptadas:

- 1.13.0, change archivado `2026-08-31-andamio-con-aplicacion`: el CI del marco
  corre el formateador sobre el andamio (commit 7ceb40e, detectado por el CI de un
  consumidor el 2026-08-31, «9 archivos fallaban `prettier --check`»); la versión
  se **deriva** del manifiesto del andamio y se pina **exacta** (commit 40a7bce:
  medían con 3.6.2 escrito a mano mientras el consumidor resolvía 3.9.6 desde el
  rango, y las dos no formatean igual); el formato sale a un job propio que corre
  en los dos carriles (commit d1c6380: una tabla mal formateada entró a `main` en
  un PR de solo docs y detonó en el PR de otra persona); `init` deja de
  reserializar el archivo de valores (commit c8b4fff, «el control mide el destino,
  no `plantilla/`»); y los bloques `[FRONT]` de `eslint.config.mjs` marcan su
  cierre (commit 1bd6dc0: deducir dónde termina cada bloque rompía el archivo).
- 2.6.0, change `2026-09-13-el-andamio-pasa-su-propia-cadena`, commit 4d0bd19: la
  línea de `/api/health` se abre en varias líneas, porque con un nombre largo no
  entraba en el ancho (detectado por su compuerta el 2026-09-13).
- 2.1.0, change `2026-09-07-el-despliegue-se-hereda`, commit 4ac068c: la guía del
  andamio decía que no traía despliegue ni `infra/`, y los traía.

**Lo que Projects agrega y Rigel no necesitaba**: aquí las podas por forma,
plataforma y tipo de cuenta cambian el texto, así que el sujeto no es solo
`plantilla/` sino **cada destino instanciado**, y aparecen dos clases de defecto
que Rigel no tiene —marcadores dentro de tablas de markdown (el ancho de la celda
cambia al sustituir) y centinelas de poda dentro de tablas y citas (el formateador
parte la tabla)—.

## Qué cambia

1. **El andamio queda formateado** con la versión que declara, y pinada exacta:
   `plantilla/package.json` pasa de `"prettier": "^3.9.6"` a `"prettier": "3.9.6"`.
   Las tablas de las portadas dejan de llevar marcadores (una carpeta fija se
   escribe literal; los dominios van en lista) y los centinelas de poda de
   `README-del-proyecto.md` pasan a ser comentarios HTML sueltos, sin tablas ni
   citas alrededor.
2. **`projects init` escribe con la forma del formateador**: los JSON que deja en
   el proyecto con las reglas del formateador (`jsonParaElArchivo`, `package.json`
   aparte porque el formateador lo trata como `JSON.stringify`), las costuras de
   las podas cosidas (`coserCosturas`) y la página de protección sin la línea de
   más. El paso `formateado` del arranque **se conserva** solo para lo que queda
   afuera: un nombre de proyecto más largo que el medido (`LARGO_DE_NOMBRE_MEDIDO`,
   60). Con `--sin-arranque`, ese caso se **avisa** con el comando.
3. **Las líneas del esqueleto que llevan el nombre del proyecto aguantan su
   largo**: `app.ts` y `App.test.tsx` abren sus objetos, y el log de arranque de
   `server.ts` toma el nombre de una constante. Medido: la primera línea que se
   parte ahora lo hace a los 70 caracteres (`App.tsx`), no a los 17.
4. **El CI del marco corre el formateador** sobre `plantilla/` y sobre el destino
   de cada combinación, con valores cortos y con valores largos, usando la versión
   **derivada** de `plantilla/package.json` y rechazando un rango. Paso nuevo en el
   job `higiene` de `.github/workflows/ci.yml`, con banco propio.
5. **El `ci.yml` del andamio corre el formato en los dos carriles**: job `formato`
   sin condición ni dependencias, que `ci-ok` exige sin aceptarle `skipped`.
6. **`eslint.config.mjs` marca el cierre de cada bloque `[FRONT]`** con
   `// [/FRONT]`, y la guía del andamio trae los caminos «sin frontend» y «sin
   E2E» completos —seis lugares cada uno, recorridos hasta verde—, alineados con lo
   que imprime `projects init` (`CON_LIMPIEZA_MANUAL`).
7. **La guía del andamio deja de mentir sobre lo que trae**: la sección 4 de
   `plantilla/README.md` se reescribe contra el árbol, con un banco que compara cada
   fila con lo que `projects init` reparte por forma y plataforma.

## Impacto en los proyectos consumidores

Hay tres consumidores reales, los tres en `@v1.9.6`
(`im-diego-ec/custodia-bingo`, `im-diego-ec/plantilla-sitio`,
`im-diego-ec/plantilla-aplicacion`).

- **Nada del contrato referenciado cambia.** Ningún workflow reusable, action,
  input, output, permiso ni nombre de check. El paso nuevo vive en el `ci.yml` del
  marco, que no viaja.
- **Todo lo demás es scaffold**: llega solo a los proyectos que nacen después de
  esta versión. Los tres existentes no reciben nada, y **conservan el agujero del
  carril de docs** hasta copiar el job: el requirement modificado se enuncia para lo
  que nace del andamio y lo dice (design D9), y nada del marco lo verifica en ellos.
  El fragmento del CHANGELOG describe qué copiar: el job `formato` con su
  línea en `ci-ok`, el pin exacto de prettier (con `pnpm install` y `pnpm format`),
  las dos líneas abiertas del esqueleto y el `// [/FRONT]` de `eslint.config.mjs`.
- **Un proyecto nuevo tiene un check más**: `formato`. No es un renombrado ni
  cambia `ci-ok`, que sigue siendo el único requerido.
- **La herramienta `projects init`** escribe lo mismo que antes salvo el formato:
  mismos archivos, mismas claves. Con `--sin-arranque`, el aviso ya no dice «sin
  formatear»; dice lo que queda, y agrega uno si el nombre excede el largo medido.

Contrato: **minor** (capacidad nueva compatible, sin endurecer nada que un
consumidor tenga hoy).

## Distribución

- **Scaffold**: `plantilla/` (package.json, ci.yml, eslint.config.mjs, las dos
  portadas, `api/src/app.ts`, `api/src/server.ts`, `web/src/App.test.tsx`, la guía
  del andamio y los archivos que solo se reformatean).
- **Herramienta del marco** (no viaja; corre desde el clon): `projects-init.mjs`.
- **CI propio del marco** (no viaja): el paso nuevo de `.github/workflows/ci.yml`.
- **Canónico**: un delta a `calidad-codigo`.

No hay nada **referenciado** ni **regenerado** en este change.
