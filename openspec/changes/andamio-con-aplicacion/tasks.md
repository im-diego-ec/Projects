---
artefacto: tasks
dri: Builder 1
aprueba: Builder 1 (builder) # gate de `calidad-codigo`, no del PO
informado: PO / Builder 2
estado: pendiente-de-revision
---

El orden manda, y acá tiene una razón concreta: **los controles estáticos del
bloque 2 se escriben ANTES de absorber los archivos** (bloque 3), para que el rojo
de cada uno de los diez defectos quede evidenciado contra el material real y no
contra un fixture que yo dibujé. Es la regla del marco —rojo primero— aplicada al
único caso donde hoy no hay ningún check: el andamio.

El bloque 5 (`projects init`) va después del 3 porque necesita un andamio que
instale. El bloque 6 es del corte de versión, no de este trabajo.

Toda verificación se acredita por **código de salida**, nunca grepeando la salida.

**`projects-starter` YA SE BORRÓ**, el 2026-08-23, y **antes** de la tarea 6.3 que
lo gateaba. Esta nota decía «no se borra hasta que el ensayo del 4.1 esté verde,
es el único lugar donde hoy vive el material de partida»; queda escrita así, tachada
y con lo que de verdad pasó, porque tildar la casilla como si el plan se hubiera
seguido es peor que la desviación.

Qué significa en la práctica: el material absorbido está en `plantilla/` (PR #56,
mergeado), así que **nada operativo se perdió**. Lo que ya no existe es el
upstream contra el cual diferir si mañana aparece que algo del esqueleto quedó
afuera — el árbol pre-absorción sobrevive solo en un clon local que no es durable.
Y no se preserva a propósito: su `infra/` era el inventario de un ambiente vivo de
otro proyecto, y copiarlo al marco sería mover el problema, no resolverlo.

---

## 0. Lo que hay que contestar antes de escribir una línea

- [ ] 0.1 **¿Se sube el pin de pnpm?** El esqueleto trae `pnpm@9.15.0` y el
      `ci.yml` documenta que en 9.15 un `--filter` con script ausente sale 0 (en
      11.18 sale 1). Las comprobaciones del marco ya no dependen de ese código de
      salida, así que la respuesta por default es **no tocarlo en este change** —
      subir el gestor de paquetes es cambio de dependencia y se pregunta antes
      (frontera ⚠️). Necesita el sí o el no del Builder 1, escrito.
- [ ] 0.2 **`lib/prisma.ts`: doble o exclusión.** Se intenta con doble primero
      (D5). Si la prueba resulta más frágil que valiosa, va exclusión con motivo.
      La decisión se toma con el número en la mano, no antes; lo que no puede
      quedar es al 0 % sin declaración.
- [ ] 0.3 **Tomar el snapshot del material de partida**: los 32 archivos del
      starter a un directorio de trabajo, con el `sha256` de cada uno y la fecha.
      El otro repositorio se va a borrar; sin esta huella no se puede
      contestar después «¿esto lo cambiamos nosotros o venía así?».
- [ ] 0.4 **Confirmar el conteo del `Why`.** El proposal afirma 49 archivos: 22
      del andamio más lo que dejan `openspec init` y el render de la
      constitución. Correr `projects init` contra un destino temporal y contar. Si
      el número no es 49, se corrige en el proposal **antes** del review: un
      número medido mal en el Why envenena todo lo que se apoya en él.

## 1. La verificación del delta, primero (rojo evidenciado)

- [ ] 1.1 `openspec validate --strict` sobre el change, y la relectura de
      coherencia proposal ↔ design ↔ tasks ↔ delta. Evidencia: la corrida en
      verde y los cuatro documentos nombrando los mismos diez defectos con los
      mismos números.
- [ ] 1.2 Releer el bloque MODIFIED contra el spec vivo **línea por línea**: son
      dos requirements reemplazados enteros y omitir un scenario existente lo
      borra. Evidencia: diff de los dos requirements mostrando solo la
      adición del párrafo y del scenario nuevo, más el discriminador
      «de un repositorio ya instanciado» en el scenario general.

## 2. Los controles que hoy no existen (antes de absorber nada)

Cada uno se escribe con el material de partida presente en un directorio de
trabajo, para que el primer rojo sea el real.

- [ ] 2.1 **Enmascaramiento en los manifiestos del andamio.** Detecta `|| true`,
      `; exit 0`, `--passWithNoTests` y la familia. Evidencia: contra los
      manifiestos del starter da rojo nombrando **tres** hallazgos
      (`api:lint`, `web:lint`, `web:test`); contra los corregidos, verde.
- [ ] 2.2 **Los scripts que el pipeline invoca están declarados.** Se LEEN del
      `ci.yml` del andamio (`SCRIPTS`, `EXCEPCIONES`, y los dos de la raíz) y se
      buscan en los manifiestos; una excepción que no corresponde a un paquete
      del workspace es rojo. Evidencia: contra el starter da rojo por
      `format:check` ausente en la raíz, `typecheck` ausente en `web` y la
      excepción de E2E sin paquete; contra el esqueleto absorbido, verde.
