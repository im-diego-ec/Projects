---
artefacto: tasks
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: en-ejecucion
---

# Tasks — el-andamio-nace-instalable

Todas las mediciones son del 2026-09-17, en el worktree del lote, con Node 24.19.0,
pnpm 11.23.0 por corepack, prettier 3.9.6 instalado aparte, docker 29.5.2 y actionlint
1.7.12 (bajado del release oficial con su suma verificada, sin shellcheck). `$S` es el
directorio de mediciones de la sesión; `instanciar.sh` corre
`projects-init.mjs --sin-herramientas --sin-arranque` con los valores de `--ejemplo`
cambiados a `forma`/`plataforma` (aplicación + supabase, sitio + ninguna) y
`TIPO_CUENTA: usuario`.

## 1. El rojo, antes del arreglo

- [x] 1.1 La vía sin programas guarda el proyecto sin lockfile. **Evidencia**, sobre una
      aplicación instanciada con `--sin-arranque`:
      ```
      $ ls pnpm-lock.yaml
      ls: pnpm-lock.yaml: No such file or directory
      $ CI=true corepack pnpm install --frozen-lockfile
      [ERR_PNPM_NO_LOCKFILE] Cannot install with "frozen-lockfile" because pnpm-lock.yaml is absent
      exit=1
      ```
- [x] 1.2 Sin generar el cliente, `pnpm install && pnpm lint` sale rojo. **Evidencia**
      (aplicación instalada, sin `pnpm datos`): `pnpm lint` → `✖ 8 problems (8 errors, 0 warnings)`,
      exit 1 (`no-unsafe-*` sobre `$queryRaw` y `$disconnect`); `cd api && pnpm typecheck` →
      `src/lib/prisma.ts(1,15): error TS2305: Module '"@prisma/client"' has no exported member 'PrismaClient'`, exit 1.
- [x] 1.3 Un sitio recién nacido tiene el censo de fuentes en rojo. **Evidencia**: sitio
      instanciado, instalado y commiteado; `node actions/censo-fuentes/censo-fuentes.mjs` →
      `2 archivo(s) fuera del alcance` (`sitio/astro.config.mjs`, `sitio/vitest.config.ts`),
      exit 1. La aplicación, en cambio, exit 0 (30 fuentes, 8 exclusiones).
- [x] 1.4 Los bancos nuevos y ampliados, escritos antes de cada arreglo y corridos contra
      el árbol sin él. **Evidencia**, `node --test --test-reporter=tap`:
      `pruebas/andamio/todo-camino-deja-el-lockfile.test.mjs` → `# fail 5` (el paso no existía);
      `pruebas/andamio/manifiestos.test.mjs` → `# fail 2` («los paquetes declaran vitest con
      rangos distintos (api, web: ^4.1.11; sitio: ^4.0.18)» y «"api" no declara postinstall»);
      `pruebas/andamio/caminos-sin-paquete.test.mjs` → `# fail 1` (faltan `api/package.json` y
      `package.json`); `pruebas/andamio/acoples-del-andamio.test.mjs` → `# fail 3` (sin
      servicio de datos, y `ci.yml` sin declarar); `pruebas/andamio/fuentes-cubribles.test.mjs`
      → `# fail 1`: la compuerta real sale exit 1 sobre `sitio/astro.config.mjs` («1 archivo(s)
      fuente del cambio (4 linea(s) agregadas) no los reclama ningun reporte de cobertura») y
      sobre `sitio/vitest.config.ts` (6 líneas).
- [x] 1.5 Lo que el plan suponía y el árbol contradijo. **Evidencia**: la clasificación del
      banco de fuentes pone `api/src/middleware/requestId.ts` entre los importados por una
      prueba: `api/src/middleware/errorHandler.test.ts:6` hace
      `import { requestId } from "./requestId.js"`. El rojo esperado por el catálogo para ese
      archivo no existe con la regla «alguna prueba lo importa»; su prueba propia entra por
      la 5.1, no por el banco.

## 2. Todo camino deja el lockfile

- [x] 2.1 Paso «Dejar el lockfile que el primer CI exige» en
      `herramientas/plantilla-repos/personalizar.yml:139`, entre «Armar el proyecto» y la
      copia: `corepack pnpm install --lockfile-only --ignore-scripts` (`:164`) y rojo si el
      archivo no queda o queda vacío (`:168`). **Evidencia**:
      `pruebas/andamio/todo-camino-deja-el-lockfile.test.mjs` → `# pass 7`.
