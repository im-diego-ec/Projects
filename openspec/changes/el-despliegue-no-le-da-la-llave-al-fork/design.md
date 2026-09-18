---
artefacto: design
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: en-ejecucion
---

# Design — el-despliegue-no-le-da-la-llave-al-fork

## Clasificación de distribución

| Pieza | Forma | Por qué esa y no otra |
|---|---|---|
| `plantilla/.github/workflows/desplegar.yml` | **scaffold** | Es la topología del despliegue del proyecto —su plataforma, sus environments, su credencial—, que AGENTS.md pone del lado del proyecto. Pasarla a referenciado habría hecho viajar el arreglo solo, pero cambia quién manda sobre ese archivo (acción de «pregunta primero») y exige un workflow reusable con `secrets:` y environments del llamador, que es un diseño aparte. Se registra como alternativa, no se toma acá |
| `plantilla/sitio/README.md` | **scaffold** | Es la guía del paquete del proyecto; ya era scaffold |
| `docs/10-publicar.md` | **canónico** | Página del marco; no viaja |
| `openspec/changes/.../specs/despliegue-ci/spec.md` | **canónico** | Delta del contrato del marco |
| `pruebas/andamio/expresiones.mjs`, `pruebas/andamio/la-llave-del-despliegue.test.mjs` y los bancos ajustados | **canónico** (bancos del marco) | Corren en el CI de Projects contra el andamio; no viajan. Viven fuera de `openspec/changes/` desde el primer commit, como pide `config.yaml` |
| `openspec/cobertura-de-requirements.md` | **canónico** | Anclas de los casos que se movieron |

Nada **referenciado** ni **regenerado** cambia: ningún consumidor recibe este
arreglo con el bump, y por eso el parche manual va escrito en el CHANGELOG.

## D1 — La guarda es la condición del job, no el filtro ni el environment

Hay tres lugares donde se podía poner el freno, y dos no frenan al fork:

- **El filtro `branches: [main]` del disparo.** Compara el `head_branch` del CI
  que terminó; en un pull request desde un fork ese nombre lo elige el fork. Se
  deja —evita despertar el workflow por cada PR— con un comentario que dice que no
  es una guarda, y el banco lo afirma en voz alta: el modelo del disparo deja
  pasar al fork.
- **La política de rama del environment.** GitHub la compara contra el
  `GITHUB_REF` de la corrida (referencia de environments, leída el 2026-09-17), y
  bajo `workflow_run` el `GITHUB_REF` es **siempre la rama por defecto**
  (referencia de eventos: «Default branch»). O sea que un environment limitado a
  `main` **deja pasar** un job disparado por el CI de un fork. Sirve como segunda
  llave contra los otros caminos (una rama que dispara a mano un workflow editado,
  un workflow nuevo que alguien agregue), no contra este.
- **La condición del job.** Es la única que ve el evento. Es la guarda.

**La aprobación de workflows de colaboradores nuevos tampoco es una guarda.** En
un repositorio público GitHub pide aprobar la primera corrida de un colaborador
nuevo, pero alcanza con un PR mergeado antes para saltearla, y quien aprueba el CI
de un PR no está aprobando un despliegue.

## D2 — Qué mira la condición, cláusula por cláusula

Bajo `workflow_run`, el job `dev` exige:

| Cláusula | Qué frena | Caso del banco que se pone rojo sin ella |
|---|---|---|
| `conclusion == 'success'` | un CI en rojo | «push propio a main con el CI en rojo» |
| `workflow_run.event == 'push'` | el CI de **cualquier** pull request, propio o ajeno: mide una mezcla que no está en `main` | «pull request del mismo repositorio desde su main hacia otra base» |
| `head_branch == 'main'` | un push a otra rama, si el CI del proyecto llegara a correr ahí; no se apoya en el filtro | «push a una rama que no es main» |
| `head_repository.full_name == github.repository` | un commit de otro repositorio | «defensa en profundidad: un push cuyo commit viene de otro repositorio» |