- [ ] 2.3 **Cada paquete verificable extiende `coberturaDelMarco()`** y su script
      `test` emite cobertura. Evidencia: quitar el import en una copia del
      andamio da rojo nombrando el paquete; quitar `--coverage` del script,
      también.
- [ ] 2.4 **Ningún marcador en RUTAS del andamio** (D3). Evidencia: renombrar un
      directorio de la copia a `{{PAQUETE_API}}` da rojo; el andamio real, verde.
      Y la prueba deja escrito en su encabezado por qué existe: hoy
      `marcadoresQueSobreviven()` lee solo contenido y firmaría «cero» sobre ese
      repositorio.
- [ ] 2.5 **Control de que estos controles no son no-op**: mutar copias del
      andamio —un manifiesto sin `test`, un `|| true` reintroducido, un paquete
      sin cobertura cableada, un marcador en una ruta— y exigir que **cada
      mutación muerda**. Se mutan copias, nunca el árbol del repo, y la prueba
      verifica al final que el andamio quedó intacto.

## 3. Absorber el esqueleto, corregido

- [ ] 3.1 Los tres paquetes en directorios **literales** `api/`, `web/`, `e2e/`
      (D3), con los marcadores solo dentro de los archivos y **solo** los seis
      que ya existen: `{{PROYECTO}}`, `{{ORG}}`, `{{PAQUETE_API}}`,
      `{{PAQUETE_WEB}}`, `{{PAQUETE_E2E}}`, `{{GENERAR_CLIENTE_DATOS}}`.
      Evidencia: `projects init` contra un destino temporal sale 0 y el destino
      queda **sin un solo marcador** (contenido y rutas).
- [ ] 3.2 El `package.json` de la raíz: `lint` = `eslint .`, `format:check` =
      `prettier --check .` (sin `-r`, D4), el pin de `packageManager` según 0.1, y
      `projects.cobertura.excluidos` con los **tres** excluidos del andamio y su
      motivo (D8). Evidencia: 2.2 y 2.1 en verde, y la primera corrida del ensayo
      sin reclamar cobertura sobre esos tres archivos.
- [ ] 3.3 Los manifiestos de los paquetes: sin `|| true`, sin
      `--passWithNoTests`, `test` con cobertura, `typecheck` declarado también en
      `web`, y `@vitest/coverage-v8` en devDependencies **con la versión
      acompañando a la de vitest** (D4/D5). Evidencia: 2.1, 2.2 y 2.3 en verde.
- [ ] 3.4 Las devDependencies del linter y del formateador que el
      `eslint.config.mjs` del andamio importa: `@eslint/js`,
      `typescript-eslint`, `globals`, `eslint-plugin-react-hooks`,
      `eslint-plugin-react-refresh`, `@tanstack/eslint-plugin-query`,
      `eslint-config-prettier`, más `eslint` y `prettier`. Evidencia: `pnpm lint`
      y `pnpm format:check` corren de verdad en el destino y **ponen en rojo** un
      archivo sucio a propósito.
- [ ] 3.5 Cada paquete extiende `../vitest.config.base.mjs` con
      `coberturaDelMarco()` (D5). Evidencia: el lcov de cada paquete existe, con
      rutas `SF:` relativas a la RAÍZ del monorepo — si dos paquetes emiten
      `src/...` indistinguibles, la compuerta da rojo por rutas ambiguas y ese es
      el error de cableado número uno.
- [ ] 3.6 El workspace, una sola vez en la raíz, **con el `allowBuilds` mudado**
      desde `api/pnpm-workspace.yaml` antes de borrarlo (D6). Evidencia: en el
      destino, `pnpm install` deja los engines de Prisma y el paso «Generar el
      cliente de la capa de datos» sale 0. Sin la mudanza este paso falla tres
      pasos más adelante con un mensaje que no habla de workspaces.
- [ ] 3.7 `e2e/` mínimo con Playwright: un spec contra el health del API,
      `tsconfig.json` extendiendo la base, `typecheck` declarado, y
      `projects.cobertura.excluidos` con su motivo escrito (D7). Evidencia: la
      excepción del `ci.yml` deja de estar muerta, y el censo de fuentes no
      reporta los archivos de `e2e` como fuera de programa de tipos.
- [ ] 3.8 `docker-compose.yml` y los comandos de levantar servicios locales, en
      la raíz. Evidencia: el formateador y el censo no protestan por ellos (o su
      exclusión queda declarada con motivo).

## 4. Cobertura al mínimo, sin deuda

- [ ] 4.1 Pruebas de `app.ts` y `middleware/auth.ts` (D5): rutas, verificación de
      token y el bypass de desarrollo. Evidencia: el total de `api` alcanza el
      mínimo del marco en las cuatro métricas, medido desde el lcov, **partiendo
      de 39,18 % de líneas**.
- [ ] 4.2 `server.ts` excluido con motivo escrito; `lib/prisma.ts` según 0.2.
      Evidencia: la compuerta lista las exclusiones con su motivo en el resumen
      de la corrida, y ninguna queda sin corresponder a un archivo.
