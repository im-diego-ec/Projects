---
artefacto: migracion-consumidor
consumidor: im-diego-ec/intranet
dri: Builder 1
aprueba: Builder 2 (builder par) — y el PO donde toca gobernanza
informado: PO
estado: pendiente-de-revision
---

# Migración de `intranet` a la constitución del marco (Bloque 2 del tasks)

Este documento es **el diff exacto** que hay que aplicarle a
`im-diego-ec/intranet`. No es un resumen ni una guía: cada sección trae el
contenido literal, y lo que no se pudo decidir sin un humano está marcado como decisión
abierta en vez de resuelto por omisión.

**Por qué un documento y no un PR.** El repo no está en disco en esta máquina y no se
clonó. Escribir en el repositorio de un consumidor desde una sesión de Projects es 🛑
(`projects/AGENTS.md`), y el PR de adopción es **PR #1 de intranet**, abierto y sin mergear
(rama `projects/adopcion-marco`): la corrección entra **ahí**, antes de que la copia lossy
llegue a `main`. Todo lo que sigue está verificado contra un **consumidor sintético** que
reproduce los archivos reales de esa rama y corre la action real del marco (evidencia por
código de salida en la sección 4).

Estado leído: `AGENTS.md` de la rama `projects/adopcion-marco`, **241 líneas**, blob
`bcc8cbf04dafb680a94b0677c742b198047103fc`. Los números de línea de este documento son de
ese blob; si la rama avanza, hay que re-anclarlos.

---

## 1. La pieza central: hay una regla de seguridad INVERTIDA y hay que BORRARLA

### Qué dice hoy el repo

`AGENTS.md`, líneas **173-175**, dentro del bloque **🛑 Nunca**:

> - **Contactar usuarios reales desde dev**: dev usa la instancia real de Clerk pero con datos
>   de prueba — cualquier integración saliente nueva (correo, SMS, webhooks a terceros) corre en
>   sandbox u off en dev.

Y `APP_ENV` **no aparece ni una vez** en el archivo (verificado: `grep -c APP_ENV` → `0`).

### Qué dice la regla del marco

La regla `dev-no-contacta-usuarios` del canónico (`40-fronteras.md`, bloque 🛑) dice lo
contrario en la parte que importa:

> - **Contactar usuarios reales desde dev**: la instancia dev del proveedor de identidad
>   es **separada** (solo usuarios de prueba) y las integraciones salientes (chat, correo,
>   SMS) corren en sandbox u off — el modo real exige `APP_ENV=prod` como **guard
>   estructural en el código**, no una convención. El 2026-07-28 el scheduler de dev
>   notificó a usuarios reales y cuatro empleados "reservaron" en el ambiente de pruebas: la
>   separación de ambientes por convención no separa nada.

La diferencia no es de redacción. El repo dice **instancia real con datos de prueba** —o sea,
separación por convención— y el marco dice **instancia separada más un guard estructural en
el código**. Esa regla existe porque el 2026-07-28 el ambiente de dev **notificó a usuarios
REALES** y cuatro empleados reservaron en un ambiente de pruebas. La frase del repo autoriza
exactamente el mecanismo que produjo el incidente.

### No alcanza con agregar lo que falta: hay que BORRAR la frase invertida

Este es el punto del documento y no admite una lectura suave.

Cuando el artefacto del marco llegue a intranet, el agente va a cargar `AGENTS.md` **y**
`.projects/AGENTS-marco.md` en la misma sesión. Si la frase invertida se queda:

- el agente lee **dos reglas contradictorias sobre lo mismo, en el mismo repo, en el mismo
  turno**, y elige una. No hay forma de saber cuál;
- la que queda escrita en el archivo del proyecto es la **permisiva**, y es la que un agente
  que busca autorización va a encontrar primero;
- **ningún check la caza.** Verificado por código de salida, no por opinión: con la frase
  invertida presente en el `AGENTS.md` del proyecto y el artefacto perfectamente al día, el
  modo verificar de la action devuelve **exit 0** — verde. Lo que el check compara son bytes
  del artefacto; una contradicción en el archivo del proyecto es invisible para él, y el
  propio design lo declara ("La contradicción no declarada sigue siendo invisible").

