# Design — el-arranque-no-supone-el-shell-ni-la-cuenta

## Contexto

Ocho ítems del catálogo de Rigel con una raíz común: el arranque daba por sentados el shell
y el tipo de cuenta de quien lo corre. Rigel los cerró con un solo shell (Git Bash), una sola
cuenta (su organización) y un PO derivado de sus equipos. Projects ofrece Windows con
`arrancar.cmd`, cuentas personales y de organización, y un PO **declarado** en el archivo de
valores. Cada decisión de abajo porta la propiedad y cambia el mecanismo cuando el de Rigel
no encaja o la medición de acá lo desmiente.

## Decisiones

### D1 — La BOM se saca por bytes, en la herramienta, y las tres

`leerValores(ruta)` (`herramientas/projects-init.mjs`) lee el archivo como bytes, saca la
BOM de UTF-8, UTF-16 LE o UTF-16 BE si está, decodifica y parsea. Lo usan las tres lecturas
de `main()`: el archivo de valores, el de respuestas del asistente y la compatibilidad de
`--asistente --valores`.

- **Por qué en la herramienta y no en la guía**: la guía ya tenía un gemelo de PowerShell
  que evitaba `>`, y declaraba 5.1 no soportado. Eso protege a quien lee la guía; la
  herramienta la corren también el asistente, la puerta web y quien escribe el archivo con
  su editor. Rigel probó primero el camino de la guía (`file valores.json`) y falló:
  verificaba el nombre de la codificación, no la propiedad.
- **Por qué sacar y no decodificar**: una BOM decodificada queda como U+FEFF delante de la
  primera clave. Medido con el mutante: 3 de 7 casos del banco en rojo.
- **Por qué no más tolerancia**: un JSON roto sigue tirando su `SyntaxError`. La tolerancia
  es de codificación, no de contenido.

### D2 — El PO se contrasta en `projects init`, y el mismo control se corre a pedido desde `projects-doctor`

El plan decía «en doctor o puerta». El árbol dice otra cosa:

- **La puerta no puede**: corre en un runner con `GITHUB_TOKEN`, que no tiene permisos de
  organización —listar los miembros de un equipo exige leer la organización—. Pondría
  siempre «no pude mirar».
- **El doctor, solo, llega tarde o temprano**: es el Paso 0 de quien no programa, corre
  antes de que exista el archivo de valores y su contrato es «los programas de esta
  máquina».
- **`projects init` es donde se escribe `CODEOWNERS`**, y ya mide la protección de rama con
  `gh` en solo lectura y tres estados (medido / no se puede / no pude mirar). El control va
  ahí, después de la sonda de protección, y **solo avisa**: el arreglo es la composición de
  los equipos, fuera del árbol del proyecto, y D1 del PO manda aviso para eso.
- **Y el doctor gana `--valores <archivo>`**, que corre la MISMA función: sirve en la fase 1
  de la guía técnica —antes de que exista el repo— y cuando los equipos cambian después. Ahí
  un problema medido sí sale 1: el doctor es un diagnóstico a pedido y su regla es que lo que
  bloquea sale 1.

**La propiedad, no la derivación.** Rigel deriva el PO como «equipo po menos builders» y se
planta si no es exactamente uno. Projects declara el PO; lo que se comprueba es que
`EQUIPO_PO − EQUIPO_BUILDERS` sea exactamente `{PO}`. Los cuatro modos de falla tienen nombre
(`vacio`, `solo-builders`, `varios`, `otro`) y mensaje con el arreglo. Los handles se comparan
sin mayúsculas, como GitHub.

**Seguridad de la invocación.** `gh api orgs/<org>/teams/<slug>/members --paginate --jq
'.[].login'` con `shell: false`; `ORG`, `EQUIPO_PO` y `EQUIPO_BUILDERS` se validan contra
`FORMATOS` antes, y un valor con forma de inyección devuelve `no-se-sabe` sin invocar nada.
La auditoría de `pruebas/init/projects-init.test.mjs` declara el residuo nuevo; su lector de
vectores se arregló para saltar literales enteros (con `[^\]]*` cortaba a la mitad de
`".[].login"` y reportaba un residuo que no existe).

