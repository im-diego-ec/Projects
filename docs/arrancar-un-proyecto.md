# Arrancar un proyecto desde cero

Esta guía te lleva de **no tener repo** a **`ci-ok` verde y el primer change de
OpenSpec en marcha**. Es el caso «proyecto nuevo»; si el repo **ya existe** y hay
que meterle el marco, eso es otra cosa y vive en la skill `projects-adoptar`.

**Todo lo que dice acá está medido**, corriendo los comandos, no deducido de leer
los archivos. Donde algo falla, lo dice y dice el mensaje exacto que vas a ver.

Marcas que vas a encontrar:

| Marca | Significa |
|---|---|
| **[vos]** | Lo hacés vos, ahora |
| **[otro]** | Depende de otra persona o de un OK: **arrancalo temprano**, bloquea |
| **[auto]** | Lo hace una herramienta o el pipeline |
| ⚠️ | Falla **en silencio** o con un error que apunta al lugar equivocado |

> **Lo primero que hay que entender:** `projects init` deja el repo **completo** — la
> mecánica (pipeline, reglas, guardrails) **y** la aplicación (los tres paquetes con sus
> pruebas pasando). Un solo comando, una sola fuente. Hasta el 2026-08-22 el esqueleto de
> aplicación vivía en otro repo que había que clonar aparte; ese repo se borró y su
> reemplazo es el andamio.

---

## Antes de empezar: las cinco cosas que la guía da por sentadas

### 1. El sistema operativo y la shell, dicho de frente

Esta guía toca **dos superficies distintas** y conviene no confundirlas: **tu máquina**,
donde clonás el marco, corrés `projects init` y corrés `pnpm verificar`; y **el runner**,
que es `ubuntu-latest` y no lo elegís vos. Todo lo de esta sección es sobre la primera.

Qué está soportado, y qué significa «soportado»: cada bloque de comandos de la guía está
marcado con su lenguaje, y **donde el comando no es el mismo en los dos lados, la guía trae
el par**. Un bloque ` ```bash ` sin gemelo corre igual en las dos — es la mayoría, porque
`git`, `node`, `pnpm`, `npx` y `gh` son el mismo programa en los tres sistemas.

| Máquina | Shell | Cómo se ve acá |
|---|---|---|
| macOS, Linux, y **WSL** sobre Windows | `bash` o `zsh` | bloque ` ```bash ` |
| Windows nativo | **PowerShell 7+** (`pwsh`) | bloque ` ```powershell ` |

**En Windows la recomendación es WSL, y no es gusto.** El CI corre sobre `ubuntu-latest`:
adentro de WSL tu verificación y la del pipeline corren sobre el mismo sistema de archivos
—sensible a mayúsculas—, con los mismos fines de línea y sin el tope de 260 caracteres en
las rutas. Las cuatro filas de sistema de archivos de la tabla de fallos silenciosos del final
**desaparecen** en WSL; ninguna desaparece en PowerShell. Y hay una quinta, medida en este
repo: `openspec archive` sobre Windows nativo imprime **`Specs updated successfully`** y no
aplica nada ([upgrade-openspec.md, trampa 3](upgrade-openspec.md)).

PowerShell nativo **sigue soportado** —hay quien no puede instalar WSL— y por eso los pares
existen. Lo que **no** está soportado es `cmd.exe`, ni **Windows PowerShell 5.1**: la consola
azul, `powershell.exe`, la que ya viene con el sistema. 5.1 rompe esta guía en dos lugares
exactos: no entiende `&&` entre comandos (fases 4 y 5) —

```
The token '&&' is not a valid statement separator in this version.
```

— y su redirección `>` escribe **UTF-16**, que es cómo el `valores.json` de la fase 2 sale
ilegible para Node sin que nada lo avise. `pwsh` es una instalación aparte y contesta:

```powershell
$PSVersionTable.PSVersion.Major    # 7 o más
```

⚠️ **Git Bash no es WSL.** Trae los coreutils, así que los bloques ` ```bash ` corren tal
cual, pero abajo sigue habiendo NTFS: rutas largas, fines de línea y mayúsculas se comportan
como en Windows. Sirve para no traducir comandos; no te saca de ninguna fila de esa tabla.

#### Qué de esta promesa se comprueba con un comando, y qué no