Completar sin borrar deja al agente una prohibición y una autorización sobre lo mismo. **El
borrado es la mitad que hace el trabajo**; agregar el artefacto es la otra. Las dos van en el
mismo PR o no van.

### El movimiento, en dos pasos

**(a) BORRAR.** Las líneas 173-175 desaparecen junto con toda la sección `## Fronteras de
tres niveles` (145-185), porque esa sección entera pasa a vivir en el artefacto. No queda una
versión recortada ni una nota al pie: queda el artefacto.

**(b) DECIDIR si hay desvío, y esto necesita un humano con acceso a Clerk.** Hay dos estados
posibles del mundo y no se pueden distinguir desde acá:

- **La frase estaba simplemente MAL** (la instancia dev de intranet sí es separada, y el
  texto se degradó al copiar el scaffold). Entonces: se borra, **no se declara ningún
  desvío**, y la regla del marco rige tal cual. Es el caso esperado y el default.
- **La frase describía la configuración REAL** (dev comparte de verdad la instancia
  productiva de Clerk). Entonces hay un **riesgo abierto**, no una excepción: lo que se
  declara como desvío es la *situación a corregir con fecha*, y **jamás** el permiso de
  contactar usuarios reales. La prohibición no se desvía. El desvío admisible sería, como
  máximo, sobre el mecanismo de separación, con el control compensatorio (`APP_ENV=prod` como
  guard en el código) **ya existente y verificado**, y con fecha de caducidad.

Lo que NO es admisible en ningún caso: un desvío redactado como "dev usa la instancia real
con datos de prueba", porque eso convierte el canal de desvíos en la puerta por la que vuelve
el incidente. Si nadie verifica el estado de Clerk antes del merge, el comportamiento
correcto es **borrar la frase y no declarar desvío** — fail-closed: queda la regla del marco,
que es la conservadora.

Evidencia que hay que adjuntar al PR para cerrar (b): que la instancia dev de Clerk es una
instancia distinta de la de producción, y que existe el guard `APP_ENV=prod` en el código
antes de cualquier integración saliente real. Con eso, (b) se cierra sin desvío.

**Segunda contradicción, del mismo tipo pero menos grave.** La línea **104** dice "Escala por
sesión (`/model`, `/effort high`) cuando la tarea lo paga", sin compuerta, y el canónico ahora
dice lo contrario: escalar de modelo o de effort **exige OK humano previo**
(`escalar-modelo-exige-ok-previo` en ⚠️ y `escalar-solo-con-ok-previo` en la sección de
agentes). Se borra con el resto de la sección de modelos, por la misma razón: el texto
vigente autoriza lo que la regla nueva prohíbe.

---

## 2. El diff, archivo por archivo

### 2.1 `AGENTS.md` — de 241 líneas a 71

**Se BORRA** (pasa al artefacto; no se recorta ni se resume):

| Líneas  | Sección                                                   |
| ------- | --------------------------------------------------------- |
| 1-13    | cabecera y bloque de "Procedencia" del scaffold           |
| 43-112  | `## Cómo trabajamos: OpenSpec` (incluye modelos y effort)  |
| 114-143 | `## Git y despliegue` (incluye la tabla de Ambientes)      |
| 145-185 | `## Fronteras de tres niveles` ← **acá viven 173-175**     |
| 187-196 | `## Seguridad y observabilidad`                            |
| 198-225 | `## AWS y herramientas del agente` + `### Secretos`        |
| 227-241 | `## GitHub (estándar del área)`                            |

**Se CONSERVA**: la tabla de stack (16-40, que es del proyecto) y los hechos propios que el
canónico no puede saber. **Se AGREGA**: la línea de carga `@.projects/AGENTS-marco.md`.

El archivo completo queda así — verificado: pasa `prettier --check` con el `.prettierrc` de
intranet, y el modo verificar de la action da exit 0 con esta cabecera y esta línea de carga.

