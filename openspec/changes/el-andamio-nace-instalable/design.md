# Design — el-andamio-nace-instalable

## Contexto

Rigel cerró estas lecciones con un andamio de una sola forma: versionó **un**
`pnpm-lock.yaml`, escribió `{{PROYECTO}}` en su `ci.yml` y pidió una prueba *hermana* por
cada fuente. Tres cosas que en Projects no se pueden copiar: el andamio se **poda** por
forma y plataforma (no hay un workspace único que un lock pueda describir), los workflows
llegan por la **copia del template** y nadie los puede retocar (no admiten marcadores que
cambian por repositorio), y la compuerta de cobertura decide **por datos** (si un lcov
reclama el archivo), no por nombres. Cada decisión de abajo porta la propiedad y cambia el
mecanismo por uno que encaja.

## Decisiones

### D1 — El lockfile lo deja cada camino, no el andamio

Los caminos de nacimiento son dos: el **arranque** de `projects init` (doble clic o a
mano), cuyo primer paso es `pnpm install` y ya deja el lockfile, y la **vía sin
programas** (`personalizar.yml`), que llama a la herramienta con `--sin-arranque`. El
hueco era solo el segundo, y se cierra ahí: paso «Dejar el lockfile que el primer CI
exige», entre armar el proyecto y copiarlo al repositorio, con
`corepack pnpm install --lockfile-only --ignore-scripts`.

- **Por qué `--lockfile-only --ignore-scripts`**: el job tiene `contents: write` y
  `actions: write`. Con las dos banderas pnpm solo resuelve versiones: no baja el árbol ni
  ejecuta un script de instalación de dependencias que nadie leyó. Lo que se instala de
  verdad lo instala el CI del proyecto, en `build_test`, con `contents: read`. Medido el
  2026-09-17: 2 s por forma, cero `node_modules`, y el `pnpm install --frozen-lockfile`
  siguiente sale 0 en aplicación y en sitio.
- **Por qué el paso verifica el archivo después de pnpm**: un `exit 0` sin
  `pnpm-lock.yaml` —o con uno vacío— guardaría el mismo repo roto que el defecto. Rojo
  con el arreglo escrito, y no se guarda nada (el paso va antes del borrado).
- **Por qué la tercera vía (herramienta a mano con `--sin-arranque`) no cambia**: ya lo
  avisa con el comando (`projects-init.mjs`, «Sin el install no hay lockfile») y, con
  `--repositorio`, se niega a guardar (`dejarElRepositorio` con `listoParaGuardar: false`,
  cubierto por `pruebas/init/el-doble-clic-deja-un-repo.test.mjs:423`). Agregarle red a
  `--sin-arranque` rompería el paso del formateador del CI del marco (24 combinaciones sin
  red) y el banco de `pruebas/init/`, que corre sin red.

**Descartado:** versionar un lockfile en `plantilla/` como Rigel (no coincide con el
workspace podado; haría falta uno por combinación de forma y plataforma, que se pudre en
cuanto una poda cambia); correr el arranque entero en `personalizar.yml` (instalaría y
ejecutaría scripts de dependencias con un token que puede escribir, y convertiría un test
flaky en un proyecto sin personalizar); una bandera nueva en `projects init` para resolver
el lock (la vía sin programas es la única que la usaría, y el paso en el YAML se ve donde
corre).

### D2 — El cliente de datos en el `postinstall`, y la limpieza manual derivada

`plantilla/api/package.json` gana `"postinstall": "{{GENERAR_CLIENTE_DATOS}}"`, el mismo
comando que el script `datos`. Solo viaja con capa de datos porque el paquete `api/` no
llega a un sitio (`noViajanPorForma`), así que la poda por forma ya lo respeta sin código
nuevo.

- **Lo que se conserva**: el paso explícito del CI y el script `datos`. El orden «cliente
  antes del lint» se lee en el pipeline, y un `--ignore-scripts` (el job `formato`, el
  paso del lockfile) saltea el `postinstall` sin avisar.