**Por qué dos cláusulas contra el fork y no una.** Hoy `event == 'push'` alcanza
—un fork no puede hacer push al repositorio— y `head_repository` también alcanza
—el commit de un PR de fork vive en el fork—. Cada una sola deja la seguridad
colgada de **un** campo del evento; las dos juntas exigen que GitHub se equivoque
dos veces. El caso de defensa en profundidad lo declara: GitHub no produce hoy ese
evento, y el banco lo exige igual para que la cláusula no sea decorativa.

**Mayúsculas.** GitHub compara cadenas sin distinguirlas (referencia de
expresiones): `'Main' == 'main'` es verdadero. El banco lo tiene como caso
propio, porque es la forma más barata de creer que el nombre de la rama frena algo.

**«Repo propio» en el disparo a mano.** El lote pedía exigirlo también para
`workflow_dispatch`. No se escribe: bajo ese evento el código sale siempre de un
ref de **este** repositorio —disparar exige permiso de escritura—, así que
`github.event.repository.full_name == github.repository` sería una cláusula que no
puede dar falso, y el banco exige que toda cláusula tenga un caso que la ponga
roja. Lo que sí varía a mano es la **rama**, y esa se exige.

## D3 — El disparo a mano sale solo de `main`

**Por qué.** El permiso de Workers de Cloudflare es de la **cuenta entera**: no se
puede acotar un token a un solo Worker (documentación de permisos de Cloudflare,
leída el 2026-09-17). La credencial de DEV puede, entonces, lo mismo que la de
producción, y el código que la alcanza tiene que haber pasado por un PR.

**Choca con un escenario vivo, y se resuelve con un `MODIFIED`.**
`despliegue-ci` · «La rama determina el ambiente de destino» decía que un disparo
manual desde una rama de trabajo sube a DEV. Esa vía tiene sentido donde la
credencial de DEV es más chica que la de producción (un rol OIDC propio, por
ejemplo). El delta la acota a ese caso y agrega el escenario del otro: rojo, sin
traer código, diciendo desde dónde se publica. `pipeline-entrega` menciona la
misma vía en su prosa, pero delega la correspondencia rama→ambiente en
`despliegue-ci`, así que no hace falta tocarla.

**Alternativa descartada: una credencial de DEV separada.** Exigiría una segunda
cuenta de Cloudflare para la copia de prueba, y con ella perder lo que el diseño
de versiones da —promover **la misma** versión que se miró, sin recompilar—,
porque las versiones viven dentro de un Worker de una cuenta. Es una decisión de
producto (costo, operación, una cuenta más que cuidar) y no la toma un parche de
seguridad. Queda la guarda.

**Por qué el rechazo es un job aparte y rojo.** Con `dev` y `produccion` saltados,
una corrida desde otra rama terminaba **gris y sin una palabra**, y quien la
disparó creía haber subido. `guardas` la pone en rojo con el arreglo escrito
—«Use workflow from» → `main`— y ofrece el ensayo que no publica.

**Lo que ese paso no puede, y está dicho en el archivo:** en un disparo a mano
corre el workflow **de la rama elegida**, así que una rama que edite
`desplegar.yml` puede sacarse el paso. Contra eso protege el environment con
política de rama `main`, que GitHub evalúa contra la rama del disparo y no contra
el archivo.

## D4 — Dónde vive la credencial

**Decisión:** en los environments `dev` y `produccion`, cada uno limitado a
`main`, con los dos secretos en cada uno. El job `dev` declara `environment: dev`.

| Alternativa | Por qué no |
|---|---|
| Secreto de repositorio (lo que había) | Lo resuelve cualquier job de cualquier workflow del repositorio |
| Solo en `produccion`, y DEV con secreto de repositorio | Es el mismo token (D3): dejaría la copia más alcanzable del mismo valor |
| DEV declarando `environment: produccion` | Cada subida a DEV quedaría registrada como un despliegue a producción, y los revisores requeridos de `produccion` frenarían cada merge |

**Precedencia, medida en la referencia de secretos el 2026-09-17:** «If a secret
with the same name exists at multiple levels, the secret at the lowest level takes
precedence», y el de environment gana. Por eso un repositorio que todavía tenga el
secreto de repositorio sigue publicando mientras migra, y por eso el aviso de
`guardas` es lo único que lo delata.