```markdown
# AGENTS.md — po / intranet

> Este archivo es la **constitución de ESTE proyecto** para humanos y para agentes de IA
> (Claude Code, Cursor). Se carga en **cada sesión** de codificación, y tiene dos mitades:
>
> - **Lo del marco** — las reglas comunes del área (OpenSpec, git y despliegue, las
>   fronteras de tres niveles, seguridad y observabilidad, infraestructura, AWS, secretos,
>   agentes y modelos, GitHub). **No están escritas acá**: llegan como artefacto generado en
>   `.projects/AGENTS-marco.md`, que carga la línea de abajo. Ese archivo **no se edita a
>   mano** —lo escribe Projects y el CI compara su contenido contra el texto publicado para la
>   versión que declara—, y por eso una regla común se corrige **una vez para todos** en vez
>   de envejecer copia por copia en cada repo.
> - **Lo del proyecto** — todo lo que sigue en este archivo: su stack, sus decisiones, las
>   reglas que valen acá y en ningún otro repo.

@.projects/AGENTS-marco.md

**Lo que NO va en este archivo**: las reglas comunes del área —están en el artefacto, y ahí
se corrigen una vez para todos— y las excepciones a ellas, que se declaran en
`.projects-desvios.json` con su motivo escrito. Ante conflicto entre este archivo y el
artefacto, **manda el artefacto**: una copia divergente de una regla del marco es un defecto
de este repo, no un matiz.

---

## Stack fijado (no se cambia sin aprobación)

| Capa                        | Herramienta                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| Frontend                    | React 18 + Vite + TypeScript, i18next (ES/EN), TanStack Query                                   |
| Backend                     | Express + Prisma 7 (`@prisma/adapter-pg`)                                                       |
| Datos                       | Aurora PostgreSQL (una sola base, IAM/adapter-pg)                                               |
| Auth                        | Clerk (Google SSO restringido a `@ejemplo.invalid`); verificación de JWT networkless en el API  |
| Validación de input externo | Zod                                                                                             |
| Infra                       | **AWS** + **Terraform** (IaC; `infra/` dev — **no existe todavía `infra-prod/`**)               |
| CI/CD                       | **GitHub Actions** (promoción por ambientes, workflows reusables de Projects)                       |
| Package manager             | **pnpm** con workspaces (monorepo: web, api)                                                    |
| Tests                       | Vitest (unit/integración, backend con Postgres real del runner) — **sin suite E2E todavía**     |

pnpm está fijado porque el CI ejecuta `corepack enable` / `pnpm -r` directamente y porque el
marco depende de un único lockfile en la raíz. Cambiar de package manager no es sustituir un
comando: es reescribir el job de build del CI.

No introducir frameworks, ORMs, bases de datos ni servicios alternos a los de esta tabla.
Cómo se pide una excepción está en las fronteras del artefacto del marco.

---

## Lo propio de este proyecto

- **Producción no está aprovisionada.** No hay `infra-prod/`, ni cuenta, ni dominio de
  producción: hasta que exista, **todo despliegue es a dev** y la promoción termina ahí. La
  columna «producción» de la tabla de Ambientes del artefacto es un objetivo planificado, no
  un ambiente vivo — está declarado como desvío de `promocion-por-ambientes` en
  `.projects-desvios.json`, y ese desvío caduca el día que exista `infra-prod/`.
- **Las credenciales de AWS son las de por defecto de la CLI**, sin perfil nombrado todavía.
  Cuando se nombre un perfil, el valor se cambia en `.projects-valores.json` y se re-renderiza:
  no se escribe dos veces.
- **Los roles de autorización de este dominio son lector / editor / administrador.** El
  backend es la autoridad (regla del marco); esta línea solo dice cuáles son los roles.
- **Integraciones salientes propias**: Slack, el data warehouse (DWH) y ClickUp. Todas
  cuentan como sistemas de terceros para la 🛑 del marco: escribir en ellas exige compuerta
  de aprobación explícita.
- **El estado REAL del ruleset de `main`** —incluida la firma de commits, que puede estar
  diferida si el equipo todavía no tiene GPG configurado— vive en
  `.github/proteccion-main.md`, y se actualiza en el mismo PR que cambie la configuración.

> Si al escribir una regla acá pensás "esto le sirve a todos los proyectos", no va acá: se
> propone como change en Projects y llega por el artefacto. Y si lo que querés es **apartarte**
> de una regla del marco, eso no se escribe como regla propia — se declara como desvío en
> `.projects-desvios.json`, que es lo único que el marco reconoce como override.
```