- [x] 2.2 El paso real, extraído del YAML y corrido con corepack de verdad. **Evidencia**:
      aplicación → `pnpm-lock.yaml resuelto: 5422 lineas`, exit 0; sitio → `4756 lineas`, exit 0;
      en los dos, sin `node_modules`, y el `CI=true pnpm install --frozen-lockfile` siguiente
      → exit 0.
- [x] 2.3 El banco muerde el `.gitignore`: sacar `!/pnpm-lock.yaml` de `plantilla/.gitignore`
      → `not ok 6 - la copia lleva el lockfile al repositorio y el .gitignore del andamio deja
      guardarlo`; restaurado con `git checkout`.
- [x] 2.4 El camino de la herramienta sin arranque no guarda: ya lo cubría
      `pruebas/init/el-doble-clic-deja-un-repo.test.mjs:423-439` (`listoParaGuardar: false`
      → sin commit, sin llamadas a `gh`, `::warning::el primer guardado NO se hizo`).
- [x] 2.5 `actionlint` sobre `personalizar.yml` (forma `aplicacion`) → exit 0.

## 3. El cliente de datos nace con el install

- [x] 3.1 `plantilla/api/package.json:9` → `"postinstall": "{{GENERAR_CLIENTE_DATOS}}"`.
      **Evidencia**: `pruebas/andamio/manifiestos.test.mjs` → `# pass 11`, con las mutaciones
      «el paquete de datos pierde el postinstall» y «el postinstall genera con un comando
      distinto» en rojo.
- [x] 3.2 Medido sobre una aplicación nueva (lockfile del paso 2, install con scripts, sin
      `pnpm datos`): `api postinstall$ prisma generate` en el log del install;
      `pnpm lint` → exit 0; `cd api && pnpm typecheck` → exit 0.
- [x] 3.3 `CON_LIMPIEZA_MANUAL.GENERAR_CLIENTE_DATOS` nombra los tres archivos
      (`herramientas/projects-init.mjs:1447`). **Evidencia**:
      `pruebas/andamio/caminos-sin-paquete.test.mjs:196` → verde;
      `pruebas/init/projects-init.test.mjs` → verde.
- [x] 3.4 El Dockerfile con el `postinstall`. **Evidencia**: `docker build -f api/Dockerfile .`
      (amd64 emulado) → el install termina con `api postinstall: ✔ Generated Prisma Client` y
      node aborta después con `uv__io_poll: Assertion 'errno == EEXIST' failed`, exit 134;
      **sin** el `postinstall`, el mismo exit 134 en el mismo punto (la emulación, no el
      cambio). Con el `FROM` cambiado a `linux/arm64` solo para medir: 14/14 pasos, exit 0,
      `docker run --rm <imagen> id -un` → `node`.
- [x] 3.5 La prosa: `plantilla/README.md` (celda «Si no existe» y el párrafo del
      `postinstall`), `README.md` (fila del marcador), `plantilla/comandos-levantar-servicios.txt`
      (paso 0), `docs/05-arrancar-tecnico.md` (nota de la 4.1 y la tabla de fallos
      silenciosos) y el comentario del paso del cliente en `plantilla/.github/workflows/ci.yml:288-291`,
      dentro de los centinelas de datos.

## 4. La integración levanta el motor de datos real

- [x] 4.1 `services.postgres` y `env.DATABASE_URL` en `build_test`
      (`plantilla/.github/workflows/ci.yml:190-238`), entre centinelas de nivel de job;
      imagen `postgres:16` (`:219`), healthcheck (`:230`), base
      `${{ github.event.repository.name }}` en el servicio (`:223`) y en la URL (`:237`).
      **Evidencia**: `pruebas/andamio/acoples-del-andamio.test.mjs:363` verde y `:367` con sus
      seis mutaciones en rojo.
- [x] 4.2 La poda real: una aplicación conserva el servicio y un sitio no lo recibe.
      **Evidencia**: el mismo banco llama a `podarPorForma`; en los destinos instanciados,
      `grep -c "services:" .github/workflows/ci.yml` → 1 en la aplicación, 0 en el sitio;
      `actionlint` → exit 0 en las dos formas.
