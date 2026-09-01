# Arrancar un proyecto desde cero

Esta guía te lleva de **no tener repo** a **`ci-ok` verde y el primer change de
OpenSpec en marcha**. Es el caso «proyecto nuevo»; si el repo **ya existe** y hay
que meterle el marco, eso es otra cosa y vive en la skill `projects-adoptar`.

**Todo lo que dice acá está medido**, corriendo los comandos, no deducido de leer
los archivos. Donde algo falla, lo dice y dice el mensaje exacto que vas a ver.

**Para quién es esta página.** Para quien va a **ejecutar** el arranque y sabe
moverse en una consola: es un runbook técnico, denso a propósito, y no evita el
vocabulario del oficio. Si no sos técnico y tenés que arrancarlo igual, la
versión acompañada —paso por paso, con lo que vas a ver en pantalla— es
[04-arrancar-acompanado.md](04-arrancar-acompanado.md); esta página
sigue siendo la que manda cuando las dos se contradigan.

**Palabras del marco que vas a ver acá**, cada una definida en una línea:
[ADR](02-glosario.md), [andamio](02-glosario.md), [archive](02-glosario.md),
[builder](02-glosario.md), [bump](02-glosario.md), [canónico](02-glosario.md),
[capability](02-glosario.md), [carril](02-glosario.md), [censo](02-glosario.md),
[change](02-glosario.md), [ci-ok](02-glosario.md), [CODEOWNERS](02-glosario.md),
[compuerta](02-glosario.md), [constitución](02-glosario.md), [delta](02-glosario.md),
[guardrail](02-glosario.md), [marcador](02-glosario.md), [PO](02-glosario.md),
[PRD](02-glosario.md), [pin](02-glosario.md), [proposal](02-glosario.md),
[requirement](02-glosario.md), [ruleset](02-glosario.md), [scaffold](02-glosario.md),
[spec](02-glosario.md).

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
aplica nada ([12-upgrade-openspec.md, trampa 3](12-upgrade-openspec.md)).

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
cosa comprobable de un comando, y es que el inventario **no encoja**: el archivo tiene **8**
gemelos y **25** bloques ` ```bash `, y eso lo dicen
` grep -c '^```powershell' docs/05-arrancar-tecnico.md ` y ` grep -c '^```bash' ` sobre el
mismo archivo. Está probado a la mala, que es la única forma de saber que un check sirve:
borrando cada gemelo, uno por uno, sobre una copia. Todos bajan el conteo y ponen la
comprobación en rojo — ninguno se escapa.

Esos dos números tampoco quedan librados a que alguien se acuerde de recontarlos: están en el
registro de cifras de `pruebas/docs/comandos-que-existen.test.mjs`, que los mide sobre este
mismo archivo y se pone rojo el día que la prosa se queda atrás. Hizo falta: estuvieron
escritos de más durante varias versiones, y nadie se enteró hasta que alguien volvió a contar
a mano.

Lo que ese conteo **no** ve, y conviene decirlo antes de que alguien se confíe: que entre un
bloque ` ```bash ` **nuevo** que no sea portable, y que entre sin su gemelo. El lado bash sube
en uno y la comprobación se pone roja, sí, pero roja **porque el inventario cambió**, no
porque falte un gemelo: quien la vea puede apagarla subiendo el número escrito sin haberse
preguntado si el bloque nuevo era portable. Ya pasó: el lado bash creció el día que la sección
3.1 sumó un bloque `node --input-type=module`, que **sí** corre igual en las dos shells — pero
eso lo decidió una lectura, no el conteo. Distinguir un caso del otro a máquina pide adivinar
qué comando corre igual en las dos shells, y adivinar es exactamente lo que un check no debe
hacer; así que eso hoy lo ve una persona leyendo el diff, y por eso es otra fila del mismo
[backlog de automatización](11-reglas-no-escritas.md#backlog-de-automatización) que la
comprobación de prerrequisitos del punto 3. Ojo con esa ancla si la vas a buscar con `grep`:
lleva tilde, y `grep -i` pliega mayúsculas pero **no** acentos, así que escrita sin tilde la
búsqueda devuelve **cero** coincidencias y sale **1** — que se lee como que el enlace está
roto, cuando no lo está. Lo que sí lo demuestra es buscar el encabezado del otro lado:
` grep -n '^## Backlog de automatización' docs/11-reglas-no-escritas.md ` contesta con una sola
línea. Cuál es esa línea no se escribe acá, y no es descuido: el número se corre solo con cada
párrafo que alguien agregue más arriba en esa página, y quien lo lea viejo va a creer que el
enlace se rompió — que es exactamente el susto que este párrafo existe para evitar. Lo que
importa es que la respuesta sea **una sola** línea, y eso el comando lo imprime.

⚠️ **Ninguno de los gemelos se ejecutó, y en CI no corre ninguno.** El
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
uv --version                        # la herramienta de descubrimiento lo exige (ver 08)
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
[backlog de automatización](11-reglas-no-escritas.md#backlog-de-automatización).

### 4. Los documentos del negocio, si ya existen

Si el PO ya hizo el trabajo de negocio —entrevistó gente, levantó los procesos, escribió
los casos raros, hizo un prototipo—, esos archivos son tu punto de partida. **No van al
repositorio**: pueden tener nombres de empleados, clientes y proveedores reales.
Tenelos a mano antes de empezar. Cómo se convierten en un PRD está en
[08-descubrimiento.md](08-descubrimiento.md), y cómo ese PRD se convierte en specs, en
[09-construir-con-openspec.md](09-construir-con-openspec.md).

### 5. El mapa

Ocho fases, de la 0 a la 7. Las **[otro]** arrancan primero porque bloquean el final, no
el arranque.

| Fase | Qué | Quién |
|---|---|---|
| 0 | Verificar lo que ya está hecho a nivel organización | **[vos]**, 4 comandos |
| 1 | Arrancar lo que depende de otra persona | **[otro]** |
| 2 | Juntar los valores — a mano, o contestando las preguntas del asistente | **[vos]** |
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
nuevo entra ahí, se renombra, y eso toca al repo que ya está en ese board: por eso está en
esta fase y no en la última.

```bash
gh project list --owner po
```

---

## Fase 2 — Los valores · **[vos]** + un dato de **[otro]**

`projects init` pide **23 valores**. Uno más, `PAQUETES`, se deriva de los otros y
no se pregunta: una lista escrita aparte de sus elementos se desincroniza sola.

> Esa cifra la mide el banco contra la lista `REQUERIDOS` de la herramienta, así
> que si envejece se pone roja acá y no en tu proyecto. Crece sólo cuando se
> agrega una **decisión** —no al agregar un archivo—, y eso pasa con un PR.

> **Hay dos formas de producir ese archivo, y las dos terminan en el mismo lugar.**
> Ésta —`--ejemplo` y editar— es la del builder: la explícita, la que no pregunta
> nada, la que sirve en una tubería. La otra es `--asistente`, que hace entre 9 y
> 17 preguntas en castellano y **deriva las 23 claves de las respuestas**: no
> pide un id de cuenta de AWS a quien no eligió AWS, ni un canal de Slack a quien
> avisa por correo. Genera este mismo archivo y lo valida con el mismo
> `validarValores`, así que no hay dos caminos que puedan divergir: hay un
> generador y una puerta.
>
> Si estás acompañando a alguien que no es técnico, mandalo a
> [04-arrancar-acompanado.md](04-arrancar-acompanado.md), que está escrita
> alrededor del asistente. Si sabés qué querés, seguí con `--ejemplo`.
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
grep -o 'mcp__[0-9a-f-]\{36\}' <ruta-a-un-repo-que-ya-funciona>/.claude/settings.json | sort -u | head -1
```

```powershell
Select-String -Path "<ruta-a-un-repo-que-ya-funciona>\.claude\settings.json" -Pattern "mcp__[0-9a-f-]{36}" -AllMatches |
  ForEach-Object { $_.Matches.Value } | Sort-Object -Unique | Select-Object -First 1
```

El valor va **sin** el prefijo `mcp__`. Con el valor mal, el andamio queda con cinco
entradas de allowlist que no matchean ninguna herramienta y cada lectura de Slack te
pide permiso a mano. **Ningún check lo detecta**: lo único que se verifica es que no
sobrevivan marcadores `{{...}}`, y un UUID de ceros no es un marcador.

---

## Fase 3 — El repo · **[vos]** · dos comandos

```bash
gh repo create <org>/<proyecto> --private --clone
cd <proyecto>
node <ruta-al-clon-de-projects>/herramientas/projects-init.mjs \
  --valores <ruta>/valores.json --destino .
```

```powershell
gh repo create <org>/<proyecto> --private --clone
cd <proyecto>
node <ruta-al-clon-de-projects>/herramientas/projects-init.mjs --valores <ruta>/valores.json --destino .
```

Lo único que cambia es la barra invertida del final de línea, que en PowerShell **no
continúa el comando**: parte la invocación en dos y `node` arranca sin `--valores`. La barra
de las rutas no hace falta cambiarla — Node y `gh` aceptan `/` en Windows.

Eso es todo. **No hay una segunda pieza que traer**: `projects init` escribe **el andamio
entero** — la mecánica, los tres paquetes con sus pruebas pasando, **y los dos directorios
de infraestructura**. La corrida te lo dice sola en su primera línea, con la forma
`escritos N archivos, M ocurrencias sustituidas`; qué hacer con esos dos números está en
3.1. **Acá no van escritos a propósito**: crecen con cada archivo que entra al andamio, y
esta línea ya los tuvo mal por eso.

Si el repo que querés usar **ya existía**, el primer comando falla: eso es la 3.3.

### 3.0 Las otras cuatro banderas, y la única que vas a necesitar algún día

Además de `--valores` y `--destino`, que son las del comando de arriba, la herramienta
acepta cuatro banderas más.
`node <ruta-al-clon-de-projects>/herramientas/projects-init.mjs --help` las imprime todas —
la lista de acá sale de esa salida, no de la memoria de nadie. Tres son de escape y se usan
poco; la cuarta merece un párrafo porque su ausencia **aborta el arranque** y el mensaje no
se parece a un problema de banderas.

| Bandera | Cuándo |
|---|---|
| `--ejemplo` | Fase 2: imprime el esqueleto de `valores.json` |
| `--asistente` | Fase 2 por preguntas: deriva los 23 valores de 9 a 17 respuestas en castellano. Exige terminal; sin TTY imprime las preguntas y sale 2 |
| `--solo-valores <ruta>` | Con `--asistente`: escribe el archivo y no arma nada. Gemelo interactivo de `--ejemplo` |
| `--forzar` | Sobrescribe un destino que **ya tiene** archivos del andamio. Es la bandera que apaga la protección contra pisar trabajo: se usa para reintentar un arranque que se cortó a la mitad, no para «probar otra vez» |
| `--sin-herramientas` | No corre `openspec init` ni el render de la constitución. Te deja el andamio copiado y nada más — el repo queda **sin** `openspec/` y sin `.projects/`, o sea sin las dos piezas de la la página 08 |
| `--version-openspec <x.y.z>` | Ver abajo |

⚠️ **`--version-openspec` es el escape para cuando el pin no se puede leer.** La herramienta
**no lleva el número adentro**: lo lee del `default` del input `version_openspec` de
`.github/workflows/marco-ci.yml`, en el clon del marco desde el que la corrés. Una sola
declaración, para que no haya dos que puedan divergir. Si ese archivo no está —un clon
parcial, un *sparse checkout*, un fork sin `.github/workflows/`, la herramienta copiada
fuera de su árbol— la corrida **aborta sin escribir nada** y lo dice entero:

```
::error::no encontre <ruta>/.github/workflows/marco-ci.yml. De ahi sale el pin del CLI de
OpenSpec (el `default` del input `version_openspec`), y sin el este arranque no puede correr
`openspec init`. NO se escribio nada. Dos salidas: pasa el pin a mano con
--version-openspec <x.y.z>, o corre esto desde un clon COMPLETO del repo del marco (un clon
parcial o un fork sin .github/workflows/ no trae ese archivo). Si el arranque no necesita
las dos herramientas, --sin-herramientas tampoco lo pide.
```

Las dos salidas son literales: o corrés desde un clon completo —que es lo normal y lo que
dice la sección 2 de esta guía— o pasás el pin a mano. Para saber qué número pasar, el
comando está en [12-upgrade-openspec.md](12-upgrade-openspec.md); si no tenés el archivo, tampoco
tenés de dónde leerlo, así que sale del repo del marco en GitHub.

**Espera una versión EXACTA**, no un rango ni `latest`, y lo comprueba **antes** de tocar
un solo archivo:

```
::error::--version-openspec = "latest" no es una version exacta x.y.z (se espera algo como
0.9.4, sin rangos ni "latest"). No se escribio nada. Ese valor se concatena en la linea de
comandos del ejecutor de paquetes: en Windows esa invocacion va por cmd.exe sin escapar los
argumentos.
```

El motivo está en el propio mensaje y no es pedantería: ese valor termina dentro de la línea
de comandos de un proceso hijo. Y ⚠️ **la bandera lleva valor: si la escribís al final del
`argv` sin él, el error de arriba es lo que te salva** — antes se colaba como `undefined` y
llegaba entera hasta el `npx`.

### 3.1 Qué quedó en el repo

**Van a quedar bastantes más archivos de los que dice el mensaje `escritos N`, y las dos
cosas están bien.** El mensaje cuenta **sólo el andamio**; los otros dos pasos escriben
por su cuenta y no entran en esa cuenta:

| De dónde | Cuántos |
|---|---|
| El andamio — lo que `projects init` copia y sustituye | El `N` de `escritos N archivos` |
| `openspec init`, que `projects init` corre en su último paso | **25**: 6 comandos `/opsx:*`, 6 skills `openspec-*`, y el árbol de `openspec/` |
| El render de la constitución | **2**: `.projects/AGENTS-marco.md` y `.cursor/rules/00-marco.mdc` |

⚠️ **La cifra del andamio no está escrita acá a propósito, y esta línea la tuvo mal.**
Traía dos cifras fijas —la del andamio y el total— y las dos crecen con cada archivo que
entra a `plantilla/`: se movieron entre dos mediciones **del mismo día**, con un archivo
nuevo en el medio. La que vale es la que imprime **tu** corrida. Si querés el
número antes de correr nada, el comando está en el encabezado de
`herramientas/projects-init.mjs`, bajo *ESOS CUATRO NUMEROS SE MIDEN*:

```bash
cd <ruta-al-clon-de-projects> && node --input-type=module -e '
import { archivosDelAndamio } from "./herramientas/projects-init.mjs";
console.log(archivosDelAndamio("plantilla").length);
'
```

⚠️ **El artefacto de la constitución va a declarar `version=1.6.0` y no 1.7.0, y está bien.**
Versiona el **canónico**, no el release: como el texto del canónico no cambió en la 1.7.0, el
artefacto sigue siendo el correcto. Verificado — el check da exit 0 y dice «la porción del
marco está al día en 2 superficies».

| Directorio | Qué hay |
|---|---|
| `api/` | Express + TS + Prisma + **Supabase Auth** (el token se verifica en el propio API, sin llamada de red por request), con `lib/log.ts`, `middleware/auth.ts`, `middleware/errorHandler.ts`, `requestId.ts`, `asyncHandler.ts` — y **48 pruebas** |
| `web/` | React + Vite + Tailwind + **Supabase Auth** (`src/auth.ts` es el único archivo que importa el SDK del proveedor), con **25 pruebas** |
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
viene de acá. La compuerta llega cuando «este repositorio se despliega» sea verificable
para la forma que tengas delante: hoy el andamio reparte pipeline de despliegue **sólo
para la forma `sitio`** —que publica en Cloudflare Workers y no usa esta infraestructura—
y para una aplicación todavía no hay ninguno. El tramo entero está en
[10-publicar.md](10-publicar.md). Hasta entonces son disciplina, y se ven de un tirón:

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

⚠️ **El job «Sin marcadores del scaffold sin resolver» falla, y está bien.** Tu repo nace con
**2 recuadros 🕳️**, los dos en `AGENTS.md`, que un humano tiene que resolver y borrar. El
andamio guarda un tercero, en `.github/proteccion-main.md`, pero ése no te llega: `projects
init` lo reemplaza por el bloque con el estado **medido** de la protección de rama, que es lo
que vas a leer en la fase 6.1. El marco cuenta los que quedan y los lee como bootstrap a
medias: mientras existan, ese job es rojo. **No es un defecto de tu repo ni del andamio.**

Y hay una razón por la que **no se pueden borrar antes del primer push**: la sección «Antes
del primer commit» de `AGENTS.md` se borra recién cuando sus pasos están hechos, y uno de
ellos manda generar el artefacto del marco con `gh workflow run actualizar-marco.yml` — un
workflow que para GitHub **no existe hasta que el push lo puso en `main`**. La protección de
rama de la fase 6.1 arrastra la misma condición: el check `ci-ok` no aparece en la lista del
ruleset hasta que alguna corrida lo haya reportado. El primer rojo es estructural.

**La secuencia que lo apaga:**

1. **Push a `main`** → el CI corre. Rojo en «Sin marcadores», verde en el resto.
2. **Aplicá la protección** (fase 6.1, las 4 reglas). Ahora `ci-ok` existe en el ruleset.
3. **Resolvé y borrá los 2 recuadros 🕳️**, que es trabajo real:
   - `AGENTS.md`, «Antes del primer commit»: revisá la tabla del stack y **borrá la fila**
     de lo que este proyecto no vaya a tener, y hacé los demás pasos que esa sección lista
     antes de borrarla entera.
   - `AGENTS.md`, «reglas de este repo»: escribí las propias, o borrá el recuadro si
     todavía no hay ninguna.
   - Y en `.github/proteccion-main.md`, donde ya **no** queda recuadro que borrar: pasá los
     🔴 a 🟢 con la fecha, y escribí el motivo de las diferidas. Ese archivo no pone rojo a
     este job, pero es el mismo trabajo y se hace en el mismo viaje.
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
- `TOKEN_ACTUALIZAR_MARCO` — **opcional**, y el consumidor que ya está en marcha
  nunca lo puso. Sin él el PR semanal de actualización nace sin checks; el propio workflow lo
  avisa y explica el rodeo.

**Variables (`vars`): ninguna.** El consumidor que ya está en marcha tiene cero.

⚠️ **`actualizar-marco.yml` nunca corrió en ningún repo de la organización.** El repo
nuevo va a ser el primer lugar donde se ejecute, y su cron cae el lunes siguiente al
arranque. No es un problema, pero conviene saberlo: si algo raro aparece un lunes al
mediodía, es eso.

---

## Cuando termines acá

El repositorio está armado, verificado y con sus ajustes puestos. Lo que sigue no
es de esta página: es **qué construir** y **cómo**.

- [08-descubrimiento.md](08-descubrimiento.md) — de los documentos del negocio a
  un PRD que dice qué hay que construir. Le habla al [PO](02-glosario.md).
- [09-construir-con-openspec.md](09-construir-con-openspec.md) — de ese PRD a un
  change de OpenSpec y de ahí a un pull request. Le habla al
  [builder](02-glosario.md).

Las dos vivían adentro de esta guía y se fueron: son el ciclo de trabajo, no el
arranque. Esta página termina cuando el repositorio está sano.

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
| Los 2 recuadros 🕳️ del andamio | El primer CI sale **rojo** en «Sin marcadores del scaffold sin resolver», y no se pueden borrar antes de que el CI corra | Fase 5.1 |
| Primer PR con el bootstrap adentro | Rojo en cobertura: el diff agrega el esqueleto entero | Fase 5 |
| **BMAD instalado DENTRO del repo** | El check de marcadores del scaffold da **rojo** por 2 archivos de BMAD, y `git add` falla con `Filename too long` en sus `__pycache__`. Se instala en un directorio aparte | La página 08 |
| **Entrar por la fase 1 de BMAD** | Sirve para sacarle información a alguien preguntándole, y el trabajo ya está hecho. Se entra por `bmad-prd`, que pide los documentos por nombre | La página 08 |
| **Esperar que BMAD genere los specs de OpenSpec** | No los genera, y no hay comando que convierta el PRD en deltas. El paso 7 es a mano, y es así a propósito | La página 08 |
| **Pedirle a BMAD un cambio sin commitear antes** | No hay deshacer: `.memlog.md` es bitácora de decisiones, no historial de versiones, y la skill no menciona backup | La página 08, paso 6 |
| **Armar la lista de cobertura leyendo el PRD** | Deja de servir para lo único que sirve: detectar lo que el PRD perdió. Sale de los documentos originales | La página 08, paso 4 |
| **Pasarle a la sesión el PRD y no los documentos** | Puede citar el PRD pero no la fuente: la lista de cobertura queda apuntando al intermediario | La página 09, paso 7 |
| **Pedir los cuatro artefactos de OpenSpec de una** | El PO gatea proposal y specs; si el design ya está escrito, su aprobación es un trámite | La página 09, paso 7 |
| **Empezar el change con `/opsx:propose`** | Genera los cuatro artefactos de un solo golpe —proposal, deltas, `design.md` y `tasks.md`—, así que el PO termina aprobando un proposal cuyo diseño ya está escrito. El comando que crea el change y **para ahí** es `openspec new change <nombre>`. Ver [09-construir-con-openspec.md](09-construir-con-openspec.md) |
| **Nombrar el change como el proyecto** | Un change se propone, se aprueba y se archiva; si su nombre abarca todo el sistema no puede cerrarse nunca. El nombre es la rebanada | La página 09, paso 7.a |
| **Editar el prompt de una skill de BMAD** | Dejás de usar una herramienta y empezás a mantener un fork ajeno. Si no entiende los documentos, ESO es el resultado: se anota y se sigue a mano | La página 08 |

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
| **`openspec archive` sobre Windows nativo** | Imprime **`Specs updated successfully`** y hace rollback de todo, specs incluidos. Verificado el 2026-08-14, reproducido dos veces | No mirar el mensaje: mirar `git status --short`. El procedimiento y los tres rodeos están en [12-upgrade-openspec.md, trampa 3](12-upgrade-openspec.md) |

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
fila al backlog de [reglas no escritas](11-reglas-no-escritas.md#backlog-de-automatización).