- **El Dockerfile**: su `pnpm install --filter api...` ahora corre el `postinstall`.
  Medido con docker el 2026-09-17: con la arquitectura que declara (`linux/amd64`,
  emulada en esta máquina arm64) el `RUN pnpm install` termina el install y el
  `postinstall` («✔ Generated Prisma Client») y después node aborta con
  `uv__io_poll: Assertion 'errno == EEXIST' failed` (exit 134) — **idéntico sin el
  `postinstall`**, así que es la emulación y no este cambio. La misma imagen construida
  nativa (`linux/arm64`, solo para medir) completa los 14 pasos con exit 0 y arranca como
  `node`. El `prisma generate` explícito que sigue no cambia.
- **«No corresponde»**: un proyecto con `api/` que no genera cliente tiene que borrar el
  comando de **tres** archivos, y el `postinstall` es el más caro de olvidar (sin comando,
  el primer `pnpm install` sale rojo). `CON_LIMPIEZA_MANUAL.GENERAR_CLIENTE_DATOS` nombraba
  **uno**; ahora los nombra, y un banco deriva los lugares del andamio (cada archivo que
  viaja con el marcador fuera de un comentario) y exige que la salida los nombre.

**Descartado:** un `postinstall` que no falle si el comando no existe (un fail-open
silencioso en el install); generar el cliente en `prepare` (corre también al publicar un
paquete, que este no es).

### D3 — El motor real en la integración, con el nombre del repositorio

`build_test` declara `services.postgres` y `env.DATABASE_URL` a nivel de job, entre los
centinelas `projects:solo-si-hay-datos` (de nivel de job, con cuatro espacios), así que la
poda real de un sitio los saca y la de una aplicación los conserva.

- **La imagen es la del `docker-compose.yml`** (`postgres:16`), no una elegida aparte: el
  banco las compara.
- **El nombre de la base es `${{ github.event.repository.name }}`** en el servicio y en la
  URL. `{{PROYECTO}}` no puede ir en un workflow (`workflows-sin-marcadores-por-repo`), y
  ese banco declara el nombre del repositorio como su equivalente. En los dos caminos el
  repositorio se llama como el proyecto: la puerta deriva `PROYECTO` del nombre del
  repositorio (en minúsculas) y el doble clic crea el repositorio con `PROYECTO`. Si el
  repositorio tiene mayúsculas, la base de la integración las conserva y la del local no:
  no rompe nada, porque cada entorno compara su servicio con su conexión.
- **Medido contra Postgres 16 real** (contenedor local, 2026-09-17): con `DATABASE_URL`
  a nivel de proceso la suite del API da 53/53, `prisma migrate deploy` sale 0 («No
  migration found») y una consulta real devuelve la base nombrada. Y el motivo de la
  unicidad, medido: `prisma migrate deploy` contra una base que no existe **la crea en
  silencio** y sale 0.

**Descartado:** un literal fijo (`integracion`) en los dos lados (cumple la coincidencia
interna pero deja de ser «la base del proyecto», y cada copia del template tendría la
misma); `{{PROYECTO}}` como Rigel (prohibido en workflows, por un límite de GitHub y no de
estilo); agregar un paso `prisma migrate deploy` al CI del andamio (el andamio no trae
migraciones y el comando es del ORM elegido: lo agrega el proyecto con su primer modelo;
queda como deuda declarada, ver «Cómo se cumple solo»).

### D4 — Una sola base por descubrimiento

El banco de acoples barre el andamio buscando `postgres://`, `postgresql://` o
`POSTGRES_DB:`/`=` y exige que cada archivo esté en `SITIOS_DE_LA_BASE` (comparado) o en
`NO_SITIOS_DE_LA_BASE` (con motivo), y que ninguna declaración quede muerta. Hoy: tres
sitios (compose, `.env.example`, `ci.yml`) y un no-sitio (la URL de relleno de
`prisma.test.ts`).