**El repositorio privado en el plan gratuito.** GitHub no ofrece secretos de
environment ahí (referencia de environments: «only available in public
repositories» para el plan Free). La guía lo dice con su costo y el workflow lo
avisa en cada corrida. La primera llave —las condiciones de D2— vale en cualquier
plan. `projects init` ya mide si el repositorio admite compuertas de plataforma
(`bloqueDeLaCompuertaDeProd`) y no se toca en este change: su texto habla de los
revisores requeridos, no de la credencial, y agregar ahí la frase queda como
mejora menor.

## D5 — Avisar la credencial al alcance de cualquier job

`guardas` no declara environment, así que `secrets.CLOUDFLARE_API_TOKEN` resuelve
**solo** el secreto de repositorio u organización: exactamente lo que cualquier
otro job puede leer. Si hay algo, lo dice.

**Amarillo y no rojo**, por la decisión D1 del PO: el arreglo es configuración de
GitHub, fuera del árbol del proyecto, y en un repositorio privado del plan gratuito
no tiene arreglo. El valor no se imprime nunca; el banco lo afirma.

**`guardas` no corre con el evento de un fork**, aunque no traiga código ajeno. La
propiedad «con el evento de un fork no corre ningún job» es la más fácil de
enunciar y de evaluar, y no tiene excepciones que recordar.

## D6 — Un solo commit por corrida (OPS-04)

Un primer paso `version` fija `head_sha || github.sha` y valida que sea un commit
completo; el `ci-ok`, el checkout, la etiqueta y el resumen lo leen de ahí. El
banco evalúa la derivación: bajo `workflow_run` da el commit medido y no la punta
de `main`.

**Residuo declarado, no medido.** La compuerta de producción busca las corridas de
DEV por el `head_sha` **de la corrida de `desplegar`**. Si ese campo, bajo
`workflow_run`, es la punta de `main` al arrancar —como `GITHUB_SHA`—, en la
carrera en que entra otro merge entre el fin del CI y el arranque del despliegue la
versión quedaría rotulada con el commit medido y la compuerta no la encontraría:
**rojo** («nunca se subió a DEV»), con el apartamiento nombrado como salida. Antes
de este change esa misma carrera daba una versión con el nombre de un commit y el
código de otro, **en verde**. El cambio mueve el caso de verde falso a rojo
cerrado. La ventana es chica: el CI del andamio cancela la corrida anterior de la
misma rama cuando entra otro push.

## D7 — La versión que se promueve tiene que estar en `main`

El job `produccion` trae el árbol de la casilla `version` y corre su
`pnpm install` al lado de la credencial. Antes de traer nada, el paso que elige la
versión exige un commit de 40 caracteres y pregunta
`repos/<repo>/compare/<version>...<punta de main>`: `ahead` o `identical` quieren
decir que está en la historia de `main`. Cualquier otra respuesta, o no poder
preguntar, es rojo. El apartamiento `sin_pasar_por_dev` se aparta de DEV, no de
`main`.

**Permisos, auditados acción por acción.** La consulta usa `contents: read`, que el
job ya tenía. `guardas` corre con `permissions: {}`: sus dos pasos solo leen
variables de entorno. `dev` no suma permisos: declarar un environment no exige
ninguno del token.

**Alternativa descartada:** comprobar con `git merge-base --is-ancestor` después
del checkout. Exigiría traer la historia completa, y traería el árbol antes de
saber si se puede.

## D8 — `persist-credentials: false`

Los dos checkouts traen un árbol cuyo `pnpm install` corre a continuación. Ese
código no tiene por qué encontrar el token del workflow en `.git/config`. Es la
misma regla que `marco-ci.yml` ya cumple en sus checkouts.

## Alternativas descartadas del diseño general

- **Mover el despliegue adentro de `ci.yml`**, como jobs con `needs:` e
  `if: github.event_name == 'push'`. Eliminaría `workflow_run` y con él el vector
  del fork. Se descarta porque `ci.yml` cancela la corrida anterior de la misma
  rama (`cancel-in-progress: true`), y `despliegue-ci` · «Los despliegues a un
  ambiente compartido se serializan» exige que un despliegue en vuelo **no** se
  cancele. Mezclar los dos en un workflow obliga a elegir una de las dos reglas.