### 2.2 `CLAUDE.md` — explicitar que la cadena tiene DOS eslabones

El archivo actual (10 líneas) sigue diciendo que `AGENTS.md` es la "constitucion unica". Ya
no lo es. **No se agrega un segundo import**: el salto lo resuelve el anidamiento, y
declararlo dos veces cargaría el artefacto dos veces. Solo cambia la prosa.

```markdown
# CLAUDE.md

Las reglas de este repo viven en **AGENTS.md** — la constitucion de este proyecto para
humanos y agentes (Claude Code, Cursor).

No hay ninguna regla que viva solo en este archivo. La linea de abajo IMPORTA AGENTS.md al
contexto en el arranque de la sesion: es carga mecanica de Claude Code, no un puntero que el
agente deba recordar seguir.

La cadena tiene DOS eslabones y los dos son mecanicos. AGENTS.md trae lo propio del proyecto
e importa a su vez `.projects/AGENTS-marco.md`, que es la porcion del marco: las reglas comunes
del area, generadas por Projects y verificadas en el CI. Si ese segundo eslabon se rompe, el
agente trabaja sin la mitad de las reglas y nada en la sesion lo delata: por eso el CI
comprueba que la referencia siga en pie.

@AGENTS.md
```

### 2.3 `.projects-valores.json` — NUEVO (raíz del repo, fuera de `.projects/`)

Vive en la raíz a propósito: `.projects/` es desechable y el modo escribir lo reemplaza entero.
El canónico usa **15 placeholders** y los 15 tienen que tener valor, o el render falla
(verificado: con tres vacíos, exit 1 y el mensaje nombrando los tres).

```json
{
  "superficies": ["claude-code", "cursor"],
  "PROYECTO": "intranet",
  "ORG": "po",
  "PAQUETE_API": "api",
  "BUILDER_1": "@builder-uno",
  "BUILDER_2": "@builder-dos",
  "PO": "@po",
  "CUENTA_DEV": "802589444524",
  "CUENTA_PROD": "(sin aprovisionar)",
  "REGION": "us-east-1",
  "PERFIL_DEV": "credenciales por defecto (sin perfil nombrado)",
  "PERFIL_PROD": "(sin aprovisionar)",
  "DOMINIO_DEV": "intranet-dev.ejemplo.invalid",
  "DOMINIO_PROD": "intranet.ejemplo.invalid",
  "CANAL_ALERTAS": "#alertas-prod",
  "PREFIJO_RECURSOS": "intranet"
}
```

De dónde sale cada valor, para que se pueda auditar sin adivinar: `CUENTA_DEV` y `REGION` de
`infra/variables.tf` y de la tabla de Ambientes vigente; `PREFIJO_RECURSOS` de
`variable "project" { default = "intranet" }`, que es la raíz real de las rutas de SSM
(`/${var.project}/${var.environment}/...` en `infra/ssm.tf`); `PAQUETE_API` de que
`api/src/lib/log.ts` existe, así que la regla de logging renderizada apunta a un archivo
real; los handles, de `.github/CODEOWNERS` y del propio `AGENTS.md`; las superficies, de que
la primera línea del archivo dice "Claude Code, Cursor".

**Decisión abierta (necesita humano), y es la única del render.** `DOMINIO_PROD`,
`CUENTA_PROD` y `PERFIL_PROD` no tienen valor verdadero porque producción no existe. El
canónico escribe `https://{{DOMINIO_PROD}}` con el esquema **fijo alrededor** del placeholder,
así que un proyecto sin producción no puede rendir una tabla del todo honesta. Las dos
opciones, las dos verificadas con exit 0:

- **`DOMINIO_PROD: "intranet.ejemplo.invalid"`** (el dominio planificado, por simetría con
  dev). Renderiza `https://intranet.ejemplo.invalid` — legible, y honesto **solo porque** el
  desvío de `promocion-por-ambientes` queda impreso cuatro líneas más arriba diciendo que esa
  columna es un objetivo planificado. Es la opción de este documento.
- **`DOMINIO_PROD: "(no aprovisionado todavia)"`**. Renderiza literalmente
  `https://(no aprovisionado todavia)` y `https://api.(no aprovisionado todavia)`: nadie lo
  confunde con una URL viva, y nadie lo lee sin tropezar.

Un valor vacío **no** es opción: es exit 1 ("no tiene valor para: CUENTA_PROD, DOMINIO_PROD,
PERFIL_PROD"). La solución de fondo —que el canónico sepa expresar "ambiente no
aprovisionado" sin inventar una URL— es un **change en Projects**, no una edición del consumidor,
y no se resuelve en este PR.

### 2.4 `.projects-desvios.json` — NUEVO

```json
{
  "desvios": [
    {
      "regla": "promocion-por-ambientes",
      "fecha": "2026-08-19",
      "aprobado_por": "@builder-uno",
      "motivo": "En intranet produccion NO esta aprovisionada: no existe infra-prod/, ni cuenta, ni dominio de produccion. La promocion TERMINA en dev y la columna de produccion de la tabla de Ambientes es un objetivo planificado, no un ambiente vivo. Este desvio caduca el dia que exista infra-prod/."
    }
  ]
}
```

Las cuatro claves son obligatorias (`regla`, `fecha` en AAAA-MM-DD, `aprobado_por`,
`motivo`): falta cualquiera y es rojo. Un desvío cuya regla ya no existe también es rojo, con
el motivo que tenía escrito en el mensaje. La fecha y el aprobador son de quien lo apruebe de
verdad — los de arriba son el valor propuesto, no una firma.

Verificado que hace lo que promete: el desvío se imprime **dentro** del artefacto que los
agentes cargan, anidado bajo la viñeta de la regla que anula y antes de la regla siguiente.

```markdown
<!-- projects:regla id=promocion-por-ambientes -->

- **Promoción por ambientes**: merge de código → deploy a DEV → smoke API → E2E →
  deploy a PROD → verificar-prod. Producción no recibe nada que dev no haya
  verificado; [...]

  > ⛔ **DESVÍO DECLARADO** — la regla `promocion-por-ambientes` NO rige en este repositorio.
  > Aprobado por @builder-uno el 2026-08-19.
  > **Motivo:** En intranet produccion NO esta aprovisionada: [...]
```

Y su motivo sale además como `::notice::` en **cada** corrida, para que un motivo que
envejeció mal quede a la vista en vez de fosilizarse.

### 2.5 `.projects/AGENTS-marco.md` y `.cursor/rules/00-marco.mdc` — NUEVOS, generados

**No se escriben a mano.** Se generan corriendo la action en modo escribir y se commitean tal
cual. Con los valores de arriba salen de **602 y 607 líneas**, mismo cuerpo, cabecera
`<!-- projects:constitucion version=1.3.0 sha=d18f9d9b0c8f superficie=... -->`.

Las **dos** superficies, no una: intranet declara "Claude Code, Cursor" en la primera línea de
su `AGENTS.md`, y Cursor lee `AGENTS.md` como markdown plano sin expandir imports. Emitir solo
para Claude Code dejaría a Cursor leyendo **la mitad del proyecto y ninguna frontera**: sería
una regresión respecto de hoy, no un empate.

### 2.6 `.prettierignore` — el artefacto sale del formateador

El archivo actual tiene 8 líneas y no menciona `.projects`. Se agrega al final:

```gitignore
# LA PORCION DEL MARCO ES UN ARTEFACTO GENERADO: la escribe Projects y el CI compara
# su contenido, byte a byte, contra el texto publicado para la version que el propio
# archivo declara. Pasarle el formateador de este repo la pondria en divergencia por
# una razon que no es del proyecto, y el rojo diria "alguien lo edito a mano" — el
# mismo motivo por el que ya esta afuera el archive de OpenSpec.
# Las ENTRADAS del render (.projects-valores.json, .projects-desvios.json) viven FUERA de
# .projects/ a proposito: ese directorio es desechable y el modo escribir lo reemplaza.
# Esas dos SI se formatean.
.projects
.cursor/rules/00-marco.mdc
```

Sin esto el CI de intranet, que ya corre `pnpm format:check` (`ci.yml:52`), reformatea el
artefacto y lo pone en divergencia: rojo permanente sobre un archivo que ninguna persona
escribió ni puede arreglar.

### 2.7 `.gitattributes` — NUEVO, y es un requisito, no una prolijidad

**Intranet no tiene `.gitattributes`** (verificado sobre el árbol de la rama). Sin él, en
Windows el árbol de trabajo queda con CRLF mientras los blobs son LF, y una comparación byte
a byte —justo la de esta porción del marco— falla por un motivo que no es del proyecto. Es
además la regla `fin-de-linea-lf` del canónico, que el repo empezaría incumpliendo el día uno.

```gitignore
# Normalizacion de fin de linea. Sin esto, en Windows (core.autocrlf=true) el arbol
# de trabajo queda con CRLF mientras los blobs versionados son LF puro, y las
# comparaciones byte a byte —incluida la de la porcion del marco— fallan por un
# motivo que no es del proyecto.
* text=auto eol=lf

# Binarios: sin conversion de fin de linea ni diff de texto.
*.png binary
*.jpg binary
*.jpeg binary
*.gif binary
*.ico binary
*.pdf binary
*.woff binary
*.woff2 binary

# Generado: el diff no aporta nada en review y su tamaño tapa el resto.
pnpm-lock.yaml linguist-generated=true
```

⚠️ Antes de agregarlo hay que comprobar que **no produce churn**: buscar blobs versionados con
CR (`git ls-files -z` + `grep -lI` del carácter de retorno de carro) tiene que salir vacío. Si
algún blob ya tiene CRLF, esto lo renormaliza y el diff va a incluir archivos que nadie tocó
— en ese caso va en un commit propio, separado y declarado.

### 2.8 `.github/workflows/ci.yml` — el job de verificación

El `uses: ...marco-ci.yml@v1` de la línea 17 ya está: el paso del marco llega solo. Lo que
falta es el job que hace el **re-render byte a byte** y sube el artefacto corregido. Se
agrega **como job propio**, no como paso de `build_test`, y la razón no es estilo:
`build_test` se omite en el carril rápido de docs
(`if: needs.marco.outputs.solo_docs == 'false'`), y editar `AGENTS.md`, `CLAUDE.md` o
`.projects/` **es** un cambio de solo docs. Metido ahí, el check no correría justamente en los
PR que pueden romper la cadena de carga.

```yaml
# LA PORCION DEL MARCO DE LA CONSTITUCION, verificada byte a byte. Job propio y no
# un paso de build_test: build_test se OMITE en el carril rapido de docs, y editar
# AGENTS.md o .projects/ ES un cambio de solo docs.
#
# LIMITE, dicho en voz alta: esto garantiza que el TEXTO llegue integro y al dia a
# la superficie que el agente carga. No garantiza que el agente lo OBEDEZCA en el
# turno 40 de una sesion larga. Cierra el hueco de DISTRIBUCION, no el de
# comportamiento.
constitucion:
  name: constitucion-del-marco
  runs-on: ubuntu-latest
  # La action no llama a la API de GitHub: lee el arbol ya checkouteado y escribe
  # comandos de workflow. contents: read es el minimo y el techo.
  permissions:
    contents: read
  steps:
    - uses: actions/checkout@v4
    # La action renderiza con node. Sin esto falla con el arreglo escrito, en vez
    # de pasar en verde por no haber podido correr.
    - uses: actions/setup-node@v4
      with: { node-version: 22 }
    - name: Constitucion del marco al dia
      id: constitucion
      uses: im-diego-ec/Projects/actions/constitucion@v1
      with:
        modo: verificar
    - name: Subir la porcion del marco al dia
      if: always() && steps.constitucion.outputs.corregidos != ''
      uses: actions/upload-artifact@v4
      with:
        name: constitucion-al-dia
        path: ${{ steps.constitucion.outputs.corregidos }}
        if-no-files-found: warn
```

Y el veredicto agregado tiene que mirarlo, o el check requerido no lo cubre
(`ci.yml:65-78`): en `needs` se agrega `constitucion`, y en el script del veredicto la línea

```bash
[ "${{ needs.constitucion.result }}" = "success" ] || { echo "::error::constitucion-del-marco termino en '${{ needs.constitucion.result }}'"; exit 1; }
```

va **antes** de la rama de solo-docs, porque la constitución corre en los dos carriles: no
tiene rama de "no aplica" y un skip inesperado es rojo, no un verde mudo.

⛔ **`actions/constitucion` NO existe todavía en el tag `@v1`.** Verificado:
`git ls-tree v1 actions/` en Projects lista `carril-docs`, `censo-fuentes`, `cobertura-diff` y
`guardrail-deltas`, y nada más. Hasta que el release del marco mueva `v1`, este job falla con
"Can't find 'action.yml'" y `ci-ok` queda rojo **a propósito**: es la señal de que el PR no
puede mergearse antes del release. **No se arregla pinando la rama del marco** — un pin a
rama es un pin móvil, y ese es el problema que este change existe para cerrar.

---

## 3. Lo que la migración recupera, medido

`AGENTS.md` pasa de **241 líneas** a **71** de proyecto más **602** de artefacto. Lo que
vuelve no es formato: son reglas que hoy no están escritas en ningún archivo que un agente de
intranet cargue. Cada una verificada con `grep -ci` sobre el `AGENTS.md` actual, resultado
**0 ocurrencias**:

| Lo que hoy falta                                     | `grep -ci` hoy |
| ---------------------------------------------------- | -------------- |
| `no-console` como error del linter                   | 0              |
| ejecutores que descargan (`npx`) con versión exacta   | 0              |
| `APP_ENV` (el guard del incidente del 2026-07-28)     | 0              |
| el nombre del check requerido `ci-ok`                 | 0              |
| "Cuando el marco publica una versión" (sección entera) | 0            |
| alertar con **origen preciso**                        | 0              |
| escribir en **sistemas de terceros**                  | 0              |
| Well-Architected                                      | 0              |
| todo fail-open es **ruidoso**                         | 0              |
| la cifra `$10/$50 vs $3/$15 por MTok`                 | 0              |
| `* text=auto eol=lf`                                  | 0              |
| lo generado fuera del formateador                     | 0              |

Y en viñetas de frontera: hoy **✅ 5 / ⚠️ 5 / 🛑 8**; el canónico trae
**✅ 7 / ⚠️ 8 / 🛑 10**. Las tres ⚠️ nuevas son las tres reglas fijadas esta semana (escalar
de modelo con OK previo, cambiar configuración de repo u organización con OK previo, apartarse
de la infra base preguntando antes), que hoy no existen en ningún archivo — y la primera,
además, **corrige** el texto vigente de la línea 104.

---

## 4. Verificación: qué se corrió y qué dio

Todo por **código de salida**, contra un consumidor sintético que reproduce los archivos
reales de `projects/adopcion-marco` y ejecuta la action **real** del marco. Ningún comando
escribió en el repositorio de intranet; los únicos accesos a intranet fueron `gh api` de
**lectura**.

| #   | Qué                                                                                 | Exit                   |
| --- | ----------------------------------------------------------------------------------- | ---------------------- |
| 1   | `constitucion.mjs` modo **escribir** con los valores propuestos                     | **0** (2 superficies)  |
| 2   | modo **verificar** con el `AGENTS.md` y el `CLAUDE.md` propuestos                   | **0**                  |
| 3   | los tres valores de producción **vacíos**                                            | **1** (los nombra)     |
| 4   | variante `DOMINIO_PROD` = dominio planificado                                        | **0**                  |
| 5   | variante `DOMINIO_PROD` = `(no aprovisionado todavia)`                               | **0**                  |
| 6   | `prettier --check` del `AGENTS.md` y los dos JSON, con el `.prettierrc` de intranet  | **0** (tras formatear) |
| 7   | modo verificar **después** de pasar Prettier por el `AGENTS.md`                      | **0**                  |
| 8   | **la frase invertida presente** en el `AGENTS.md`, artefacto al día                  | **0** ← nadie la caza  |
| 9   | `JSON.parse` de `.projects-valores.json` y `.projects-desvios.json`                        | **0**                  |

La fila **8** es la que justifica todo el punto 1 de este documento: la contradicción es
invisible para el mecanismo. Lo único que la elimina es borrar la frase.

Lo que **no** se pudo verificar y hay que verificar en el PR: que el runner resuelva
`actions/constitucion@v1` (no existe todavía), que `.gitattributes` no produzca churn, y que
Claude Code resuelva el import `@.projects/AGENTS-marco.md` en el producto real — acá se verificó
contra el verificador del marco, que exige exactamente esa forma.

---

## 5. Decisiones que necesitan un humano, sin resolver por omisión

1. **El estado real de la instancia dev de Clerk** (punto 1(b)). Es la única decisión con
   consecuencia de seguridad. Default si nadie la verifica: borrar la frase y **no** declarar
   desvío.
2. **Qué valor lleva `DOMINIO_PROD`** y sus dos hermanos (2.3). Las dos opciones renderizan
   con exit 0; se leen distinto.
3. **Quién aprueba el desvío de `promocion-por-ambientes`** y con qué fecha (2.4). El JSON
   propuesto lleva un valor, no una firma.
4. **`CANAL_ALERTAS`**: se propone `#alertas-prod` porque es el canal del área, pero intranet
   no documenta canal propio y su producción no existe. Confirmar.
5. **El `.gitattributes` en commit propio** si hay blobs con CRLF (2.7).
6. **El texto normativo de las tres reglas nuevas** del canónico, que gobiernan a los dos
   consumidores y no existen en ningún archivo aprobado. Es aprobación del marco, no de
   intranet, pero bloquea el estreno del artefacto en los dos repos.

---

## 6. Hallazgos fuera del alcance de este documento (no se arreglaron acá)

Salieron al leer el repo para armar el diff. Ninguno se toca en esta migración; se dejan
escritos para que no se pierdan.

- **Los secretos de intranet SÍ entran al tfstate.** `infra/ssm.tf` crea los parámetros de
  Clerk, Slack, DWH y ClickUp desde Terraform, con los valores pasados por
  `secrets.auto.tfvars`. La regla del marco `secretos-se-resuelven-en-el-arranque` dice lo
  contrario con todas las letras: "los parámetros se crean por CLI, **fuera de Terraform**,
  para que el valor nunca entre al tfstate". Cuando el artefacto llegue, esa contradicción
  queda escrita en el repo: o se arregla la infra, o se declara el desvío con su motivo y su
  fecha de caducidad. No es cosmético — un tfstate con secretos es un secreto en un bucket.
- **El repo no versiona `.claude/settings.json`** (verificado: la ruta `.claude` da 404 en la
  rama). El paso "Permisos del agente sin escritura" del marco lo va a reportar como
  `::warning::` ruidoso, nunca verde mudo: lo no rastreado no se puede mirar.
- **El job `marco:` de `ci.yml:16-17` no declara `permissions:` a nivel de job.** El workflow
  los declara arriba, así que hoy funciona por herencia; declararlos en el job es lo que pide
  la regla `auditar-permisos-de-job-nuevo` y lo que evita que un cambio del workflow los
  saque sin que nadie lo note.
- **Las actions del `build_test` están una generación atrás** (`checkout@v4`, `setup-node@v4`,
  `pnpm/action-setup@v4`) frente a las que ya usa el consumidor viejo (`@v7`, `@v7`, `@v6`). No
  es de este change; el snippet del punto 2.8 usa `@v4` a propósito para no mezclar una
  actualización de dependencias con la migración de la constitución.