- [ ] 4.3 `web` con su primera prueba de verdad (deja de existir
      `--passWithNoTests`) y su total en el mínimo. Evidencia: el veredicto por
      paquete en verde para `web`.
- [ ] 4.4 **Ningún manifiesto del esqueleto declara `projects.cobertura.deuda`**
      (D5). Evidencia: la comprobación estática del 2.3 extendida a este punto,
      en verde, y el veredicto de la compuerta sin una sola fila AMARILLA.

## 5. `projects init`: el lockfile y la lista humana más corta

- [ ] 5.1 El paso de instalación en el destino, después de sustituir marcadores
      (D2), cubierto por `--sin-herramientas` junto con `openspec init`.
      Evidencia: el destino queda con `pnpm-lock.yaml` y
      `pnpm install --frozen-lockfile` sale 0 sobre él; con
      `--sin-herramientas`, la salida **nombra** que sin lockfile el primer CI
      muere en su cuarto paso.
- [ ] 5.2 Sacar de la lista humana los dos pasos que dejan de existir (los
      excluidos de cobertura y el cableado de `vitest.config.base.mjs`), y dejar
      la lista con lo que de verdad no puede hacer una herramienta: protección de
      main, Dependabot, equipos de CODEOWNERS, labels, secrets. Evidencia: la
      salida de `projects init` ya no imprime el rótulo «las dos cosas sin las que
      el primer CI sale rojo», porque no hay ninguna.
- [ ] 5.3 El ensayo de bootstrap completo (D9): instanciar en un temporal,
      instalar, y correr en el orden del `ci.yml` —cliente de datos, `lint`,
      `format:check`, la declaración de scripts, `typecheck`/`test`/`build` por
      paquete, censo de fuentes, cobertura en dos planos— exigiendo **exit 0**.
      Evidencia: la corrida completa en verde, con su salida en el PR. Es la
      acreditación del scenario «la primera corrida del pipeline, sin una sola
      edición».
- [ ] 5.4 Actualizar `plantilla/README.md` (el archivo que no se copia): la
      tabla de marcadores, el mapa de lo que ahora trae el andamio, y el camino
      «si el proyecto no tiene frontend / no tiene E2E» enumerando **todos** los
      lugares que nombran al paquete retirado. Evidencia: seguir el camino a
      mano sobre un destino real y llegar a verde.

## 6. El corte de versión (no es de este trabajo)

- [ ] 6.1 Entrada en el CHANGELOG con su sección **«Para consumidores»**: acá
      dice **nada**, y el motivo es estructural — el esqueleto vive en el andamio
      y el andamio no llega a un repositorio ya creado. Se escribe en el mismo PR
      que el cambio, no al cortar.
- [ ] 6.2 Los pines del andamio al release nuevo (`pruebas/andamio/pinado.test.mjs`
      los compara contra el CHANGELOG). Pendiente a propósito: es del corte.
- [x] 6.3 Recién con el release publicado y el 5.3 en verde: **borrar
      `projects-starter`**, y dejar en el archive de este change la huella del
      0.3 y el enlace al PR que lo absorbió.
      **Hecho el 2026-08-23, y ADELANTADO respecto de esta tarea:** Builder 1 lo borró
      apenas mergeó el PR #56, sin esperar el release ni el 5.3. La condición que
      esta tarea protegía —tener el material de partida mientras el reemplazo no
      esté probado— ya se había cumplido por otra vía: el `pnpm verificar` del
      repo instanciado salía **exit 0** antes del merge, así que el reemplazo
      estaba probado. Lo que sí se perdió es el upstream para diferir, y eso queda
      en el archive.

## 7. Lo que queda abierto y va escrito en el archive

- [ ] 7.1 **Nada avisa cuando el stack del esqueleto envejece.** Dependabot no ve
      el andamio (Projects no tiene `package.json`). El camino es un workflow
      programado que corra el ensayo del 5.3 y abra issue si falla; no entra acá.
- [ ] 7.2 **El ensayo corre a mano.** Un banco que alguien puede no correr. Los
      controles estáticos del bloque 2 sí corren en el CI del marco y cubren la
      regresión más probable (editar un manifiesto); el ensayo cubre la
      instalación real.
- [ ] 7.3 **El veredicto de un repositorio de verdad** —con su ruleset, su push
      fundacional y el plano del diff en `NO APLICABLE`— llega con el próximo
      proyecto que nazca. Se anota qué salió distinto de lo previsto.

## Fuera de alcance, declarado

- **Reescribir el esqueleto.** Se absorbe lo que funciona; se corrige lo medido.
- **Subir versiones de React, Express, Prisma, vitest o Vite.** Otro change, con
  su orden de riesgo (devDeps → runtime → auth).
- **Terraform e infra.** El esqueleto levanta local con `docker-compose`; `infra/`
  e `infra-prod/` no son de este change.
- **Componentes del design system.** El esqueleto es mínimo, no una demo; la marca
  la cubre `marca-verificada`.
- **Crear la instancia de Clerk y cargar sus claves.** Humano, y no gatea el
  pipeline.