Los pares son una promesa, y una promesa que nadie mide se rompe sola. Hoy hay **una sola**
cosa comprobable de un comando, y es que el inventario **no encoja**: el archivo tiene **9**
gemelos y **28** bloques ` ```bash `, y eso lo dicen
` grep -c '^```powershell' docs/arrancar-un-proyecto.md ` y ` grep -c '^```bash' ` sobre el
mismo archivo. Está probado a la mala, que es la única forma de saber que un check sirve:
borrando los nueve gemelos, uno por uno, sobre una copia. Los **nueve** bajan el conteo a 8 y
ponen la comprobación en rojo — ninguno se escapa.

Lo que ese conteo **no** ve, y conviene decirlo antes de que alguien se confíe: que un bloque
` ```bash ` **nuevo** que no sea portable entre sin su gemelo. El lado bash sube a 29 y la
comprobación se pone roja, sí, pero roja **porque el inventario cambió**, no porque falte un
gemelo: quien la vea puede apagarla cambiando el 28 por 29 sin haberse preguntado si el
bloque nuevo era portable. Distinguir un caso del otro a máquina pide adivinar qué comando
corre igual en las dos shells, y adivinar es exactamente lo que un check no debe hacer; así
que eso hoy lo ve una persona leyendo el diff, y por eso es otra fila del mismo
[backlog de automatización](reglas-no-escritas.md#backlog-de-automatización) que la
comprobación de prerrequisitos del punto 3. Ojo con esa ancla si la vas a buscar con `grep`:
lleva tilde, y `grep -i` pliega mayúsculas pero **no** acentos, así que escrita sin tilde la
búsqueda devuelve **cero** coincidencias y sale **1** — que se lee como que el enlace está
roto, cuando no lo está. Lo que sí lo demuestra es buscar el encabezado del otro lado:
` grep -n '^## Backlog de automatización' docs/reglas-no-escritas.md ` contesta con una sola
línea, la 475.

⚠️ **Ninguno de los nueve gemelos se ejecutó, y en CI no corre ninguno.** El
pipeline corre sobre `ubuntu-latest`, donde no hay `pwsh`; en la máquina donde se midió esta
guía, ` which pwsh powershell ` contesta *not found* y sale 1. Lo único que se les hizo fue
leerlos contra la sintaxis de PowerShell. Validarlos de verdad son dos escalones bien
distintos. El **barato** es parsearlos sin correrlos: un job en `windows-latest` que extraiga
los bloques y se los pase a `[System.Management.Automation.Language.Parser]::ParseInput`, que
devuelve los errores de sintaxis sin ejecutar nada — con una vuelta previa obligatoria,
sustituir los `<marcadores>`, porque `<` no es un token válido de PowerShell (ni de bash,
donde es redirección) y sin eso el parser los rechaza a todos por el motivo equivocado. El
**caro** es ejecutarlos, y ese no va a existir: estos bloques crean claves SSH, escriben en
`$HOME` y le hablan a la API de GitHub. Hasta que exista el barato, tratá cada bloque de
PowerShell de esta guía por lo que es — **revisado por lectura, no medido**.

### 2. El clon del marco

Toda la guía dice `<ruta-al-clon-de-projects>`. Ese clon **no viene de ningún lado**: lo traés
vos, una vez, y te sirve para todos los proyectos.

```bash
gh repo clone im-diego-ec/Projects
```

Anotá la ruta donde quedó. Es la que vas a pegar cada vez que la guía diga
`<ruta-al-clon-de-projects>`.

### 3. Las herramientas

**Seis comprobaciones**, y dos cosas que hay que dejar armadas para que dos de ellas
contesten lo que la guía espera. Si alguna no da lo que dice acá, resolvela **antes** de la
fase 0: todo lo que sigue lo usa.

```bash
node --version                      # 22 o más (el CI usa 22)
git --version                       # 2.34 o más — lo pide la firma por SSH de abajo
pnpm --version                      # 9.15.0 — lo fija el andamio con packageManager
gh auth status                      # autenticado. Necesitás scope admin:org (fase 3.2) y
                                    # admin del repo (fase 6)
git config --get commit.gpgsign     # tiene que decir true: el marco exige commits firmados
uv --version                        # la herramienta de descubrimiento lo exige (fase 7.1)
```

Los seis corren igual en `pwsh`, incluidos los comentarios: `#` también abre comentario ahí.
Por eso este bloque no tiene gemelo.

#### `corepack enable`, que es cómo se llega a ese `9.15.0`

`pnpm --version` no contesta `9.15.0` por casualidad. El número lo fija el andamio en
`package.json` —`"packageManager": "pnpm@9.15.0"`— y quien lo hace cumplir es **corepack**,
que viene adentro de Node y se enciende **una vez por máquina**:

```bash
corepack enable
```

Está acá porque es literalmente lo que hace el CI: `corepack enable` es el **segundo** paso de
`build-test` —el primero es `actions/checkout`—, y llega **antes** de `setup-node`; el
comentario del workflow dice por qué: «corepack en vez de una action de terceros: menos
superficie que auditar». La regla del área
es que tu máquina y el pipeline corran lo mismo; esta línea es la que lo garantiza para el
package manager.

⚠️ **Fuera de un repo con `packageManager`, `pnpm --version` no prueba nada.** Contesta lo
que corepack tenga por defecto, o lo que tengas instalado global, y podés pasar la
comprobación con la versión equivocada. La medición que vale es **dentro del repo, después
de la fase 3**. Antes de eso alcanza con que `corepack --version` conteste.

#### La firma de commits, por sistema operativo

`git config --get commit.gpgsign` tiene que decir `true`, y llegar ahí son **tres cosas, no
una**: algo que firme, una clave, y esa clave cargada en GitHub. Si falta cualquiera de las
tres, el síntoma es el mismo y no dice cuál falta:

```
error: gpg failed to sign the data
fatal: failed to write commit object
```

⚠️ Si `commit.gpgsign` no está en `true`, lo vas a descubrir en la fase 5, cuando el primer
commit falle — o peor, cuando entre sin firma y el ruleset la exija más adelante.

**Hay dos formatos de firma y el marco no exige uno.** El switch se llama `commit.gpgsign`
por historia, pero Git firma con GPG o con **SSH** según `gpg.format`, y GitHub verifica las
dos. Para un equipo repartido en tres sistemas operativos **la recomendación es SSH**: es la
misma clave con la que ya empujás, los comandos son idénticos en los tres, y no hay agente
ni pinentry que configurar — que es justo la parte que se rompe distinto en cada sistema.
Necesita Git 2.34 o más, y por eso `git --version` está en la lista de arriba.

```bash
ssh-keygen -t ed25519 -C "tu-correo"        # solo si todavía no tenés una
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true
gh ssh-key add ~/.ssh/id_ed25519.pub --type signing --title "firma"
```

```powershell
ssh-keygen -t ed25519 -C "tu-correo"
git config --global gpg.format ssh
git config --global user.signingkey "$HOME\.ssh\id_ed25519.pub"
git config --global commit.gpgsign true
gh ssh-key add "$HOME\.ssh\id_ed25519.pub" --type signing --title "firma"
```

El par existe por **una** razón, y es la que muerde: PowerShell **no expande `~`** en los
argumentos que le pasa a un programa externo. `gh` recibe una tilde literal y contesta que
no encuentra el archivo; `git config` la guarda tal cual y el fallo aparece recién en el
primer commit. `$HOME` sí se expande.

⚠️ **`--type signing` no es opcional, y es el error caro.** El default de `gh ssh-key add` es
`authentication` — que es como está cargada la clave que ya usás para empujar. Con esa sola,
tus commits se firman perfectamente en tu máquina y GitHub los muestra **sin el badge
Verified**: la misma clave tiene que estar cargada **dos veces, una por tipo**. Y cuando el
ruleset de la fase 6.1 exija firma, el rechazo llega en el push, no acá.

Si el área ya está parada en **GPG**, o ya tenés la clave, el camino es el de siempre y es lo
único de esta guía que cambia de verdad según el sistema operativo:

| Sistema | Cómo se instala | Lo que además hay que decirle a Git |
|---|---|---|
| **macOS** | `brew install gnupg pinentry-mac` | En `~/.gnupg/gpg-agent.conf`, `pinentry-program` apuntando a lo que conteste `which pinentry-mac` (la ruta cambia entre Apple Silicon e Intel). Sin eso la passphrase no se puede pedir y el commit falla con el `gpg failed to sign` de arriba, que no menciona pinentry por ningún lado |
| **Linux** | El paquete `gnupg` de la distro | Nada, si el agente ya corre. Si el commit falla desde una terminal sin TTY declarada: `export GPG_TTY=$(tty)` en tu perfil |
| **Windows nativo** | **Gpg4win** (trae GnuPG y Kleopatra) | `git config --global gpg.program "C:\Program Files (x86)\GnuPG\bin\gpg.exe"`. ⚠️ Git for Windows trae **su propio** `gpg`, y no es el que tiene tu clave: sin esta línea, `gpg --list-secret-keys` te muestra la clave y el commit igual falla |
| **WSL** | Igual que Linux, **adentro** de WSL | Nada. La clave vive en WSL y no en Windows: son dos llaveros distintos, y una clave cargada en Gpg4win no existe del lado de WSL |

Y en los cuatro casos el último paso es el mismo, y es el que se olvida — la clave
**pública** cargada en GitHub, o el commit se firma y llega sin verificar:

```bash
gpg --list-secret-keys --keyid-format=long     # de acá sale el ID largo
git config --global user.signingkey <ID>
git config --global commit.gpgsign true
gpg --armor --export <ID> | gh gpg-key add -
```

#### Y esto, hoy, depende de que te acuerdes

⚠️ Toda esta sección es una regla que se cumple **porque alguien la leyó**, y la doctrina del
marco dice que eso no cuenta. Lo que la convertiría en algo que falla solo es una
**comprobación de prerrequisitos ejecutable**: un comando que corra las seis verificaciones
de arriba, imprima cuál falló y salga distinto de 0. No se implementa acá — esta guía es la
**especificación de qué tiene que comprobar**, no el lugar donde vive. Mientras no exista,
el ítem es una fila del
[backlog de automatización](reglas-no-escritas.md#backlog-de-automatización).

### 4. Los documentos del negocio, si ya existen

Si el PO ya hizo el trabajo de negocio —entrevistó gente, levantó los procesos, escribió
los casos raros, hizo un prototipo—, esos archivos son tu punto de partida. **No van al
repositorio**: pueden tener nombres de empleados, clientes y proveedores reales.
Tenelos a mano antes de empezar. Cómo se convierten en specs está en la **fase 7.1**.

### 5. El mapa

Ocho fases, de la 0 a la 7. Las **[otro]** arrancan primero porque bloquean el final, no
el arranque.

| Fase | Qué | Quién |
|---|---|---|
| 0 | Verificar lo que ya está hecho a nivel organización | **[vos]**, 4 comandos |
| 1 | Arrancar lo que depende de otra persona | **[otro]** |
| 2 | Juntar los 21 valores | **[vos]** |
| 3 | Crear el repo y correr `projects init` | **[vos]**, 2 comandos |
| 4 | `pnpm install` y comprobar en local | **[vos]**, 1 comando |
| 5 | El primer push, directo a `main` | **[vos]** + **[auto]** |
| 6 | Settings del repo | **[vos]**, algunos con OK |
| 7 | El primer change de OpenSpec | **[vos]** + **[otro]** |

**La fase 5 es donde el primer CI sale rojo, y es esperado.** Está explicado en 5.1; no es
que hayas hecho algo mal.

---

## Fase 0 — Verificar, no hacer · 4 comandos, 30 segundos · **[vos]**

Cuatro de los pendientes que `projects init` te va a listar **ya están hechos a nivel
de organización** y son de una-vez-en-la-vida. Verificalos y seguí: abrir esas
pantallas es media hora perdida.

```bash
gh api orgs/im-diego-ec/dependabot/repository-access --jq '.accessible_repositories[].name'
```
→ tiene que aparecer `projects`. Es lo que deja que Dependabot lea el repo **privado**
del marco. Sin esto, ningún consumidor recibe versiones nuevas.

```bash
gh api repos/im-diego-ec/Projects/actions/permissions/access
```
→ `{"access_level":"organization"}`. Es lo que deja que tu repo haga `uses:` del
marco. ⚠️ Si faltara, el síntoma es un error de **repositorio no encontrado** que
parece un typo en la ruta del `uses:` — y la ruta está bien.

```bash
gh api orgs/im-diego-ec/installations --jq '.installations[].app_slug'
```
→ tiene que estar `claude`. Es el bot que contesta en los PRs.

```bash
gh api orgs/im-diego-ec/issue-types --jq '.[].name'
```
→ los tipos de issue del área. Es una de las dos dimensiones que la constitución
exige (la otra son las labels `area:*`, fase 6).

---

## Fase 1 — Arrancar lo asíncrono PRIMERO · **[otro]**

Estas dos cosas dependen de otra persona. Si las dejás para el final, te bloquean
el final.

**1. El PO en la organización y en su equipo.**

⚠️ El equipo `po` de la organización está **vacío** (`members_count: 0`), y nada lo
avisa: GitHub simplemente no asigna a nadie cuando `CODEOWNERS` nombra un equipo sin
miembros. Sin el PO adentro **no hay quién apruebe el proposal ni los specs**, que
es el primer paso del primer change.

```bash
gh api orgs/im-diego-ec/teams/po/members --jq 'length'   # hoy: 0
```

⚠️ **El handle es `po`.** No es `dserrano` — ese es su nombre en Slack, y en
GitHub pertenece a **otra persona**. Los tres handles "obvios" (`builder-uno`,
`builder-dos`, `dserrano`) existen en GitHub y son de terceros reales. Poner uno de esos
en `CODEOWNERS` no falla: asigna a un desconocido, o a nadie, sin decir nada.

**2. El issue macro en el Project del equipo.** Los pendientes macro **no** viven en el
repo: van al Project del área, y los hijos —los sub-issues por bloque— no van al board.
Decidido el 2026-08-23; la regla es la de la constitución y no cambió.

Hoy el único project del área es *«Roadmap del área»* (project 2). Si el proyecto
nuevo entra ahí, se renombra, y eso toca a otro repo: por eso está en esta fase y no en
la última.

```bash
gh project list --owner po
```

---

## Fase 2 — Los 21 valores · **[vos]** + un dato de **[otro]**

`projects init` pide **21 valores** (el 22.º, `PAQUETES`, se deriva y no se pregunta).
Sacá el esqueleto:

```bash
cd <ruta-al-clon-de-projects>
node herramientas/projects-init.mjs --ejemplo > valores.json
```

```powershell
cd <ruta-al-clon-de-projects>
node herramientas/projects-init.mjs --ejemplo | Set-Content -Encoding utf8 valores.json
```

El gemelo no usa `>` a propósito, y es el motivo por el que esta guía no soporta Windows
PowerShell 5.1: ahí `>` escribe **UTF-16 con BOM**. El archivo se ve perfecto en el editor,
y el `--valores` de la fase 3 lo rechaza con un error de sintaxis JSON sobre el primer
carácter, que se lee como si lo hubieras llenado mal. `Set-Content -Encoding utf8` deja UTF-8
sin BOM en `pwsh` 7, que es lo que Node espera.

La tabla completa de qué es cada uno está en
[`plantilla/README.md`](../plantilla/README.md), sección 2. Acá va sólo lo que
necesitás para **juntar todo antes de sentarte**:

**Los que contestás solo** — identidad y paquetes: `PROYECTO`, `ORG`,
`PAQUETE_API`, `PAQUETE_WEB`, `PAQUETE_E2E`, `GENERAR_CLIENTE_DATOS`,
`PREFIJO_RECURSOS`, `DOMINIO_DEV`, `DOMINIO_PROD`.

**Los que son un dato que hay que buscar** — no los inventes:

| Valor | De dónde sale |
|---|---|
| `CUENTA_DEV` / `CUENTA_PROD` | Los ids de AWS del área |
| `PERFIL_DEV` / `PERFIL_PROD` | Los perfiles de la CLI ya configurados |
| `BUILDER_1` / `BUILDER_2` / `PO` | Handles de GitHub **verificados** (ver el ⚠️ de la fase 1) |
| `EQUIPO_BUILDERS` / `EQUIPO_PO` | **Slugs** de equipo: `builders`, `po`. Sin `@` y sin la org |
| `CANAL_ALERTAS` | El canal de Slack del área |
| `ID_MCP_SLACK` | ⚠️ Ver abajo |

⚠️ **`ID_MCP_SLACK` no se genera ni se pide.** El ejemplo imprime un UUID de ceros,
que se lee como «generá uno» o «pedilo a alguien», y no es ninguna de las dos: es
cómo **tu cliente local** nombra al servidor MCP de Slack. Se saca de un repo que ya
funciona:

```bash
grep -o 'mcp__[0-9a-f-]\{36\}' <ruta-a-un-proyecto-anterior>/.claude/settings.json | sort -u | head -1
```

```powershell
Select-String -Path "<ruta-a-un-proyecto-anterior>\.claude\settings.json" -Pattern "mcp__[0-9a-f-]{36}" -AllMatches |
  ForEach-Object { $_.Matches.Value } | Sort-Object -Unique | Select-Object -First 1
```

El valor va **sin** el prefijo `mcp__`. Con el valor mal, el andamio queda con cinco
entradas de allowlist que no matchean ninguna herramienta y cada lectura de Slack te
pide permiso a mano. **Ningún check lo detecta**: lo único que se verifica es que no
sobrevivan marcadores `{{...}}`, y un UUID de ceros no es un marcador.

---

## Fase 3 — El repo · **[vos]** · dos comandos

```bash
gh repo create po/<proyecto> --private --clone
cd <proyecto>
node <ruta-al-clon-de-projects>/herramientas/projects-init.mjs \
  --valores <ruta>/valores.json --destino .
```

```powershell
gh repo create po/<proyecto> --private --clone
cd <proyecto>
node <ruta-al-clon-de-projects>/herramientas/projects-init.mjs --valores <ruta>/valores.json --destino .
```

Lo único que cambia es la barra invertida del final de línea, que en PowerShell **no
continúa el comando**: parte la invocación en dos y `node` arranca sin `--valores`. La barra
de las rutas no hace falta cambiarla — Node y `gh` aceptan `/` en Windows.

Eso es todo. **No hay una segunda pieza que traer**: `projects init` escribe **75 archivos
con 156 sustituciones** — la mecánica, los tres paquetes con sus pruebas pasando, **y los
dos directorios de infraestructura**.

Si el repo que querés usar **ya existía**, el primer comando falla: eso es la 3.3.

### 3.1 Qué quedó en el repo

**102 archivos**, y el mensaje dice `escritos 75`. Las dos cosas están bien, y el desglose
medido es este:

| De dónde | Cuántos |
|---|---|
| El andamio — lo que `projects init` copia y sustituye | **75** |
| `openspec init`, que `projects init` corre en su último paso (12 comandos `/opsx:*`, 12 skills `openspec-*`, y el árbol de `openspec/`) | **25** |
| El render de la constitución (`.projects/` y `.cursor/rules/`) | **2** |

⚠️ **El artefacto de la constitución va a declarar `version=1.6.0` y no 1.7.0, y está bien.**
Versiona el **canónico**, no el release: como el texto del canónico no cambió en la 1.7.0, el
artefacto sigue siendo el correcto. Verificado — el check da exit 0 y dice «la porción del
marco está al día en 2 superficies».

| Directorio | Qué hay |
|---|---|
| `api/` | Express + TS + Prisma + Clerk, con `lib/log.ts`, `middleware/errorHandler.ts`, `requestId.ts`, `asyncHandler.ts` — y **46 pruebas** |
| `web/` | React + Vite + Tailwind + Clerk, con **8 pruebas** |
| `e2e/` | Playwright, con una prueba de humo |
| `.github/`, `eslint.config.mjs`, `AGENTS.md`, … | La mecánica del marco |
| `.projects/`, `.cursor/rules/` | La porción de la constitución, renderizada al día |
| `infra/`, `infra-prod/` | Terraform de dev y de producción — **con pendientes de decisión adentro**, ver abajo |

**La tabla «Stack fijado» del `AGENTS.md` llega LLENA**, no con huecos, porque el andamio
implementa ese stack. Lo que hay que hacer es **borrar la fila —y su paquete— de lo que
este proyecto no vaya a tener**, no llenarla.

#### Los dos directorios de infraestructura, y por qué NO te van a poner el CI en rojo

`infra/` y `infra-prod/` llegan con **lo que se deriva de tus valores ya funcionando** —el
backend del state, el proveedor, la referencia a la base compartida del área, los dominios—
y con **los pendientes de decisión**: seis en dev y siete en producción. El séptimo es el de
**alarmas**, y existe solo en producción a propósito.

Cada pendiente dice tres cosas: qué falta, **con qué criterio se decide**, y qué garantía del
marco queda sin cumplir si no se hace. Están ahí para que no haga falta haber diseñado la
infraestructura del área para poder resolverlos.

⚠️ **Y no gatean todavía**, así que no confundas: el primer CI rojo de la fase 5.1 **no**
viene de acá. La compuerta llega con el trabajo de despliegue, porque hoy «este repositorio
se despliega» no es verificable — el andamio no reparte pipeline de despliegue. Hasta
entonces son disciplina, y se ven de un tirón:

```bash
grep -rn PENDIENTE-INFRA infra infra-prod
```

```powershell
Get-ChildItem -Recurse -File infra, infra-prod | Select-String -Pattern "PENDIENTE-INFRA"
```

**Cero recursos de Terraform**, y es deliberado: el andamio no reparte infraestructura sin
verificar, porque verificarla exige una cuenta real y un `apply` con OK humano — y repartir
sin verificar haría que cada proyecto herede los errores del último que la escribió. Lo que
hay son referencias a lo que **ya existe** y los pendientes que describen lo que falta crear.

### 3.2 Los equipos necesitan escritura sobre el repo, y nadie lo hace solo

`projects init` escribe un `.github/CODEOWNERS` que nombra a los equipos de la organización.
**Un equipo sin permiso de escritura sobre el repo es ignorado como code owner por GitHub,
sin ningún aviso** — lo dice el comentario del propio archivo. O sea: el review cruzado
que el marco promete queda asignado a nadie, el PR se ve perfectamente normal, y no hay
rojo que lo delate.

`gh repo create` **no** le da acceso a ningún equipo, y crear el repo desde la interfaz
tampoco. Es un paso propio.

Es **cambio de configuración de repo: pedí el OK antes** (frontera ⚠️ del marco).

```bash
gh api --method PUT orgs/im-diego-ec/teams/builders/repos/im-diego-ec/<proyecto> -f permission=push
gh api --method PUT orgs/im-diego-ec/teams/po/repos/im-diego-ec/<proyecto> -f permission=push
```

Verificalo, porque es exactamente de las cosas que fallan en silencio:

```bash
gh api orgs/im-diego-ec/teams/builders/repos --jq '[.[].name]'
gh api orgs/im-diego-ec/teams/po/repos --jq '[.[].name]'
```

El repo nuevo tiene que aparecer en las **dos** listas. Y si el equipo `po` todavía está
vacío (fase 1), el gate del PO tampoco se asigna: son dos condiciones y hacen falta las
dos — el equipo con acceso, y el equipo con gente.

### 3.3 Si el repo ya existía

No es el caso normal, pero pasa: alguien crea el repo cuando se decide el proyecto,
semanas antes de que empiece. `gh repo create` contra un nombre que ya existe devuelve
**422 `name already exists on this account`** y no hace nada.

Un comando lo dice antes, y no toca nada:

```bash
gh repo view po/<proyecto> --json name,isEmpty,defaultBranchRef
```

- **`Could not resolve to a Repository`** → no existe, seguí la fase 3 tal cual.
- **Contesta** → existe. Cambiá el primer comando por `gh repo clone` y dejá el resto
  igual: `projects init` escribe sobre el checkout, no necesita un repo virgen.

Si lo que hay es un `README.md` de placeholder, dejá que el andamio lo reemplace. Lo que
**no** se hace es borrar y recrear el repo para tener un arranque limpio: se pierde la
historia y cualquier issue que lo referencie, y no compra nada que este camino no dé.

---

## Fase 4 — Un solo comando, y es el lockfile · **[vos]**

```bash
pnpm install
git add -A && git commit -m "chore: bootstrap del proyecto con el marco"
```

⚠️ **Esto no es opcional y es lo único que falta.** El andamio trae los manifiestos con
sus rangos pero **no el lockfile**: un lockfile fija versiones exactas y no convive con
marcadores. El CI corre `pnpm install --frozen-lockfile`, así que sin este paso el primer
push **muere en su cuarto paso**:

```
ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with "frozen-lockfile" because
pnpm-lock.yaml is not up to date with <ROOT>/package.json
```

El lockfile entra al commit fundacional y queda versionado desde el primer día.

### 4.1 Comprobalo antes de pushear, con un comando

```bash
pnpm verificar
```

**Tiene que salir 0.** Corre, en este orden: generar el cliente de datos, `eslint .
--max-warnings=0`, `prettier --check`, el typecheck de los tres paquetes, las pruebas
**con cobertura**, y el build. Es la misma cosa que el CI, y la regla del área es correrla
**antes** de cada push — el CI es la corrida final, no el banco de pruebas.

> **Ojo con el orden, que costó una corrida descubrirlo:** el primer paso de `verificar`
> es `datos` (generar el cliente de Prisma) y está ahí por una razón. Si corrés
> `pnpm lint` a secas justo después de instalar, sin generar, te salen **8 errores de
> tipos sin resolver** apuntando a `$disconnect` — y el mensaje no dice «te falta generar
> el cliente». `verificar` lo hace en el orden correcto.

### 4.2 Lo que YA viene hecho, y que antes había que hacer a mano

Está acá para que no lo busques:

- Los **scripts que el CI invoca** (`lint`, `format:check`) y las devDependencies del
  linter y el formateador.
- Los **excluidos de cobertura del andamio** (`eslint.config.mjs`,
  `vitest.config.base.mjs`, las herramientas de agente), con su motivo escrito. Son
  archivos que el marco reparte y que ninguna prueba puede cubrir.
- El **cableado de `vitest.config.base.mjs`** en cada paquete y el proveedor de cobertura.
  Los scripts `test` ya corren `--coverage`: sin eso no se emite `lcov` y la compuerta del
  marco da rojo por «no se encontró ningún reporte».
- Los **umbrales en verde sin deuda declarada**: `api` en 100 % de líneas, `web` en 100 %
  en las cuatro métricas, contra un mínimo de 80.

---

## Fase 5 — El primer push va DIRECTO a `main` · **[vos]** + **[auto]**

Este es el paso de orden más importante de la guía, y va contra el instinto.

```bash
git add -A && git commit -m "chore: bootstrap del proyecto con el marco"
git push -u origin main
```

**No por PR.** Medido sobre el mismo árbol (93 archivos, 15 148 inserciones): entrando
**por PR** la compuerta de cobertura sale **exit 1**; entrando **por push a `main`**
sale `::notice:: NO APLICABLE` y **exit 0**. El plano del cambio mide «líneas que este
PR agrega sin pruebas», y el commit fundacional agrega el esqueleto entero.

Y hay una segunda razón que empuja al mismo lado: **el check `ci-ok` no aparece en la
lista de checks del ruleset hasta que el CI haya corrido una vez.** Así que el orden
real es:

```
push a main  →  CI corre  →  arreglar en main con más pushes directos hasta ci-ok verde
             →  RECIÉN AHÍ el ruleset  →  desde ese momento, todo por PR
```

Desde ese momento el proceso normal rige sin excepciones, y el primer PR de verdad ya
lleva un diff chico donde la compuerta de cobertura mide lo que tiene que medir.

### 5.1 Tu primer CI va a salir ROJO en un job, y es esperado

⚠️ **El job «Sin marcadores del scaffold sin resolver» falla, y está bien.** El andamio
reparte **3 recuadros 🕳️** —2 en `AGENTS.md`, 1 en `.github/proteccion-main.md`— que un
humano tiene que resolver y borrar. El marco los cuenta y los lee como bootstrap a medias:
mientras existan, ese job es rojo. **No es un defecto de tu repo ni del andamio.**

Y hay una razón por la que **no se pueden borrar todos antes del primer push**: el recuadro
de `proteccion-main.md` te manda aplicar la protección de rama, y eso **no se puede hacer
hasta que el CI haya corrido una vez** — el check `ci-ok` no existe en la lista del ruleset
hasta que alguna corrida lo haya reportado. El primer rojo es estructural.

**La secuencia que lo apaga:**

1. **Push a `main`** → el CI corre. Rojo en «Sin marcadores», verde en el resto.
2. **Aplicá la protección** (fase 6.1, las 4 reglas). Ahora `ci-ok` existe en el ruleset.
3. **Resolvé y borrá los 3 recuadros**, que es trabajo real:
   - `AGENTS.md`, «Antes del primer commit»: revisá la tabla del stack y **borrá la fila**
     de lo que este proyecto no vaya a tener.
   - `AGENTS.md`, «reglas de este repo»: escribí las propias, o borrá el recuadro si
     todavía no hay ninguna.
   - `.github/proteccion-main.md`: pasá los 🔴 a 🟢 con la fecha, y escribí el motivo de
     las diferidas.
4. **Push de nuevo** → verde.

Antes del segundo push, comprobá que no quedó ninguno. Sin salida es lo que buscás:

```bash
grep -rn "🕳" --include="*.md" .
```

```powershell
Get-ChildItem -Recurse -File -Filter *.md | Select-String -Pattern "🕳"
```

⚠️ **Este es el bloque donde el gemelo importa más, y también donde miente más fácil.**
Los dos comandos recorren el árbol entero, así que después de `pnpm install` barren también
`node_modules/` — tardan, y una coincidencia ahí abajo no es tuya. Y en la versión de
PowerShell, si estás en la consola azul de 5.1 el emoji no sobrevive al parseo del archivo:
**no encuentra nada y sale sin error**, que es exactamente lo que buscabas ver. Sin salida no
prueba nada si la herramienta no sabe leer el carácter. En `pwsh` 7 sí lo lee.

---

## Fase 6 — Settings del repo · **[vos]**, y algunos exigen OK

### 6.1 La protección de `main`

Está en [`.github/proteccion-main.md`](../plantilla/.github/proteccion-main.md) del
propio repo nuevo. ⚠️ **No apliques las 8 reglas.** Encendé las **4 probadas** y dejá
las otras diferidas con su motivo escrito: aprobación requerida + review de code
owner + bypass vacía, con un equipo de una persona, **deja el repo sin ninguna vía de
integrar**. El documento ya viene con esa separación hecha.

### 6.2 Las seis labels `area:*`

⚠️ No se heredan de ningún molde — ni el repo del marco las tiene. Un repo nuevo nace
sin ninguna, y la constitución las exige.

```bash
gh label create "area:backend"   --color 0052CC --description "Area: backend"
gh label create "area:ci-cd"     --color 006B75 --description "Area: ci-cd"
gh label create "area:datos"     --color FBCA04 --description "Area: datos"
gh label create "area:frontend"  --color 1D76DB --description "Area: frontend"
gh label create "area:infra"     --color 5319E7 --description "Area: infra"
gh label create "area:seguridad" --color B60205 --description "Area: seguridad"
```

### 6.3 Dependabot, en ESTE repo

⚠️ No se enciende solo: la configuración de code security de la organización tiene
`default_for_new_repos: null`. Settings → Advanced Security → **Dependency graph** y
**Dependabot security updates**.

```bash
gh api repos/im-diego-ec/<proyecto> \
  --jq '.security_and_analysis.dependabot_security_updates.status'   # enabled
```

```powershell
gh api repos/im-diego-ec/<proyecto> --jq ".security_and_analysis.dependabot_security_updates.status"
```

Por qué importa: el andamio pina el marco por **versión exacta**, y el único
mecanismo que trae versiones nuevas es el PR de Dependabot. Sin esto, el repo no
recibe bumps y **no aparece en el censo de consumidores** del marco.

### 6.4 Los secrets: son dos, y ninguno gatea el pipeline

- `CLAUDE_CODE_OAUTH_TOKEN` — para que el bot conteste. `claude setup-token` y
  `gh secret set`. Si falta, `claude.yml` sale rojo y nada más se rompe. Puede
  esperar.
- `TOKEN_ACTUALIZAR_MARCO` — **opcional**, y el un consumidor nunca lo
  puso. Sin él el PR semanal de actualización nace sin checks; el propio workflow lo
  avisa y explica el rodeo.

**Variables (`vars`): ninguna.** El un consumidor tiene cero.

⚠️ **`actualizar-marco.yml` nunca corrió en ningún repo de la organización.** El repo
nuevo va a ser el primer lugar donde se ejecute, y su cron cae el lunes siguiente al
arranque. No es un problema, pero conviene saberlo: si algo raro aparece un lunes al
mediodía, es eso.

---

## Fase 7 — El primer change de OpenSpec · **[vos]** + **[otro]**

El repo ya está verde. Lo que sigue es el trabajo.

`openspec/specs` y `openspec/changes` nacen **vacíos**, y ⚠️ **git no versiona
directorios vacíos**: quien clone el repo no los va a tener hasta que exista el
primer change. `validate --all --strict` sobre el árbol recién instanciado sale
verde, pero es un verde **vacuo** — no hay nada que validar.

⚠️ **El momento peligroso:** `openspec new change` deja el CI **rojo** hasta que el
change tenga su delta. Así que el change se crea y se completa en la misma sesión, o
se trabaja en una rama sin PR abierto todavía.

Los seis pasos y quién aprueba cada uno están en
[`AGENTS.md`](../AGENTS.md): proposal y specs los aprueba el **PO**; design y tasks
los revisa **el otro builder**. Los **12 comandos `/opsx:*`** y las 12 skills
`openspec-*` cubren el ciclo: los deja `openspec init`, que `projects init` corre en su último
paso — si ese paso falló, no están, y hay que correrlo a mano.

### 7.1 De los documentos del negocio a los specs, paso por paso

Esta sección es para el caso más común: **el PO ya hizo el trabajo de negocio** —entrevistó
gente, levantó los procesos, escribió los casos raros, hizo un prototipo— y hay que
convertir eso en specs de OpenSpec.

Antes de los pasos, tres palabras que se usan abajo:

| Palabra | Qué es |
|---|---|
| **BMAD** | La herramienta de descubrimiento. Se instala dentro de Claude Code como un montón de *skills*: le hablás y te va escribiendo documentos. Nadie del equipo la usó todavía |
| **PRD** | *Product Requirements Document.* Un documento en prosa que dice qué tiene que hacer el sistema. **Lo escribe BMAD** leyendo los documentos del PO. **No es un spec y no es contrato**: es material de lectura |
| **Delta** | El archivo de OpenSpec que dice qué cambia en los specs vivos. **Esto sí es el contrato**, y lo aprueba el PO |

Y la advertencia que evita la confusión más cara:

> **BMAD no genera specs de OpenSpec, y no hay ningún comando que convierta lo uno en lo
> otro.** BMAD llega hasta el PRD. De ahí en adelante los specs los escribe una sesión de
> agente **dentro del repo**, leyendo el PRD. Ese paso es trabajo, y es así a propósito: el
> contrato lo firma una persona.

#### Dos sesiones, y qué se hace en cada una

Es la pregunta que más marea, así que va primero:

| Sesión | Dónde se abre | Qué se hace ahí |
|---|---|---|
| **La del descubrimiento** | `~/descubrimiento-<proyecto>` | Instalar BMAD, la **lista de cobertura**, el PRD y sus vueltas de pulido (pasos 1 a 6) |
| **La del proyecto** | La carpeta del repo | El proposal, los deltas, y la **tercera columna** de la lista (pasos 7 y 8) |

**Los documentos del PO no se mueven nunca**: viven en la carpeta del descubrimiento y no
entran al repo. Lo que cruza son tres cosas: lo que el agente lee (el PRD y los documentos)
y **un archivo que se commitea**: la lista de cobertura.

#### El camino completo

```
documentos     ──►  lista de   ──►  BMAD  ──►  PRD  ──►  sesión en   ──►  proposal   ──►  lista
  del PO           cobertura         (5)      (5-6)      el repo          + deltas       completa
   (3)             col. 1-2                                 (7)             (7)          col. 3 (8)
 ─────────────── sesión del descubrimiento ───────────    ────── sesión del proyecto ──────
```

---

#### 1 · Un directorio aparte, fuera del repo

```bash
mkdir ~/descubrimiento-<proyecto>
cd ~/descubrimiento-<proyecto>
git init
```

⚠️ **Fuera del repo, y no es prolijidad: está medido que el CI se pone rojo.** Si instalás
BMAD dentro del repo del proyecto, dos de sus archivos traen marcadores entre dobles llaves
y el check «Sin marcadores del scaffold sin resolver» da **rojo** para siempre, sobre
archivos que nadie escribió ni puede arreglar. Y en Windows nativo `git add` falla con
`Filename too long` en los `__pycache__` de la herramienta — ver la tabla de fallos por
sistema operativo del final.

El `git init` de acá **no** versiona nada del proyecto: es para poder volver atrás si BMAD
sobrescribe algo (paso 6). En Windows nativo, dejale además un `.gitignore` con
`__pycache__/` y `.venv/` **antes** del paso 6: son salida de la herramienta, y son lo que
hace fallar ese `git add` justo cuando lo necesitás.

#### 2 · Instalar BMAD ahí

```bash
npx --yes bmad-method@6.11.0 install --yes --modules bmm --tools claude-code --directory .
```

Versión exacta, nunca el nombre pelado: es la regla del marco para todo comando que
descarga. Ensayado el 2026-08-20: **termina bien**, escribe unas 49 skills y ~2,9 MB.
Necesita `uv` (lo verificaste en «Antes de empezar»).

#### 3 · Poner los documentos del PO, numerados

Copialos a un subdirectorio y **numeralos al copiarlos**. Son **dos letras**, y el número es
el orden en que el PO te los entregó:

```
documentos/
  D01-procesos-recepcion.md        D = cualquier cosa escrita
  D02-casos-borde-recepcion.md
  D03-feedback-usuario.md
  P01-prototipo/                   P = el prototipo
```

**Por qué solo dos letras.** Una letra existe **únicamente si el localizador se resuelve de
otra manera**, y con eso el juego se reduce solo: en algo escrito el localizador es el
encabezado o el punto numerado que el archivo ya trae (`D01-3.2`); en el prototipo es el
rótulo de la pantalla o del control (`P01-detalle-de-recepcion`). El feedback escrito **es**
algo escrito, así que es `D`; el que vive dentro del prototipo es parte de `P`. Si algún día
aparece una **grabación**, ahí sí hace falta una tercera —`E`, con el localizador en
`hhmmss`— porque se resuelve distinto de las dos.

**Y para qué sirven los números, que si no se dice parecen burocracia:** son la única forma de
escribir «esto salió de acá» en el repo **sin copiar el documento al repo**. Los documentos
no entran nunca —pueden tener nombres de empleados, clientes y proveedores reales—, así que
lo que viaja es el código. `D01-3.2` se lee «el punto 3.2 del documento D01», y el `3.2` lo
trae el documento: no lo inventás vos.

#### 4 · La lista de cobertura · **sesión del descubrimiento**

**Qué es:** la lista de todo lo que dicen los documentos del PO, numerada, para poder
verificar después que nada se perdió. Tiene tres columnas y **acá se llenan las dos
primeras**; la tercera se llena en el paso 8, cuando existan los escenarios.

**Por qué va acá y no después del PRD:** con la lista hecha primero te sirve **dos veces** —
para revisar que el PRD no perdió nada (paso 6) y para revisar que los specs no perdieron
nada (paso 8). Hecha después, solo sirve para lo segundo.

Es trabajo mecánico y le sale bien a un agente. En la sesión del descubrimiento, este prompt:

```
Leé todos los archivos de documentos/ y armá la lista de cobertura en
lista-de-cobertura.md, con este formato exacto:

| id | de dónde | qué dice | destino |
|---|---|---|---|

Reglas:
- Una fila por AFIRMACIÓN, no por documento ni por párrafo. Si un pasaje dice dos
  cosas, son dos filas. Si un documento lista doce casos borde, son doce filas.
- id: I001, I002, … correlativo, sin saltos y sin reutilizar.
- "de dónde": el código del documento, guion, y el localizador QUE EL DOCUMENTO YA
  TRAE (un número de punto, un encabezado, el rótulo de una pantalla). Ejemplo:
  D01-3.2. Si el documento no numera nada, usá el ordinal del párrafo y marcalo
  con ~ (D01-~14) para que se sepa que ese número lo pusiste vos.
- Si la afirmación NO está en el documento y la estás infiriendo, escribí en "de
  dónde" la palabra DEDUCIDO y el ancla de lo que sí dice el documento.
- "qué dice": la CITA TEXTUAL del documento, no un resumen tuyo. Si el pasaje es
  largo, la oración que contiene la afirmación, no el párrafo entero. Copiá las
  palabras como están.
- Y con una sola excepción, que es obligatoria: reemplazá todo nombre de persona,
  cliente o proveedor real por su ROL ENTRE CORCHETES — «[jefe de bodega]»,
  «[proveedor]». Los corchetes importan: son lo que deja ver que ahí hubo un
  reemplazo, y sin ellos no se distingue una cita de una paráfrasis. Este archivo
  SÍ entra al repositorio, y los documentos no.
- "destino": dejala VACÍA. Se llena más adelante.

No leas ni uses ningún PRD para esto: la lista tiene que salir de los documentos
originales, que son la fuente. Si algo no está en los documentos, no lo agregues.
```

⚠️ **Lo más importante de ese prompt es «no uses ningún PRD».** Si la lista se arma leyendo
el PRD, deja de servir para lo único que sirve: detectar lo que el PRD perdió.

Lo que tiene que salir, con las tres primeras filas de ejemplo:

| id | de dónde | qué dice | destino |
|---|---|---|---|
| `I001` | `D01-3.2` | «No se recibe mercadería sin la orden de compra firmada.» | |
| `I002` | `D01-3.2` | «La firma la da [jefe de bodega] o su suplente.» | |
| `I003` | `DEDUCIDO` desde `D01-3.2` | el documento no dice qué pasa si la orden llega después de la mercadería | |

Fijate en tres cosas del ejemplo, porque son las que se rompen: el **mismo ancla** `D01-3.2`
sostiene dos filas —el pasaje decía dos cosas—; el corchete de `[jefe de bodega]` deja ver
dónde hubo un reemplazo; y la fila `DEDUCIDO` **no** lleva comillas, porque no es una cita de
nada: es algo que notaste vos.

#### 5 · Pedirle a BMAD el PRD

##### Antes: qué se decide acá, y qué ya está decidido

Es la duda más razonable de un proyecto nuevo: *¿le digo que es un sistema web, o le cuento el
proceso y que él decida si conviene un portal o un chatbot?* La respuesta corta es **ninguna de
las dos**, y por tres motivos distintos.

**1. La forma no se decide acá, y no la decide una herramienta.** El stack está fijado por el
marco: app web —React con Vite adelante, Express de API, Postgres por Prisma, Clerk para
identidad— sobre ECS y RDS. Apartarse de eso es una frontera ⚠️ que **se pregunta antes de
implementar**, y la contesta una persona. Así que no le preguntes «¿portal o chatbot?»: no es
su decisión. Y si al leer los documentos tu conclusión honesta es que esto no debería ser una
app web, eso **para el trabajo y se pregunta** — no se resuelve dentro de un PRD.

**2. La estructura inicial y el login YA están.** No son un change, ni un spec, ni una tarea
pendiente. Después de la fase 3 ya tenés corriendo, con sus pruebas pasando:

| Ya existe | Qué es |
|---|---|
| Una página con el nombre del proyecto | Y el estado del API leído en vivo |
| **Botón de ingreso y menú de usuario** | `ClerkProvider` cableado; `SignedOut` muestra *Sign in*, `SignedIn` muestra el usuario |
| `GET /api/health` | Abierto, es lo que verifica el pipeline |
| `GET /api/hello` | **Detrás de `requireAuth`**: la cadena de identidad ya funciona de punta a punta |
| `requestId`, `errorHandler`, logging | La mecánica de observabilidad que el marco exige |

Así que la pregunta «¿cómo sabe que no hay nada y tiene que crear la estructura y poner el
login?» no tiene que contestarse: **no hay nada que crear ahí**.

**3. Lo que el proyecto especifica es su negocio, y nada más.** Los ocho specs del marco
—`calidad-codigo`, `despliegue-ci`, `observabilidad`, `pipeline-entrega`…— hablan de **cómo se
trabaja y cómo se opera**, y llegan por referencia. El `openspec/specs/` del proyecto nace
vacío y es para **el comportamiento del producto**. Por eso el primer change de un proyecto
nuevo **no es «la base»**: es la primera rebanada de negocio, igual que en un proyecto que ya
existe.

##### Por qué un change sobre algo que ya existe se entiende más fácil

En un sistema en marcha el change se ve solo: *«ahora hay dos edificios y el estacionamiento es
por separado»* — hay un spec, y esto lo cambia. En un proyecto nuevo es **exactamente el mismo
trabajo**, con una sola diferencia: el spec **nace** en ese change en vez de modificarse.

| | Proyecto que ya existe | Proyecto nuevo |
|---|---|---|
| El delta dice | `MODIFIED` sobre un requirement vigente | `ADDED`: la capability nace acá |
| Todo lo demás | igual | igual |

No hay un modo «arranque» distinto. Lo que se siente distinto es solo que la primera vez no hay
nada contra qué contrastar, y para eso está la lista del paso 4.

**Lo que sí es decisión del día uno y va en el primer change**: qué roles existen y quién puede
qué, y las reglas del proceso. Lo que es decisión **técnica** —¿hace falta una cola?, ¿otra
base?— es frontera ⚠️: se pregunta, y va a `design.md` con su ADR. Nunca al PRD.

##### Antes: ¿una rebanada o todo el sistema?

Un proyecto nuevo es grande y la pregunta aparece sola. **BMAD no parte el trabajo en
changes, y eso es una decisión del marco, no una limitación.** Sus «épicas» viven en su fase
3, *después* de decidir la arquitectura —v6 las movió ahí a propósito, porque la arquitectura
cambia cómo conviene partir—, y esa fase no se adopta: el marco ya tiene `design.md`,
`tasks.md` y review cruzado. Así que **el PRD informa el recorte y el recorte lo firmás vos.**

Dos formas de trabajar, y las dos son válidas:

| | Cómo | Cuándo conviene |
|---|---|---|
| **Una rebanada** | Un `bmad-prd` con un alcance angosto declarado en el Brain dump. Un PRD, un change | Cuando querés recorrer el camino completo y ver dónde se traba |
| **Todo el área** | Un `bmad-prd` con el alcance grande, y después vos lo cortás en varios changes | Cuando ya conocés la herramienta y querés el mapa entero antes de empezar |

**Para el primer día, la rebanada angosta.** Un PRD del sistema entero te consume el día en
BMAD y no llegás a la mitad de OpenSpec; una rebanada de punta a punta te enseña todo el
camino en una tarde. Y hay una razón medida además de la práctica: el alcance **no se ensancha
mientras trabajás**, porque ensancharlo convierte «esto no lo cubrimos» en «eso quedaba
afuera», y ahí se pierde justo el hallazgo.

Las rebanadas que siguen son otro `bmad-prd` con otro alcance, u otro corte del mismo PRD.

⚠️ **BMAD tiene una fase 1 (Analysis) y no la vas a usar.** Sirve para *elicitar*, o sea
para sacarle la información a alguien preguntándole, y ese trabajo ya está hecho. El
proveedor la marca «Optional» y dice textual:

> *«Neither skill requires the other — start with `bmad-prd` directly if you already know
> what you're building.»*

**`bmad-prd` es una skill de Claude Code, no un comando de terminal.** Se invoca por su
nombre. Lo que va a pasar, en orden:

| | Qué hace | Qué hacés vos |
|---|---|---|
| 1 | Arranca sola: resuelve su configuración, lee el nombre y el idioma y te saluda | Nada |
| 2 | Detecta la intención: **Create** si no hay PRD, **Update** si ya hay, **Validate** si solo querés crítica | Nada. Si queda ambigua, pregunta |
| 3 | **Brain dump.** Es su primer movimiento y el que importa | Le pasás **rutas de archivo** o el texto pegado. No hace falta ningún formato particular |
| 4 | Dispara búsquedas web por su cuenta; te llega solo un resumen | Nada |
| 5 | **Stakes calibration** y **Working mode** | Contestás. Apunta a 2 o 3 idas y vueltas, no diez |
| 6 | El trabajo del modo elegido, y escribe la salida | Leés |

**¿Se le pasa un directorio o los archivos uno por uno?** No está verificado que la skill
acepte un directorio como tal; lo que sí es seguro es que la sesión **es Claude Code**, así
que puede listar el directorio y leer los archivos por su cuenta. Por eso el prompt de abajo
nombra el directorio **y le pide explícitamente que los liste**: si la skill solo maneja
rutas, la sesión las enumera sola. Para la prueba de media hora, en cambio, pasale **un solo
archivo por su ruta**.

El prompt de arranque:

```
Usá bmad-prd para armar el PRD.

Los documentos de entrada son TODOS los archivos del directorio documentos/ —
listalos y leelos todos, son la fuente. No hay documento previo de BMAD: el
trabajo de negocio ya está hecho.

Lo que hay que especificar ahora es solo esto: recepción de mercadería, desde que
llega el camión hasta que se concilia con la orden de compra. Corta antes del pago
al proveedor.

No propongas tecnología ni arquitectura: la forma ya está decidida y no es parte de
esto. Lo que necesito es el comportamiento que el negocio necesita.
```

Deja `prd.md`, `addendum.md` y `.memlog.md` (este último es su bitácora de decisiones, no el
PRD). **Los tres se quedan afuera del repo.**

🛑 **Si BMAD no entiende tus documentos, no le toques el prompt de una skill.** En el momento
en que editás una skill dejás de usar una herramienta y empezás a mantener un fork ajeno. Si
no los digiere, **eso es el resultado** — se anota y se sigue a mano.

#### 6 · Pulir el PRD, y contrastarlo contra la lista

**Antes de cada pedido grande, commiteá.** No hay deshacer: `.memlog.md` es bitácora de
decisiones, no historial de versiones, y la skill no menciona backup ni git.

```bash
git add -A && git commit -m "prd antes de pedir cambios"
```

**Se invoca la misma skill otra vez.** No hay una skill aparte para editar: `bmad-prd`
detecta que ya existe un `prd.md`, entra en modo **Update**, y hace un paso de **Reconcile**
— compara el PRD con lo que le decís y **muestra los conflictos antes de aplicar nada**. Si
lo que querés es que lo critique **sin tocarlo**, existe el modo **Validate**.

Y acá es donde la lista del paso 4 se cobra sola:

```
Compará prd.md contra lista-de-cobertura.md y decime, en una lista corta:
1. qué filas de la lista NO aparecen de ninguna forma en el PRD;
2. qué afirma el PRD que no tenga ninguna fila que lo respalde.
No corrijas nada todavía. Solo el reporte.
```

Lo primero es lo que el PRD perdió; lo segundo es lo que el PRD agregó por su cuenta. Las
dos cosas son decisiones tuyas, no de la herramienta: con el reporte en la mano volvés a
`bmad-prd` y le pedís los cambios.

#### 7 · La sesión del proyecto: proposal y deltas

Acá cruzás. Abrís una sesión de agente **en la carpeta del repo**, y eso importa: hereda sola
toda la constitución, porque el andamio dejó la cadena armada.

```
CLAUDE.md  ──importa──►  AGENTS.md  ──importa──►  .projects/AGENTS-marco.md
                         (lo del proyecto)         (las reglas del área)
```

Más `.claude/settings.json`, y los **12 comandos `/opsx:*`** y las 12 skills `openspec-*` que
dejó `openspec init` (lo corre `projects init` en su último paso; si ese paso falló, no están y
hay que correrlo a mano).

##### 7.a El nombre del change, que es lo primero que hay que elegir

**El nombre del change es la rebanada que vas a especificar, no el proyecto.** Es el error
más natural: uno viene de pensar «el sistema de compras» y ese es el nombre del *repo*, no de
un change. Un change es un pedazo que se propone, se aprueba, se implementa y se archiva; si
su nombre abarca todo el sistema, nunca va a poder cerrarse.

| ❌ | ✅ |
|---|---|
| `primera-version-del-sistema-de-compras` | `recepcion-de-mercaderia` |
| `compras` | `conciliacion-orden-remito` |

Es el mismo alcance que declaraste en el prompt del paso 5. Si ahí escribiste *«recepción de
mercadería, desde que llega el camión hasta que se concilia con la orden»*, el change se llama
`recepcion-de-mercaderia`.

Reglas del nombre: **kebab-case** (minúsculas y guiones), sin espacios, sin acentos, sin
mayúsculas. Si le pasás una descripción en vez de un nombre, el comando lo deriva solo
(*«agregar autenticación de usuarios»* → `add-user-auth`); si le pasás algo que no es
kebab-case, lo rechaza y te pide otro.

Y **la fecha no la pones vos**: los changes archivados llevan prefijo
(`2026-08-13-carril-docs-completo`) y lo agrega `openspec archive` al cerrar. Mientras el
change está vivo, es solo el nombre.

##### 7.b Crear el change

**El directorio lo crea el comando, no vos con `mkdir`.**

```
/opsx:new recepcion-de-mercaderia
```

⚠️ **No uses `/opsx:propose`.** Los dos crean el change, pero `propose` *«genera todos los
artefactos en un solo paso»* — proposal, deltas, `design.md` y `tasks.md` juntos —, y eso es
exactamente lo que rompe el gate del PO: aprueba un proposal cuyo diseño ya está escrito.
`/opsx:new` crea el change, muestra la plantilla del primer artefacto y **para**; sus propias
reglas dicen «no crear ningún artefacto todavía».

**¿Y OpenSpec no se queja de un archivo que él no creó?** No, y está medido: el change
`capa-descubrimiento` del propio marco tiene **seis archivos extra** adentro (un directorio
`piloto/` completo) y `openspec validate --all --strict` da *16 passed, 0 failed*, exit 0.
OpenSpec **ni lee ni valida** los archivos que no son sus artefactos — simplemente los ignora.

**Y por qué ahí y no en `docs/`:** porque la lista habla de los deltas. Cuando el delta cambia,
la lista cambia con él; tiene que viajar en el mismo PR, pasar por el mismo review y archivarse
con el change. En `docs/` se separaría de lo único que le da sentido y nada las mantendría
juntas.

Recién con el directorio creado, copiás la lista — el único archivo del descubrimiento que se
commitea:

```bash
cp ~/descubrimiento-<proyecto>/lista-de-cobertura.md \
   openspec/changes/recepcion-de-mercaderia/cobertura.md
```

```powershell
Copy-Item "$HOME\descubrimiento-<proyecto>\lista-de-cobertura.md" `
          "openspec\changes\recepcion-de-mercaderia\cobertura.md"
```

Dos diferencias, y las dos rompen callado: la continuación de línea en PowerShell es la
**comilla invertida**, no la barra; y `~` en un argumento suelto llega literal, así que
`Copy-Item` iría a buscar una carpeta llamada `~` dentro del repo. `$HOME` sí se expande.

##### 7.c El prompt

Le pasás **tres cosas, no una**: el PRD, los documentos originales y la lista.

```
Este es el PRD de este proyecto, ya revisado por mí:
  ~/descubrimiento-<proyecto>/prd.md

Los documentos originales del negocio, que son la fuente de todo, están en:
  ~/descubrimiento-<proyecto>/documentos/

Y la lista de cobertura ya está en
openspec/changes/recepcion-de-mercaderia/cobertura.md, con sus dos primeras
columnas llenas.

Escribí SOLO el proposal y los deltas de specs de este change:
  openspec/changes/recepcion-de-mercaderia/proposal.md
  openspec/changes/recepcion-de-mercaderia/specs/<capability>/spec.md

NO escribas design.md ni tasks.md todavía: el PO tiene que aprobar el proposal y
los deltas primero, y si el design ya está escrito su aprobación es un trámite.

Cada escenario que escribas tiene que corresponder a una o más filas de
cobertura.md. Si necesitás afirmar algo que no tiene fila, no lo inventes: decime
cuál es y por qué hace falta.
```

**El PRD solo no alcanza**, y por eso van los documentos: si es lo único que entra, la sesión
puede citar el PRD pero no de qué documento del PO salió cada cosa, y la lista queda
apuntando al intermediario en vez de a la fuente.

⚠️ **Crear el change deja el CI rojo hasta que tenga su delta.** Se crea y se completa en la
misma sesión, o se trabaja en una rama sin PR abierto todavía.

#### 8 · La tercera columna, y con eso el PR

Misma sesión del proyecto, con los deltas ya escritos:

```
Llená la columna "destino" de openspec/changes/recepcion-de-mercaderia/cobertura.md.

Cada fila recibe exactamente una de tres formas, y ninguna otra:
- el título del escenario que la implementa;
- "fuera de alcance: <razón>", si la afirmación es real y la dejamos afuera a
  propósito;
- "pregunta abierta: <la pregunta>", si el documento no la resolvía.

Prohibido "n/a", prohibido dejarla vacía y prohibido inventar un escenario para
llenarla: si una fila no tiene destino, DEJALA VACÍA y listámela aparte. Una fila
sin destino es algo que se perdió, y encontrarlo es para lo que existe esta lista.

No toques las dos primeras columnas: están congeladas desde el paso 4.

Y para las filas cuyo "de dónde" dice DEDUCIDO: no pueden quedar como un escenario
normal. O van como "pregunta abierta", o el escenario lleva escrita la marca de
supuesto. Escribir una deducción como si el documento la dijera deja una invención
indistinguible de un requerimiento real.
```

Las filas que te devuelva sin destino son el resultado más valioso del día: es lo que el PO
dijo y no llegó a ningún lado. Cada una se resuelve —entra como escenario, se declara fuera
de alcance, o se convierte en pregunta abierta— y recién entonces el PR está completo.

**Una pregunta abierta impide archivar el change.** Podés proponer y diseñar con dudas; no
podés convertirlas en contrato callándolas. Es la única parte de todo esto que es regla del
marco: el resto es convención, y **ningún comando valida esta lista** — `validate --strict`
no la mira.

La lista viaja en el mismo PR que los deltas: cuando el delta cambia, la lista cambia con él.
Su dueño es quien escribe el delta —una lista que llena un tercero después es una
reconstrucción— y su lector es el PO en el review, porque es lo que le permite revisar **por
contenido** en vez de por confianza.

Y lo que la lista **no** compra, dicho para que nadie se confíe: garantiza que cada escenario
tenga **procedencia**, no que la procedencia sea **buena**. Un documento puede contener una
mala idea, y la lista la va a rastrear con toda fidelidad hasta su origen.

---

#### Lo primero que hacés, y lleva media hora

**No está medido que BMAD sepa leer documentos como los del PO.** La documentación del
proveedor dice que lee un documento con **su** formato; que digiera procesos levantados,
listas de casos raros y un prototipo, no lo probó nadie.

Así que la primera media hora es exactamente esa prueba: **un documento solo**, antes de
abrirle todo. Si no lo entiende, ya sabés a qué te enfrentás y lo anotás. Lo que no se puede
es descubrirlo a media tarde y llamarlo «un problema de instalación».

#### Qué NO tocar de BMAD

BMAD hace mucho más que el PRD, y casi todo lo demás compite con algo que el marco ya tiene
resuelto y con gates que fallan solos.

| No tocar | Por qué |
|---|---|
| `bmad-architecture`, `bmad-create-epics-and-stories`, `bmad-sprint-planning` | Duplicaría las decisiones técnicas entre su `architecture.md` y el `design.md` y los ADRs del marco |
| `bmad-build`, `bmad-build-auto`, `bmad-code-review`, `bmad-qa-generate-e2e-tests`, `bmad-retrospective` | Compite con gates que ya funcionan solos: review cruzado por CODEOWNERS, PR por bloque, CI |
| El «flujo rápido» que produce un `tech-spec-<slug>.md` | Crearía un tercer carril al lado de «change de OpenSpec o PR directo», que es justo la ambigüedad que esa regla existe para cerrar |
| `bmad-product-brief` y la fase Analysis | Es para elicitar, y el trabajo ya está hecho |
| Los agentes de persona (`bmad-agent-architect`, `bmad-agent-dev`) | Son de las fases que no se adoptan |

#### Lo que de esto NO está verificado

Se dice en vez de rellenarse, porque un hueco declarado se resuelve en dos minutos el lunes
y una invención plausible cuesta la tarde:

- Si además de invocar la skill por nombre existe un comando `/bmad-prd`.
- Si el Brain dump acepta un **directorio** como entrada o solo rutas de archivo sueltas.
- Qué pregunta exactamente en **Stakes calibration** y en **Working mode**, y qué modos hay.
- Cuántas idas y vueltas toma el flujo completo más allá de las 2 o 3 declaradas.
- Qué hace si un documento de entrada no se puede leer: no hay manejo de error descrito.
- La ruta literal final de `prd.md`: depende de su `config.yaml`, que se genera al instalar.
- Si al entrar en **Update** hay un paso formal de aprobación de cada conflicto, o solo se
  muestran antes de aplicar.
- Si sin `uv` la skill falla visible o en silencio.

Lo que aparezca acá el lunes va al registro de la adopción, y de ahí a la corrección de esta
guía.

---

## Los fallos silenciosos, en una tabla

Si algo no cierra, buscá acá primero. Todos están medidos y todos **pasan en verde**
o apuntan al lugar equivocado.

| Qué | Síntoma | Dónde |
|---|---|---|
| `ID_MCP_SLACK` mal | Cinco entradas de allowlist que no matchean nada; permisos a mano para siempre | Fase 2 |
| `pnpm lint` sin generar el cliente de datos | 8 errores de tipos apuntando a `$disconnect`, no a «falta generar». `pnpm verificar` lo hace en orden | Fase 4.1 |
| Equipo `po` vacío | GitHub no asigna a nadie. El gate del PO no existe y nada lo dice | Fase 1 |
| **Equipos sin escritura sobre el repo** | GitHub **ignora** al code owner sin avisar: el review cruzado queda asignado a nadie y el PR se ve normal. `gh repo create` no da acceso a ningún equipo | Fase 3.2 |
| **El repo destino ya existía** | `gh repo create` devuelve 422 `name already exists` y corta el primer comando ejecutable de la guía | Fase 3.3 |
| Handle de GitHub equivocado | Asigna a un tercero real, o a nadie | Fase 1 |
| `@v1` en vez de versión exacta | No falla: el repo simplemente **no recibe versiones nuevas** ni aparece en el censo | Fase 6.3 |
| Dependabot apagado | Igual que arriba, y no hay aviso | Fase 6.3 |
| Labels `area:*` ausentes | La constitución las exige y nadie las crea | Fase 6.2 |
| Los 3 recuadros 🕳️ del andamio | El primer CI sale **rojo** en «Sin marcadores del scaffold sin resolver», y uno de los tres no se puede borrar antes de que el CI corra | Fase 5.1 |
| Primer PR con el bootstrap adentro | Rojo en cobertura: el diff agrega el esqueleto entero | Fase 5 |
| **BMAD instalado DENTRO del repo** | El check de marcadores del scaffold da **rojo** por 2 archivos de BMAD, y `git add` falla con `Filename too long` en sus `__pycache__`. Se instala en un directorio aparte | Fase 7.1 |
| **Entrar por la fase 1 de BMAD** | Sirve para sacarle información a alguien preguntándole, y el trabajo ya está hecho. Se entra por `bmad-prd`, que pide los documentos por nombre | Fase 7.1 |
| **Esperar que BMAD genere los specs de OpenSpec** | No los genera, y no hay comando que convierta el PRD en deltas. El paso 7 es a mano, y es así a propósito | Fase 7.1 |
| **Pedirle a BMAD un cambio sin commitear antes** | No hay deshacer: `.memlog.md` es bitácora de decisiones, no historial de versiones, y la skill no menciona backup | Fase 7.1, paso 6 |
| **Armar la lista de cobertura leyendo el PRD** | Deja de servir para lo único que sirve: detectar lo que el PRD perdió. Sale de los documentos originales | Fase 7.1, paso 4 |
| **Pasarle a la sesión el PRD y no los documentos** | Puede citar el PRD pero no la fuente: la lista de cobertura queda apuntando al intermediario | Fase 7.1, paso 7 |
| **Pedir los cuatro artefactos de OpenSpec de una** | El PO gatea proposal y specs; si el design ya está escrito, su aprobación es un trámite | Fase 7.1, paso 7 |
| **Usar `/opsx:propose` en vez de `/opsx:new`** | `propose` genera los cuatro artefactos en un solo paso, que es justo lo de la fila de arriba. `new` crea el change y para | Fase 7.1, paso 7.b |
| **Nombrar el change como el proyecto** | Un change se propone, se aprueba y se archiva; si su nombre abarca todo el sistema no puede cerrarse nunca. El nombre es la rebanada | Fase 7.1, paso 7.a |
| **Editar el prompt de una skill de BMAD** | Dejás de usar una herramienta y empezás a mantener un fork ajeno. Si no entiende los documentos, ESO es el resultado: se anota y se sigue a mano | Fase 7.1 |

### Y los que dependen de tu sistema operativo

Estos no salen del marco: salen de que **tu máquina no es el runner**. El CI corre sobre
`ubuntu-latest`, y las cuatro primeras filas son diferencias del **sistema de archivos** —
las cuatro desaparecen adentro de WSL, y ninguna desaparece en PowerShell nativo ni en Git
Bash, que corren sobre NTFS igual. La postura completa está en «Antes de empezar», punto 1.

| Qué | Síntoma real | Arreglo |
|---|---|---|
| **Rutas largas en Windows** | `git add` o `pnpm install` cortan con `Filename too long`, sobre un archivo que existe y que se puede abrir. El tope es de 260 caracteres y lo cuenta la ruta **completa**, así que aparece según dónde clonaste, no según qué archivo es: el mismo repo funciona en `C:\p\` y falla en `C:\Users\<vos>\Documents\Proyectos\…` | `git config --global core.longpaths true` arregla la mitad de git. La otra mitad —Node, pnpm— necesita la política **LongPathsEnabled** de Windows, que es cambio de sistema y pide administrador. Clonar cerca de la raíz lo esquiva sin permisos |
| **Los `__pycache__` de la herramienta de descubrimiento** | Es la fila de arriba, con nombre y apellido: el `git add -A` del paso 6 —el commit antes de pedirle cambios a BMAD— muere con `Filename too long` adentro de `~/descubrimiento-<proyecto>`, y sin ese commit no hay deshacer | Ese directorio tiene su propio `git init` (paso 1) y ningún `.gitignore`. Escribile uno con `__pycache__/` y `.venv/`: son salida de la herramienta, no material del descubrimiento, y no hay razón para versionarlos |
| **Fin de línea (CRLF)** | `pnpm verificar` sale rojo en el paso de formato sobre archivos que **nadie tocó**, y `git diff` no muestra nada: `[warn] Code style issues found in the above file(s). Run Prettier with --write to fix.` Está medido en este marco, el 2026-08-19: con `core.autocrlf=true` —el default de Git para Windows— los fixtures llegaban en CRLF, las pruebas los escribían en LF, y el diff veía el archivo entero reescrito: el caso «un cambio que solo **borra** líneas» pasaba a tener **2 líneas agregadas** y salía con **EXIT 1**. Quedaban 90 de 91 pruebas verdes, y la única roja lo era por el fin de línea del disco, no por el código | El andamio trae `.gitattributes` con `* text=auto eol=lf`, y por eso no es cosmético. Pero solo gobierna **desde** la fase 3: un checkout hecho antes ya está en CRLF en disco. `git config --global core.autocrlf false` y después `git add --renormalize .` |
| **Mayúsculas del sistema de archivos** | Verde en tu máquina, rojo en el CI y solo ahí: `error TS2307: Cannot find module './Boton'`. macOS y Windows no distinguen `boton.tsx` de `Boton.tsx`; Linux sí. Su hermano peor es el renombre: `git mv boton.tsx Boton.tsx` en macOS o Windows **no hace nada y no dice nada**, así que el repo se queda con el nombre viejo y vos ves el nuevo | `git config core.ignorecase false` en el repo, y renombrar con `git mv -f`. El typecheck ya ayuda —`forceConsistentCasingInFileNames` está prendido en el `tsconfig.base.json` del andamio— pero solo sobre lo que pasa por el compilador: la ruta de una imagen, un nombre dentro de un glob o un archivo nombrado en el YAML del CI no los mira nadie hasta el runner |
| **Windows PowerShell 5.1 en vez de `pwsh` 7** | Dos cortes exactos: `The token '&&' is not a valid statement separator in this version.` en las fases 4 y 5, y un `valores.json` en **UTF-16** que la fase 3 rechaza como JSON inválido en el primer carácter — lo que se lee como que llenaste mal el archivo | Instalar `pwsh` 7, que es un paquete aparte y convive con el 5.1. `$PSVersionTable.PSVersion.Major` tiene que decir 7 |
| **`openspec archive` sobre Windows nativo** | Imprime **`Specs updated successfully`** y hace rollback de todo, specs incluidos. Verificado el 2026-08-14, reproducido dos veces | No mirar el mensaje: mirar `git status --short`. El procedimiento y los tres rodeos están en [upgrade-openspec.md, trampa 3](upgrade-openspec.md) |

---

## Cómo evoluciona este documento

**Canónico.** Se actualiza cuando alguien arranca un proyecto y encuentra algo que
acá no está — que es exactamente para lo que sirve el primer ensayo. Si un paso te
trabó, la corrección va en el mismo PR que la arregla.

**Y para que ese ensayo deje evidencia y no una anécdota**: llená el
[registro de fricción](plantillas/registro-de-friccion.md) *mientras* corrés esta
guía, no después. Se guarda en `docs/adopciones/AAAA-MM-DD-<proyecto>.md`.

Sus dos reglas de uso, acá también porque son las que se rompen: **no arregles la
guía mientras la corrés** —arreglar sobre la marcha te deja un documento que
funciona para vos y para nadie más, y borra el dato que vinimos a buscar— y **un
tropiezo cuyo arreglo empieza con «hay que recordar que…» no va a la guía**: va como
fila al backlog de [reglas no escritas](reglas-no-escritas.md#backlog-de-automatización).
