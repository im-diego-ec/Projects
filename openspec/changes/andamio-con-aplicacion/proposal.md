---
artefacto: proposal
dri: Builder 1
aprueba: Builder 1 (builder) # change técnico de `calidad-codigo`; el gate del PO en
                        # este repo está acotado a `gobierno-contribucion`
                        # (.github/CODEOWNERS, últimas dos líneas)
informado: PO / Builder 2
estado: pendiente-de-revision
---

# andamio-con-aplicacion — Proposal

## Why

`projects init` deja un repositorio de **49 archivos** —22 del andamio más lo que
dejan `openspec init` y el render de la constitución— y **ninguno es código de
producto**. No hay `package.json`, no hay lockfile, no hay un paquete. O sea: el
marco entrega la mecánica que verifica, y no entrega nada que verificar.

Eso no es una incomodidad de arranque. Es un repositorio que **no puede ponerse
verde**, y se puede señalar el paso exacto donde muere. El job `build_test` del
`ci.yml` que el andamio copia hace, en orden: `checkout`, `corepack enable`,
`setup-node`, y **cuarto** `pnpm install --frozen-lockfile`. Sin manifiestos ni
lockfile, ahí termina la corrida. Los siete pasos que siguen —el cliente de datos,
`pnpm lint`, `pnpm format:check`, la declaración de scripts por paquete, la
verificación por paquete, el censo de fuentes, la cobertura en dos planos— nunca
se ejecutan. El repositorio nuevo nace rojo y su primer PR es para arreglar el
andamio.

> Sospecha no confirmada, y la anoto en vez de afirmarla: `setup-node` con
> `cache: pnpm` necesita un lockfile para computar su clave de caché, así que
> probablemente muera un paso ANTES. No se verificó contra una corrida real en
> esta sesión. El cuarto paso es el que está medido.

**La salida a ese hueco era clonar otro repo**, `projects-starter`, el
esqueleto de aplicación del área. Y esa salida se cerró: Builder 1 lo archivó
(read-only) y se va a borrar. La decisión no es un accidente administrativo, es el
diagnóstico: un esqueleto que vive fuera del marco **deriva** de la mecánica que
dice ejemplificar, nadie lo verifica contra ella, y su abandono no produce
ninguna señal. El propio starter lo demuestra midiéndose contra las compuertas
que hoy exige el marco:

| Defecto del starter | Qué pasa cuando corre contra el marco |
|---|---|
| `"lint": "eslint . \|\| true"` en `api` y en `web` | `pnpm lint` sale **verde sin lintear una línea**. Es un fail-open y el marco lo prohíbe por spec |
| `"test": "vitest run --passWithNoTests"` en `web` | verde con **cero pruebas**: el mismo fail-open con otra ropa |
| `"test": "vitest run"` pelado en `api` | no emite lcov y la compuerta de cobertura da rojo por «no se encontró ningún reporte» |
| `@vitest/coverage-v8`: **cero ocurrencias** en el lockfile | no hay proveedor de cobertura instalado |
| `vitest.config.base.mjs` del andamio | **no lo extiende nadie**: cada paquete escribe sus umbrales, o ninguno |
| `api/pnpm-workspace.yaml` suelto | un segundo archivo de workspace dentro de un paquete |
| el `package.json` de la raíz | no declara los scripts que el `ci.yml` del marco invoca |
| faltan las devDependencies del linter y el formateador | el `eslint.config.mjs` del andamio no puede cargar |
| cobertura del código heredado: **39,18 % de líneas** en `api` | mínimo del marco: 80. `server.ts` y `lib/prisma.ts` al 0 % |
| los tres excluidos de cobertura del propio andamio | no están declarados en ninguna parte |

Diez defectos, y **ninguno es del starter en sí**: son la distancia acumulada
entre dos repositorios que nadie compara. Mientras el esqueleto viva afuera, esa
distancia vuelve a crecer desde el día uno.

Y hay una segunda pieza de evidencia, del lado del marco: la salida de
`projects init` ya enumera dos pasos humanos bajo el rótulo **«las dos cosas sin las
que el primer CI sale rojo»** — pegar los excluidos de cobertura del andamio en
el manifiesto de la raíz, y cablear `vitest.config.base.mjs` en cada paquete
instalando el proveedor de cobertura. El marco ya sabe qué falta, con el detalle
al nivel de la línea que hay que pegar. Lo que hace es **imprimirlo**. Un
requisito de compuerta que se cumple con memoria humana no es una compuerta: es
una nota.

## What Changes