### D5 — vitest 5 como par, con un solo rango

`vitest` y `@vitest/coverage-v8` pasan a `^5.0.1` en `api`, `web` y `sitio`. El piso es la
versión medida (5.0.1 era la última el 2026-09-17), no la 5.0.0: un piso por debajo de lo
medido es exactamente lo que tenía el sitio (`^4.0.18` contra `^4.1.11`). vitest 5.0.0
declara el peer `"@vitest/coverage-v8": "5.0.0"`, exacto, y por eso el banco exige el mismo
rango en los dos y en todos los paquetes.

- **Medido en las dos formas** (aplicación con Supabase y sitio sin plataforma, pnpm
  11.23.0): `pnpm verificar` sale 0; 53/53 en `api`, 28/28 en `web`, 2/2 en `sitio` con
  astro 7.3.3; el lcov trae los 7 fuentes de `api/src`, los 3 de `web/src` y el de
  `sitio/src/lib`.
- **`include` sigue sosteniendo el total en la 5**: un `web/src/huerfano.ts` sin prueba
  entra al lcov en 0% y baja las líneas de 100% a 98,76%. El umbral sigue vivo: con
  `MINIMO_DEL_MARCO` en 99 el API sale 1. La tabla `text` de la 5 oculta las filas al
  100% —la de `web` directamente no imprime «All files»—: decide el lcov.
- **El comentario de `vitest.config.base.mjs` conserva el literal `all: true`**, porque
  el paso de `marco-ci.yml` que lo exige todavía no se cambió (lo cambia el lote 5 del
  porte, en otro carril).

**Descartado:** `^5.0.0` como Rigel (piso por debajo de lo medido); subir solo `api` y
`web` (el sitio comparte `vitest.config.base.mjs`).

### D6 — Fuentes cubribles, adaptado a la compuerta por datos

El banco clasifica cada fuente del andamio con la lectura de manifiestos del censo
(`leerPaquetes`, `paqueteDe`), que es la misma que usa la compuerta:

1. excluido con motivo → listo; una exclusión sin archivo o sin motivo es roja;
2. dentro del alcance de cobertura (el `include`/`exclude` de `coberturaDelMarco()`,
   leído de la función y no copiado) de un paquete que mide cobertura → alguna prueba del
   paquete lo tiene que importar (un `import type` y una prueba vacía no cuentan);
3. fuera del alcance → se le pregunta a `medir-cobertura-diff.mjs` corriendo de verdad,
   con el contenido real como línea agregada y sin exclusiones.

Más un contador anti-vacuidad: al menos un archivo llega a la compuerta real y cada
paquete que mide cobertura aporta al menos un fuente importado.

**El rojo que dio, contra el árbol de antes**: `sitio/astro.config.mjs` y
`sitio/vitest.config.ts`, rojos en la compuerta real (y, medido aparte, en el censo de
fuentes de un sitio recién nacido: exit 1). Se declaran en `sitio/package.json` con su
motivo, igual que `api/` y `web/` declaran los suyos.

**Lo que el árbol contradijo del plan**: el catálogo suponía que `requestId.ts` saldría
rojo por no tener prueba. No: `errorHandler.test.ts` lo importa como utilería, así que con
la regla «alguna prueba lo importa» ya estaba cubierto. Su prueba propia entra igual
(D7), por lo que promete y no por el banco.

**Descartado:** la prueba *hermana* de Rigel (la compuerta no mira nombres); un piso alto
de archivos evaluados (se achica legítimamente con cada exclusión y obligaría a editar el
control para que pase).

### D7 — La prueba de `requestId`, portada

Cinco casos (el trace del balanceador, el header de respuesta, el contexto de log leído
desde el handler, el id local y que dos requests locales no compartan id). Medido con
sabotajes sobre un andamio instalado: sacar el header → 2 rojos; sacar el contexto → 2
rojos; ignorar el trace del balanceador → 3 rojos.