- [x] 4.3 Contra Postgres 16 real (contenedor local `postgres:16` con `pg_isready`, base
      `people-agenda`), con `DATABASE_URL` en el entorno del proceso: install → exit 0; suite
      del API → `Tests 53 passed (53)`; `prisma migrate deploy` → `No migration found in
      prisma/migrations`, exit 0; una consulta real con `getPrisma()` →
      `[{"base":"people-agenda"}]`.
- [x] 4.4 El motivo de la unicidad, medido: `prisma migrate deploy` con la URL apuntando a
      `otra_base` → `PostgreSQL database otra_base created at localhost:55432`, exit 0, y
      `pg_database` lista las dos bases.
- [x] 4.5 Descubrimiento de lugares: `SITIOS_DE_LA_BASE` y `NO_SITIOS_DE_LA_BASE` en
      `pruebas/andamio/acoples-del-andamio.test.mjs:398-465`. **Evidencia**: `:452` verde y
      `:456` en rojo con un `api/scripts/humo.ts` que nombra otra base.

## 5. Las pruebas del andamio

- [x] 5.1 `plantilla/api/src/middleware/requestId.test.ts` con cinco casos. **Evidencia**:
      `vitest run src/middleware/requestId.test.ts` → `5 passed`; sin `res.setHeader` →
      `2 failed | 3 passed`; sin `contextoLog.run` → `2 failed | 3 passed`; ignorando
      `x-amzn-trace-id` → `3 failed | 2 passed`.
- [x] 5.2 vitest y `@vitest/coverage-v8` a `^5.0.1` en `api` (`plantilla/api/package.json:30,35`),
      `web` (`plantilla/web/package.json:25,30`) y `sitio` (`plantilla/sitio/package.json:22-23`).
      **Evidencia**: instalado `vitest@5.0.1` y `@vitest+coverage-v8@5.0.1`; `pnpm verificar` →
      exit 0 en la aplicación (`api` 53/53, `web` 28/28) y en el sitio (2/2, astro 7.3.3); lcov
      con 7 `SF:` en `api`, 3 en `web`, 1 en `sitio`.
- [x] 5.3 `include` en la 5 y el umbral vivo. **Evidencia**: `web/src/huerfano.ts` sin prueba
      → 4 `SF:` en el lcov, `FNH:0`, líneas del paquete 98,76%; `MINIMO_DEL_MARCO = 99` →
      `ERROR: Coverage for functions (89.47%) does not meet global threshold (99%)` (y
      statements y branches), exit 1. Escrito en `plantilla/vitest.config.base.mjs:100`,
      conservando el literal `all: true` que exige el paso de `marco-ci.yml` (lo cambia el lote 5).
- [x] 5.4 El par con banco: `pruebas/andamio/manifiestos.test.mjs:283`, con tres mutaciones
      (pin exacto contra rango, proveedor ausente, piso distinto del sitio) en rojo.
- [x] 5.5 Fuentes cubribles: `pruebas/andamio/fuentes-cubribles.test.mjs` y las dos
      exclusiones de `plantilla/sitio/package.json:30,34`. **Evidencia**: `# pass 6`; el
      censo sobre un sitio nuevo → `los 7 archivos fuente están dentro del alcance (5
      exclusión(es) declarada(s) con motivo)`, exit 0; la aplicación → 31 fuentes, exit 0.
- [x] 5.6 La compuerta de cobertura en su peor caso (todo el árbol como líneas agregadas,
      con el lcov de vitest 5). **Evidencia**: aplicación → `porcentaje=100.00`,
      `lineas_medidas=230`, `paquetes_en_rojo=0`, exit 0; sitio → `porcentaje=100.00`, exit 0.

## 6. Lo que el cambio movió en otros bancos

- [x] 6.1 `openspec/cobertura-de-requirements.md`: las anclas a
      `plantilla/.github/workflows/ci.yml` y a `pruebas/andamio/acoples-del-andamio.test.mjs`
      se corrieron por los bloques nuevos; se remapearon por contenido (`:252`→`:305`,
      `:308`→`:361`, `:400`→`:453`, `:504`→`:557`; `:305`→`:516`, `:388`→`:599`,
      `:542`→`:753`, `:669`→`:880`). **Evidencia**: `pruebas/docs/cobertura-de-requirements.test.mjs`
      → `# pass 13` (antes, `not ok 684` y `not ok 691` con «cae sobre una linea vacia o de comentario»).
      **Corrección (revisión adversarial, RV-H5)**: el `:504`→`:557` fue un error. El `:504`
      ya estaba viejo después del lote 22 (el paso «Verificar cada paquete» estaba en la
      550) y la 557 cae dentro de otro paso, en un `problema(`; el paso está en la 603. El
      remapeo por contenido no se hizo para esa ancla, y el banco no lo vio porque solo
      exige que la línea no esté vacía ni sea un comentario. Corregida en la 9.2.