**Lo que queda sin control, y se dice**: que el equipo tenga permiso de escritura sobre el
repositorio (sin él GitHub lo ignora). El repo puede no existir todavía cuando corre init.

### D3 — actionlint local: el pin del CI, el shellcheck del PATH, y nunca «válido» sin él

`herramientas/actionlint-local.mjs` porta la herramienta de Rigel con cuatro cambios:

1. **No baja shellcheck.** Rigel lo baja de un release que no publica checksums (medido: 13
   assets de la v0.11.0, ninguno de sumas) y lo ejecuta sin verificar; además sería una
   dependencia nueva del marco, que AGENTS.md pone en «pregunta primero». Se usa el del
   `PATH` —como el CI usa el del runner— pasado **explícito** (`-shellcheck=<ruta>`), y sin
   él se apaga explícito (`-shellcheck=`) y se avisa.
2. **En Windows se apaga explícito**, no solo «no se intenta»: con shellcheck en el `PATH`,
   actionlint lo encuentra solo y se cuelga igual.
3. **Techo de tiempo** (180 s para correr, 60 s por descarga): un hook colgado es peor que
   uno que no existe.
4. **Corre donde estás parado**, no en el clon del marco: sirve también para un consumidor,
   con la versión que declara el clon.

Tres códigos (0 verde, 1 hallazgos, 2 no pudo correr). El hook `pre-push` bloquea con 1 y
avisa con 2: un defecto de la herramienta local no puede frenar un push que el CI va a juzgar
igual. El `::error::` del paso de actionlint de `marco-ci.yml` nombra la herramienta.

**El doctor no la usa**, contra lo que decía el plan («que el pre-push y projects-doctor lo
usen en lugar del binario del PATH»): el doctor nunca usó actionlint —el árbol lo desmiente—,
y su público es quien arranca un proyecto, no quien edita workflows.

### D4 — La verificación final del bootstrap es `git grep --untracked`

`git grep` viene con git: corre igual en bash, PowerShell y cmd, y saltea lo que
`.gitignore` excluye. **`--untracked` no está en Rigel** y es la mitad que importa: medido,
sin la bandera un marcador en un archivo sin commit no aparece y el comando sale 1, y la
sección se llama «antes del primer commit». El patrón va entre comillas dobles, las únicas
que respetan los tres shells.

### D5 — El contraste de la protección encadena el id por nombre y declara POSIX

`ID=$(... --jq '.[] | select(.name == "main-protegida") | .id')` —por el nombre que el paso 2
del mismo documento le da, no `.[0]` como Rigel: con dos conjuntos de reglas el primero puede
ser otro— y `${ID:?...}` corta si no hay ninguno. La nota dice el shell y el error que da
PowerShell (`accepts 1 arg(s), received 3`). No se escribe un gemelo de PowerShell: la
sección es de mantenimiento, y un segundo bloque sin medir en Windows sería prosa que nadie
corrió.

### D6 — La tabla de diferidas lleva la condición que reactiva cada regla

Cumple el «disparador concreto» que el requirement vivo «Branch protection documentada como
paso manual» ya exigía. La aprobación requerida va marcada como **primera**, con el porqué:
con aprobaciones = 0 el gate del PO que `CODEOWNERS` cablea no se exige. La condición de la
primera fila trae su comando. **No se porta** lo de Rigel 2.0.0 que pasa esas dos reglas a
obligatorias con bypass declarado: depende de la compuerta del dueño del contrato, que en
Projects no existe (otro lote del catálogo, `dueno-del-contrato-*`).

### D7 — El cero falso de `grep` es una regla escrita, y su afirmación tiene banco

