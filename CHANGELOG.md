# Changelog

Todos los cambios notables de Projects se documentan acá.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y
el versionado sigue [Semantic Versioning](https://semver.org/lang/es/).

**Este archivo lo leen los consumidores.** Los proyectos hacen
`uses: im-diego-ec/Projects/...@v1`, y `v1` es un tag **móvil**: lo que se
publique acá les llega sin que ellos toquen una línea. Por eso la entrada del
changelog se escribe en el **mismo PR** que introduce el cambio, no al momento
del release, y por eso cada entrada dice **qué tiene que hacer un consumidor**
(normalmente: nada).

Convención de secciones: `Añadido`, `Cambiado`, `Obsoleto`, `Eliminado`,
`Corregido`, `Seguridad`. Todo lo que sea **BREAKING para `@v1`** se marca en
mayúsculas al inicio de la línea y obliga a abrir línea mayor nueva: `v1` no se
mueve sobre un cambio incompatible.

> Nota: en los **proyectos** el changelog es el archive de OpenSpec y no se
> mantiene un archivo aparte. Projects es la excepción deliberada porque tiene
> consumidores externos: el archive guarda el *porqué* de cada decisión; este
> archivo guarda el *qué* por versión.

> **Excepción declarada del bootstrap.** `AGENTS.md` fija que todo cambio al
> marco entra como change de OpenSpec con su proposal aprobado. Este primer
> commit no lo es, y no puede serlo: el proceso que exige el change es
> justamente lo que este commit crea, y `openspec/changes/` nace vacío. La
> excepción vale **solo para el bootstrap**; desde el segundo cambio rige la
> regla sin excepciones. Queda escrita acá en vez de resolverse en silencio,
> porque un marco cuyo primer acto es incumplirse a sí mismo sin decirlo enseña
> justo lo contrario de lo que pretende enseñar.

---

## [No publicado]

### Añadido

- **Check estático nuevo en el job `higiene`: *Ejecutores de paquetes pinados*.**
  Se pone rojo si un archivo rastreado del repo corre un paquete por un ejecutor
  que **descarga** (`npx`, `bunx`, `npm exec`, `npm x`, `bun x`, `pnpm dlx`,
  `yarn dlx`, cada uno con o sin banderas globales entre el gestor y su
  subcomando) sin clavarlo a una versión exacta.

  El agujero que cierra es concreto, no teórico. El marco documenta desde su
  primera versión que el paquete del CLI es `@fission-ai/openspec` y que
  `openspec` a secas en npm es un **placeholder ajeno**, y la guía de upgrade lo
  llevaba como ítem de checklist. Un ítem de checklist depende de que alguien se
  acuerde: en el consumidor piloto el allowlist del agente autorizaba
  `Bash(npx --yes openspec ...)` en cinco patrones — o sea descargar y
  **ejecutar** el paquete del squatter, con `--yes`, sin preguntar nada.

  La propiedad es sobre el **ejecutor**, no sobre una lista de paquetes prohibidos
  que alguien tendría que mantener. `pnpm exec` y `yarn exec` quedan fuera a
  propósito: leen `node_modules` y fallan si el binario no está —fallan cerrado— y
  por eso son la salida que el mensaje de error ofrece cuando el binario ya lo
  trae una dependencia declarada del repo.

  **Se exige la versión, no el scope**, y la distinción importa: hay paquetes
  legítimos sin scope (`prettier`, `eslint`), así que pedir scope sería un check
  imposible de satisfacer. La versión exacta sí se puede exigir siempre, y es la
  que convierte un nombre equivocado en un fallo ruidoso — el squatter publica
  `0.0.0` y no tiene la versión que uno pina, así que la invocación muere en vez
  de resolver en silencio.

  Límites declarados en el propio paso, porque esto **lee texto y no ejecuta
  nada**: los `.md` quedan fuera (son prosa, y la documentación del marco cita la
  forma incorrecta como contraejemplo, así que un comando de runbook escrito en un
  README no queda cubierto); las líneas que arrancan en comentario quedan fuera
  (un comentario no se ejecuta — y sin esa regla el check se pone rojo a sí mismo
  al documentarse); una invocación partida con `\` no se lee; y el pin no prueba
  que el nombre sea el paquete que uno quería: hace ruidoso el error, no lo hace
  imposible. Un pin que llega por variable —el pin canónico del marco es un
  `input` de este mismo workflow— cuenta como pinado y se informa aparte.

- **Aviso de versión a los consumidores** — `.github/workflows/aviso-version.yml`
  (workflow propio de Projects) más `actions/aviso-version` (referenciada). Al
  publicarse un release, el marco **notifica**; hasta hoy solo publicaba.

  El agujero es de forma, no de contenido: el `CHANGELOG.md` y la página del
  release son superficie de **consulta**, y con `v1` móvil un consumidor recibe
  comportamiento nuevo —incluido un check que lo pone en rojo— sin haber leído
  nada. Pasó el 2026-08-19: al mover `v1`, el segundo consumidor quedó a un push
  de un rojo que nadie le anunció.

  **El contenido no se escribe dos veces.** Sale de la sección `### Para
  consumidores` de la entrada de esa versión —la que este archivo ya obliga a
  escribir en el PR que introduce el cambio—, más las líneas `BREAKING` si las
  hay, más los dos enlaces. No hay un formato paralelo que alguien deba
  sincronizar: la única fuente que se edita sigue siendo el changelog.

  **El destino no está cableado.** Viaja por `secrets.AVISO_VERSION_DESTINO` (la
  URL del webhook ES la credencial, así que es secret y no var) y el campo del
  payload por `vars.AVISO_VERSION_CAMPO` (`text` para Slack, Google Chat y Teams;
  `content` para Discord). Ni el canal ni la URL aparecen en el repo, y el valor
  no entra al log: el paso de envío omite cualquier texto que lo contenga, aun
  dentro de un mensaje de error del propio `curl`.

  **Sin destino configurado no falla el release, pero no se calla**: `::warning::`
  nombrando el secret que falta y el mensaje completo al resumen de la corrida,
  que pasa a ser el destino de última instancia. Un destino configurado que
  **rechaza** el aviso, en cambio, es **rojo** — la distinción de la regla 6:
  configuración ausente es aviso, configuración rota es rojo, y un canal que dejó
  de entregar en silencio es exactamente el agujero que esto cierra. El único
  otro rojo es que el CHANGELOG no tenga entrada para la versión publicada: ahí
  no hay degradación honesta posible, y el arreglo va escrito en el error.

  **Verificable sin credenciales, que es lo que decide si esto sobrevive.** La
  action que arma el mensaje es pura: no conoce el destino, no toca la red y
  corre en cualquier máquina —`AVISO_VERSION=1.2.0 node
  actions/aviso-version/aviso-version.mjs`— mostrando exactamente qué se
  enviaría. Y el botón de Actions trae `simulacro` **marcado por defecto**:
  arma, publica el mensaje en el resumen y no lo manda. Desmarcarlo es el acto
  deliberado de enviar de verdad.

- **Detector de secretos en el job `higiene`: *Sin secretos en el repo (árbol y
  historia del cambio)*.** La regla más dura del marco —🛑 nunca poner secrets en
  código, contexto ni logs— era la única sin **un solo** mecanismo que la hiciera
  cumplir: disciplina pura, y la disciplina no escala a builders nuevos. Los tres
  repos del área tienen el escaneo de secretos, la protección de push y las
  actualizaciones de seguridad de la plataforma en `disabled`, así que hasta hoy
  no había nada entre un `git push` y una credencial publicada.

  **Es portable a propósito.** Escaneo de secretos y protección de push son de
  **pago** en repos privados (SKU *Secret Protection*) y esta organización tiene
  cero repos públicos. El marco le exige la regla a **todos** sus proyectos, así
  que el mecanismo no puede depender de que alguien compre algo: es un binario
  pineado (`gitleaks`, input `version_gitleaks`) que se descarga del release
  oficial y se verifica con el `sha256` del archivo de checksums del **mismo
  release** — el patrón exacto de `actionlint`, con el mismo alcance declarado:
  cubre descarga corrupta o asset cambiado, no un release comprometido de raíz.

  **Dos planos, la forma que ya usa la cobertura, con un reparto distinto.** El
  **árbol completo** va sin tolerancia y sin piso que suba: con cobertura el total
  admite deuda y por eso el piso sube de a poco, pero una credencial en el árbol
  no es trabajo pendiente sino un incidente vivo, y no se amortiza. Un detector
  solo-diff jamás vería lo que ya está adentro. El plano de la **historia del
  cambio** no es redundante: el árbol solo ve el contenido de hoy, así que
  «commiteo el `.env`, lo saco en el commit siguiente» deja el árbol impecable y
  la credencial igual de comprometida — la forma más común en que un secreto entra
  a un repo, y el único plano que la ve. Por eso el job pasa a pedir
  `fetch-depth: 0`, que es el costo declarado del cambio.

  **El mensaje nunca imprime el valor, y trae el orden del arreglo.** Archivo,
  línea, regla y descripción; nada más. El programa que clasifica no lee siquiera
  los campos que contienen el secreto —ni los que identifican a una persona—, de
  modo que la redacción de la herramienta es el cinturón y no leerlos son los
  tirantes. Y el arreglo va numerado, porque acá **el orden es la mitad del
  arreglo**: (1) rotar la credencial ya, porque un secreto que llegó a un commit
  está comprometido aunque lo borres —queda en la historia, en los clones, en los
  forks y en las cachés de la plataforma—; (2) recién después sacarlo del código y
  hacerlo viajar por referencia al gestor de secretos; (3) la limpieza de la
  historia se coordina con una persona. El error dice además que un secreto real
  **no se describe en el PR**: se escala.

  **Los falsos positivos deciden si el check sobrevive, y se declaran con motivo
  escrito.** La forma es la misma que ya usan las exclusiones del censo de
  fuentes: `.projects-falsos-positivos.json` (input `archivo_falsos_positivos`) con
  `{ "archivo", "regla", "motivo" }`. Sin `motivo` es rojo; con comodines es rojo
  —una declaración nombra **un** archivo, no un árbol—; y una declaración que ya
  no absorbe ningún hallazgo es **muerta** y también roja, porque si no queda
  repartiendo permiso sobre la nada. Cada declaración viva se imprime como
  `::notice::` en **cada** corrida y va al resumen del job: una excepción que
  nadie vuelve a ver es una excepción que nadie vuelve a discutir.

  **Una sola vía de excepción, y las otras seis están cerradas.** La herramienta
  trae seis canales propios para callar un hallazgo sin motivo y sin dejar
  rastro, y los seis se probaron: un `.gitleaks.toml` del repo puede **vaciar
  todas las reglas** (un repo con un secreto sintético sale en verde), un
  `.gitleaksignore` silencia por huella, un comentario `gitleaks:allow` al final
  de la línea baja el hallazgo a cero, la configuración **también entra por
  entorno** con `GITLEAKS_CONFIG` o `GITLEAKS_CONFIG_TOML` —los dos únicos que no
  dejan rastro ni en el repo, y con los que el paso salía **verde y mudo** sobre
  un repo con secretos adentro— y el archivo del **directorio del barrido** es el
  último eslabón de la precedencia documentada
  (`--config` > `GITLEAKS_CONFIG` > `GITLEAKS_CONFIG_TOML` >
  `<destino>/.gitleaks.toml`). Los dos archivos son rojo **si están, rastreados o
  no**, decidido con presencia en disco: el runner lo elige el consumidor y en uno
  propio `actions/checkout` no limpia lo no rastreado, así que «no está en el
  índice» no significa «no está ahí cuando el detector corre». El comentario se
  desactiva con `--ignore-gitleaks-allow`; las dos variables se vacían en el
  `env:` del paso; y el paso pasa su propia config (`[extend] useDefault = true`)
  con `--config`, que saca de la cadena al archivo del destino sin cambiar el
  universo de reglas.

  **Una declaración cubre coincidencias concretas, no un permiso abierto.** El par
  (archivo, regla) por sí solo perdona todo lo que ese archivo tenga de esa regla,
  hoy y siempre: con una declaración viva, un secreto **nuevo** agregado a ese
  mismo archivo entraba en verde (comprobado). Por eso cada entrada declara
  cuántos hallazgos absorbe **en el árbol** —uno por defecto, `"hallazgos": N` si
  de verdad son varios— y cualquier desajuste es rojo, con el número que ahora
  corresponde y la instrucción de revisar las coincidencias una por una antes de
  subirlo. El plano de la **historia** no se cuenta contra ese número: una
  coincidencia suya la absorbe la declaración solo si cae en una de las líneas que
  ya cubre en el árbol. Así la coincidencia que entró y se borró dentro del cambio
  —que por definición no está en el árbol— no tiene dónde entrar, y un falso
  positivo que el cambio vuelve a tocar no obliga a declarar un número que cambia
  cuando el rango del PR pasa. Límite declarado: si la línea de un falso positivo
  declarado **se mueve** dentro del rango, la historia lo reporta como no cubierto
  — rojo del lado conservador, con el mensaje diciendo exactamente eso.

  **La salida de la herramienta no se vuelca cruda al log.** En la rama de "no
  pudo correr" —justo aquella en la que se comportó de forma inesperada— asumir
  que la redacción actuó es asumir lo que acaba de fallar, y el log de una corrida
  lo ve cualquiera que vea el repo. Pasan solo las líneas con la forma de su log
  estructurado, recortadas, y se dice cuántas se omitieron: el diagnóstico útil
  (config ilegible, archivo inaccesible) sobrevive; un volcado de pánico, no.

  **Se descartó la herramienta con verificación en línea**, que tiene una tasa de
  falsos positivos imbatible, por una razón que no admite matices: valida el
  candidato **enviándolo a la API del proveedor**, y su salida JSON lleva el valor
  en claro. El marco prohíbe que el valor de un secreto salga hacia un tercero,
  aunque sea para confirmarlo.

  Límites declarados en el propio paso: detecta **forma, no validez**; un secreto
  sin forma reconocible no se detecta; un archivo ignorado del control de
  versiones queda fuera del universo (la misma evasión limpia que ya declara el
  censo de fuentes); y el plano de la historia mira el **rango del cambio**, no la
  historia entera, así que un secreto anterior a la adopción solo aparece si
  todavía está en el árbol. El resumen de la corrida lo dice con todas las letras:
  cero hallazgos **no** prueba que no haya secretos.

  El plano de la historia mira además los diffs de los **merges**
  (`--diff-merges=first-parent` dentro de `--log-opts`), porque `git log -p` los
  suprime por defecto y traer `main` a la rama de trabajo es el flujo diario de
  este marco. Consecuencia asumida: el diff de un merge de `main` también muestra
  lo que `main` trae, contenido que el plano del árbol ya cubre, así que suma
  ruido y no rojos nuevos.

- **Banco de pruebas de los pasos inline de `marco-ci.yml`** (`pruebas/marco-ci/`,
  cableado en el `ci.yml` de Projects). Los guardrails que viven dentro de un bloque
  `run:` no pueden salir de ahí —`marco-ci.yml` es reusable, así que cuando lo
  llama un consumidor el árbol checkouteado es el **del consumidor** y ningún
  archivo de Projects está presente—, y por eso eran el único código del marco sin
  una sola aserción. El banco no copia ese código: lee `marco-ci.yml`, extrae el
  script exacto del paso y lo corre contra fixtures, afirmando por **código de
  salida**. Si un paso se renombra o pierde su `run:`, el extractor tira y el job
  se pone rojo en vez de dejar de probar en silencio.

  Límite declarado: `gitleaks` no se descarga en el banco, así que del detector de
  secretos se prueban el cruce con las declaraciones, el rojo por presencia de los
  archivos de excepción (con un stub de `curl` que deja una señal en disco, para
  afirmar por existencia de archivo que el paso cortó **antes** del binario) y que
  las banderas de `git log` destapen el diff de un merge. Ninguna de las tres
  reemplaza una corrida real con el binario.

### Corregido — cuatro defectos de estos checks, encontrados por la auditoría de cierre de v1

Los cuatro salían **en verde** o mentían sobre la causa del rojo, los cuatro están
medidos por código de salida en la auditoría del 2026-08-20, y cada arreglo entra
con su caso en el banco nuevo (verificado: el banco se pone rojo contra el código
anterior y verde con el arreglo).

- **El cruce del detector de secretos tomaba `max(árbol, historia)`**, así que una
  declaración de dos falsos positivos **absorbía una coincidencia nueva** de la
  misma regla que entraba y se borraba dentro del PR: exit 0 diciendo «3
  hallazgo(s): 0 sin declarar». Un archivo con falsos positivos declarados se
  volvía punto ciego para su propia regla, en verde, en un check de seguridad.

- **El plano de la historia no veía las resoluciones de merge.** `gitleaks git`
  corre `git log -p`, que suprime los diffs de merge: un secreto que entraba en la
  resolución y se borraba después salía exit 0, 0 hallazgos, **imprimiendo «(árbol
  + historia del cambio)»** — afirmando una cobertura que no tuvo. Es el fail-open
  silencioso del 2026-08-05 otra vez, y en el camino más transitado del marco.

- **El rojo por los archivos de excepción se decidía con `git ls-files`**, o sea
  solo sobre lo rastreado. Un `.gitleaks.toml` sin rastrear con
  `useDefault = false` llevaba el plano de la historia de exit 1 a **exit 0**, y un
  `.gitleaksignore` sin rastrear con la huella del hallazgo, lo mismo. Se corrige
  el comentario que llamaba «cinturón» a `--gitleaks-ignore-path` sobre un
  directorio vacío: medido en 8.30.1 **no neutraliza nada**.

- **El check de ejecutores no veía tres formas que descargan igual**: `npm x`
  (alias documentado de `npm exec`), `bun x` y cualquier bandera global entre el
  gestor y su subcomando (`pnpm --silent dlx`). Las tres medían exit 0 con «no hay
  nada que pinar», que es el peor verde posible: uno que afirma haber mirado. Y la
  forma en que el problema apareció **de verdad** —`Bash(npx --yes openspec:*)` en
  el allowlist de un agente— caía en «no pude determinar el paquete» y degradaba a
  `::warning::` con exit 0. Ahora el comodín del allowlist se recorta antes de leer
  el paquete (el error dice «openspec va sin versión», que es lo que hay que
  arreglar) y lo indeterminado **dentro de un allowlist de agente** es rojo: ahí la
  línea no es una invocación que alguien revise cuando falle, es un permiso
  permanente para descargar y ejecutar.

- **La rama del aviso de *Artefactos regenerados al día* era código muerto**: el
  paso no podía salir amarillo nunca. `xargs` colapsa los códigos de `grep` —sale
  123 si cualquier hijo salió entre 1 y 125—, así que «no encontré nada» caía en la
  guarda del «no pude mirar» y el repo **sin cabeceras**, la clase más atrasada y
  justo la que el check dice proteger, recibía un rojo que mentía sobre la causa y
  ofrecía el arreglo equivocado. Se corrige con un archivo por iteración, no
  ignorando el 123: eso habría apagado el «no pude leer», que es el caso que tiene
  que ser rojo, y los dos casos están en el banco para que ese parche no pase. El
  aviso interpolaba además `${DIRS[*]}`, un array que un cambio anterior había
  borrado: salía mutilado y sin nombrar los archivos de los que hablaba.

### Cambiado

- **`plantilla/AGENTS.md`** suma la regla a las fronteras ✅, con las dos formas
  correctas: `pnpm exec` para lo que ya está instalado, paquete completo con
  versión exacta para lo que sí hay que traer de npm. **Es scaffold**: no alcanza
  a los repos ya creados, que se ponen al día por su propio PR.
- **`plantilla/README.md`** explica que el check cubre también el allowlist de
  `.claude/settings.json`, y por qué un repo que ignore `.claude` entero en su
  `.gitignore` esconde de ese check justo el archivo donde apareció el problema.
- **`docs/upgrade-openspec.md`** gana la fila que faltaba en "Dónde vive el pin":
  el allowlist del agente es **el único lugar que repite el número a la fuerza**,
  porque el permiso se concede por coincidencia literal de texto y no puede
  referenciar el pin canónico. Es el mecanismo exacto por el que el consumidor
  quedó atrás. Y el ítem de checklist "sin restos de `openspec` a secas" pasa a
  decir la verdad nueva: la **ausencia** de versión ya la caza el check; el
  **atraso** del número sigue siendo trabajo de ese procedimiento.
- **`plantilla/AGENTS.md`** suma la sección *Cuando el marco publica una versión*:
  qué es el aviso, que estar en ese canal es requisito del proyecto y no una
  cortesía, que un aviso con acción requerida se convierte en issue el mismo día,
  y las dos salidas que **no** valen (copiar el workflow del marco o pinar una
  versión vieja). El checklist de "antes del primer commit" gana el paso de pedir
  ese acceso. **Es scaffold**: los repos ya creados lo suman por su propio PR.

### Para consumidores

**Hay una acción obligatoria, y el orden importa.** Un repo con una invocación sin
versión exacta da rojo apenas este check aterrice. `un-proyecto-anterior` tiene hoy
cinco, todas en `.claude/settings.json`, y el arreglo es un PR de cinco líneas en
su propio repo. **Ese PR se mergea ANTES de que se mueva `v1`**, igual que se hizo
con el check de artefactos regenerados en la 1.2.0: con un solo consumidor y
nuestro, ordenar los merges es más honesto que enseñar a convivir con un aviso. Si
ese orden no se puede garantizar, el endurecimiento se estrena en modo aviso y
endurece en el major siguiente, como manda `AGENTS.md`.

Verificado antes de publicar: sobre `projects` el check pasa en verde (8
invocaciones, 5 con versión literal y 3 por variable) y sobre `un-proyecto-anterior`
da rojo exactamente en las cinco líneas reales, sin un solo falso positivo — el
`pnpm exec playwright` del deploy, el `pnpm exec prisma generate` del Dockerfile y
los `tsc`/`vitest`/`eslint` de los `scripts` de cada `package.json` no se tocan,
porque ninguno pasa por un ejecutor que descargue.

Volver a medir después de completar el alfabeto (`npm x`, `bun x`, banderas
intermedias, comodín del allowlist) **no movió esos números**: `projects` sigue en
verde con las mismas 8 invocaciones y cero avisos, y `un-proyecto-anterior` sigue en
rojo con exactamente las mismas 5 líneas. El alfabeto nuevo no agrega hallazgos al
consumidor real; cierra formas que hoy no usa y que habrían entrado en verde.

**Del detector de secretos, una consecuencia para quien corre en runner propio.**
El rojo por `.gitleaks.toml` o `.gitleaksignore` se decide ahora por **presencia en
disco**, no por el índice. En un runner efímero de la plataforma no cambia nada; en
uno propio, un archivo de esos que quedó de una corrida anterior pone el paso en
rojo, y eso es a propósito: `actions/checkout` no limpia lo no rastreado, así que
un archivo así **sí** apagaría el detector si el check no lo mirara.

**Del detector de secretos hay una acción obligatoria y también tiene orden.** Un
repo con falsos positivos sin declarar da rojo apenas el check aterrice, así que
el PR que agrega su `.projects-falsos-positivos.json` **se mergea ANTES de que se
mueva `v1`** — mismo precedente, misma razón. En `un-proyecto-anterior` son **tres
declaraciones**, medidas y no estimadas: la sonda de auth de `deploy.yml` (token
basura literal, existe para que el API responda 401 exacto) y la misma frase de
prosa del spec de observabilidad en dos lugares (el spec vivo y su copia
congelada en el archive). El número importa: un barrido de regex a mano sobre ese
mismo árbol daba 17 candidatos, y esa diferencia es la que decide si el check
sobrevive al tercer PR o alguien lo apaga.

**No se encontró ningún secreto real** en los archivos rastreados de ninguno de
los repos revisados. Verificado antes de publicar, con el `run:` del paso
ejecutado tal cual: `projects` con el paso ya adentro pasa en verde en los dos planos;
`un-proyecto-anterior` da rojo en sus tres hallazgos y pasa a verde con las tres
declaraciones, cada una visible en el resumen de la corrida; un repo con un
secreto sintético en el árbol da rojo; uno con el secreto **borrado** en el commit
siguiente tiene el árbol limpio y lo caza igual el plano de la historia; y un repo
que versiona `.gitleaks.toml` es rechazado antes de escanear. La corrida completa,
descarga del binario incluida, tarda alrededor de 8 segundos sobre el consumidor
real.

**Del aviso de versión, nada que hacer en el repo del proyecto.** No agrega
ningún workflow, secret ni paso al consumidor: el aviso se dispara en Projects y el
destino se configura en Projects. Lo único que se pide es humano y de una sola vez:
**estar en el canal donde cae**. Si los avisos no llegan, el proyecto se sigue
enterando como hasta hoy —cuando un check lo pone en rojo—, que es precisamente
lo que esto viene a evitar. Los repos ya creados suman por su cuenta la sección
nueva de `plantilla/AGENTS.md`, o al menos la regla: **un aviso con acción
requerida se convierte en issue el mismo día**.

Este mismo texto que estás leyendo es lo que el aviso va a enviar cuando esta
versión se publique — la sección «Para consumidores» es la fuente, no un resumen
de ella.

---

## [1.2.0] — 2026-08-19

**El alcance de la verificación deja de declararse y pasa a derivarse, y el
código nuevo llega con pruebas.** Dos composite actions nuevas más dos checks
estáticos que cierran huecos donde el marco afirmaba algo y nada lo verificaba.

Todo es **MINOR** por semver, pero hay una acción obligatoria del lado del
consumidor: sin cablear el paso del censo, el check de cableado da rojo. Ver
*Para consumidores*.

### Añadido

- **`actions/censo-fuentes`** — deriva el alcance real de la verificación de
  calidad y falla si un archivo fuente versionado queda fuera de él. Resta el
  universo de `git ls-files` menos lo que enumera el analizador estático del
  repo, menos lo que lista el compilador de cada `tsconfig` que declara sus
  entradas, menos las exclusiones declaradas con motivo. Lo que sobra es rojo,
  con el archivo nombrado y las tres salidas concretas para cubrirlo.

  La propiedad es por **archivo**, no por paquete, y esa es toda la diferencia:
  los dos agujeros que motivaron la pieza vivían dentro de paquetes
  correctamente configurados, así que cualquier check que pregunte si el
  *paquete* está configurado los declara sanos.

  **Frontera nueva y declarada:** hasta hoy el marco solo *leía* archivos del
  consumidor; el censo *ejecuta* su toolchain para preguntarle qué archivos ve.
  Por eso el paso va después del install, y por eso sin dependencias instaladas
  emite un `::warning::` ruidoso en vez de pasar en verde.

- **`actions/cobertura-diff`** — mide qué proporción de las líneas que el pull
  request agrega o modifica ejercitan las pruebas, cruzando los reportes `lcov`
  del repo con el diff. Mínimo del marco: 80% sobre las líneas del cambio.

  El núcleo no es el porcentaje, es qué pasa cuando no hay datos: si ninguna
  ruta `SF:` de los reportes corresponde a un archivo versionado, es **rojo
  ruidoso** con el arreglo escrito. La herramienta externa candidata, en esa
  misma situación, no encuentra líneas que medir, reporta cobertura total y sale
  con éxito — o sea que cablearla mal deja el gate abierto. Por eso el
  comparador es propio.

  «No hay datos» es rojo en las **cuatro** formas en que aparece, no solo en la
  más visible: ninguna ruta `SF:` versionada; un archivo **fuente** del cambio
  que ningún reporte reclama (qué es fuente sale de la lista de extensiones del
  censo, no de las que casualmente traen los reportes); un reporte que reclama
  el archivo pero no llega hasta donde el cambio escribió (`lcov` rancio: cache
  de CI, suite no recorrida); y una ruta `SF:` que corresponde a dos archivos
  versionados en un monorepo sin `projectRoot`. La válvula de escape legítima es
  la exclusión declarada con motivo en `projects.cobertura.excluidos`, la misma
  mecánica del censo.

  El porcentaje **nunca** se publica solo: la salida `lineas_fuera_de_medicion`
  dice cuántas líneas fuente quedaron fuera del denominador, porque una línea
  cubierta y cincuenta sin dato dan "100.00" sobre una cobertura real del 2%. Y
  un `minimo` por debajo del 80 del marco pasa, pero con un `::warning::` que
  dice cuál es el del marco: bajarlo es decisión del consumidor, y es visible.

- **Dos checks estáticos nuevos en el job `higiene` del workflow reusable.**
  Llegan solos a todo consumidor de `@v1`, sin nada que copiar del otro lado, y
  son independientes entre sí: un repo con los dos problemas los ve **los dos en
  la misma corrida**.

  1. **Scripts de verificación sin enmascaramiento.** Lee los `package.json`
     rastreados y marca en rojo todo script cuyo cuerpo termine en un sufijo que
     convierta un fallo en éxito. Un script que convierte un rojo en verde es,
     por construcción, invisible para todo lo que dependa de su código de salida
     —incluido el pipeline—, así que la única forma de atraparlo es examinarlo,
     no ejecutarlo. Un manifiesto que no parsea también es rojo: no se pudo
     leer, así que no se pudo verificar.
  2. **Censo de fuentes cableado.** Comprueba que algún flujo de
     `.github/workflows/` invoque `actions/censo-fuentes`. Sin ese paso, la
     derivación del alcance queda declarada pero apagada, y un archivo que
     ninguna herramienta mira no produce rojo en ningún lado. El fallo trae el
     paso listo para pegar.

- **Banco de pruebas de las composite actions en el CI de Projects** (job
  `pruebas-actions`). Es interno: ningún consumidor lo ve ni lo hereda.
  No es una buena práctica opcional — es la **única evidencia posible**. El
  marco no puede dogfoodear estos checks porque no tiene manifiestos de paquete
  propios, así que sobre este repo el censo no verifica nada (el mismo límite
  declarado que el check de marcadores del scaffold). La diferencia con todo lo
  publicado hasta ahora es que estas piezas traen **código no trivial**: sin el
  banco, ese código llegaría a todos los consumidores sin haberse ejecutado
  nunca sobre un caso controlado.

  El job deriva del árbol qué corre: una action nueva con pruebas queda cubierta
  sin tocar el workflow, cero bancos encontrados es rojo, y una action con script
  propio sin banco sale con un `::warning::` que la nombra.

### Cambiado

- **El scaffold deja de barrer el monorepo con `pnpm -r`.** Ese recorrido
  **saltea en silencio** los paquetes que no declaran el script y sale 0: en el
  consumidor real, la suite E2E nunca tuvo `typecheck` y el CI estuvo verde todo
  ese tiempo. En su lugar el `ci.yml` de la plantilla **deriva** de pnpm la lista
  de paquetes, comprueba contra cada manifiesto que el script esté declarado, y
  después lo corre parado **dentro** de cada paquete —la única forma que
  efectivamente falla cuando el script no existe—. La lista de paquetes no
  existe: un paquete nuevo queda cubierto sin que nadie agregue nada. Lo único
  escrito a mano son las **excepciones**, con su motivo al lado.

  Se descartó enumerar por filtro de paquete porque **también falla abierto**, y
  encima depende de la versión: con el script ausente, el mismo comando sale
  **0** en pnpm 9.15 y **1** en pnpm 11.18. Una garantía que cambia con un bump
  de herramienta no es garantía.

- **Placeholder nuevo del scaffold: `{{GENERAR_CLIENTE_DATOS}}`**, documentado en
  `plantilla/README.md` con su fila de qué hacer si el proyecto no lo necesita.
  El paso que genera el cliente de la capa de datos va entre el install y el
  lint: sin él, el código de acceso a datos vuelve a ser `any` silencioso y el
  lint pasa en verde sin haber verificado nada. Lleva `--fail-if-no-match`,
  porque sin esa bandera renombrar el paquete apaga la generación en silencio
  con salida 0.

- **El snippet del `package.json` raíz de `plantilla/README.md` ya no trae los
  agregadores `build` y `test`**: repartían el mismo defecto de `pnpm -r` a cada
  proyecto para uso local, y `pnpm test` en la raíz además disparaba la suite
  E2E completa.

Los tres puntos anteriores son **scaffold**: se copian una vez y quedan en el
proyecto. No alcanzan a los repos ya creados, que se ponen al día por su propio
change.

### Corregido — diez fail-open, encontrados por una auditoría adversarial

Antes de publicarse, las dos piezas pasaron por un crítico dedicado a buscar
**caminos que terminan en verde sin haber verificado nada**. Encontró diez, todos
reproducidos con casos ejecutables; los diez están cerrados y cada uno dejó su
caso en el banco. Vale la pena que un consumidor sepa qué se corrigió, porque
son exactamente los modos de falla que hacen que un gate dé confianza sin darla:

- **Un reporte de cobertura desactualizado** hacía que las líneas nuevas se
  leyeran como «no ejecutables» y el paso saliera en verde y mudo. Vector real:
  una caché de CI que restaura `coverage/`. Peor: una línea *modificada* que
  conserva su número heredaba el resultado viejo y contaba como cubierta.
- **Un archivo cuya extensión ningún reporte medía** salía en silencio, y en un
  cambio mixto el porcentaje publicado llegó a decir **100%** sobre una
  cobertura real del 2%. Ahora la clasificación usa la definición de «código
  fuente» del censo —la misma para las dos piezas— y el porcentaje **nunca** se
  publica sin declarar cuántas líneas quedaron fuera del denominador.
- **Un archivo fuente que ningún reporte reclama** avisaba y dejaba pasar,
  cuando el contrato promete que la integración falla. Ahora es rojo, y para no
  enrojecer lo legítimo se consultan las exclusiones declaradas con motivo, que
  el comparador ignoraba.
- **Un monorepo sin `projectRoot`** cuyas rutas colisionaban con homónimos de la
  raíz pasaba en verde y con el diagnóstico equivocado. Ahora es rojo y nombra
  la causa correcta.
- **El detector de enmascaramiento** dejaba pasar cinco formas verificadas
  —`|| echo`, `| tee`, `; echo`, un comentario al final, `|| true && echo`— y
  encima afirmaba haber comprobado algo que no comprobó. Se reemplazó la
  búsqueda de sufijos por un lector de la cadena de comandos.
- **El check de «censo cableado» se satisfacía con un README** que contuviera la
  línea del ejemplo — la misma línea que el propio mensaje de error imprime para
  que la pegues. Ahora solo mira los archivos que el proveedor de CI ejecuta.
- **Artefactos presentes sin versión declarada** contaban como «nada que
  verificar», justo la clase más atrasada posible y la que motivó el check.
- **Un `grep` sin permiso de lectura** devolvía error y el check lo tragaba.
- **El guardia de módulo del censo** podía volverlo un no-op absoluto invocado
  por una ruta no canónica: salida vacía, código 0.

Una de las correcciones introdujo un **falso positivo** que también se cazó y se
cerró antes de publicar: un archivo de puros tipos se volvía rojo, y ningún
reporte de cobertura puede medirlo. Es el archivo más común del stack fijado.

**Lo que esto deja como lección, más que como cambio:** el guardia de módulo ya
había sido corregido en la acción hermana, con un comentario que lo llamaba «el
único fail-open posible de este script». La lección estaba aprendida, escrita, y
a un directorio de distancia — y no cruzó. Copiar una corrección no la propaga.

### Límites declarados

- **La plantilla no es lintable como plantilla.** El validador de workflows deja
  hallazgos sobre los marcadores `{{...}}` dentro de un bloque de comandos. Sobre
  el scaffold ya sustituido no deja ninguno. Lo exigible en CI es que el YAML
  **parsee** y que el resultado sustituido linte limpio, no cero hallazgos sobre
  la plantilla sin resolver.
- **Los checks estáticos del job de marco no tienen banco de pruebas.** Son
  comandos dentro del YAML y quedan fuera de las pruebas automatizadas de las
  dos acciones. Se verifican a mano contra fixtures. Es deuda declarada, no un
  olvido.

### Para consumidores

**1. Cablear el censo. Es obligatorio y hay un check que lo exige.** El paso va
en el job que ya corre lint y typecheck, **después** de instalar dependencias:

```yaml
- run: pnpm install --frozen-lockfile
# DESPUES del install: el censo interroga al toolchain ya instalado.
- uses: im-diego-ec/Projects/actions/censo-fuentes@v1
```

Y declarar, en el `package.json` del paquete que los contiene, los archivos que
legítimamente ninguna herramienta mira:

```json
{ "projects": { "cobertura": { "excluidos": [
  { "patron": "vite.config.ts", "motivo": "por que este archivo no lo mira nadie" }
] } } }
```

`motivo` no puede estar vacío, y una exclusión que ya no corresponde a ningún
archivo rastreado es **roja**: las exclusiones no sobreviven al problema que las
justificó.

**2. Cablear la cobertura del diff.** El paso va después de correr las pruebas
con cobertura:

```yaml
- uses: actions/checkout@v7
  with: { fetch-depth: 0 }   # sin esto, el commit base puede no estar en el clon
# ... install, y las pruebas CON cobertura ...
- uses: im-diego-ec/Projects/actions/cobertura-diff@v1
```

Requisito que decide todo lo demás: **las rutas `SF:` de los `lcov` tienen que
ser relativas a la raíz del repositorio.** En un monorepo eso significa
configurar el `projectRoot` del reporter; sin eso, dos paquetes emiten `src/...`
indistinguibles entre sí. Si ninguna ruta resuelve, el paso es rojo — nunca un
100% simulado.

Aviso honesto: a diferencia del censo, **ningún check estático verifica todavía
que este paso esté cableado.** Un repo que no lo agregue no da rojo por eso; da
rojo el día que alguien confíe en una cobertura que nadie está midiendo.

**3. Scripts de verificación: probablemente nada que hacer.** Si los scripts del
repo ya propagan su código de salida, el check sale verde solo. Se verificó
contra el consumidor real: 28 scripts de 4 manifiestos, cero enmascaramiento.

**El consumidor actual da rojo hasta que se ponga al día, y por eso el orden es
primero el consumidor.** `un-proyecto-anterior` hoy no cablea el censo, así que el
check de cableado lo pone rojo, y su censo encuentra 23 archivos fuera del
alcance: dos componentes de dominio tragados por un ignore pensado para
generados, los tres scripts de `api` fuera de todo programa de tipos, los cuatro
`.ts` de E2E sin ningún `tsconfig`, y seis archivos de configuración que son
candidatos legítimos a exclusión declarada.

Esto **no** es breaking para `@v1`, y el orden es toda la razón. La definición
del marco es que un consumidor *que no modifica una sola línea* quede roto; acá
el consumidor se pone al día **antes** de que el check aterrice, así que ningún
repo amanece en rojo. Es el mismo precedente aplicado en `marco-se-cumple-solo`,
no una excepción nueva. El modo aviso queda reservado para cuando haya
consumidores que no controlamos.

### Antes de mover `v1`

- El PR del consumidor con los dos pasos cableados tiene que estar **mergeado
  primero**. Si el tag se mueve antes, `un-proyecto-anterior` queda roto sin haber
  tocado una línea, que es exactamente la definición de breaking de `AGENTS.md`.
- **El scaffold todavía no cablea ninguno de los dos pasos**: tal como está,
  todo proyecto nuevo nacería rojo el día uno por el check de cableado. Hay que
  cerrarlo antes del tag, no después.
- Probar las dos actions desde el consumidor apuntando a la **rama** del change
  y revertir ese pin en el mismo PR, como manda `AGENTS.md`.

---

## [1.1.0] — 2026-08-18

**El marco empieza a hacerse cumplir solo.** Tres checks nuevos que cierran
huecos donde el marco afirmaba algo y nada lo verificaba. Validado contra el
consumidor real antes de mover el tag móvil: `un-proyecto-anterior` quedó verde de
punta a punta con el job `higiene` corriendo.

### Añadido

- **Tres checks nuevos en el job de marco (`higiene`), que cierran huecos donde
  el marco afirmaba algo y nada lo verificaba.** Llegan solos a todo consumidor
  de `@v1`: no hay nada que copiar ni configurar del otro lado.
  Los tres son independientes entre sí: un repo con dos problemas los ve
  **los dos en la misma corrida**, no de a uno por push.

  1. **Artefactos regenerados al día.** Compara la versión declarada en los
     artefactos que genera el CLI de OpenSpec (`.claude/`, `.agents/`) contra el
     pin del marco. *Regenerado* era la única de las cuatro formas de
     distribución que se apoyaba solo en que alguien se acordara de ejecutarla.
     El fallo trae el comando exacto de regeneración.
  2. **Definiciones de pipeline válidas** (actionlint, pineado, con `shellcheck`
     sobre cada bloque `run:`). Eran el único código del repo que nadie linteaba:
     un error de sintaxis o una expresión inválida se descubrían *ejecutando*, o
     sea después del merge.
  3. **Sin marcadores del scaffold sin resolver.** Un placeholder que sobrevive
     al bootstrap falla en silencio — en el archivo de propietarios de código no
     produce error alguno, simplemente no asigna revisores, y el review cruzado
     que el marco promete desaparece sin ruido desde el primer día.

- Input `version_actionlint` (default `1.7.12`) para pinar el validador.

### Para consumidores

**Checks 2 y 3: nada que hacer.** Se verificó contra el consumidor real antes de
publicar: `un-proyecto-anterior` los pasa sin tocar una línea (con un hallazgo real
de `shellcheck` que se arregló en su propio repo, no acá).

**Check 1 (artefactos regenerados): puede pedir una acción de una sola vez.** Un
repo cuyos artefactos vengan de una versión anterior del CLI dará rojo hasta que
corra lo que el propio mensaje de error indica:

```
npx --yes @fission-ai/openspec@<pin> update --force
```

Esto **no** es breaking para `@v1`, y el orden es la razón. La definición del
marco es que un consumidor *que no modifica una sola línea* quede roto; acá el
consumidor regeneró **antes** de que el check aterrizara, así que ningún repo
amaneció en rojo. Cuando el marco tenga consumidores que no controlamos, un
endurecimiento así se estrena en modo aviso y endurece en el major siguiente
—como manda `AGENTS.md`—; con un solo consumidor y nuestro, ordenar los merges es
más honesto que enseñar a convivir con un aviso.

### Nota sobre el alcance del check 3

En **este** repo el check de marcadores se omite y lo dice en el log: Projects
distribuye el scaffold, así que los marcadores son su materia prima (están en
`plantilla/` y en toda la documentación que la explica). La detección es
automática —la presencia del scaffold— y no un input que un consumidor pueda
apagar sin querer. Consecuencia declarada: de los tres checks, este es el único
que el marco no se aplica a sí mismo. Su valor está entero del lado de los
proyectos.

---

## [1.0.0] — 2026-08-17

**Primera versión publicada del marco.** A partir de acá los proyectos lo
consumen con `uses: im-diego-ec/Projects/...@v1`, y `v1` es un tag
**móvil**: apunta siempre a la última `1.x`.

Validado contra un consumidor real antes de publicarse: `un-proyecto-anterior`
reemplazó sus jobs de marco por el reusable y quedó verde de punta a punta —los
tres jobs del marco más su `build-test` completo (Postgres, Prisma, lint,
typecheck, tests y builds)—. Esa validación encontró y corrigió un defecto de
diseño antes del tag; está abajo, en *Corregido*.

### Corregido

- **El guardrail de deltas viaja como composite action, no por `checkout`.** El
  reusable hacía `actions/checkout` del repo del marco para traerse el script y
  fallaba con `Not Found`: el `GITHUB_TOKEN` de un consumidor **no tiene lectura
  sobre otro repo**, ni dentro de la misma organización. En la misma corrida el
  job de detección sí pasó, lo que reveló la regla general: **el `uses:` de un
  workflow o de una action en repo privado se resuelve por la configuración de
  Actions de la organización, sin token; `checkout` no**. Consecuencia para el
  consumidor: **no hace falta crear ningún PAT** — desaparecen los inputs
  `ruta_guardrail`, `repo_marco` y `ref_marco`, y el secret `token_marco`.

### Para consumidores

Un proyecto nuevo nace del scaffold (`plantilla/`). Uno existente reemplaza sus
jobs de marco por una llamada al reusable y conserva el nombre de su check
agregado —el que exige la protección de rama— para no dejar `main` esperando una
señal que ya no existe.

### Cambiado — decisiones del PO sobre el bootstrap (2026-08-14)

- **`CODEOWNERS` pasa a equipos de la organización** en vez de handles
  personales, acá y en el scaffold: `@{{ORG}}/{{EQUIPO_BUILDERS}}` sobre todo y
  `@{{ORG}}/{{EQUIPO_PO}}` sobre los contratos. Sobrevive a que un rol cambie de
  persona, saca los nombres propios del marco y hace auditable la composición en
  un solo lugar. Se documentan las dos condiciones que **fallan en silencio**:
  el equipo necesita acceso de **escritura** o GitHub lo ignora como code owner
  sin avisar, y el PO **no** debe pertenecer al equipo de builders o podría
  satisfacer su propio gate (quien crea un equipo por API queda dentro
  automáticamente — pasó, y se corrigió).
- **pnpm queda fijado por el marco**, junto a Terraform y GitHub Actions: deja
  de ser un hueco 🕳️ del scaffold. El CI que trae la plantilla lo ejecuta
  directamente y el marco depende de una propiedad concreta del workspace —un
  único lockfile en la raíz— que el `.gitignore` del scaffold ya protege.

### Añadido — la casa (raíz del repo)

- `README.md`: qué es Projects, por qué existe —con la tabla de incidentes reales
  y el guardrail que dejó cada uno—, el principio **referenciar > copiar** con
  las cuatro formas de distribución, la adopción para proyectos nuevos y
  existentes, y el mapa del repo.
- `AGENTS.md`: la constitución de **este** repo. Todo cambio al marco es un
  change de OpenSpec con aprobación; versionado semver con tag mayor móvil `v1`;
  la **regla de oro** —un guardrail nace de un incidente y sube al MARCO, no al
  proyecto: el post-mortem ES el proposal—; la prohibición de editar el marco
  desde el repo de un proyecto (o es parámetro, o es change acá); la definición
  operativa de qué es BREAKING para `@v1`; y la revisión trimestral de
  divergencia del scaffold.
- `.github/CODEOWNERS`: review cruzado automático entre builders sobre todo el
  repo, con el PO como owner **exclusivo** de los specs canónicos y de los
  proposals.
- `.github/proteccion-main.md`: el estado **real** del ruleset de `main` (hoy
  todo pendiente, porque el repo recién nace), por qué el check requerido es
  `ci-ok` y los pasos exactos para aplicarlo o restablecerlo desde cero. El
  scaffold lleva su gemelo parametrizado.
- `.github/PULL_REQUEST_TEMPLATE.md`: adaptada a que acá lo que cambia es el
  marco. Pide la clasificación de distribución, el **impacto en los proyectos
  consumidores**, el veredicto explícito de si el cambio es breaking para `@v1`
  y la evidencia de haberlo probado contra un consumidor real.
- `CLAUDE.md` (importa `AGENTS.md` sin agregar reglas propias) y `.gitignore`
  de Projects — el de los proyectos es otro y vive en el scaffold.
- **Convención única de parametrización**, documentada en el README: los valores
  de proyecto van como placeholders `{{...}}` —con los handles de GitHub
  parametrizados **por rol**, nunca por nombre propio— y todo lo que el pipeline
  consume en runtime (URLs de sondas, ARNs, log groups) viaja por `vars` y
  `secrets` de GitHub Actions.

### Añadido — referenciado (`@v1`)

- `.github/workflows/marco-ci.yml`: los jobs de CI que todo proyecto hereda
  —detección del carril rápido de docs, guardrail de deltas de OpenSpec,
  validación estricta y veredicto agregado—, consumibles con `uses:`.
- `actions/carril-docs/` y `actions/guardrail-deltas/`: las composite actions
  sobre las que se apoya ese workflow.
- El CI propio de Projects, que **dogfoodea** el marco: si un guardrail no sirve
  para este repo, tampoco sirve para los demás.

### Añadido — scaffold (`plantilla/`)

El árbol que se copia una vez al crear un proyecto: `AGENTS.md` y `CLAUDE.md`,
gobernanza (`CODEOWNERS`, plantilla de PR, `dependabot.yml`), configuración
(`eslint.config.mjs`, `tsconfig.base.json`, Prettier, `.gitignore`,
`.claude/settings.json`) y un `README.md` propio que es la guía operativa del
bootstrap.

Incluye `.github/workflows/ci.yml`: un **llamador delgado** que consume
`marco-ci.yml@v1` y deja el `build-test` del producto como hueco a llenar. Es la
única pieza de CI que se copia —la mecánica sigue siendo referenciada— y existe
para que el repo nuevo nazca con el veredicto `ci-ok` ya armado, sin que nadie
tenga que acordarse de escribirlo.

### Añadido — canónico (`openspec/specs/`)

Los ocho specs del marco, destilados de los specs vivos de otro repo:
`calidad-codigo`, `despliegue-ci`, `gestion-secretos`, `gobierno-contribucion`,
`observabilidad`, `operacion-infra`, `pipeline-entrega` y
`verificacion-desplegada`. `openspec/changes/` queda vacío a propósito: el
primer change que se proponga nace ahí.

### Añadido — el porqué (`docs/`)

Los tres ADRs del marco (OpenSpec como fuente de verdad, trunk-based con
promoción por ambientes, verificación dentro del pipeline) con su convención de
formato; `reglas-no-escritas.md` —las reglas que se practicaban sin estar
escritas, con su estado de enforcement y el backlog de automatización—;
`upgrade-openspec.md`, el procedimiento para subir el pin del CLI con sus tres
trampas; y las plantillas de post-mortem y de runbook, que se copian al proyecto
cuando hace falta la primera (no al crear el repo).

### Contexto de origen

El marco se destila del estado **actual** de `un-proyecto-anterior` (primer commit
2026-07-03), no de un starter previo: `projects-starter` quedó archivado el
2026-08-14. Cada guardrail que entra a Projects trae su incidente detrás —la tabla
del README los enumera con fecha— y esa trazabilidad es un requisito, no un
adorno: el post-mortem es el proposal del change que crea el guardrail.