- [x] 6.2 `docs/05-arrancar-tecnico.md:569`: `api/` pasa de **48** a **53 pruebas** (la de
      `requestId` suma cinco) y deja de nombrar `asyncHandler.ts`, que no existe desde el paso
      a Express 5. **Evidencia**: `pruebas/docs/pruebas-del-andamio.test.mjs` → `# pass 3`.
- [x] 6.3 El mensaje de `pruebas/andamio/manifiestos.test.mjs` que decía «se pierden el
      `all: true`» nombra el `include`.

## 7. Verificación del lote

- [x] 7.1 Formato: `cd plantilla && prettier@3.9.6 --check .` → `All matched files use
      Prettier code style!`; el paso del CI del marco «El andamio y lo que el init escribe
      pasan el formateador», extraído y corrido local → `24 destino(s) nacen formateados`, exit 0.
- [x] 7.2 Banco completo y `openspec validate --all --strict`: ver el mensaje del commit.

## 8. Lo que queda afuera, con su motivo

- [ ] 8.1 Regenerar `im-diego-ec/plantilla-sitio` e `im-diego-ec/plantilla-aplicacion`
      con este `personalizar.yml`. **Motivo**: son repos consumidores y esta sesión no escribe
      en ellos (regla de AGENTS.md); hasta entonces la vía sin programas sigue naciendo sin
      lockfile.
- [ ] 8.2 Corregir `CHANGELOG.md:2264-2266` (la 1.7.0 dice que `requestId.ts` entró «con su
      prueba»). **Motivo**: el porte no edita `CHANGELOG.md`; la fe de erratas va en el
      fragmento `.porte/changelog/23-el-andamio-nace-instalable.md` y la línea se corrige al
      integrar.
- [ ] 8.3 Ver el servicio de Postgres y el paso del lockfile en un runner real. **Motivo**:
      esta sesión no empuja ni dispara workflows; lo medido es el script extraído, actionlint
      y un Postgres local.
- [ ] 8.4 Las filas de los cinco requirements ADDED en `openspec/cobertura-de-requirements.md`
      y la revisión adversarial. **Motivo**: van en la pasada de archive, como en los lotes
      anteriores del carril.
- [ ] 8.5 La imagen `postgres:16` del servicio de `build_test` (y la del
      `docker-compose.yml`, que el banco exige igual): OK humano para meter una imagen de
      terceros en la integración que el andamio reparte, y decidir si se pina por digest
      (RV-H3). **Motivo**: AGENTS.md lo pone en «Pregunta primero», y pinarla tiene un costo
      que no se resuelve desde un lote —el Dependabot del andamio no actualiza ni el
      `docker-compose.yml` ni los `services:` de un workflow, así que el digest quedaría
      congelado sin parches—; ver design D3. La misma decisión alcanza al paso «Pines de
      actions de terceros por SHA» del CI del marco, que no mira imágenes.

## 9. Revisión adversarial del carril: lo que cazó y cómo se cerró

- [x] 9.1 Los requirements del cliente generado y del motor real afirmaban de «un
      repositorio nacido del andamio» algo que los tres consumidores en `@v1.9.6` no
      cumplen, y el fragmento lo presentaba como opcional (RV-H4). Acotados al andamio y a
      lo que nace de él, cada uno con un escenario para el repositorio nacido antes; el
      fragmento dice que un proyecto existente no lo recibe y qué copiar.
      **Evidencia**: `openspec validate el-andamio-nace-instalable --strict` →
      `Change 'el-andamio-nace-instalable' is valid`.
- [x] 9.2 El ancla de «CI verifica todos los paquetes de forma bloqueante» en
      `openspec/cobertura-de-requirements.md` pasa de `:557` a `:603` (RV-H5).
      **Evidencia**: `grep -n 'name: Verificar cada paquete' plantilla/.github/workflows/ci.yml`
      → `603`; `sed -n 603p` → `      - name: Verificar cada paquete`.
