---
artefacto: proposal
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
informado: PO / Builder 2
estado: en-ejecucion
---

# El andamio nace instalable, y todo camino de nacimiento lo deja así

## Por qué

**La vía de quien no programa producía un repositorio que su propio CI no podía
instalar.** Medido el 2026-09-17 sobre el árbol de `main` más los lotes 0b y 22:

- `personalizar.yml` —la puerta sin programas de los repositorios plantilla— arma el
  proyecto con `projects-init.mjs --sin-arranque`, vacía el repositorio, copia el
  proyecto y lo guarda. Nadie corre `pnpm install`, así que **se guarda sin
  `pnpm-lock.yaml`**. Una aplicación instanciada así: `ls pnpm-lock.yaml` → no existe,
  y `CI=true pnpm install --frozen-lockfile` → `ERR_PNPM_NO_LOCKFILE`, exit 1. El
  `ci.yml` del andamio instala así en sus dos jobs (`formato` y `build_test`): el
  **primer push de cada proyecto nacido por esa vía moría en el primer paso que
  instala**, por algo que la persona no escribió y que sin una terminal no puede
  arreglar.
- **Quien clonaba y corría `pnpm install && pnpm lint` veía 8 errores que no eran
  suyos** (`no-unsafe-*` sobre `$queryRaw` y `$disconnect`) y `pnpm typecheck` un
  `TS2305` («`@prisma/client` has no exported member `PrismaClient`»): el cliente de
  datos solo lo generaba un paso explícito (`pnpm datos`, el arranque y el CI). La
  trampa estaba escrita en prosa (`docs/05-arrancar-tecnico.md`, «ojo con el orden»),
  que AGENTS.md no acepta como cierre de lo que puede ser mecanismo.
- **Un sitio nacía ROJO en el censo de fuentes.** Medido con `censo-fuentes.mjs` sobre
  un sitio recién instanciado e instalado: exit 1, `sitio/astro.config.mjs` y
  `sitio/vitest.config.ts` fuera del alcance (el analizador los ignora por
  `**/*.config.*` y `sitio/tsconfig.json` los deja afuera a propósito), sin exclusión
  declarada. Los mismos dos archivos ponen roja la compuerta de cobertura el día que un
  PR los toca (ningún reporte los reclama). Ningún banco del marco le preguntaba a la
  compuerta real por los archivos del andamio.
- **La integración corría con la capa de datos doblada.** El andamio reparte Postgres en
  el `docker-compose.yml` del local y nada en el CI: ninguna prueba del proyecto podía
  ejercer el motor real ni sus migraciones. Y el nombre de la base se comparaba en dos
  lugares escritos a mano, sin nada que cazara un tercero.
- **El corredor de pruebas iba desparejo y atrasado.** `api` y `web` declaraban
  `vitest ^4.1.11`, el sitio `^4.0.18` —un piso por debajo—, y ningún banco exigía que
  `@vitest/coverage-v8` fuera del mismo rango que `vitest`, que exige su proveedor en la
  misma versión exacta.
- **El `CHANGELOG.md` de la 1.7.0 afirma que `middleware/requestId.ts` entró «con su
  prueba»** (`CHANGELOG.md:2264-2266`), y no tenía prueba propia: se ejercía de rebote
  desde `app.test.ts` y como utilería de `errorHandler.test.ts`.

**Origen en Rigel.** Las mismas lecciones, pagadas antes y portadas adaptadas:

- 2.6.0, change archivado `2026-09-13-el-andamio-pasa-su-propia-cadena`, commit
  4d0bd19 (issue #458, medido el 2026-09-13): `ERR_PNPM_NO_LOCKFILE` en el primer push
  y los 8 errores de `pnpm lint` recién clonado. Rigel versiona **un** lockfile en el
  andamio y genera el cliente en el `postinstall`.
- 2.6.0, commit fabe1e6 (issue #62, 2026-08-23): vitest de la 2 a la 5 como par
  coherente, después de que Dependabot abriera dos PRs incompatibles entre sí.
- 1.13.0, change archivado `2026-08-31-andamio-con-aplicacion`, commits 1bd6dc0 (el par
  `vitest`/`@vitest/coverage-v8` con banco), f6fc798 y 8b25cb3 (la prueba de
  `requestId` que un consumidor de Rigel tuvo que escribir a mano, y el control de que
  ningún fuente del andamio enrojece la compuerta, 2026-08-31).
- 1.9.0, change archivado `2026-08-29-pruebas-contra-base-real`, commits 4bf260e y
  755207b (2026-08-28, segundo consumidor: 51 pruebas verdes con dobles, tres defectos
  que Postgres mostró en la primera corrida).
- 2.4.0, commit b7d3201 (issue #64): el banco de «una sola base» descubre los lugares en
  vez de listarlos, después de dar 601/601 en verde con un quinto lugar desalineado.

**Lo que Projects no puede traer tal cual.** El andamio de Projects se **poda** por forma
y plataforma: un único lockfile versionado no coincide con el workspace de todas las
formas, y `--frozen-lockfile` falla cuando los importers no coinciden. Se porta la
**propiedad** —ningún camino guarda el repositorio sin su lockfile—, no el archivo. Y un
workflow del andamio **no puede** llevar `{{PROYECTO}}`: llega por la copia del template
y el `GITHUB_TOKEN` no lo puede retocar después, así que el nombre de la base en la
integración sale del contexto del repositorio.

## Qué cambia

1. **`personalizar.yml` deja el lockfile.** Paso nuevo entre «Armar el proyecto» y la
   copia: `corepack pnpm install --lockfile-only --ignore-scripts` en el proyecto recién
   armado, que resuelve versiones **sin ejecutar código de dependencias** en un job cuyo
   token puede escribir; si pnpm falla o no deja el archivo, el paso sale rojo con el
   arreglo escrito y **no se guarda nada**.
2. **El cliente de datos nace con el install**: `plantilla/api/package.json` gana
   `"postinstall": "{{GENERAR_CLIENTE_DATOS}}"`. Viaja solo con la forma que tiene capa
   de datos (el paquete `api/` no llega a un sitio). La salida de `projects init` para
   el caso «el proyecto no genera cliente de datos» pasa a nombrar los **tres archivos**
   donde viaja el comando —antes nombraba uno—, derivados del andamio por un banco.
3. **La integración levanta el motor de datos real**: el job `build_test` del `ci.yml`
   del andamio declara `services.postgres` con la **misma imagen** que el
   `docker-compose.yml`, healthcheck `pg_isready`, y `DATABASE_URL` a nivel de job. La
   base se llama como el repositorio (`${{ github.event.repository.name }}`), en el
   servicio y en la conexión. Todo va entre los centinelas `projects:solo-si-hay-datos`:
   un sitio no hereda un servicio inútil.
4. **Una sola base, por descubrimiento**: el banco barre el andamio buscando todo lo
   que tenga forma de nombre de base y exige que cada archivo esté declarado como sitio
   comparado o con su motivo.
5. **vitest y `@vitest/coverage-v8` pasan a `^5.0.1` como par**, en `api`, `web` y
   `sitio`, con un banco que exige el mismo rango en cada paquete y en todo el andamio.
6. **`plantilla/api/src/middleware/requestId.test.ts`**, con cinco casos: el trace del
   balanceador, el header de respuesta, el contexto de log, el id local y que dos
   requests locales no compartan id.
7. **Ningún fuente del andamio enrojece la compuerta de cobertura**: banco nuevo que
   clasifica cada fuente con la misma lectura de manifiestos que usa la compuerta
   —excluido con motivo, dentro del alcance e importado por alguna prueba, o fuera del
   alcance y juzgado por `medir-cobertura-diff.mjs` corriendo de verdad—, con exclusiones
   muertas en rojo y un contador anti-vacuidad. El sitio declara las dos exclusiones que
   le faltaban.

## Impacto en los proyectos consumidores

Hay tres consumidores reales, los tres en `@v1.9.6` (`im-diego-ec/custodia-bingo`,
`im-diego-ec/plantilla-sitio`, `im-diego-ec/plantilla-aplicacion`).

- **Nada del contrato referenciado cambia**: ningún workflow reusable, action, input,
  output, permiso ni nombre de check.
- **Todo lo demás es scaffold** y llega a los proyectos que nacen después. Los
  existentes no reciben nada solos; el fragmento del CHANGELOG da lo que cada uno puede
  copiar.
- **Los dos repositorios plantilla son el caso que más importa**: su `personalizar.yml`
  es el de la 1.9.6, sin el paso del lockfile, y hasta que se **regeneren** desde el
  marco cada proyecto que nazca por la vía sin programas lo hace sin lockfile. La
  regeneración es un acto de mantenimiento del marco sobre repos consumidores y no se
  hace desde esta sesión: queda como pendiente declarado.
- **Un sitio que ya nació** (como `plantilla-sitio`) tiene el censo de fuentes en rojo
  por los dos archivos de configuración: el arreglo son dos exclusiones en
  `sitio/package.json`, escritas en el fragmento.
- **Una aplicación nueva tiene un servicio de Postgres en `build_test`**. No es un check
  nuevo ni un renombrado: `ci-ok` sigue siendo el único requerido.

Contrato: **minor** (capacidad nueva compatible; ningún repo que hoy pasa empieza a
fallar por esta versión).

## Distribución

- **Scaffold**: `plantilla/api/package.json`, `plantilla/web/package.json`,
  `plantilla/sitio/package.json`, `plantilla/.github/workflows/ci.yml`,
  `plantilla/api/src/middleware/requestId.test.ts`, `plantilla/vitest.config.base.mjs`
  (comentario), `plantilla/comandos-levantar-servicios.txt`, y la guía del andamio
  (`plantilla/README.md`, no viaja).
- **Scaffold del molde**: `herramientas/plantilla-repos/personalizar.yml`, que vive en
  los repos plantilla y se regenera desde acá.
- **Herramienta del marco** (no viaja): `herramientas/projects-init.mjs`
  (`CON_LIMPIEZA_MANUAL`).
- **Canónico**: un delta a `calidad-codigo`.

No hay nada **referenciado** ni **regenerado** en este change.