No se puede volver check (distinguir un `grep` bien escrito de uno que no puede matchear exige
adivinar la intención), y la regla de oro pide decirlo y decir qué se hace en su lugar: la
regla 11 de `docs/11`, con su fila en el backlog, y
`pruebas/docs/grep-y-tildes.test.mjs`, que mide el comportamiento con el `git` de la máquina
—en `LC_ALL=C`, que todo sistema tiene— para que la página no envejezca mintiendo. La
medición de acá corrige a Rigel: el cero falso depende del locale, no de git.

## Clasificación de distribución

| Pieza | Clasificación | Por qué esa |
|---|---|---|
| `herramientas/projects-init.mjs` (BOM, equipos) | Herramienta del marco | Corre desde el clon del marco; no viaja al proyecto |
| `herramientas/projects-doctor.mjs` (`--valores`) | Herramienta del marco | Ídem |
| `herramientas/actionlint-local.mjs` | Herramienta del marco | Tooling local: no entra al pipeline de ningún consumidor |
| `herramientas/hooks/pre-push` | Herramienta del marco | Hook del repo del marco, instalado a mano por enlace |
| Mensaje del paso de actionlint en `marco-ci.yml` | Referenciado | Es texto de un `::error::`; ningún input, permiso ni nombre de job cambia |
| `plantilla/AGENTS.md`, `plantilla/.github/proteccion-main.md` | Scaffold | Se copian una vez; los proyectos existentes no los reciben solos |
| Deltas en `calidad-codigo` y `gobierno-contribucion` | Canónico | Contrato del marco |
| `docs/05`, `docs/11` | Documentación del marco | No viajan |

## Qué lo hace cumplir solo

| Propiedad | Check que se pone rojo |
|---|---|
| BOM tolerada, por bytes, sacada | `pruebas/init/valores-con-bom.test.mjs` (7 casos; sin tolerancia caen 5, con la BOM decodificada caen 3) |
| PO contrastado contra los equipos | `pruebas/init/equipos-del-po.test.mjs` (14 casos, dos de ellos del doctor) |
| Invocación de `gh` sin residuo no declarado | `pruebas/init/projects-init.test.mjs`, auditoría de `execFileSync` |
| actionlint con el pin del CI y el hook que lo usa | `pruebas/herramientas/actionlint-local.test.mjs` (15 casos; el hook corrido de verdad con un `node` falso) |
| Verificación final portable y con `--untracked` | `pruebas/andamio/comandos-del-andamio-en-cualquier-shell.test.mjs` (corre el comando del documento en un repo de juguete) |
| Diferidas con condición, contraste encadenado y POSIX | el mismo banco (corre el bloque de contraste con un `gh` falso) |
| La regla del cero falso sigue siendo verdad | `pruebas/docs/grep-y-tildes.test.mjs` |

**Lo que depende de que alguien se acuerde**, declarado: que un documento del andamio que
**no** es uno de estos dos declare su shell (hay bloques `bash` en otros ocho); que el equipo
del PO tenga escritura sobre el repo; y la regla 11 misma.

## Alternativas descartadas

- **Bajar shellcheck como Rigel**: binario sin checksum y dependencia nueva sin OK humano.
- **Pinear el sha256 de shellcheck en la herramienta**: sería confiar en la primera descarga
  (TOFU) y sumar un pin que nadie mueve; queda como pendiente con OK humano.
- **El control de equipos en la puerta web**: `GITHUB_TOKEN` no lee equipos.
- **El control de equipos en rojo**: el arreglo vive fuera del árbol del proyecto.
- **`git grep -nE` sin `--untracked`** (Rigel): falso «no queda nada» antes del primer commit.
- **Gemelo de PowerShell para el contraste de la protección**: no medible en esta máquina ni
  en el CI (no hay `pwsh`), y la sección no es del camino de quien no programa.
- **Un lint de `grep` sobre tildes**: ruido que enseña a ignorarlo.