- **Analizadores de terceros para workflows** (zizmor, poutine). Este lote tiene
  prohibido agregar herramientas de terceros; queda como pendiente con su motivo.
- **Pasar `desplegar.yml` a workflow reusable** (referenciado). Ver la tabla de
  clasificación.

## Qué lo hace cumplir solo, y qué no

**Falla solo:**

- `pruebas/andamio/la-llave-del-despliegue.test.mjs` **evalúa** la condición de
  cada job contra doce eventos y exige la lista exacta de jobs que corren; exige
  aparte que con el evento del fork **no corra ningún job que lea un secreto**,
  para que un job nuevo no pueda escaparse por no estar en la tabla. El caso rojo
  está demostrado contra las condiciones reales de la 1.9.6 y del job `dev`
  anterior, y cada cláusula tiene una mutación que pone rojo su caso. Además:
  environment declarado en todo job que trae el árbol y ve la credencial,
  `persist-credentials: false`, un solo commit por corrida, y la guía mandando a
  los environments.
- `pruebas/andamio/la-compuerta-de-prod.test.mjs` corre el paso de la promoción
  con un `gh` de mentira: versión que no es un commit, versión fuera de `main`
  (con y sin el apartamiento), consulta que falla, y el rojo demostrado sacando el
  bloque nuevo.
- `pruebas/andamio/post-despliegue.test.mjs` exige que el resumen mande a pegar el
  commit fijado y **no** `GITHUB_SHA`.

**No falla solo, y se dice:**

- **Que los environments existan y tengan la política de rama `main`.** Es
  configuración de GitHub, fuera del árbol. Lo que sí se ve es el secreto de
  repositorio, y eso se avisa en amarillo (D5).
- **Los repositorios que ya tienen el defecto.** El scaffold no viaja y nada del
  marco mira hoy el `desplegar.yml` de un consumidor. Un check referenciado que
  lo detecte —un `workflow_run` que lee secretos sin mirar el evento ni el
  repositorio del commit— pondría en rojo a `plantilla-sitio` el día del bump, y
  **por la decisión D1 del PO eso es lo que corresponde, no un breaking**: una
  compuerta nueva se exige en rojo el día que sale, y la excepción (aviso, o
  breaking hacia la v2) es solo para un arreglo que queda fuera del árbol del
  consumidor. Acá el arreglo es reemplazar el `if:` de su `desplegar.yml`, dentro
  de su árbol, y el parche exacto ya está en «Para consumidores»: va en un MINOR,
  en rojo, con ese parche. La mitad que sí queda fuera del árbol —crear los
  environments y mover los secretos— no la ve ningún check y ya se avisa en
  amarillo (D5). La versión anterior de este párrafo lo mandaba a la v2 citando la
  D1 al revés (hallazgo RV-H2 de la revisión adversarial). No se construye en este
  change porque es un diseño propio —qué forma de disparo cuenta, cómo se reconoce
  un job que lee un secreto— y un check nuevo en el pipeline de todo consumidor,
  que se ensaya contra `plantilla-sitio` antes de publicarse. Queda como pendiente
  (tasks 8.5).
- **Que GitHub llene el contexto como el banco lo simula.** Los campos salen del
  esquema publicado de la API y de la referencia de eventos; no hay un runner de
  GitHub en este banco. La prueba contra un repositorio real queda pendiente.
- **La semántica de expresiones.** El evaluador del banco implementa el
  subconjunto que el andamio usa y **lanza** ante cualquier otra cosa; no
  reemplaza a actionlint, que no está en el entorno y no se agrega.

## Revisión

Este change no tiene builder par: el marco declara el desvío de un solo
mantenedor (decisión D8 del PO). Lo reemplaza una **revisión adversarial con
lentes independientes**, que se registra en `tasks.md` cuando ocurra. Hasta
entonces el estado es `en-ejecucion` y el change no se archiva.