El esqueleto de aplicación se **absorbe** dentro del andamio, corregido, y la
adopción del marco deja de tener un segundo repositorio en su camino crítico.

### 1. El esqueleto entra a `plantilla/`, con el stack fijado

Los tres paquetes en directorios **literales** (`api/`, `web/`, `e2e/`), porque
`projects init` copia rutas tal cual y sustituye solo contenido: React + TS + Vite +
Tailwind en `web`, Express + TS + Prisma en `api`, la suite E2E de Playwright en
`e2e`, y en la raíz el manifiesto, el workspace y el `docker-compose.yml` de los
servicios locales. Los marcadores viajan **dentro** de los archivos y solo los
que ya existen: `{{PROYECTO}}`, `{{ORG}}`, `{{PAQUETE_API}}`, `{{PAQUETE_WEB}}`,
`{{PAQUETE_E2E}}`, `{{GENERAR_CLIENTE_DATOS}}`.

### 2. Los diez defectos se arreglan al absorber, no después

Sin `|| true` y sin `--passWithNoTests`; `test` con cobertura en cada paquete
verificable; el proveedor de cobertura en las devDependencies con su versión
acompañando a la de vitest; cada paquete extendiendo `coberturaDelMarco()`; el
segundo archivo de workspace disuelto en el de la raíz **sin perder su
`allowBuilds`** (ver el design: borrarlo a secas apaga los postinstall de Prisma);
los scripts de la raíz con los nombres exactos que invoca el `ci.yml`; las
devDependencies del linter y del formateador; los tres excluidos del andamio
declarados en el manifiesto de la raíz; y la cobertura del código heredado
llevada al mínimo del marco, **sin declarar deuda** (D5).

### 3. Los dos pasos humanos que gateaban el primer CI desaparecen

Dejan de imprimirse porque dejan de existir. La lista que `projects init` imprime al
terminar se queda solo con lo que de verdad no puede hacer una herramienta:
protección de main, Dependabot, equipos de CODEOWNERS, labels, secrets.

### 4. El marco gana los controles que hoy no tiene sobre su propio andamio

Nada corre sobre `plantilla/`: no hay `package.json` en Projects, así que ninguna
integración mira esos manifiestos. Este change agrega las comprobaciones que
faltan —enmascaramiento en los manifiestos distribuidos, scripts que el pipeline
invoca y el esqueleto no declara, paquete sin cobertura cableada, marcador en una
ruta— y el ensayo de bootstrap que las acredita por código de salida.

## Impact

- **Capability afectada**: `calidad-codigo` (tres requirements nuevos y dos
  modificados; la justificación de la elección está en el design, D0).
- **`plantilla/`** pasa de 22 archivos a **~58**: los 32 del material de origen
  menos el `pnpm-workspace.yaml` suelto que se disuelve, más el paquete `e2e` y
  las pruebas nuevas. Es el cambio más grande que el andamio recibió, y el
  primero que le agrega código ejecutable. El número exacto se fija en el PR;
  este es el orden de magnitud.
- **`projects init`** gana un paso (generar el lockfile en el destino, D2) y pierde
  dos de su lista humana.
- **Consumidores existentes**: cero impacto. El esqueleto vive en el andamio y el
  andamio no llega a un repositorio ya creado.
- **`projects-starter`** queda sin función: se puede borrar cuando el ensayo
  de bootstrap de este change esté en verde, y no antes.

## Qué NO entra, y es deliberado

- **Reescribir el código heredado.** Se absorbe lo que funciona y se corrige lo
  medido. Un rediseño del esqueleto es otro change y otra discusión.
- **Infra.** El esqueleto trae `docker-compose.yml` para levantar local; el
  Terraform de `infra/` e `infra-prod/` no es de este change.
- **Los 40+ componentes del design system.** El esqueleto es mínimo, no una
  demo. La marca la cubre `marca-verificada`.
- **Auth real.** Clerk viaja configurado con sus variables de ejemplo; crear la
  instancia y cargar las claves es humano, y no gatea el pipeline.

## Lo que este change no puede cerrar

- **Que el esqueleto siga siendo el stack fijado.** Nada comprueba que las
  versiones del esqueleto sigan siendo las que el área quiere: Dependabot no ve
  el andamio, porque Projects no tiene `package.json`. Queda como hueco declarado y
  se atiende con el ensayo de bootstrap corriendo periódicamente (task 4.2).
- **La primera corrida real.** El ensayo de bootstrap se corre a mano contra un
  destino temporal; el veredicto de un repositorio de verdad, con su ruleset y su
  push fundacional, llega con el próximo proyecto que nazca (Supply Chain).