## Clasificación de distribución

| Pieza | Clase | Por qué esa y no otra |
|---|---|---|
| `plantilla/api/package.json` (`postinstall`, vitest 5), `plantilla/web/package.json`, `plantilla/sitio/package.json` (vitest 5, exclusiones), `plantilla/.github/workflows/ci.yml` (servicio y conexión), `plantilla/api/src/middleware/requestId.test.ts`, `plantilla/vitest.config.base.mjs`, `plantilla/comandos-levantar-servicios.txt` | **scaffold** | El proyecto los recibe una vez y después son suyos: el stack, el pipeline y las pruebas del proyecto los decide el proyecto |
| `plantilla/README.md` | **scaffold** (no viaja) | La guía del andamio: se lee desde el marco |
| `herramientas/plantilla-repos/personalizar.yml` | **scaffold del molde** | Vive en los repos plantilla y se regenera desde acá; no puede ser referenciado porque el `GITHUB_TOKEN` no puede escribir workflows |
| `herramientas/projects-init.mjs` (`CON_LIMPIEZA_MANUAL`) | **herramienta del marco** | Corre desde el clon y no viaja |
| Los bancos nuevos y los ampliados | **CI propio del marco** | Miden el andamio del marco; en un consumidor no hay andamio que medir |
| Delta a `calidad-codigo` | **canónico** | Vive solo en este repo; los proyectos lo cumplen |

No hay nada **referenciado** ni **regenerado**: no cambia ningún workflow reusable, ninguna
action ni el pin de OpenSpec.

## Cómo se cumple solo

| Qué | Check que se pone rojo |
|---|---|
| `personalizar.yml` deja el lockfile, sin ejecutar dependencias, y lo guarda | `pruebas/andamio/todo-camino-deja-el-lockfile.test.mjs` (extrae y corre el paso con un `corepack` falso en sus cuatro caminos; corre la copia real y le pregunta a git por el `.gitignore`) |
| El `postinstall` genera con el mismo comando que `datos` | `pruebas/andamio/manifiestos.test.mjs`, con dos mutaciones |
| La salida de «sin cliente de datos» nombra cada lugar | `pruebas/andamio/caminos-sin-paquete.test.mjs` (lugares derivados del andamio) |
| El motor real en la integración, misma imagen, healthcheck, misma base, solo con datos | `pruebas/andamio/acoples-del-andamio.test.mjs` §2b, con seis mutaciones y la poda real |
| Todo lugar que nombra una base está declarado | `pruebas/andamio/acoples-del-andamio.test.mjs` §2c |
| El par vitest/proveedor, un solo rango | `pruebas/andamio/manifiestos.test.mjs`, con tres mutaciones |
| Ningún fuente del andamio enrojece la compuerta | `pruebas/andamio/fuentes-cubribles.test.mjs` |

**Lo que sigue dependiendo de alguien, declarado:**

- **Regenerar los dos repos plantilla.** Mientras `im-diego-ec/plantilla-sitio` y
  `im-diego-ec/plantilla-aplicacion` sigan con el `personalizar.yml` de la 1.9.6, la vía
  sin programas sigue naciendo sin lockfile. Nada del marco lo detecta hoy; el banco de
  «las plantillas no quedan atrás» (change `las-plantillas-no-quedan-atras`, otro carril)
  es el lugar natural para medirlo.
- **Ninguna prueba del andamio se conecta a la base.** El servicio queda disponible y
  medido, pero el andamio no trae modelos ni migraciones: la primera prueba contra el motor
  y el `migrate deploy` en la integración los agrega el proyecto con su primer modelo.
- **Nada del marco corre la cadena del andamio instalado.** Que vitest 5, el `postinstall`
  y el servicio funcionen está medido en esta sesión (tareas), no en el CI del marco, que
  no instala el andamio. Rigel tiene un corredor para eso (`andamio-pasa-su-cadena`); no
  se porta acá.
