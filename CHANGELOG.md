# Changelog

Todos los cambios notables de Projects se documentan acá.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y
el versionado sigue [Semantic Versioning](https://semver.org/lang/es/).

**Este archivo lo leen los consumidores.** Los proyectos hacen
`uses: im-diego-ec/Projects/...@vX.Y.Z`, por **versión exacta**, y reciben
cada versión nueva como **PR de Dependabot** en su repo: el rojo de un check
nuevo aparece dentro de ese PR, que es donde se puede leer antes de mergear. Esa
es la razón de que estas notas sean lo primero que alguien abre al ver el PR.

Por eso la entrada del changelog se escribe en el **mismo PR** que introduce el
cambio, no al momento del release, y por eso cada entrada dice **qué tiene que
hacer un consumidor** (normalmente: nada).

Hasta la 1.3.0 el canal era el tag móvil `v1`, que empujaba el cambio a todos a
la vez. `v1` sigue existiendo, pero ya no es el canal de distribución.

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

## [1.9.2] — 2026-09-03

### Corregido

- **El proyecto no registraba su propio tipo de cuenta.** `TIPO_CUENTA` decidía
  qué forma de CODEOWNERS viajaba pero no quedaba escrita en
  `.projects-valores.json`, así que regenerar el proyecto más adelante caía al
  default y le cambiaba la forma sola. Es el mismo defecto que ya mordió con
  `forma`: el archivo que declara el proyecto no declaraba una de las cosas que
  deciden cómo se arma. **Qué tiene que hacer un consumidor: nada.**

## [1.9.1] — 2026-09-03

### Corregido

- **El CODEOWNERS que no asignaba a nadie, y no lo decía.** El andamio repartía
  siempre la forma de **organización** (`@cuenta/equipo`). En una **cuenta de
  usuario** los equipos de GitHub **no existen**, así que ese archivo no asignaba
  a nadie, nunca, y GitHub no dice una palabra: el review cruzado quedaba apagado
  en silencio — que es textualmente el modo de falla que el propio CODEOWNERS
  declara querer evitar. Medido sobre un proyecto real creado bajo una cuenta
  personal. Ahora el andamio trae **las dos formas** y reparte la que
  corresponde, decidida por una clave nueva, `TIPO_CUENTA`.
- **El asistente mide el tipo de cuenta en vez de suponerlo**, preguntándole a
  GitHub; si no puede (sin `gh`, sin sesión, sin red) **lo dice en voz alta** y
  anota `usuario`, que es el lado que no rompe en silencio: un handle personal
  vale en los dos lados y un equipo sólo en una organización.
- **Un vector de inyección en esa consulta, cerrado por construcción.** La
  invocación lleva `shell` en Windows y ahí los argumentos van concatenados sin
  escapar; el nombre de cuenta ahora se valida contra el patrón de un handle
  **antes** de interpolarse. Lo cazó el propio banco de seguridad del marco.

**Qué tiene que hacer un consumidor: nada** — pero un proyecto creado antes bajo
una cuenta personal tiene un CODEOWNERS que no asigna a nadie. Se arregla
regenerándolo, o cambiando los `@cuenta/equipo` por los handles de las personas.

## [1.9.0] — 2026-09-03

### Corregido

- **El marco prometía «sin tarjeta» en seis lugares y ninguno tenía fuente
  vigente.** De Supabase, la única cita rastreable es un post de marzo de 2021
  sobre el pricing de la *beta*, un esquema que ya no existe; su página de
  precios de hoy no lleva la frase. De Cloudflare no la dice **ninguna** página
  —ni `/plans`, ni la de precios de Workers, ni el get-started—. Probablemente
  sea cierta en la práctica, pero es la primera columna que mira quien no tiene
  tarjeta, y si es falsa esa persona lo descubre en el formulario de alta, con el
  proyecto ya armado. Se sacó de los seis lugares y hay un banco nuevo que la
  caza si vuelve. **Qué tiene que hacer un consumidor: nada.**
- **El detalle de AWS vendía como ventaja algo que quien lo lee no puede usar, y
  omitía el límite que más duele.** Decía que «acá Terraform SÍ vale la pena»
  siendo que Terraform es una herramienta de terminal y quien contesta el
  asistente no tiene terminal — por eso existe el asistente. Y no decía que la
  cuenta gratuita de AWS **se cierra sola a los 6 meses**, o antes si se agotan
  los créditos, tras lo cual AWS retiene los datos 90 días y los borra. Alguien
  podía elegir AWS creyendo que empezaba gratis y perder el proyecto medio año
  después. **Consumidor: nada** — es copia del asistente, no del andamio.
- **El detalle de Supabase hacía sonar su pausa como una trampa silenciosa.**
  Supabase avisa por mail una semana antes y otra vez al pausar, y la pausa se
  evita entrando al panel. La redacción vieja omitía los avisos, y era el
  argumento más fuerte para mover a alguien de proveedor. **Consumidor: nada.**

- **El asistente corrompía el proyecto y después abortaba.** La guarda del
  destino ocupado vivía **~270 líneas después** de las tres escrituras del
  asistente: volver a correr `--asistente` sobre un proyecto ya armado contestaba
  las catorce preguntas, escribía `.projects-valores.json`,
  `.projects-respuestas.json` y `.projects-desvios.json`, y **recién ahí** abortaba.
  Los tres son los archivos **declarativos** —de ahí sale la constitución—, así que
  quien reabría el asistente para cambiar de plataforma quedaba con un archivo
  diciendo `aws` sobre un árbol sin `infra/`, describiendo una infraestructura que
  no existe. La herramienta que se presenta como «no pasa nada si te equivocás»
  rompía el proyecto **en silencio y salía con error a la vez**. Ahora se detiene
  antes de la primera pregunta. **Qué tiene que hacer un consumidor: nada.**
- **`AGENTS.md` —el archivo que los agentes leen como fuente de verdad— describía
  un mundo anterior.** Declaraba **Clerk** como proveedor de identidad cuando el
  andamio entrega **Supabase Auth**; decía que la plataforma «nace en `aws`»
  cuando la del proyecto está en su propio `.projects-valores.json`; presentaba la
  **promoción por ambientes** como pieza entregada cuando está anotada como
  desvío; y apuntaba **dos veces** a `infra/adaptadores.md` en proyectos donde
  `infra/` fue podado, prescribiendo cuatro pasos manuales para borrar carpetas
  que nunca llegaron. Su prosa afirmaba «hoy ninguna herramienta reparte el
  andamio según esta clave» — cierto antes de que existiera `noViajanPorPlataforma`.
  Ahora el bloque de infraestructura va detrás de un centinela y se poda con las
  carpetas. **Qué tiene que hacer un consumidor: nada**, salvo que quiera
  regenerar para recibir el archivo corregido.
- **Los comandos copiables decían `pnpm` pelado y contestaban `command not
  found`.** Este repositorio fija su pnpm en `packageManager` y `corepack` es lo
  que la trae. Los cinco comandos del proyecto generado ahora llevan el prefijo,
  con una línea que explica por qué. **Consumidor: nada.**
- **Un `pnpm e2e` fallido dejaba el `pnpm verificar` siguiente en rojo.**
  Playwright escribe `e2e/test-results/` con capturas y trazas del intento, y no
  estaba ignorado: el rojo aparecía por archivos que la persona nunca escribió, y
  el `git add -A` del Paso 9 los subía al primer commit. Mismo caso que
  `coverage/` y `**/.astro/`. **Consumidor: nada.**
- **Nada decía cómo instalar Docker.** Grep sobre todo el repo: cero resultados.
  Es el único requisito que el marco no comprueba y el que da el peor error
  —`command not found: docker`, sin salida—. Ahora está en la tabla de programas
  de `docs/04` y en el encabezado de `comandos-levantar-servicios.txt`, archivo
  que advertía de esta trampa exacta y no decía dónde conseguirlo.
- **El system prompt del bot afirmaba que «se despliega solo por el pipeline».**
  Es a quien la persona le pregunta cómo publicar, y para la forma `aplicacion`
  ese despliegue no existe. **Consumidor: nada** — viaja en `claude.yml`.
- **El asistente le decía «undefined» a la persona en su peor momento.** El
  rechazo de una respuesta imprimía `no tiene la forma que corresponde:
  ${formato.espera}`, y de los catorce formatos **sólo dos definen `espera`**.
  Los otros doce mostraban la palabra `undefined` — incluido el equívoco más
  probable de todo el recorrido, escribir el correo donde va el usuario de
  GitHub. Ahora cae a `que`, que siempre está. **Qué tiene que hacer un
  consumidor: nada** — es el asistente del marco.

### Añadido

- **Los workflows del proyecto dejan de llevar marcadores que cambian con cada
  repositorio.** Medido contra GitHub: el `GITHUB_TOKEN` **no puede crear ni
  modificar archivos de workflow** —*«refusing to allow a GitHub App to create or
  update workflow … without `workflows` permission»*— aunque **sí puede
  borrarlos**, también medido con una corrida real. La consecuencia: un workflow
  que llega por copia de un template **no se puede arreglar después**. Si llevara
  el nombre del proyecto sustituido, quedaría nombrando al proyecto equivocado
  para siempre, en el repositorio de otra persona. Ahora el nombre y el dueño
  salen del contexto de GitHub en tiempo de ejecución. Lo que es igual en toda
  copia —`ORG_MARCO`, los nombres de paquete— se sigue sustituyendo. **Qué tiene
  que hacer un consumidor: nada.**

- **La puerta web, rediseñada: repositorios plantilla, uno por forma.** La primera
  versión ponía la puerta en el marco y armaba el proyecto en el runner. **No
  puede funcionar**, y se midió con una corrida real: el `GITHUB_TOKEN` no puede
  crear archivos de workflow, así que un proyecto armado por un runner nunca
  podría escribir su propio `ci.yml`. Ahora los workflows llegan por la **copia
  del template** —que no es un push y no tiene ese límite— y la puerta, que vive
  dentro de cada plantilla, sólo reescribe lo que sí puede tocar y **se borra a sí
  misma** al terminar. Y trae el marco en **la versión que el propio proyecto
  declara**, leída de su `ci.yml`: con `main` el proyecto nacía con un artefacto
  de la versión en desarrollo y su CI lo rechazaba. **Qué tiene que hacer un
  consumidor: nada.**

- **La puerta web: se arma un proyecto sin abrir una terminal.** El marco tenía
  dos entradas y las dos exigen terminal — el asistente aborta si `stdin` no lo
  es, y `--valores` exige escribir un JSON de 25 claves a mano. Medido: alguien
  que no abre una terminal **no llegaba ni al Paso 0**. Ahora el repositorio es
  un *template*, y su copia trae un `workflow_dispatch` que GitHub renderiza como
  formulario web: tres clics y el runner arma el proyecto con el token del propio
  repositorio. **Cero infraestructura nuestra, cero credenciales nuevas.**
  `herramientas/projects-puerta.mjs` traduce el formulario al **mismo** objeto de
  respuestas del asistente y llama a las **mismas** `derivar` y `desvios`: no es
  un segundo motor. Y de paso **escribe los desvíos**, que es justo lo que el
  camino de `--valores` no hacía. **Qué tiene que hacer un consumidor: nada.**

- **El Paso 0 de la guía acompañada arranca con un doble clic, no con un bloque
  de comandos.** Y la promesa que la guía se hace a sí misma —«cada paso dice qué
  copiar»— pasó a aceptar también «qué abrir»: esa promesa nunca fue *copiar*,
  fue **decir qué hacer en concreto**, y exigir la palabra «copiar» obligaba a
  inventarle un comando a un paso que a propósito no lo tiene.

- **Dos lanzadores de doble clic: `arrancar.command` (macOS) y `arrancar.cmd`
  (Windows).** La invocación documentada era `node <ruta-al-clon>/herramientas/projects-init.mjs`,
  y ese hueco que la persona rellena a mano produce el peor error de todo el
  recorrido: una ruta mal escrita da un volcado de Node en inglés que **ninguna
  guarda de la herramienta puede atajar**, porque la herramienta ni llegó a
  arrancar. Los lanzadores derivan la raíz de dónde está el propio archivo,
  comprueban Node, corren el comprobador y recién después el asistente, y dejan
  la ventana abierta al final para que el motivo se pueda leer. **Consumidor:
  nada** — viven en el clon del marco.

- **`projects-doctor`: el Paso 0 entero en un solo comando.** Antes eran cuatro
  comandos y **comparar la salida a ojo** contra un ejemplo — que no comprueba
  nada, porque el piso de versión de Node vive en el código y no en la pantalla.
  Y **Docker no estaba en ninguna lista**: era el único requisito que el marco no
  comprobaba y el que da el peor error (`command not found: docker`, sin salida),
  con cero instrucciones de instalación en todo el repositorio. Ahora un comando
  revisa los cinco programas y la sesión de GitHub, distingue *falta* de *viejo*
  de *alcanza pero no es lo recomendado*, marca Docker como opcional según lo que
  se vaya a construir, y **nunca dice que algo falta sin decir en la misma salida
  de dónde se baja**. **Qué tiene que hacer un consumidor: nada** — es una
  herramienta del marco.

- **Un banco que exige constancia para las promesas de dinero.**
  `pruebas/docs/promesas-sin-fuente.test.mjs` barre todo lo que alguien lee para
  decidir y falla si vuelve «sin tarjeta» en cualquiera de sus cuatro formas.
  Lleva una lista `VERIFICADAS` vacía a propósito: el día que alguien dé de alta
  las cuentas reales sin cargar tarjeta y anote la constancia, la frase vuelve
  sola a todos lados. **Consumidor: nada** — es un banco del marco.

## [1.8.0] — 2026-09-01

### Corregido

- **La forma `sitio` no llegaba a un proyecto sano, y la carta la declaraba
  construida.** Los pasos del arranque estaban fijos en cuatro y `podarPorForma`
  borra `datos` del manifiesto de un sitio: la misma corrida escribía un
  `package.json` sin ese script y dos líneas después mandaba correr `pnpm run
  datos`. Y su `ci.yml` conservaba `--filter <api> --fail-if-no-match`, que nace
  rojo sobre un workspace sin paquete de API. **Qué tiene que hacer un
  consumidor: nada**, salvo que hubiera generado un sitio, en cuyo caso conviene
  regenerarlo.
- **`sitio` + AWS escribía cinco valores `undefined` y salía 0.** Las preguntas
  de AWS y la derivación decidían con predicados distintos. Ahora hay uno solo,
  y la infraestructura tampoco viaja a un sitio.
- **El `uses:` del pipeline de un proyecto nuevo apuntaba a un repositorio
  inexistente.** `{{ORG}}` significaba a la vez la cuenta del proyecto y la del
  marco. La segunda pasa a ser `{{ORG_MARCO}}`, derivada del remoto del clon.
  **Consumidor: nada** — es un marcador nuevo del andamio, no de los proyectos
  ya creados.
- **`desplegar.yml` esperaba un workflow llamado `ci` y el workflow se llama
  `CI`.** `workflow_run` resuelve por el `name:` exacto: no fallaba, no
  disparaba nunca. Y publicaba la punta de `main` en vez del commit que pasó el
  CI; ahora pide `head_sha`.
- **Los desvíos declarados no llegaban a la constitución del proyecto.** El
  archivo se escribía como lista pelada donde el lector espera `{ "desvios":
  [...] }`, sus cinco `regla` no existían en el canónico, y le faltaban
  `aprobado_por` y `fecha`. Los tres se arreglan juntos: arreglar uno solo
  cambiaba un silencio por cinco rojos.
- **Los comandos `/opsx:*` no se podían correr.** Por dentro mandan `openspec …`
  a secas, y ese programa no está instalado —ni en el sistema, ni en
  `node_modules/.bin`, ni en las dependencias del proyecto—, así que el tramo de
  construir se trababa en el primer paso. Los archivos que lo dicen los escribe
  `openspec init` y son de la herramienta: editarlos sería un fork ajeno y
  `openspec update` los devolvería igual. Ahora el `AGENTS.md` del proyecto
  declara la forma invocable con el pin exacto, y el allowlist cubre los cuatro
  subcomandos que le faltaban (`instructions`, `context`, `schemas`, `store`).
  `archive` sigue afuera a propósito: lo reemplaza la skill del marco.
- **El `verificar` de un sitio salía verde una vez y rojo la siguiente**, por los
  tipos que `astro build` genera y el linter leía.

### Añadido

- **La skill que cierra el primer change de todo proyecto tenía tres defectos.**
  Su verificación de escenarios decía «sin diferencias» sobre un archive real
  —contaba con `git grep` sin `--untracked` y el spec recién escrito no estaba
  registrado, así que comparaba cero contra cero—; varios de sus `grep` miraban
  sólo el índice y leían el vacío como éxito; y el paso que pide «los tres
  verdes» sale rojo garantizado en el primer change de cualquier proyecto, porque
  el paso anterior escribe `Purpose: TBD` y el arreglo está recién en el paso
  siguiente. Los tres cerrados, con la advertencia donde la persona ve el rojo.
- **El asistente preguntaba «¿una copia o dos?» a quien hace un sitio**, y la
  respuesta no cambiaba una sola pieza que despliegue. Ya no se pregunta.
- **Las dos opciones de «qué vas a construir» abren con su estado de
  publicación.** La recomendada no decía que hoy no existe un paso que la
  publique, y es la decisión que más cuesta si se toma tarde.
- **El `site:` de Astro no producía los enlaces canónicos que la página
  prometía.** Ahora el molde los emite —verificado compilando— y no inventa nada
  cuando `site` no está.
- **El conteo de actos humanos son tres, no dos**, y el marco lo decía de tres
  maneras distintas. El tercero, registrar el subdominio, llega tarde: Cloudflare
  no lo pide hasta la primera publicación.
- **El paso a producción está escrito.** Era la pregunta peor contestada del
  camino: cero menciones en las diez páginas. `docs/10-publicar.md` gana una
  sección 5 que dice lo que hoy hay —un solo destino, no dos—, que la respuesta
  «dos copias» del asistente no despliega dos ambientes, que la constitución
  promete una promoción que el andamio no reparte, y cómo llega un cambio a la
  gente con lo que existe.
- **Claude Code se declara como requisito.** Los tramos 2 y 3 ocurren dentro de
  una sesión de agente y ninguna página del carril no técnico lo decía: quien
  seguía la guía llegaba al descubrimiento sin saber que le faltaba una
  herramienta —y que tiene costo—. Ahora está en la tabla de programas del Paso 0,
  con qué pasa si no lo tenés.
- **`docs/10-publicar.md`**, el cuarto tramo del camino, que no tenía página. Las
  páginas siguientes corren un número: `10-reglas-no-escritas` pasa a `11`, y así
  hasta `16`.
- **El andamio reparte `docs/`** con `adr/`, `postmortems/` y `runbooks/` —las
  tres carpetas que la constitución ya mandaba usar y que el proyecto no tenía— y
  un esqueleto de change para el primer día.
- **`docs/09` cubre la segunda mitad del ciclo**: `design.md`, `tasks.md`,
  implementar y archivar.
- **La forma y la plataforma se validan**, con las opciones y una sugerencia
  cuando el valor se parece a una: escribir `"sitios"` entregaba un proyecto
  distinto con salida 0.

### Seguridad

- **El historial se reescribió** para sacar dos identificadores de cuenta de AWS
  y el correo personal del autor de 51 commits. Los once tags conservan su SHA:
  los commits afectados eran todos posteriores a `v1.7.0`, así que **ningún
  consumidor que pine una versión exacta recibe contenido distinto**.

- **El despliegue existe, y por primera vez el marco publica algo.** Un proyecto con la
  forma «un sitio para leer» viene con la configuración de **Cloudflare Workers** y un paso
  automático que sube el sitio **solo cuando las verificaciones terminan en verde** sobre
  la rama principal. Cuatro decisiones, todas con su motivo escrito:
  - **No publica con el CI en rojo.** `workflow_run` dispara **también** cuando el workflow
    anterior falló: sin la condición explícita, un CI rojo publicaría igual — o sea que el
    marco que existe para que nada entre sin verificar dejaría salir sin verificar.
  - **No se pone rojo por una credencial que todavía no existe.** Sale con un aviso
    amarillo diciendo qué falta y dónde está el paso a paso. Un rojo permanente por algo
    que la persona no configuró todavía **enseña a ignorar los rojos**, y a partir de ahí
    la compuerta que sí importa tampoco se mira.
  - **Un directorio compilado vacío es rojo**, no un despliegue limpio: publicar nada deja
    el dominio sirviendo nada, sin ningún error.
  - **Una dirección que no existe devuelve un error, no la portada.** La otra opción
    —devolver siempre el `index.html`— es lo correcto para una aplicación y es esconder el
    problema para un sitio de páginas.

- **El paso a paso de lo que ninguna herramienta puede hacer**, adentro del proyecto:
  abrir la cuenta (gratis, sin tarjeta), crear la credencial con la plantilla que ya trae
  el permiso justo, y guardarla como secreto — con la advertencia de por qué **no** va en
  un archivo del repositorio. Y un ensayo, `desplegar:prueba`, que hace todo **menos
  subir**: lee la configuración, encuentra los archivos y dice cuánto pesaría, sin cuenta
  ni credencial. Es lo que se usó para verificar todo esto: `wrangler deploy --dry-run`
  leyó la configuración y calculó **0.34 KiB** de subida.

### Corregido

- **`workerd` faltaba en la lista de scripts de instalación permitidos.** Es el motor con
  el que Cloudflare corre lo que se publica, y lo trae wrangler. Sin esa línea,
  `pnpm install` lo deja a medias y **cualquier** comando posterior del paquete —no solo
  el despliegue: también el `build`— muere con una traza del gestor de paquetes que no
  menciona Cloudflare por ningún lado.

### Añadido

- **La segunda forma de proyecto existe, y ahora la carta ofrece una elección de verdad.**
  «Un sitio para leer» —Astro— pasa de 🕳️ a **✅ construida y probada**. Elegirla en el
  asistente produce un proyecto de 34 archivos, sin servidor, sin base de datos y sin
  pantallas con sesión, que **instala, formatea, verifica y compila en verde**. Medido
  sobre un sitio recién generado: la página compilada pesa **512 bytes** y trae **cero**
  etiquetas de programa y **cero** archivos de JavaScript — que es lo que quiere decir
  «manda cero JavaScript por defecto», y ahora está medido y no citado.

- **Un hueco declarado en voz alta, y no escondido:** los archivos `.astro` **no se
  verifican por tipos**. `astro check` declara `typescript: ^5 || ^6` y este marco fija la
  7 — medido contra `@astrojs/check` 0.9.10, la última publicada. Peor: `astro build`
  **compila igual** con un error de tipos adentro de una página, comprobado. El `README`
  del paquete trae la tabla de qué cubre cada comando y empuja a sacar la lógica a
  `src/lib/`, donde sí está cubierta.

### Cambiado

- **La costura que bloqueaba cualquier forma nueva, cortada.** El `package.json` de la
  raíz nombraba `-C api`, `-C web` y `-C e2e` a mano, y `pnpm-workspace.yaml` listaba los
  tres: cualquier proyecto sin exactamente esos tres paquetes rompía la puerta de calidad
  del marco. Ahora **enumeran en vez de nombrar** —`pnpm -r` y un glob—, y arreglarlo una
  vez habilita todas las formas futuras. La exclusión de la suite de extremo a extremo sale
  del **mismo marcador** que el pipeline ya usa para su excepción, así que no hay dos
  listas que puedan divergir.

- **Y la lección se propagó a los bancos**: la mutación que borraba «todos los
  manifiestos» borraba **cuatro por nombre**, así que el día que el andamio sumó un
  paquete el caso que existe para probar que la comprobación muerde **dejó de morder**.

### Corregido

- **La señal de éxito del Paso 9 era inalcanzable como estaba escrita.** De los nueve
  `RELLENAR` del `README.md` que recibe un proyecto, **tres viven adentro del recuadro de
  instrucciones** que el propio recuadro manda borrar entero. La guía decía «reemplazá cada
  `RELLENAR`» y prometía que el comando dejaría de imprimir — y con esa instrucción nunca
  llegaba a cero. Ahora dice que son seis huecos y un recuadro, y qué significa si quedan
  líneas que empiezan con `>`.
- **La trampa que más cuesta descubrir sola: el validador exige `SHALL` o `MUST`, en
  inglés.** La guía manda escribir todo en castellano y nunca lo decía. Medido con el
  validador que este marco pinea: con `DEBE` sale **exit 1**, con `SHALL` sale **exit 0** —
  y ese mismo comando corre en las verificaciones automáticas. Peor: **el error no menciona
  la palabra**. Ahora está dicho en las dos páginas que importan, con un delta completo de
  ejemplo para copiar la forma.
- **La portada del proyecto afirmaba un despliegue que no existe.** `README-del-proyecto.md`
  traía una tabla de ambientes con prefijo de recursos y región —de AWS— aunque la
  plataforma elegida no fuera AWS y el proyecto no recibiera una sola línea de
  infraestructura. La primera pantalla que ve cualquiera que entre al repositorio. Ahora la
  tabla es condicional y **arriba va un aviso en los dos casos**: este proyecto se verifica
  solo, pero nada lo publica todavía.
- **Dos cifras más que la documentación afirmaba sobre sí misma y ya no eran ciertas** —«la
  primera de doce páginas» cuando son quince, «el estándar mide 14» cuando mide diecisiete—.
  Es la **tercera vez** que pasa lo mismo, así que la salida no fue corregirlas otra vez:
  se dejaron de escribir, y el índice publica el comando que las cuenta. Y entró el guard
  que compara toda cifra que la documentación afirma sobre sí misma contra la medición real.

### Corregido

- **El Paso 2 te hacía crear un repositorio privado y el Paso 3 te recomendaba público**,
  con una pantalla de distancia. Ahora el comando crea `--public` y explica en el mismo
  lugar **por qué** —es lo único que te da gratis la protección de la rama principal— y
  **cómo cambiarlo** si tu código no puede ser público, con lo que se pierde al hacerlo.
- **Cinco referencias cruzadas quedaron viejas** al insertar el Paso 7: apuntaban a pasos
  que se corrieron un número.
- **La carta no estaba enlazada desde ninguna de las dos páginas que la persona sigue.**
  La decisión más cara del proyecto vivía en una página que se autodeclara técnica. Ahora
  la guía acompañada abre con un tramo «antes del Paso 0» que la enlaza y —esto es lo que
  faltaba— **dice de frente qué forma le va a tocar hoy**: de las cuatro hay una
  construida, y si tu proyecto es claramente un sitio para leer o una app de teléfono, es
  mejor saberlo ahora que a mitad de camino.
- **El desempate entre B y B+ mandaba a una forma que no existe** sin decirlo.
- **La trampa del puerto en el Paso 7.** Cuando el 5173 está ocupado, la herramienta se
  muda al 5174 y avisa — pero la guía daba la dirección fija, así que la persona abría el
  puerto de otro programa. Ahora dice que la dirección buena es siempre la que imprime
  `Local:`.
- **GCP se ofrecía como elegible mientras su propio texto admitía que el andamio no lo
  trae preparado** — el mismo defecto que Slack, en su tercera casilla. Sale de las
  opciones hasta que exista su adaptador, y la tabla de la guía lo dice con un 🕳️ en vez
  de presentarlo como una opción más.

### Cambiado

- **«Que no quede en papel» deja de ser una regla de la carta y pasa a ser una regla del
  marco.** El banco nuevo exige que el asistente no ofrezca **ninguna** plataforma que el
  marco no sostenga, y que toda plataforma sostenida se pueda elegir — las dos mitades del
  mismo defecto. Cada estado va con su motivo escrito, porque un estado sin motivo es una
  decisión que la próxima persona no va a poder revisar.

### Corregido

- **El arreglo anterior cambió un aborto ruidoso por una pérdida silenciosa, que es
  estrictamente peor.** Eximir los tres archivos del asistente del guard del destino
  ocupado destrabó la corrida — pero después el copiado los pisaba igual. Medido: el
  asistente declaraba **tres desvíos** con su motivo y su fecha de revisión, el copiado
  escribía encima la plantilla vacía del andamio (`{"desvios": []}`), y la persona
  terminaba con un archivo que dice que no se apartó de nada. El aborto por lo menos
  avisaba. Ahora lo que el asistente escribió no se pisa: es la **entrada** de esa corrida.
- **La documentación afirmaba en negrita que no existe ningún comando para crear un
  change, y es falso.** `openspec new change <nombre>` existe, crea el directorio y **para
  ahí** —sin escribir ningún artefacto—, que es exactamente lo que hacía falta. El error
  fue mío y su causa también: miré `openspec change --help`, vi solo `show`, `list` y
  `validate`, y concluí de ahí en vez de buscar. La página ahora usa el comando, y el
  motivo de no usar `/opsx:propose` se conserva porque ése sigue siendo cierto.
- **«7 skills» también era falso**, y reemplazaba al «12» anterior. `openspec init` deja
  **seis**; la séptima que aparece en un proyecto la pone este marco, no OpenSpec.

### Cambiado

- **El banco de la carta era decorativo en su afirmación central, y se endureció.** Un
  escéptico lo rompió **cuatro veces** con el banco en verde: una fila con una letra fuera
  del rango pasaba entera sin sección ni explicación; una flecha sin destino dejaba a una
  forma exenta de las tres reglas a la vez; borrar el aviso que le dice al lector que hoy
  no puede elegir no movía nada; y el caso llamado «MUERDE» era tautológico — armaba la
  lista falsa en memoria y se comprobaba a sí mismo sin ejecutar nunca la comparación real.
  Los cuatro ataques se repitieron contra el banco endurecido y **los cuatro salen rojos**.

### Añadido

- **La carta: las cuatro formas de construir, nombradas y explicadas, para que la persona
  elija.** Hasta hoy el marco imponía una sola forma —una aplicación con servidor propio—
  sin decir que era una decisión tomada por él. Ahora `docs/03-stack.md` abre con las
  cuatro: **un sitio para leer** (Astro), **una aplicación detrás de una puerta**, **la
  misma con servidor propio** (lo de hoy) y **una app de teléfono** (Expo). Cada una dice
  por qué la elegirías, qué te cuesta y **el límite real que sorprende después** — el que
  no aparece en Google, el gestor de contenido que te van a pedir a los dos meses, la
  suscripción anual que no termina nunca.

  Y declara las tres preguntas que el marco decidió **no** hacer, con el motivo: elegir
  entre React, Svelte o Vue no cambia nada de lo que tu producto hace y cuesta rehacer el
  revisor de estilo entero; la capa de datos **se deriva** de si hay servidor propio; y el
  corredor de pruebas no tiene ninguna consecuencia observable. Un marco puede tener
  opiniones — lo que no puede es tenerlas sin declararlas.

- **`pruebas/docs/la-carta-no-miente.test.mjs`, para que no quede en papel.** La columna
  «estado» de la carta dice la verdad y el banco la mide: una forma marcada **🕳️ falta
  construirlo** no puede aparecer como opción del asistente, y una marcada **✅** tiene
  que poder elegirse de verdad. Es el mismo defecto que este repositorio ya se comió con
  Slack —una opción ofrecida que producía un archivo que el motor rechazaba— y esta vez
  está vigilado desde antes. Cuando una forma se construya, su fila y su opción se mueven
  **juntas** o el banco se pone rojo. El guard cazó de entrada un hueco real: `B+` estaba
  en la tabla sin sección propia que la explicara.

### Corregido

- **El primer comando del tramo de construir no existía, y era el primero.** `docs/09` decía
  «el directorio lo crea el comando» y daba `/opsx:new`. Medido contra el CLI que el marco
  pinea y contra lo que `openspec init` deja en un proyecto recién creado: los comandos que
  llegan son **seis** —`explore`, `propose`, `apply`, `archive`, `sync`, `update`— y `new`
  no es ninguno. Peor: la misma página **prohibía** `/opsx:propose`, que es el único que
  crea, así que la persona quedaba entre un comando que no existe y otro que le dijeron que
  no use. Con eso, el tramo de construir no arrancaba.

  El razonamiento de la prohibición era correcto y se conserva —`propose` genera los cuatro
  artefactos de un golpe y el PO terminaría aprobando un proposal cuyo diseño ya está
  escrito—, pero ahora la página dice qué hacer en su lugar: `mkdir` y el proposal primero,
  con `/opsx:explore` para pensar antes y `/opsx:apply` para implementar después. Y explica
  por qué a mano: **no existe ningún comando que cree un change vacío** — `openspec change`
  solo tiene `show`, `list` y `validate`.
- **Tres páginas decían «12 comandos y 12 skills» cuando son 6 y 7.**

### Añadido

- **`pruebas/docs/comandos-que-existen.test.mjs`.** Un comando escrito en una guía es una
  promesa ejecutable: quien lo copia y lo pega no tiene cómo saber que no existe. El banco
  comprueba que toda la documentación nombre solo comandos que llegan al proyecto, y que
  los conteos que afirma coincidan con lo medido.

- **La guía ahora te muestra tu proyecto andando, y era el hueco más barato de todos.** El
  andamio ya traía todo lo necesario —`pnpm dev`, los dos `.env.example`— y la guía lo
  mencionaba **cero veces**: alguien recorría trece pasos, terminaba en verde, y **nunca
  veía una pantalla**. Terminaba con la sensación de haber configurado algo, no de haber
  construido algo. El **Paso 7** copia los dos archivos de configuración, levanta el
  proyecto y lo abre en `http://localhost:5173`.

  **Y no hace falta Docker**, que es lo que hacía parecer caro este paso. Medido sobre un
  proyecto recién generado: la web contesta **200** con el nombre del proyecto en el
  título, y la otra mitad contesta `{"estado":"ok","servicio":"<tu-proyecto>-api"}`. Lo
  único que no anda sin base de datos son las rutas que la usan —contestan un error— y el
  paso lo dice de frente en vez de dejar que la persona lo descubra.

  La introducción también se corrigió: prometía menos de lo que ahora se logra.

### Corregido

- **El camino feliz de la guía estaba roto de punta a punta, y era 100% reproducible.** El
  Paso 3 corre el asistente, que deja `.projects-desvios.json` en la carpeta del proyecto.
  El Paso 5 corre el copiado, ve que ese archivo **ya existe** —es también un archivo del
  andamio— y aborta con **exit 1** y un mensaje que habla de «no sobreescribir trabajo».
  Trabajo que había escrito la propia herramienta dos pasos antes. El guard se queda —su
  trabajo es no pisar el `README` que ese repositorio ya tuviera—; lo que estaba mal era
  el conjunto: esos tres archivos son la **entrada** del copiado, no algo que destruya.
- **Elegir Slack producía un archivo inválido.** El relleno de Slack se aplicaba entero
  solo cuando **no** se elegía Slack, así que elegirlo dejaba `ID_MCP_SLACK` sin valor y
  `projects init` abortaba con `::error::falta ID_MCP_SLACK`. La opción menos usada del
  asistente era la única que no funcionaba, y quien la elegía quedaba con un error que no
  habla de lo que eligió.
- **Y el caso del banco que decía probar Slack contestaba «correo».** Los guiones del
  falso preguntador eran **posicionales**, así que se desalineaban en silencio cuando una
  pregunta condicional cambiaba de lugar: el caso pasaba en verde afirmando que probaba
  algo que no probaba, y el camino de Slack estuvo roto con **580 pruebas en verde**. El
  preguntador recibe ahora el **id de la pregunta**, con lo que un guion desalineado es
  imposible, y entró la prueba que faltaba: **cada opción de cada pregunta**, de punta a
  punta contra el validador de verdad. Comprobado que muerde con los dos defectos
  devueltos a propósito.

### Cambiado

- **La guía técnica tenía adentro el ciclo de trabajo entero, y se partió en tres.** Eran
  **1429 líneas**, y su «Fase 7» ocupaba **547 de ellas — el 38%** contando algo que no es
  arrancar un proyecto: cómo se descubre qué construir y cómo se construye. El corte no lo
  inventó esta reorganización, ya estaba escrito adentro: la propia Fase 7 tenía un
  subtítulo llamado *«Dos sesiones, y qué se hace en cada una»*, y sus ocho pasos se parten
  solos en 1–6 (de los documentos del negocio a un **PRD**) y 7–8 (de ese PRD a un change y
  a un pull request).
  - **`08-descubrimiento.md`** — le habla al PO y es **la página que la auditoría dijo que
    faltaba**: no existía ninguna dirigida a él para arrancar el descubrimiento. El
    contenido ya estaba escrito y era bueno; lo que estaba mal era dónde vivía y a quién le
    hablaba. Dice de frente lo que **no** te da: el descubrimiento llega hasta el PRD y no
    hay ningún comando que convierta un PRD en un spec.
  - **`09-construir-con-openspec.md`** — le habla al builder, empieza donde termina la
    anterior, y abre con la tabla de quién aprueba cada parte del change, que es lo que
    `.github/CODEOWNERS` hace cumplir.
  - **`05-arrancar-tecnico.md`** baja a **882 líneas** y termina donde le corresponde: con
    el repositorio sano. Cierra apuntando a las dos nuevas.

  El camino de lectura queda como el ciclo real: **entender → arrancar → los dos roles →
  descubrir → construir → cómo se trabaja**. Son 105 referencias reescritas en 31 archivos
  para renumerar de la 11 a la 15, con **0 enlaces rotos**.

### Añadido

- **`07-para-el-builder.md`: la hermana de la página del PO, que faltaba.** El reparto
  entre los dos roles es el corazón de cómo trabaja este marco, y solo uno de los dos
  tenía puerta de entrada. La nueva tiene la **misma forma y el mismo orden** que
  `06-para-el-po.md` a propósito: qué te toca y qué no, qué aprobás y qué no, y —donde el
  PO aprende a **leer** un spec— el builder aprende a **escribir** un change.

  **Y sirve igual trabajando solo**, que es el caso más común al empezar: trabajar solo no
  elimina los dos roles, los junta en una cabeza. Su sección 5 es la que dice, en una
  tabla, qué se apaga —**una** cosa: la aprobación de otra persona— y qué **no**: el pull
  request, la verificación en verde y escribir el change antes de programar siguen en pie.
  Y dice lo que se pierde y ninguna verificación reemplaza: el otro par de ojos.

  El camino de lectura pasa de siete páginas a ocho, y las cinco de consulta se renumeran
  de la 09 a la 13. Son 103 referencias reescritas en 30 archivos, con **0 enlaces rotos**
  después — que es exactamente para lo que se escribió el verificador de enlaces.

### Cambiado

- **La elección de plataforma por fin decide algo.** Era el hallazgo más caro de la
  auditoría de la ruta no técnica: la guía tiene una tabla para elegir entre cinco
  plataformas —con lo que da cada una gratis, en números medidos— y la clave `plataforma`
  existía en el archivo de valores del andamio… y **ninguna herramienta la leía**. Quien
  leía la tabla, elegía Supabase para no gastar, y recibía igual `infra/` e `infra-prod/`
  con el proveedor `hashicorp/aws` adentro. Una tabla que invita a elegir y una
  herramienta que ignora la elección es peor que no ofrecer la elección.

  Ahora, con una plataforma que no sea AWS, el proyecto nuevo **no recibe una sola línea
  de Terraform**: 69 archivos en vez de 75, sin `infra/`, sin `infra-prod/`, y el catálogo
  de las cinco plataformas mudado a `PLATAFORMAS.md` en la raíz —vivía dentro de `infra/`,
  que es justo lo que no viaja, y es la única página que explica cómo se conecta cada una.

  **No alcanzaba con vaciar los directorios:** el paso de Terraform del pipeline decide
  con `[ -d "$D" ]`, no con «hay `.tf` adentro», así que un `infra/` con un solo documento
  seguiría contando como raíz y el proyecto arrancaría verificando infraestructura que no
  tiene. Hay un caso que fija esa lectura del pipeline, para que si cambia se revise esta
  decisión.

  **`aws` sigue siendo el valor por defecto a propósito:** un archivo de valores escrito
  antes de que esta clave se leyera describe un proyecto de AWS, y sacarle la
  infraestructura en silencio sería un modo de falla mucho peor.

### Corregido

- **El archivo que declara la plataforma la contradecía.** En el andamio,
  `.projects-valores.json` trae `"plataforma": "aws"` como **literal** y no como marcador
  `{{ASI}}`, así que la sustitución no lo tocaba: el proyecto de alguien que eligió
  Supabase viajaba declarando `aws` en su propio archivo de valores. Y no es un archivo
  cualquiera — es el que la action de la constitución lee en **cada** corrida del proyecto
  para renderizar su ley. Ahora la clave se escribe con lo elegido, y **también cuando es
  `aws`**: si solo se escribiera en el caso raro, el literal del andamio seguiría siendo la
  única fuente para el caso común y podría volver a mentir el día que ese literal cambie.

- **Dos archivos quedaban con referencias muertas que no se quejan, que es lo que las hace
  peligrosas.** `.github/dependabot.yml` seguía con dos entradas de Terraform apuntando a
  `/infra` y `/infra-prod`: Dependabot no encuentra manifiestos ahí y **simplemente no
  hace nada** —sin error y sin aviso—, así que quien lea el archivo va a creer que su
  infraestructura se mantiene al día. Y `.claude/settings.json` conservaba permisos para
  correr `terraform` con un perfil de AWS que no existe. Los dos se podan ahora, y el
  bloque a sacar lo delimita el **propio andamio** con un centinela, no una lista de
  números de línea escrita en la herramienta que envejecería al primer cambio.

- **`projects init --asistente`: el camino del PO, al lado del camino del builder.**
  Hasta ahora la única entrada era un archivo con **21 claves** que alguien llenaba a
  mano. Una auditoría midió que buena parte de ellas no las puede contestar quien no es
  técnico —`REGION` con forma de AWS, `ID_MCP_SLACK`, `GENERAR_CLIENTE_DATOS`— y, peor,
  que **la decisión más cara no era ninguna de las 21**: la clave `plataforma` existía en
  el andamio y **ninguna herramienta la leía**, así que quien elegía Supabase para no
  gastar recibía el andamio de AWS igual, con seis casillas obligatorias de una nube que
  no iba a usar.

  Ahora son **8 preguntas** en el caso simple —y solo dos hay que escribirlas; el resto
  se contestan con Enter— o **15** si elegís AWS con dos ambientes, que es cuando esos
  datos existen de verdad. Cada opción explica **por qué la elegirías, qué te cuesta y
  qué límite real tiene**, con números medidos: «500 MB de base, 50.000 personas al mes,
  el proyecto se pausa si no lo tocás por una semana».

  **No es una segunda puerta al motor.** Genera el mismo archivo que entra por
  `--valores`, y valida con `validarValores`, el de siempre — dos validaciones distintas
  divergen y la que se pudre es la que nadie mira. Lo único que cambia es *cuándo*: el
  patrón corre en el momento de la respuesta, así que el handle mal escrito se arregla
  ahí y no veinte preguntas después.

  `--valores` **no pregunta nunca**, con o sin terminal: la bandera explícita es una
  declaración de que ya decidiste. Sin terminal, `--asistente` no se cuelga: imprime las
  preguntas que iba a hacer, dice que no hay a quién preguntarle y sale 2.

- **Lo que el proyecto se aparta de lo que el marco supone queda firmado.** Trabajar solo
  apaga la aprobación humana ajena —con una sola persona, exigirla bloquea **todo** merge
  sin salida— y eso, junto con el relleno de AWS y de Slack y la protección de rama que
  un repositorio privado gratuito no puede tener, se escribe en `.projects-desvios.json`
  con su motivo y con **cuándo se revisa**. El marco permite apartarse de casi cualquier
  pieza; lo que no permite es que apartarse sea algo que se descubre después.

### Cambiado

- **La guía del PO deja de mandar llenar 21 casillas a mano.** Los Pasos 3 y 4 se
  reescribieron alrededor del asistente: el 3 contesta las preguntas, el 4 revisa lo que
  quedó escrito. La tabla de tiempos dice ahora **8 preguntas** en el caso simple y 15
  con AWS, en vez de «llenar las 21 decisiones». El camino de llenarlo a mano sigue
  existiendo y está escrito ahí mismo, como lo que es: el mismo destino por otra puerta.

- **Nada verificaba que un enlace apuntara a un archivo que existe, y ahora sí.**
  `pruebas/docs/enlaces.test.mjs` comprueba los 418 enlaces relativos del repositorio
  y sus anclas. El hueco estaba medido: apuntando los 217 enlaces del glosario a un
  archivo inexistente, **sin renombrar nada**, la suite daba 948 verdes de 951 — y los
  tres rojos no eran chequeos de existencia sino proxies accidentales. Se podía romper
  la mitad de la navegación y el pipeline quedaba prácticamente verde. El `CHANGELOG.md`
  queda fuera con el motivo escrito: registra lo que cada versión publicada dijo, y
  reescribir sus rutas falsifica lo que el consumidor leyó. Qué tiene que hacer un
  consumidor: nada.

### Cambiado

- **Las páginas de `docs/` se numeran, y el orden se ve sin abrir el índice.** El orden
  alfabético ponía la guía **técnica** como primer archivo de la carpeta y la única
  página que no supone nada en quinto lugar: quien abría `docs/` empezaba por la
  equivocada. Ahora `01-introduccion.md` → `07-reglas-no-escritas.md` es el camino, y
  de la 08 a la 12 lo que se abre cuando aparece su problema. El número dice lugar en
  el camino, no importancia, y el índice lo dice con esas palabras. `docs/README.md` no
  se numera: es el índice, y con los números adelante `ls` lo deja al final, que es
  donde se consulta.
- **`empezar-sin-ser-tecnico.md` pasa a ser `01-introduccion.md`, y es una introducción
  de verdad.** Abre diciendo qué se logra, **qué no se logra**, cuánto lleva cada tramo
  y qué hay que tener antes. Entre lo que no se logra está declarado, en la página de
  entrada y no escondido en un documento técnico, que el marco **todavía no publica la
  aplicación en internet** — el hueco que una auditoría encontró que la ruta no técnica
  nunca veía.
- **La regla de dígitos de la página del stack gana su cuarta exención**, angosta y
  declarada: dos dígitos, un guion y un nombre que termina en `.md`. Sus veinte enlaces
  a otras páginas ahora llevan número. Comprobado en las dos direcciones: un `Node 22`
  en prosa sigue saliendo rojo.

### Corregido

- **Los cinco hallazgos que quedaban del recorrido adversarial.** Ninguno bloqueaba, y
  los cinco eran la misma clase de defecto: la guía afirmando un número que otro archivo
  decide.
  - El Paso 12 prometía **tres** resultados del `grep` y salen **dos**: la herramienta del
    Paso 5 reescribe `.github/proteccion-main.md` con lo que midió y se lleva el tercero
    puesto. La guía ahora dice dos y explica dónde fue el que falta.
  - El Paso 10 decía «encendé **4 de las 8** reglas» y el archivo al que manda tiene **5**
    pendientes y **4** diferidas. Ahora no cablea ningún número: manda a contar las filas
    del archivo propio, porque cuántas son depende de lo que se contestó en el Paso 3.
  - La fila de tiempos de los Pasos 5 a 7 mezclaba tiempo de máquina con tiempo de
    lectura: el Paso 6 son 5 minutos de leer, no de esperar. Se separó.
- **La primera tarea que la herramienta imprime no estaba en ningún paso de la guía.** El
  `README.md` del proyecto nuevo nace con **9 huecos `RELLENAR`** —qué hace el proyecto, a
  quién le sirve, a quién llamar cuando se rompe— y `projects init` lo imprime como su
  pendiente número uno, *antes del primer envío*. La guía mandaba directo a `git push`. Y
  **nada se pone en rojo por un `RELLENAR` sin llenar**, así que lo que no se hace ahí se
  queda para siempre. Ahora el Paso 8 llena la portada antes de enviar.
- **El resto del repositorio no sabía que el asistente existe, y la guía dice que ese
  resto manda sobre ella.** `README.md` y `docs/05-arrancar-tecnico.md` seguían mandando
  llenar 21 casillas a mano como único camino. Las dos lo nombran ahora, y lo presentan
  por lo que es: no dos caminos que puedan divergir, sino **un generador y una puerta** —
  el asistente produce el mismo archivo y lo valida con el mismo `validarValores`.

- **El propio arreglo de la puerta introdujo dos bloqueos nuevos, y los cazó el recorrido
  adversarial.** El bloque del Paso 1 termina con `cd ..`, así que la persona ya sale del
  clon ahí; el Paso 2 le daba **otro** `cd ..` y terminaba una carpeta **más arriba** del
  clon, donde probablemente no puede escribir. Y el Paso 3 y el Paso 5 la paraban en dos
  carpetas distintas —«donde va tu proyecto» contra «la carpeta del proyecto»— sin ningún
  `cd` entre medio. Ahora los dos comprueban con `pwd` y dicen exactamente cuál es, y hay
  una sola subida de carpeta en toda la cadena.
- **Tres afirmaciones nuevas de la guía eran falsas, medidas contra la pantalla.** «El
  síntoma es idéntico en los dos casos» —no lo es, los mensajes difieren y ahora la guía
  enseña a distinguirlos—; «15 preguntas con AWS» —son **13**, y **16** el máximo—; y la
  comprobación de acceso prometía «nombre y descripción» cuando la descripción viene
  vacía y la salida son 487 líneas.
- **El asistente decía «pregunta 13 de 8».** El total se fijaba antes de empezar, cuando
  no se sabía todavía cuántas preguntas iba a haber: elegir AWS agrega cinco. Ahora se
  recalcula en cada pregunta, así que el denominador crece con honestidad — `[1/8]`,
  después `[6/13]`.
- **Volver a correr el asistente borraba en silencio las respuestas de AWS.** El archivo
  de valores guarda las 21 claves **derivadas**, no las respuestas, así que al releerlo la
  pregunta de la plataforma volvía con «supabase» de recomendada, Enter la aceptaba, y las
  cinco respuestas tipeadas desaparecían: 13 preguntas la primera vez, 8 la segunda, y el
  resumen decía otra cosa sin avisar. Ahora las respuestas se guardan en
  `.projects-respuestas.json` y la corrida arranca diciendo `Retomando lo que contestaste
  antes`. Medido: 14 preguntas las dos veces y la cuenta de AWS intacta.
- **El resumen se llamaba «todo lo que elegiste» y se comía justo las cinco de AWS** — las
  únicas que la persona tuvo que ir a buscar a otro lado.
- **La tabla de programas prometía comprobar `pnpm` y el Paso 0 comprueba `corepack`.** La
  fila ahora nombra lo que el Paso 0 realmente corre.
- **El segundo archivo se presentaba como una excepción y sale siempre.** Aceptando todas
  las opciones recomendadas igual quedan tres desvíos declarados —trabajar solo ya es
  uno—. La guía ahora lo dice y explica que no es una señal de que algo salió mal.

- **La guía dejaba a la persona trabada en el paso 1 de 12, y le daba la causa
  equivocada.** El repositorio del marco es **privado** y la guía nunca decía que hay
  que pedir acceso. Peor: anticipaba el error que iba a ver —un «no encontrado»— y le
  atribuía una sola causa, no estar autenticado, con su remedio. Quien ya estaba
  autenticado y solo le faltaba permiso veía el mismo síntoma, corría el remedio, y
  seguía trabado. GitHub responde lo mismo para «no existe» y para «existe y no es tuyo»,
  a propósito, así que la página no puede distinguirlos: ahora las nombra a las dos y
  dice cuál se destraba con un comando y cuál con una persona. Y agrega el acceso como
  tercer requisito de «antes de empezar», con `gh repo view` para comprobarlo.
- **El Paso 1 mandaba «anotar» una ruta que ningún comando imprimía.** `pwd` aparecía
  **0 veces** en las 614 líneas de la página, y esa ruta es obligatoria en los Pasos 3 y
  5. Ahora el bloque a copiar la imprime, y la página dice que se copie, con la salida
  real (`Cloning into 'Projects'...`) en vez de la que prometía.
- **El Paso 2 no decía dónde había que estar parado**, y lo más probable era crear el
  proyecto **adentro** del clon del marco. Ahora sale de la carpeta primero y comprueba
  con `pwd` que la ruta no termine en `/Projects`.
- **La salida de ejemplo del Paso 0 no coincidía con la real**, en una página cuya regla
  es «si ves otra cosa, algo pasó». `gh auth status` imprime seis líneas y la guía
  mostraba una. Ahora muestra la salida completa y dice qué va a ser distinto y por qué
  no importa: lo único que hay que encontrar es la línea con el tilde.
- **La tabla de programas prometía un encendido que el Paso 0 no hacía.** Decía que pnpm
  «se enciende con `corepack` — Ver el paso 0», y el Paso 0 solo pregunta la versión.
  Todos los comandos de la página llaman a pnpm con el prefijo `corepack pnpm`, así que
  no hay nada que encender: la fila ahora lo dice.

- **Dos afirmaciones del banco quedaron falsas al numerar, y se reescribieron en vez de
  dejarlas.** Hasta hoy `consumidores.md` era subcadena de `censo-de-consumidores.md`, y
  el repositorio ya se había comido una vez ese falso verde. Con los números la colisión
  murió sola. La regla —buscar el destino del enlace y no el nombre suelto— se conserva:
  no depende de los nombres de hoy, y el próximo par que colisione va a llegar sin avisar.

- **El stack se revisa solo al arrancar.** `herramientas/projects-versiones.mjs` compara
  la versión que el proyecto tiene con la estable publicada y, si difieren, hace dos
  preguntas en este orden: si querés actualizar, y si querés aplicarlo al stack entero.
  Solo pregunta si hay una persona mirando (`process.stdin.isTTY`); en CI y en cualquier
  tubería informa y sigue. **Sin red no se pone rojo** — no saber cuál es la última
  versión no es un defecto del proyecto. Y **no toca el lockfile**: deja el comando
  escrito. `herramientas/registro-npm.mjs` es el único punto que habla con la red, para
  que el banco lo sustituya por `pruebas/init/registro-falso.mjs` y no dependa de
  internet. Qué tiene que hacer un consumidor: nada.
- **Documentación que se lee sin ser técnico, y un banco que lo vigila.**
  `docs/empezar-sin-ser-tecnico.md`, `docs/paso-a-paso-sin-ser-tecnico.md`,
  `docs/para-el-po.md`, `docs/stack.md` y un `docs/glosario.md` de 37 términos — cada
  palabra que el resto de los documentos usaba sin explicar.
  `pruebas/docs/estandar-de-lectura.test.mjs` mide los documentos de entrada contra el
  estándar en vez de confiar en que alguien lo recuerde.

### Cambiado

- **El andamio pasa a TypeScript 7.0.2 y a Supabase Auth.** TS 7 en los tres paquetes
  (`api`, `web`, `e2e`), con el *type-aware linting* comprobado metiéndole un error de
  tipos a propósito, no solo declarado en un `package.json`. La autenticación verifica
  **JWKS/RS256** con `jwtVerify` y `requiredClaims`, no un secreto compartido; Clerk
  queda como alternativa documentada, no como dependencia. Qué tiene que hacer un
  consumidor: nada — esto viaja al crear un proyecto nuevo, no reescribe uno existente.

### Corregido

- **Lo que el andamio le reparte al consumidor no tenía ninguna regla de lectura encima.**
  El estándar de lectura mide `docs/` y el `README.md` de la raíz, y su regla es enlazar
  cada palabra del vocabulario al glosario. Esa regla **no se puede aplicar a lo que
  viaja**: el glosario vive en `docs/` del marco y no se copia — medido, de los 10 `.md`
  que recibe un proyecto nuevo, ninguno es un glosario—, así que un enlace nacería roto el
  día uno. Y sin embargo son las páginas que más lee alguien que no es técnico: el
  `README.md` del repositorio donde aterriza, la plantilla que se abre en **cada** pull
  request, y el documento de la protección de `main`. Se reescribieron explicando el
  vocabulario **en la propia página** —«ci-ok no hace trabajo propio: mira el resultado de
  todas las demás y las resume en un sí o un no»— y la regla quedó fijada en
  `pruebas/docs/lo-que-lee-el-consumidor.test.mjs`: cada término del marco que use una
  página que viaja va declarado, o con la frase que lo explica (y el banco comprueba que
  esa frase esté de verdad en el texto), o con el motivo por el que no la necesita. Un
  `.md` nuevo en el andamio obliga a clasificarlo. Comprobado que muerde por los dos
  lados.
- **El arranque automático moría en una máquina limpia — la única que corepack existe
  para cubrir.** Medido en un runner de CI sin `pnpm` global: el paso 1
  (`corepack pnpm install`) pasaba y el 2 se cortaba con `sh: pnpm: not found`. La causa
  es que los scripts del andamio se llaman entre sí con `pnpm` **pelado**
  (`pnpm -C api run typecheck`, `pnpm datos && pnpm lint && …`), que es la forma
  idiomática de un workspace y no se va a cambiar: escribir `corepack pnpm` dentro de
  cada script del proyecto del consumidor sería filtrarle a su `package.json` un detalle
  de cómo lo arrancamos nosotros. **Por qué no se veía:** en la máquina de quien escribe
  el código hay un `pnpm` global y los scripts anidados lo encuentran. Ahora, cuando el
  ejecutor es corepack y no hay un `pnpm` que corra, el arranque materializa los shims
  con `corepack enable --install-directory` y los pone **adelante** del `PATH` de sus
  procesos hijos — directorio temporal, nada global, nada que tocar en la máquina.
  Comprobado con un `PATH` reducido a Node y `/usr/bin`: los cuatro pasos en verde.
  Banco: `pruebas/init/projects-init.test.mjs`.
- **Todo proyecto nacido del andamio arrancaba ROJO en su primer CI.**
  `plantilla/.github/workflows/ci.yml` expandía `${RAICES}` sin comillas (SC2086). El
  arreglo ya existía en el workflow del marco y faltaba portarlo a la copia que viaja.
  Sobre un array, `${RAICES}` no es un detalle de estilo: expande el elemento 0 y nada
  más — con dos raíces daba `[infra] [dos]` en vez de `[infra dos] [infra-prod]`.
- **`actionlint` no miraba el andamio, que era justo donde estaba el error.** Descubre
  workflows mirando **solo** `.github/workflows/` de la raíz, así que «actionlint limpio»
  era cierto y no decía nada sobre lo que se reparte. El job `higiene` ahora **instancia**
  el andamio con los valores de ejemplo de la propia herramienta —tal cual no se puede
  lintear: sus marcadores `{{ASI}}` son sintaxis rota para shellcheck (SC1083)— y lintea
  el resultado, que es exactamente lo que recibe un proyecto nuevo. Comprobado que muerde:
  devolviendo el defecto a propósito, el paso sale 1.

### Seguridad

- **El andamio repartía un documento que afirmaba compuertas que el repositorio
  desmiente.** `projects init` copiaba `.github/proteccion-main.md` tal cual; ese
  documento se presenta como «el estado real» y manda aplicar cuatro reglas. Medido:
  `gh api repos/<org>/<repo>/rulesets` responde **403 «Upgrade to GitHub Pro or make this
  repository public»**, o sea que las cuatro reglas no existen y **no pueden** existir en
  un repo privado del plan gratuito. Eso es fallar abierto: no hay compuerta y ningún
  texto lo dice. Ahora se **mide**, no se pregunta — preguntar «¿tenés GitHub Pro?» falla
  de tres formas (no lo sabe, lo sabe mal, o el plan cambia y nadie vuelve a preguntar) y
  las tres escriben una afirmación que nadie comprobó. Y **«no pude mirar» es un tercer
  estado**, no un sinónimo de «no hay problema»: sin `gh`, sin autenticación o sin red se
  escribe que no se midió y no se afirma nada. La sonda es un **GET de solo lectura** y no
  aplica el ruleset: un programa con permiso para editar la protección de `main` es un
  programa con permiso para quitarla. Deja el comando escrito, con las tres salidas y su
  costo. Banco: `pruebas/init/proteccion.test.mjs`.

- **Un consumidor llamado `<su-cuenta>/Projects` se salteaba la compuerta de la
  constitución, y el veredicto agregado le aceptaba el salteo en silencio.** El `if` de
  `constitucion-cableada` y su gemelo en `marco-ok` comparaban contra
  `format('{0}/Projects', github.repository_owner)`. Las dos puntas derivaban lo mismo,
  así que el fail-open no se notaba: un repositorio que se llamara así recibía «salteado
  a propósito» en vez de la compuerta. Un nombre de repositorio no es una identidad.
  Ahora la pregunta la contesta una **sonda por archivos rastreados de la rama base**
  (`cambios.outputs.es_distribuidor`): reparte `plantilla/.github/workflows/ci.yml`,
  contiene `actions/constitucion/action.yml` y no versiona `.projects-valores.json`.
  Fail-closed en todas sus salidas — no poder medir responde `false`, y `false` es el
  caso en el que las compuertas **corren**. Banco:
  `pruebas/marco-ci/distribuidor.test.mjs`.
- **`actions/guardrail-deltas` se mudó a un job propio, `deltas-openspec`, que se saltea
  en el repo que distribuye el marco.** Vivía como paso del job `openspec`, que corre en
  todas partes: una copia del árbol a otra cuenta seguía descargando y ejecutando la
  composite action de la cuenta **original** en cada PR de cada consumidor de esa copia.
  Un `if` de paso no lo arregla — GitHub resuelve y descarga las actions de un job en
  «Set up job», antes de evaluar el `if` de cualquier paso.
- **Bajo `pull_request_target`, el job `openspec` sí ejecutaba código del PR.** Corre
  `npx --yes "@fission-ai/openspec@<pin>"` con el cwd dentro del árbol recién
  *checkouteado*, y npm lee el `.npmrc` del directorio de trabajo antes que el del
  usuario: un `.npmrc` del head de un fork redirigía el `registry=` y npx bajaba y
  ejecutaba otro paquete con ese nombre. El pin dice **qué** bajar, no **de dónde**. Se
  agrega el paso «El arbol del PR no redirige el registry de npm» (rojo si el árbol trae
  un `.npmrc`) y el `npx` corre con `npm_config_userconfig` apuntando a un archivo
  vacío. Banco: `pruebas/marco-ci/registry-npm.test.mjs`.
- **Los seis checkouts de `marco-ci.yml` declaran `persist-credentials: false`.** Con
  el default, bajo `pull_request_target` el checkout dejaba el token del repo
  **llamador** escrito como `extraheader` en el `.git/config` de un árbol que es código
  de un tercero. Eran **cinco** cuando se escribió esta entrada y hoy son seis: el job
  `terraform` de más abajo sumó el suyo, y la cifra no se recuerda, se remide con
  `grep -c 'persist-credentials: false' .github/workflows/marco-ci.yml`. Banco:
  `pruebas/marco-ci/checkouts.test.mjs`.
- **El `allowed-tools:` del frontmatter de skills y agentes pasa a ser COMPUERTA en el
  repo que distribuye el marco.** Seguía en modo aviso en todas partes: medido sobre
  este árbol, 30 entradas que autorizan una escritura (`Bash(gh:*)` habilita `gh pr
  merge`, `gh release create` y `gh api -X DELETE`; `Bash(git:*)` habilita `git push
  --force`) y el job terminaba **verde**. La regla del marco sobre endurecimientos
  protege a los consumidores de un rojo que nadie les anunció; no protege al repo que
  escribe la línea. Banco: `pruebas/marco-ci/permisos-compuerta.test.mjs`.

### Para consumidores

- **Un job nuevo en el CI heredado: `deltas-openspec`.** Es el guardrail de deltas de
  OpenSpec, que antes era un paso del job `openspec`. No cambia lo que se verifica ni
  cuándo falla; cambia dónde aparece en la lista de checks. Cuesta un checkout y un
  `setup-node` más por corrida.
- **`marco-ok` ahora cobra también el salteo de `deltas-openspec`**, con el mismo
  criterio que ya usaba para `constitucion-cableada`: un skip solo es válido en el repo
  que distribuye el marco.
- Nada que hacer del lado del consumidor. El `allowed-tools:` del frontmatter **sigue en
  modo aviso** en tu repo: el endurecimiento de esa clase se anunciará antes en esta
  misma sección.

### Guardas que quedaron sin banco y ahora lo tienen

- Las dos guardas de «no pude mirar» del job `higiene` —«Artefactos regenerados al dia»
  y «Sin marcadores del scaffold sin resolver»— cerraban un verde afirmativo sobre cero
  archivos leídos (`git ls-files` sale 128 fuera de un árbol git) y se habían escrito
  **sin una sola aserción**. Banco con mutación:
  `pruebas/marco-ci/higiene-sin-arbol.test.mjs`.

- **`projects init --version-openspec` sin valor era un éxito silencioso.** `argumentos()`
  toma el valor con `argv[++i]`, que con la bandera al final del argv devuelve `undefined`,
  y la validación estaba escrita `if (o.versionOpenspec !== undefined && !pinValido(...))`:
  ese caso se colaba entero por las dos revisiones y `?? pinOpenspecDe(marcoCi)` lo
  reemplazaba por el default del YAML. **El pin que la persona quiso fijar se descartaba
  sin decirlo y la corrida declaraba éxito.** Ahora una bandera que lleva valor y llega sin
  él muere por su nombre (`--version-openspec necesita un valor`, código 2) antes de
  escribir nada, y la revisión pregunta por la existencia de la clave y no por el valor.
  Lo mismo para `--valores` y `--destino`. Qué tiene que hacer un consumidor: nada.

- **El marco no ejercitaba sobre sí mismo el Dependabot que reparte.** Su modelo de
  distribución y su censo de consumidores dependen de que Dependabot funcione, y
  `.github/dependabot.yml` no existía acá. Ahora existe, con el ecosistema de
  github-actions y el motivo de cada exclusión escrito.

  **Dos notas de ese archivo se corrigieron en este mismo cambio**, y las dos eran
  afirmaciones medibles que habían dejado de ser ciertas —van declaradas acá porque una
  edición que no figura en ninguna entrada es un archivo de más para quien revise el
  diff—: el motivo por el que `terraform` queda **fuera** decía «ningún job del marco
  corre `terraform`», y hoy sí hay un job `terraform` en `marco-ci.yml` —sólo que
  verifica las raíces del repo **que lo consume**, y en éste no encuentra ninguna, así
  que la decisión no cambia pero el motivo escrito sí—; y el censo de `uses:` decía
  **44 / 28 / 16** cuando hoy son **45 / 29 / 16**. El comando que reproduce las tres
  cifras está en el propio archivo, dos líneas más abajo de donde se escriben.

- **Aviso de invocaciones a acciones ajenas sin pinar por SHA — y las que corren acá ya
  están pinadas.** `AGENTS.md` declara en sus fronteras que una acción de terceros «se
  pina por SHA, no por tag móvil ajeno», y cuando este check se escribió lo cumplían
  **dos** líneas en todo el árbol, las dos de `anthropics/claude-code-action`. El job
  `higiene` las detecta y las reporta con `::warning::` —modo aviso y no rojo, porque
  estrenarle un rojo a un consumidor sin anunciárselo es lo que este marco prohíbe— con
  el comando que cierra cada una y la condición escrita para pasarlo a rojo.

  **Y ahora tiene bastante menos que reportar:** los **22** `uses:` ajenos de
  `.github/workflows/` —14 `actions/checkout` y 8 `actions/setup-node`— pasaron a SHA de
  40 hex con el tag en el comentario de al lado, que es la forma que Dependabot
  reescribe. Medido con el método del propio paso, hoy quedan **10 de 34** por tag móvil,
  y son exactamente los que **viajan**: 8 en `plantilla/.github/workflows/` y 2 en los
  `action.yml` de `cobertura-diff` y `guardrail-deltas`. El paso sigue avisando hasta que
  no quede ninguno; ahí pasa a `::error::` y `exit 1`, y ese endurecimiento se anuncia en
  «Para consumidores» **antes** de hacerlo.

  **Un SHA no se mueve, y eso es lo que lo vuelve peligroso si nadie lo descongela:** lo
  que reescribe el SHA y su comentario `# v7` es la entrada de `github-actions` de
  `.github/dependabot.yml`, que pasa de cubrir dos líneas a cubrir 24. Las dos piezas se
  necesitan; ninguna sola sirve. Qué tiene que hacer un consumidor: nada todavía.

### Corregido

- **En un Node anterior a 18.17 la herramienta escribía 16 de 75 archivos y salía diciendo
  «cero marcadores sobrevivientes».** `readdirSync({recursive:true})` no existía antes de
  esa versión y la opción se ignoraba en silencio; el control final releía el árbol con la
  misma API rota, así que confirmaba limpio un árbol que nunca escaneó entero. El repo nuevo
  nacía sin `ci.yml`, sin `CODEOWNERS` y sin `settings.json`, con un éxito en pantalla —el
  fail-open exacto que el encabezado de la herramienta declaraba imposible. Ahora hay piso
  de Node verificado antes de tocar nada, aviso en 20.12, y una defensa de fondo que compara
  los archivos escritos contra el andamio medido **con la otra API**, la que no se rompe.

- **`projects init` aceptaba nombres de paquete que no son las carpetas del andamio.** Salía
  0 y dejaba el CI del repo nuevo en rojo por excepciones que no correspondían a ninguna
  carpeta. Los nombres válidos ahora se derivan del andamio real, no de una lista escrita
  aparte que puede divergir.

- **Las cifras del andamio en el README eran de otra época.** Decía 22 archivos, 89
  ocurrencias y 22 marcadores; medido con las propias funciones de la herramienta son **75
  archivos, 157 ocurrencias de 21 marcadores en 37 archivos**. El encabezado de
  `herramientas/projects-init.mjs` ahora trae el comando que las reproduce, para que la
  próxima vez se recomprueben en vez de recordarse.

- **La exclusión del README del andamio distinguía mayúsculas** sobre sistemas de archivos
  que no las distinguen (macOS y Windows por defecto), y **el escaneo final recorría todo el
  destino** en vez de lo que la corrida acababa de escribir: un `{{ALGO}}` preexistente en
  un repo con contenido abortaba por un motivo ajeno.

- **El repo afirmaba dos compuertas de gobierno que no existen, y ahora dice lo que se
  midió.** Las dos se remidieron contra la API de GitHub el 2026-08-24 y las dos salieron
  vacías. Un repo que **afirma** una compuerta que no existe está peor que uno que no
  afirma ninguna: el que lo lee deja de buscar.

  - **`main` no tiene ninguna protección activa.** `.github/proteccion-main.md` declaraba
    un ruleset `main-protegida` con `enforcement: active` y cinco reglas en verde. Contra
    las dos formas en que GitHub puede proteger una rama —la moderna y la heredada—:
    `gh api repos/im-diego-ec/Projects/rulesets` devuelve `[]` y
    `gh api repos/im-diego-ec/Projects/branches/main/protection` devuelve `404`. No hay
    ruleset ni protección heredada: hoy un push directo a `main` entra, y el check
    `ci-ok` corre, reporta y **nadie lo exige**. El documento pasa a tener la tabla
    entera en rojo, con los pasos para aplicarla y esos dos comandos para remedirla antes
    de creerle. **Con lo que se puede leer desde acá no se reconstruye qué pasó** —si el
    ruleset se creó y se borró, o si nunca existió— y esa parte se deja sin respuesta en
    vez de rellenarla. El comentario de `ci-ok` en `ci.yml`, que decía «check REQUERIDO
    por el ruleset main-protegida», dice ahora lo mismo: el nombre del job sigue siendo
    el contrato público —renombrarlo es breaking— aunque hoy no lo exija nadie.
  - **Los owners de `.github/CODEOWNERS` bajan de equipos a un handle personal.** El
    archivo asignaba `@im-diego-ec/builders` y `@im-diego-ec/po`, y
    `gh api repos/im-diego-ec/Projects/teams` devuelve `[]`: la cuenta es **personal**, y
    en una cuenta personal los equipos no existen —no hay nada que devolver ni nada que
    crear—, así que esos owners no resolvían a **nadie**. Es el fallo mudo que el propio
    encabezado del archivo describía, esta vez sobre el archivo que lo escribía: el gate
    existía en el texto y no en la práctica. Ahora dicen `@im-diego-ec`.
    **Qué se pierde, dicho entero y no minimizado:** con un equipo el **rol** sobrevive a
    la persona —la membresía se edita en un solo lugar y ningún repo cambia—; con un
    handle no, y el día que el owner cambie de persona hay que editar este archivo.
    **La condición para volver atrás** no depende de que alguien se acuerde: que el repo
    se mueva a una **organización**, donde el mismo comando deja de devolver `[]` y estas
    líneas vuelven a la forma `@organizacion/equipo`.
    **Y la consecuencia operativa es la que más importa:** GitHub solicita review a los
    owners **excepto** al autor del PR, así que con un único owner que además escribe
    todos los PRs la resta da cero y no se le pide revisión a nadie. De ahí que activar
    `require_code_owner_review` no endurecería nada: **bloquearía todo merge**, porque el
    PR pediría una aprobación de code owner que sólo puede dar el autor. Por eso esa
    regla sigue diferida, y el motivo es ése y no la falta de tiempo. Banco:
    `pruebas/docs/codeowners.test.mjs`, que exige la forma `@usuario` en este archivo y la
    de equipo en el del andamio, porque son repos distintos y la forma válida no es la
    misma en los dos.

  **Qué tiene que hacer un consumidor: nada.** Ninguno de los dos archivos viaja con esos
  valores: el `CODEOWNERS` del andamio conserva sus placeholders de organización y equipo,
  que es la forma que sí resuelve en el repo al que llega.

### Añadido

- **`docs/para-el-po.md` y `docs/glosario.md`.** El rol con más poder de veto del marco —el
  PO, a quien CODEOWNERS le reserva rutas propias, sacadas a mano del catch-all— no tenía
  ningún documento dirigido a él, y la palabra «glosario» no aparecía en ningún archivo del
  repo. Con `pruebas/docs/` detrás, que comprueba que cada ruta que CODEOWNERS saca del
  catch-all esté explicada y que la cifra del glosario sea la cantidad real de filas: las
  dos reglas fallan solas si alguien toca CODEOWNERS o agrega una fila. Ese banco
  identifica las rutas por el carve-out y **no** por el owner desde que los owners de este
  repo son un handle personal: con un único handle, las reglas del PO nombran al mismo
  owner que la regla `*` y el rol ya no se lee en el archivo (ver la entrada de CODEOWNERS
  en «Corregido»).

- **La guía de arranque deja de asumir un solo shell.** Tenía 25 bloques `bash`, cero de
  PowerShell y una sola mención de Windows —y era un aviso de que un paso falla—. Ahora
  declara la postura de sistema operativo arriba del todo, trae el gemelo en PowerShell de
  cada bloque que no es portable, y suma los fallos silenciosos por sistema operativo a su
  tabla. Los prerrequisitos incluyen `corepack enable` y la firma de commits por plataforma.

- **Matriz de sistemas operativos para el banco de `projects init`.** Es la única pieza que
  corre en la máquina de una persona y nunca se había ejecutado fuera de Linux. Ahora corre
  en ubuntu, windows y macos.


### Corregido

- **El canal de distribución del marco tenía un retraso de hasta nueve días, y nadie lo
  sabía.** El PR del bump es la única forma en que un consumidor se entera de que el marco se
  movió. Medido el 2026-08-24 en el log de Dependabot de un consumidor, con la
  1.6.0 publicada desde el 22 y disponible:

  ```
  Available release version/ref is 1.6.0
  Found acceptable version outside cooldown: 1.4.2
  Latest version is 1.4.2
  ```

  **Propuso una versión vieja a propósito.** La causa es un `cooldown` de **tres días** que
  GitHub aplica **por defecto** a las actualizaciones de versión cuando `cooldown` no está
  declarado — no estaba en ningún archivo nuestro, y por eso nadie lo había visto. Sumado a la
  agenda semanal del lunes, el retraso llegaba a **nueve días**: una versión publicada de
  sábado a lunes no se proponía hasta el lunes siguiente.

  El andamio ahora declara `cooldown.exclude` para el marco y pasa esa entrada a **diario**:

  - **El cooldown se deja para las acciones de terceros**, que es donde sirve: cubre de una
    release recién publicada y comprometida. El marco es propio y su premisa es que un arreglo
    llegue a todos rápido, así que la protección de cadena de suministro no compra nada ahí y
    cuesta días.
  - **Diario es para toda la entrada, y no se puede acotar**: la agenda es por entrada de
    `updates:` y GitHub no permite dos entradas del mismo ecosistema y directorio. Está
    acotado por los grupos que ya existían: Dependabot no abre un segundo PR de un grupo
    mientras el primero siga abierto, así que el techo son **dos PRs abiertos** y lo que cambia
    a diario es la **corrida**, no la cantidad de PRs. Las otras cuatro entradas del archivo
    siguen semanales.

  El patrón `<org>/projects*` no es una apuesta: es el **mismo** que ya funciona en el grupo, y el
  PR del bump salió con los cinco pines, así que matchea las dos formas con las que Dependabot
  nombra al marco.

  **Lo que queda sin explicar, y se dice en vez de rellenarse**: con una ventana uniforme de 72
  horas, ni la 1.4.2 (45 h al correr) ni la 1.6.0 (27 h) deberían haber pasado el filtro, y
  1.4.2 pasó. Verificado que las fechas de commit y de release de los tags coinciden, así que
  no es eso. Algo más entra en el cálculo y no se pudo reconstruir del log. **No cambia el
  arreglo**: `exclude` saca al marco del filtro cualquiera sea la aritmética.

### Seguridad — el árbol npm que el CI de cada consumidor ejecuta

- **En cada corrida, el job `openspec` descargaba y ejecutaba un conjunto de paquetes que
  nadie podía enumerar.** El pin de `version_openspec` dice **qué** paquete baja; no dice
  **cuál árbol arrastra**. Las dependencias del CLI se resolvían frescas en cada corrida y
  un ejecutor de paquetes no deja lockfile: el código que terminaba corriendo dentro del CI
  de un consumidor podía cambiar entre **dos corridas del mismo commit**, sin PR y sin diff.
  Tres cosas cambian:

  1. **El árbol se materializa en un directorio propio del `RUNNER_TEMP`**, con `npm` corriendo
     con su cwd ahí y no adentro del árbol del consumidor. Bajo `pull_request_target` ese árbol
     es el head de un PR de fork, o sea código de un tercero: el vector conocido —un `.npmrc`
     que redirige el `registry=`— ya estaba cerrado, pero la **forma** seguía siendo correr el
     gestor de paquetes parado adentro de lo que se está juzgando. Ya no.
  2. **La instalación deja un `package-lock.json`**, y el paso arma con él un manifiesto con la
     ruta, la versión y el `integrity` de **cada** paquete, lo imprime entero en un `::group::` y
     lo resume en un sha256. Un paquete sin `integrity` sale con `::warning::` y su nombre.
  3. **El CLI se ejecuta desde ese árbol ya medido**, derivando el ejecutable de
     `node_modules/.bin` en vez de escribirlo de memoria. Si el paquete dejara de exponer un
     ejecutable reconocible, el paso vuelve al ejecutor anterior **avisando** en vez de
     degradarse callado.

  **Input nuevo: `huella_openspec`, vacío por default.** Vacío, el paso mide e imprime; con
  valor, un árbol distinto es **rojo** con los dos manifiestos en el log. El default vacío no
  es una omisión: la huella depende del registry y no se puede resolver sin red, así que el
  marco no puede traerla escrita. **Qué tiene que hacer un consumidor:** nada obligatorio. Si
  quiere el pin del árbol, mira el `::notice::` de su próxima corrida —trae la huella medida y
  la línea lista para copiar— y la declara en el `with:` de su `uses:`. A partir de ahí,
  subir `version_openspec` obliga a remedir; el `::notice::` lo dice cada vez.

- **Los 10 jobs que no declaraban `permissions:` quedaron en cero, y hasta ahora no se había
  escrito acá.** Un job sin bloque `permissions:` corre con el default del **repositorio**:
  una perilla de Settings que no vive en el árbol, que no aparece en ningún diff y que en
  muchas organizaciones sigue siendo read/write sobre todo. El `permissions:` del encabezado
  no cierra ese hueco, lo tapa: es un default para los jobs que no declaran, no un techo.
  Medido sobre los dos árboles de workflows —el del marco y el que reparte el andamio—: de
  20 jobs, 10 no declaraban; hoy declaran **los 23**, con el mínimo real o con `{}`, que es
  una respuesta y no un silencio. **Qué tiene que hacer un consumidor:** nada. Lo que le
  llega es un techo más angosto, nunca uno más ancho — y el job que llama al reusable sigue
  concediendo `pull-requests: read`, sin el cual la detección del carril de docs cae al
  fail-open. Banco: `pruebas/andamio/permisos-por-job.test.mjs`.

### Añadido — la infraestructura se verifica desde el marco, no desde una copia

- **Job nuevo en el CI heredado: `terraform`.** La verificación de formato y validez de las
  raíces de Terraform vivía **inline en el `ci.yml` que reparte el andamio**, o sea en un
  archivo que el repo nuevo recibe como propio: un paso que cualquiera puede borrar, que un
  repo anterior al andamio nunca tuvo y que un repo creado a mano no tiene. Ahora vive en
  `marco-ci.yml`, que se consume por `uses:` y no se edita. Verifica lo mismo y con las
  mismas dos comprobaciones, y **una de las dos no es inerte**, al revés de lo que decía
  el primer borrador de esta entrada: `terraform fmt -check` sí lo es —lee texto— pero
  `terraform init -backend=false` + `terraform validate` no. Lo que dice el
  `-backend=false` es que **no se inicializa el state remoto**: no toca ningún bucket, no
  pide credenciales de ninguna cuenta y no necesita que el repo se haya desplegado nunca.
  Eso es más angosto que «inerte»: `init` **descarga** los providers y módulos que
  declaran los `.tf` del árbol que se está mirando —un `required_providers` puede nombrar
  cualquier host de registry, un `source` de módulo puede ser `git::` o `http`— y
  `validate` **arranca** esos binarios de provider para leerles el schema.

  **Consecuencia, y viene cerrada de fábrica:** bajo `pull_request` eso es el trato normal
  de cualquier CI de Terraform (el árbol es el merge del PR, el token de un PR de fork es
  de solo lectura y no hay secretos). Bajo `pull_request_target` no lo es —ahí el token y
  los secretos son los del repo llamador— así que **bajo ese evento el paso corre solo el
  `fmt` y anuncia con un `::notice::` que la validez quedó sin verificar**. Un check que se
  achica en silencio bajo un evento es un verde que nadie sabe leer.

  **Corre siempre, sin `needs` y sin mirar el carril de docs, y ese detalle decide todo lo
  demás:** el default de `rutas_carril_docs` incluye `^infra/` y `^infra-prod/`, así que un
  PR que toca **únicamente** Terraform sale con `solo_docs=true`. Un job que se salteara en
  el carril rápido no verificaría nunca la infraestructura justo en los PRs que solo la
  tocan.

  **Dos inputs nuevos:** `raices_terraform` (default `"infra infra-prod"`) y
  `ventana_terraform` (default `"2026-09-30"`).

  **Qué tiene que hacer un consumidor:**
  - **Si tu repo no tiene `infra/` ni `infra-prod/`:** nada. El job sale verde en segundos con
    un `::notice::` que dice que no verificó nada, que no es lo mismo que verificar y no
    encontrar problemas. Si tus raíces se llaman de otra forma, declaralas en
    `raices_terraform`.
  - **Si tu repo sí las tiene:** mirá el log de tu próxima corrida. **Hasta el 2026-09-30 un
    hallazgo avisa; desde el 2026-10-01 detiene el CI**, sin que nadie toque ningún archivo:
    la gravedad se deriva del reloj. Esa ventana es el plazo para arreglar lo que reporte. Si
    necesitás más, `ventana_terraform` la mueve — y esa postergación queda escrita en tu
    `ci.yml`, con autor y fecha.
  - **La ausencia del binario cuenta como fallo, no como caso neutro**, y comparte la misma
    ventana. «No pude verificar» no es «verifiqué y está bien»: avisar para siempre cuando
    falta `terraform` convertiría el job en un verde perpetuo. **Límite declarado:** el
    binario sale hoy de la imagen del runner; el `hashicorp/setup-terraform` pinado por SHA
    que lo garantiza todavía no está, porque el SHA se resuelve con red. Los dos comandos que
    lo resuelven —sin copiarlo de memoria— están escritos en el encabezado del job.
  - La copia inline del andamio **sigue en pie a propósito**: su banco la extrae por nombre y
    retirarla es un cambio de dos archivos que no es este. Mientras convivan, un repo del
    andamio verifica sus raíces dos veces: cuesta segundos y no cambia ningún veredicto.

  **Hueco declarado, y se escribe acá porque un consumidor lo hereda:** el paso de este job
  **todavía no tiene banco propio**, y la compuerta que vigila justamente eso
  —`pruebas/marco-ci/cobertura-de-los-pasos.test.mjs`, que pregunta si algún banco menciona
  el nombre de un paso con `run:`— lo da por cubierto **por colisión de nombre**: el banco de
  la copia del andamio menciona ese mismo nombre porque la copia se llama igual, pero extrae
  su texto de `plantilla/.github/workflows/ci.yml`, que es otro archivo. O sea que el verde
  que hoy trae este paso lo compró esa coincidencia y no un caso que lo haya corrido. Sus
  ramas —ventana con forma inválida, raíces declaradas vacías, sin raíces en el árbol, sin
  binario, `fmt` en rojo, `validate` en rojo, el recorte por `pull_request_target`, y las dos
  gravedades de cada una— se ejercitaron a mano contra el `run:` extraído antes de escribir
  esta entrada, pero **eso no es un banco commiteado**: el arreglo es uno propio en
  `pruebas/marco-ci/` que extraiga **este** paso de **este** archivo y le corra las ramas con
  un `terraform` falso en el PATH, y va en su propio cambio. Está escrito también en el
  encabezado del job, con el comando que lo verifica.

- **El banco de `projects init` estrena el segundo eje de su matriz: la versión de Node.** La
  matriz de sistemas operativos ya existía; la de versiones no, y era la que faltaba. La
  herramienta declara dos números en su código —`NODE_MINIMO = "18.17.0"` y
  `NODE_RECOMENDADO = "20.12.0"`— y las dos ramas de esa decisión solo se ejercitaban con una
  versión **simulada**: la corrida real era siempre en Node 22, o sea la única franja donde
  el guard no hace nada. Eso ya se pagó una vez y en la dirección cara: la herramienta usaba
  `import.meta.dirname`, que llegó en Node 20.11 y vale `undefined` en 18.17, así que en el
  piso que ella misma declaraba soportado moría con un `TypeError` antes de escribir un
  archivo. **Un número que nadie ejecuta no es un piso, es una afirmación.** Cinco patas y no
  nueve: los tres sistemas operativos con el Node del runner, más 20.12.0 y 18.17.0 sobre
  ubuntu, porque lo que esas dos ejercitan es la versión del **intérprete**. La pata de
  18.17.0 **entra avisando** —nadie corrió nunca ese banco en esa versión, así que su primer
  resultado es también su primera medición— y la condición para promoverla está escrita en la
  propia matriz: en cuanto se la vea verde una vez, `modo: aviso` pasa a `modo: rojo`. La de
  20.12.0 entra en rojo desde el primer día. Esto vive en el `ci.yml` **del marco**, que
  ningún consumidor consume: **qué tiene que hacer un consumidor, nada**.

---

## [1.7.0] — 2026-08-23

### Para consumidores

**No hay nada que hacer.** Un repositorio que ya consume el marco y no vuelve a correr
`projects init` no ve **nada** de esta versión: todo lo nuevo viaja por el carril *scaffold*,
que se copia una vez al crear el repositorio y no vuelve. Y el canónico de la constitución
**no cambió**, así que el artefacto que ya tenés sigue siendo el correcto y el check no se
mueve.

Verificado contra un consumidor real antes de publicar, en la corrida `32681956360`:
**8/8 verde sin tocar una línea de código** de ese repositorio. Y esa corrida vale más que el
verde del CI de Projects para el caso de los marcadores: en Projects el paso se exime a sí mismo
por ser el repositorio que distribuye el andamio, así que allá no mira. En el consumidor
miró de verdad y pasó.

**Lo que sí cambia, y sólo para un repositorio NUEVO**: `projects init` pasa de escribir 69
archivos con 116 sustituciones a **75 con 156**. Lo nuevo son los dos directorios de
infraestructura, con lo derivable ya funcionando y con sus pendientes de decisión — que
**no** ponen el CI en rojo, a propósito.

**Si querés lo nuevo en un repositorio que ya existe**, el carril scaffold no lo trae solo:
hay que copiarlo a mano o correr la skill de adopción. Es el costo conocido de ese carril y
es el mismo que el marco ya paga por `ci.yml` y por `CODEOWNERS`.


### Añadido

- **El andamio reparte `infra/` y `infra-prod/`, que la constitución nombraba desde siempre y
  no existían.** El canónico dice «IaC = Terraform, sin excepción: `infra/` (dev),
  `infra-prod/` (prod)» y eso se renderiza en el artefacto que **el agente carga en cada
  sesión**, con las cuentas ya sustituidas. Los directorios no existían: el agente leía una
  regla que apunta a un lugar vacío, que es peor que una regla ausente porque invita a
  improvisar justo donde no se quiere improvisación.

  Llega **resuelto todo lo que se deriva** de los valores del proyecto: la `key` del state, la
  región, el proveedor con sus etiquetas, la referencia a la VPC, el prefijo de recursos, la
  identidad del repositorio y los dominios. Doce marcadores, **los doce entre los que
  `projects init` ya sustituye** — verificado con un script, ninguno inventado.

  Y llega **sin resolver lo que hay que decidir**: seis pendientes en dev y siete en prod. Cada
  uno con tres partes —qué falta, **con qué criterio se decide**, y qué garantía del marco
  queda sin cumplir—, porque un hueco que solo dice qué falta lo puede resolver únicamente
  quien ya sabía la respuesta.

  ⚠️ **Y todavía NO hay compuerta, a propósito.** Los pendientes usan un token propio
  (`PENDIENTE-INFRA`) que el paso de marcadores **no** cuenta. La primera versión de esto usó
  el marcador 🕳️ del andamio, que sí se cuenta, y eso llevaba a un repositorio recién nacido
  de **3 marcadores a 21** — de los cuales 18 son decisiones de infraestructura que necesitan
  cuentas, nombres de recursos y verificaciones que nadie puede hacer el primer día. Con la
  compuerta puesta, **un repo nuevo no podía llegar a `ci-ok` verde**, y eso además violaba el
  propio requirement de este change, que exige que la verificación sea **inerte para un
  repositorio que no se despliega**.

  Así que la compuerta llega con el change del despliegue, que es cuando «este repositorio se
  despliega» se vuelve verificable. Hasta entonces los pendientes son **disciplina declarada**
  —el agente los lee en cada sesión porque están en el árbol— y se revisan a mano con
  `grep -rn PENDIENTE-INFRA infra infra-prod`. Está dicho en los dos `README.md` y en el
  encabezado de los dos `pendientes.tf`, no solo acá.

  **Cero recursos de Terraform**, verificado y no confiado: `grep -rE '^resource '` sobre los
  dos directorios sale vacío. Repartir infraestructura sin verificar haría que cada proyecto
  nuevo herede los errores de la última vez que alguien la escribió, y verificarla exige una
  cuenta real y un `apply` con OK humano.

  Dos decisiones de forma que vale conocer: los pendientes van **juntos** en un
  `pendientes.tf` y no repartidos en ocho archivos como en el consumidor —copiar
  su división de archivos sería copiar su respuesta—; y el marcador del bucket del state va
  **dentro del valor**, así `terraform init` falla en vez de crear un state en el lugar
  equivocado. En producción eso además evita el modo de falla peligroso: escribir el state de
  prod en el bucket de dev.

  **Las alarmas se exigen como propiedad y jamás como lista**: que existan y avisen al canal.
  Cuáles y con qué umbrales es del negocio de cada proyecto —tres bien elegidas cumplen, seis
  copiadas de otro negocio no—. Y **dev no lleva pendiente de alarmas**, declarado como
  decisión: una alarma que suena por un deploy de prueba entrena a ignorarla.

  Lo que este cambio **no** trae, y está escrito: el Terraform con recursos reales, el
  `deploy.yml` y `verificar-prod`. Bloque 1 de 3 del change `infra-exigible`.

- **El CHANGELOG dejó de ser una regla sin check.** «Se escribe en el PR que introduce el
  cambio» estaba enunciado en `AGENTS.md` y en el encabezado de este archivo, y **ya había
  fallado, medido**: el 2026-08-22 se mergeó `projects init` —348 líneas— con la sección
  `## [No publicado]` vacía, y ningún check se puso rojo.

  Peor que el olvido es lo que habilitaba: la precondición 2 de `projects-release` dice que si
  la sección en vuelo está vacía «no hay versión que cortar», así que **un release sobre un
  main con cambios sin anotar pasaba esa precondición mirando el lugar equivocado**.

  El job `changelog-en-el-pr` exige que un PR que toque `actions/`, `.github/workflows/`,
  `plantilla/` o `herramientas/` toque también `CHANGELOG.md`. `docs/`, `openspec/` y
  `pruebas/` quedan fuera **a propósito**: no viajan por el carril referenciado, así que no
  le mueven el piso a ningún consumidor.

  **Estrenado en rojo, no en aviso**, contra lo que el propio backlog proponía: la regla del
  modo aviso protege a los **consumidores** de un rojo que nadie les anunció, y este check
  vive en el `ci.yml` de Projects — no viaja a ninguno. Un aviso dirigido a quien lo escribió
  no avisa nada.

  Y lo que mira está acotado: **que el PR toque el CHANGELOG**, no si lo que escribiste es
  bueno. Eso es del review, y un check que intenta leer la calidad de una entrada se pone
  rojo con entradas buenas — que es como se enseña a ignorarlo.

  Banco en `pruebas/ci-del-marco/`, 8 casos, que **extrae el script del YAML** en vez de
  copiarlo: las cuatro superficies que disparan, las tres que no, que un
  `plantilla/CHANGELOG.md` no cuenta (el ancla está al inicio de la ruta), el fail-closed
  cuando la base no resuelve, y que un diff vacío no se reporte como éxito.

- **Ninguna sección del canónico puede desaparecer en silencio.** `leerCanonico()` deriva
  las secciones del árbol, y esa decisión no se toca: agregar una entra al render por
  existir. Lo que el trade nunca nombró es su otra mitad — **derivar del árbol hace gratis
  agregar y ciego borrar**.

  Medido: la única aserción sobre el canónico real exigía `secciones.length >= 2`, así que
  **borrar `90-marca.md`** —las siete reglas de identidad visual que llegan a cada repo—
  **dejaba las 383 pruebas del marco en verde**. Del lado del consumidor tampoco se ve: su
  artefacto queda distinto, lo regenera, y pierde las reglas sin un solo aviso.

  `actions/constitucion/pruebas/inventario-canonico.test.mjs` declara las 10 secciones con
  una frase de qué trae cada una, y el rojo **nombra qué se pierde**, no solo que falta un
  archivo. El inventario vive **en la prueba y no en el manifiesto**: ponerlo ahí sería
  revertir esa decisión para todos los consumidores y sumar un campo que hay que mantener.
  Acá cuesta lo mismo —una línea al agregar una sección— pero lo paga quien toca el canónico,
  en el PR donde lo toca, con el arreglo en el mensaje. **Agregar es barato; quitar exige
  decirlo.**

- **Los manifiestos del andamio tienen guarda: hasta hoy nada mordía si alguien les metía
  un `|| true`.** El hueco se abrió el 2026-08-22, cuando el andamio pasó de traer solo
  mecánica a repartir `package.json` — y un manifiesto es exactamente donde vive un
  fail-open barato. En un andamio, además, se multiplica por cada repo que nazca de él.

  `pruebas/andamio/manifiestos.test.mjs` (7 pruebas, cero dependencias) verifica cuatro
  propiedades, **todas leídas del árbol** y ninguna repetida en la prueba:

  1. **Ningún script enmascara su código de salida.** Cinco formas —`|| true`,
     `|| exit 0`, `; exit 0`, `--passWithNoTests`, `|| :`— y el mensaje de cada hallazgo
     dice **por qué** esa forma tapa el fallo.
  2. **Los scripts que el pipeline invoca están declarados donde los busca.** Se leen del
     `ci.yml`: `SCRIPTS` por paquete, `EXCEPCIONES`, y los `pnpm <script>` de la raíz. Una
     excepción cuyo paquete el workspace no declara es roja: es una compuerta apagada para
     nadie.
  3. **Cada paquete verificable emite cobertura Y extiende `coberturaDelMarco()`.** Sin
     `--coverage` no hay lcov; sin la base, se pierden el `all: true` y el `projectRoot`.
  4. **Ningún marcador vive en una RUTA.** `projects init` sustituye contenido y copia rutas
     **tal cual**, así que un directorio `{{PAQUETE_API}}` llegaría literal al repo nuevo y
     el check de marcadores sobrevivientes —que solo lee contenido— firmaría «cero».

  **Y el rojo histórico, que es la razón de que esto exista:** una prueba reconstruye los
  manifiestos tal como llegaron y exige los **tres** fail-opens por nombre (`api:lint`,
  `web:lint`, `web:test`). No es una afirmación sobre el pasado: es la evidencia de que el
  check habría mordido el día que hizo falta.

  **Las 8 mutaciones muerden, y dos no mordían al principio.** Las dos por el mismo defecto
  mío: la escapatoria del marcador estaba escrita como «si el lado izquierdo es un marcador,
  aplica a todos», así que `{{PAQUETE_E2E}}:test` eximía a los **tres** paquetes de tener
  `test`. Sin la prueba de mordida, dos de las cuatro comprobaciones habrían entrado a
  `main` pasando siempre — el fail-open que el bloque entero existe para no tener.

- **`docs/arrancar-un-proyecto.md`: el paso a paso de arrancar un proyecto desde cero,
  medido ejecutándolo.** Era el hueco más grande de la documentación del marco y estaba
  escrito en su propio índice: `docs/README.md` decía «Arrancando un proyecto: los tres
  ADRs y de ahí a las plantillas, que se copian» —consejo de antes de que existiera
  `projects init`— y la skill `projects-adoptar` es explícitamente para un repo que **ya
  existe**. Nadie había escrito el camino del proyecto nuevo.

  La guía se midió corriendo los comandos, no leyendo los archivos: 37 agentes, cada
  afirmación con su comando y su salida, y un escéptico por afirmación que volvió a
  correr todo. De 30 afirmaciones propuestas, **20 tenían el hecho bien y la instrucción
  mal** — o sea que una guía escrita «de memoria» habría sido plausible y falsa en dos
  tercios de sus pasos.

  Lo que la medición destapó, y que ahora la guía dice con el mensaje exacto que se ve:

  1. **El marco no trae la aplicación.** `projects init` escribe 49 archivos y ninguno es
     código de producto: sin `package.json` ni lockfile, el `pnpm install
     --frozen-lockfile` del pipeline muere en su cuarto paso. El esqueleto es
     `projects-starter`, y son **dos piezas** con **4 archivos en colisión**.
  2. **El orden entre las dos es asimétrico.** Starter primero: `projects init` aborta con
     exit 1 y te lista los 4. Al revés: `tar`/`cp` los pisa con **exit 0 y sin una sola
     línea de aviso**, `ci.yml` pasa de 399 a 18 líneas y se pierde el eslabón hasta la
     porción del marco. El guard que avisaría vive **dentro del archivo que se
     reemplaza**.
  3. **El bootstrap va a `main` por push DIRECTO, no por PR.** Medido sobre el mismo
     árbol: por PR la compuerta de cobertura sale 1; por push sale `NO APLICABLE` y 0.
     Y `ci-ok` no aparece en la lista del ruleset hasta que el CI corrió una vez.
  4. **Once fallos silenciosos**, en una tabla: desde `pnpm lint` del starter saliendo
     verde sin lintear nada, hasta `ID_MCP_SLACK` mal puesto dejando cinco entradas de
     allowlist que no matchean nada. Todos pasan en verde o apuntan al lugar equivocado.

- **El andamio trae el esqueleto de aplicación: `projects init` deja un repo que se pone
  verde.** Hasta hoy escribía 49 archivos de mecánica y **ninguno de producto** — sin
  `package.json` ni lockfile, el `pnpm install --frozen-lockfile` del pipeline moría en su
  cuarto paso, y el camino era clonar **otro** repo. Ese otro repo (`projects-starter`)
  está archivado, read-only, y se va a borrar: esto es su reemplazo, y vive donde no puede
  derivar sin que nadie se entere.

  El andamio pasó de **23 a 70 archivos**. `projects init` escribe **69 con 116
  sustituciones**, y el repo queda con 87 contando lo que agregan `openspec init` y el
  render de la constitución.

  **Medido de punta a punta sobre un repo recién instanciado**, con `projects init` +
  `pnpm install` + un comando:

  ```
  pnpm verificar  ->  exit 0
  ```

  Eso es: generar el cliente de datos, `eslint . --max-warnings=0` sobre 25 archivos
  realmente linteados, `prettier --check`, el typecheck de los tres paquetes, las pruebas
  **con cobertura** y el build. Más las tres actions del marco en verde, incluida
  `cobertura-diff` **en su peor caso** —todo el esqueleto como líneas agregadas: 318/318— y
  el censo de fuentes con 32 fuentes en alcance.

  **Sin deuda de cobertura y sin bajar un umbral.** El código heredado del starter daba
  **39,18 %** de líneas; el esqueleto nace con `api` en 100/93,54/100/100 (46 pruebas) y
  `web` en 100 en las cuatro (8 pruebas), contra el mínimo de 80. Se escribieron las
  pruebas que faltaban en vez de declarar deuda: una fecha de deuda escrita en una
  plantilla es una bomba de relojería, porque el proyecto que nazca después de ese día
  arranca con el plazo vencido por una promesa que nadie de ese proyecto hizo.

  Y aparecieron las piezas que la constitución **exige** y el esqueleto heredado no tenía:
  `lib/log.ts` (todo log pasa por ahí), `middleware/errorHandler.ts`,
  `middleware/requestId.ts` y `lib/asyncHandler.ts`, cada una con su prueba. Más el
  paquete `e2e/` con Playwright, que el stack fija y que hasta ahora existía sólo como dos
  excepciones en el `ci.yml` apuntando a un directorio inexistente.

  **La tabla «Stack fijado» del `AGENTS.md` del andamio deja de llegar con huecos y llega
  llena**, porque ahora el andamio **implementa** ese stack. La instrucción se invierte: ya
  no es «llenala», es «borrá la fila —y su paquete— de lo que este proyecto no vaya a
  tener».

### Cambiado

- **El workflow que traía la constitución al día no la traía: para su propio caso de uso
  era un no-op, y ahora lo dice.** `actualizar-marco.yml` del andamio corre la action de
  la versión que el repo **ya tiene pinada**, y el canónico viaja *dentro* de esa action —
  así que en modo escribir regenera el artefacto de la versión que ya estaba. Medido el
  2026-08-22 con el pin en `1.4.1`: salida «version 1.3.0, sha 22b7d8ee231f», byte por
  byte idéntica, sin cambios y sin PR. Su encabezado, mientras tanto, prometía traer la
  constitución al día **«SOLA»**.

  El bloqueo es circular, y conviene conocerlo antes del primer bump: el PR de Dependabot
  nace **rojo** (pin nuevo, artefacto viejo), este workflow corre el pin **viejo** y por
  eso no puede ayudar, y el artefacto solo se regenera con el pin nuevo — que vive adentro
  del PR rojo.

  **Este PR cambia prosa y cero comportamiento**: el diff del workflow es 100% comentarios.
  Lo que queda escrito es el límite con su medición, el arreglo mientras tanto —bajar el
  artifact `constitucion-al-dia` que sube el job de marco y commitearlo sobre el PR del
  bump— y el destino, decidido en **[ADR 005](docs/adr/005-pin-y-constitucion-en-un-solo-pr.md)**:
  que ese mismo workflow mueva el pin **y** regenere, y abra **un** PR que nazca verde. Se
  construye cuando exista el segundo consumidor del marco; con uno solo, sus defectos se
  descubrirían en el único consumidor que hay.

  De paso se corrige el comentario del disparador: el evento que importa no es que sea
  lunes, sino que **el marco publicó una versión**. El cron queda como aproximación barata
  mientras no exista el aviso de publicación (fila 14 del backlog), pero deja de pretender
  que hace algo que medimos que no hace.

  La mitad no automatizada entra al backlog como **fila 21**, no como buena intención en el
  ADR: una decisión estructural que depende de que alguien la recuerde no está tomada, está
  deseada.

- **La guía de arranque se acortó a la mitad, porque el andamio ya hace lo que ella
  explicaba.** `projects-starter` se borró el 2026-08-23, así que la fase 3 —clonar un
  segundo repo, extraer de él una lista exacta, resolver cuatro archivos en colisión— y
  casi toda la fase 4 —escribir los scripts del CI, cablear la cobertura, instalar el
  proveedor, declarar los excluidos, decidir qué hacer con la deuda heredada— **dejaron de
  existir como trabajo**.

  Lo que queda:

  | Fase | Antes | Ahora |
  |---|---|---|
  | 3 · El repo | Clonar, extraer 32 archivos de una lista, commitear, correr init | `gh repo create` + `projects init` |
  | 4 · Que el CI arranque | Cinco sub-pasos | `pnpm install`, y nada más |

  Y la tabla de fallos silenciosos perdió cuatro filas que **ya no pueden pasar** (traer el
  esqueleto sobre el andamio, el `pnpm lint` que salía verde sin lintear, el `test` sin
  `--coverage`, el `vitest.config.base.mjs` huérfano) y ganó una nueva: correr
  `pnpm lint` sin generar el cliente de datos, que da 8 errores apuntando a `$disconnect`
  en vez de a «falta generar». `pnpm verificar` lo hace en el orden correcto.

  La referencia al repo borrado sobrevive en **una** frase de la guía, y es a propósito:
  explica qué había ahí antes y por qué ya no hace falta.

### Corregido

- **El documento de protección de `main` del andamio se contradecía a sí mismo, y en la
  dirección peligrosa.** Su primera tabla declara cuatro reglas «se encienden ahora»; la
  segunda declara cuatro **diferidas** con su motivo, y una nota ⚠️ avisa que encenderlas
  antes de tiempo *«es la forma más fácil de auto-encerrarse»* — probado: aprobación
  requerida + code owner + bypass vacía, con un equipo de una persona, deja el repo sin
  ninguna vía de integrar.

  Y el paso 4 de «Aplicarla desde cero» mandaba marcar **las ocho**, diferidas incluidas.
  Quien aplicara ese paso al pie de la letra se auto-encerraba el mismo día, y el propio
  documento lo llamaba *«exactamente ese error»* doce líneas más arriba.

  El paso 4 ahora lista **solo las cuatro** de la primera tabla, con `Required approvals: 0`
  explícito, y un paso 5 nuevo nombra las cuatro que **no** se marcan todavía — para que su
  ausencia se lea como decisión y no como olvido de la lista.

  Lo encontró el barrido de verificación de la víspera del primer ensayo de adopción; un
  escéptico independiente lo bajó de «rompe el arranque» a fricción porque
  `docs/arrancar-un-proyecto.md` ya advierte *«no apliques las 8 reglas»* antes de linkear
  al documento. La guía madre lo neutralizaba; el documento seguía mintiendo solo.

- **La guía no avisaba que el primer CI de un repo nuevo sale ROJO, y sale rojo siempre.**
  El andamio reparte **3 recuadros 🕳️** —2 en `AGENTS.md`, 1 en `.github/proteccion-main.md`—
  que un humano tiene que resolver, y el marco los cuenta: mientras existan, el job «Sin
  marcadores del scaffold sin resolver» falla. En 351 líneas la guía no lo mencionaba una
  vez, así que el primer push del lunes iba a dar un rojo sin explicación.

  Y no es evitable adelantándose: uno de los tres recuadros manda a aplicar la protección de
  rama, y eso **no se puede hacer hasta que el CI haya corrido** —el check `ci-ok` no existe
  en el ruleset hasta que alguna corrida lo reporte—. **El primer rojo es estructural.** La
  guía ahora trae la secuencia de cuatro pasos que lo apaga y el comando para comprobar que
  no quedó ninguno.

- **La guía seguía pidiendo decidir el board de los issues macro, que ya se decidió.** Los
  pendientes macro van al Project del área y los sub-issues no van al board — la regla de la
  constitución, que no cambió. Lo que sí queda como decisión es si el proyecto nuevo entra
  al project existente, porque renombrarlo toca a otro repo.

- **La suite local que el marco manda correr antes de cada push salía ROJA en un repo
  nuevo, con un error que apuntaba al lugar equivocado.** `pnpm verificar` no generaba el
  cliente de datos antes de lintear, así que quien clonaba, instalaba y corría exactamente
  lo que la regla le dice recibía **8 errores de tipos de Prisma sin resolver**, con el
  mensaje señalando `$disconnect` y no «te falta generar el cliente». El CI **sí** lo hacía
  bien —tiene su paso de generación antes—, así que el CI quedaba verde y la compuerta
  local roja: el trampolín inverso al habitual, y igual de confuso.
  Ahora `verificar` arranca con `datos`, que corre **lo mismo** que el paso del CI
  (`--filter` por nombre de manifiesto **con `--fail-if-no-match`**, porque `--filter` sin
  esa bandera sale 0 cuando no matchea nada). Lo encontré tropezando con él.

- **Tres archivos que el propio marco reparte no pasaban sus propias compuertas**, y nadie
  lo había visto porque hasta hoy el andamio no traía `package.json` y por lo tanto nunca
  se había linteado ni formateado a sí mismo: el script de la skill de archive no declaraba
  entorno Node (**26 errores** de lint), 7 archivos del andamio no pasaban su propio
  `prettier`, y los 24 que escribe `openspec init` tampoco.

- **La guía mandaba a copiar un repo archivado entero, y ese repo lleva adentro la
  infraestructura de otro proyecto.** `projects-starter` —el esqueleto de aplicación—
  está **archivado y read-only** desde el 2026-08-14, con su último commit el 2026-07-09.
  Se intentó arreglarlo ahí y GitHub lo rechazó: *«This repository was archived so it is
  read-only»*. Así que el arreglo tenía que estar en el punto de uso.

  La guía ahora **extrae de la lista** en vez de copiar el árbol: entran 32 archivos —los
  dos paquetes, el `package.json`, el workspace, el lockfile y el compose— y no entra
  nada más. Medido.

  **Eso resuelve seis problemas de una**, y por eso la lista es explícita y no un
  `cp -r` con borrados después:

  1. **`infra/`** es el Terraform de otro proyecto, **aplicable**, en la misma cuenta de
     dev. Y su README es el **inventario de ese ambiente vivo** —VPC, endpoint de la base,
     URI del ECR con el número de cuenta, bucket, ARN del rol de deploy— más el camino
     para conseguir sus secretos. No hay valores versionados; hay un mapa completo.
  2. **`deploy.yml`** es el deploy de esa arquitectura (App Runner + CloudFront), y
     apunta a esos mismos recursos por secret.
  3. **`spec/`** es la convención vieja; hoy la fuente de verdad es `openspec/`.
  4. **El `README.md` del starter** dice que «la infraestructura ya está creada» y que
     desplegar es «solo hacer push a `main`». Sobre los recursos de ese otro proyecto
     habría sido verdad.
  5. y 6. Los **cuatro archivos que colisionaban** con el andamio no se traen, así que
     `projects init` corre limpio y **`--forzar` deja de ser parte del camino normal**. La
     trampa del orden inverso —que pisa con exit 0 y sin un solo aviso— queda como nota
     plegada para quien copie el árbol entero de todas formas.

  Y la guía dice ahora **qué se hereda de un repo congelado**, en vez de dejarlo para la
  sorpresa: `pnpm@9.15.0`, `hashicorp/aws` 5.100.0 —un major completo atrás de lo que
  corre el consumidor—, sin proveedor de cobertura y con un solo archivo de pruebas.

- **El andamio mandaba a un primerizo a cuatro caminos muertos, y le escondía los dos
  pasos que deciden si su primer CI sale verde.** La lista de pendientes manuales que
  imprime `projects init` decía que el acceso de Dependabot se arregla «en el repo DEL
  MARCO» —es un ajuste de la **organización**—, no mencionaba que Dependabot **no se
  enciende solo** en un repo nuevo (y sin él el repo no recibe versiones ni aparece en
  el censo), pedía «las labels `area:*`» sin decir que son **seis**, con nombres y
  colores exactos, que **no se heredan de ningún molde**, y dejaba fuera el orden
  push-antes-que-ruleset. Ahora los seis items traen su comando.

- **Y le faltaba lo que hace roja la primera corrida: el propio marco reparte tres
  archivos que su compuerta de cobertura reclama.** `eslint.config.mjs`,
  `vitest.config.base.mjs` y las herramientas de agente son **300 de las 402 líneas** que
  el primer diff reclama sin pruebas, y ninguna prueba puede cubrirlas. Nadie lo había
  visto porque el consumidor no tiene dos de esos tres archivos. `projects
  init` ahora imprime el bloque de excluidos listo para pegar, y avisa que
  `vitest.config.base.mjs` llega a la raíz y **nadie lo extiende solo** — la única
  referencia a ese archivo en todo el árbol estaba dentro de su propio comentario.

- **La protección de `main` del andamio se auto-encerraba si se aplicaba literal.**
  `proteccion-main.md` traía una tabla de 8 reglas, las 8 en 🔴, y arriba decía «pasá los
  🔴 a 🟢». Aplicarlas todas —aprobación requerida + review de code owner + bypass
  vacía— con un equipo de una persona **deja el repo sin ninguna vía de integrar**. El
  único ruleset que funciona en la organización tiene **4** de esas reglas y deja las
  aprobaciones en 0. Ahora el documento separa las cuatro que se encienden de las cuatro
  que se difieren, cada una con su motivo escrito en la misma tabla.

## [1.6.0] — 2026-08-22

### Añadido

- **La identidad visual del área entra al marco, en dos piezas, cada una capaz de
  sostenerse sola.** Las aplicaciones del área son casi todas interfaz, así que la marca
  es parte del contrato y no un detalle de acabado. El manual completo —189 archivos:
  tokens en tres capas, componentes, tipografía, data viz— es la skill `la organización-design` de
  la organización, y **el marco no la copia**: una copia de 960K se desincroniza el primer
  día y nadie se entera. Lo que el marco transporta es el mínimo que un agente tiene que
  saber **sin haber invocado nada**, más las reglas que un árbol de sintaxis puede decidir
  solo.

  1. **En la constitución** (`actions/constitucion/canonico/90-marca.md`, 62 líneas):
     siete reglas con id estable —idioma, texto oscuro sobre el acento, solo tokens, el
     logo no se redibuja, temas y foco, redacción, y lo que el marco *no* trae—. Llegan a
     cada repo consumidor en su artefacto de agente, o sea a cada sesión de cada builder.
     El canónico queda en **683 de 700 líneas** de presupuesto, margen 17: ese costo lo
     paga cada sesión de cada repo, y por eso el presupuesto existe.

  2. **En el andamio de ESLint** (`plantilla/eslint.config.mjs`): diez selectores en
     `no-restricted-syntax`, severidad `error`, con alcance propio (`files` al fuente de
     la interfaz, sin apoyarse en la lista global de `ignores`, que un repo puede haber
     recortado). Cubren cinco de las siete reglas; las otras dos **no** se lintean y está
     dicho por qué: el idioma no lo juzga un árbol, y la tipografía no se pone en rojo
     mientras la marca no entregue los archivos —poner el sello sobre una sustitución la
     convertiría en la norma—.

  La regla que más importa no existía en el kit del sistema y se escribió acá: **texto
  blanco sobre el naranja de marca da 2.9:1 y falla WCAG AA**; el oscuro da 6.7:1. Medido
  contra el frontend de un consumidor, el bloque encuentra **26 violaciones
  reales en 13 archivos**, cinco de ellas de esa regla —una en la variante primaria del
  botón, o sea en toda la aplicación— y cinco SVG dibujados en el JSX donde va un
  componente del sistema.

  **Las dos piezas no viajan igual, y eso decide qué le pasa a cada repo.** El bloque de
  ESLint llega por el andamio, o sea a repos **nuevos**, que nacen con cero violaciones;
  por eso `error` desde el día uno no es un endurecimiento estrenado sin modo aviso (y
  tampoco había opción: con `--max-warnings=0` un `warn` ya es un rojo, solo peor
  explicado). Un repo que ya existe no recibe ese archivo y adopta el bloque cuando
  quiera, en su propio PR. La porción de la constitución sí llega a todos — y con el
  cambio de política de esta misma versión (ver «Cambiado»), su atraso es **rojo desde el
  día que se publica**, no un aviso con fecha. Lo que hay que hacer está en «Para
  consumidores».

  Los límites están escritos en el propio archivo, que es donde alguien los va a leer: el
  nombre de la clase del acento lo elige el proyecto (se reconocen `orange` y `accent`;
  otro nombre se sale del alcance **sin que nada avise**), y los selectores ven strings en
  el código, no estilo computado.

  **Cómo se verificó.** `pruebas/marca/reglas-marca.test.mjs` (10 pruebas, en CI, cero
  dependencias): que el bloque exista con alcance propio y severidad `error`, que cada
  regex **compile** —uno roto hace tirar a ESLint en cada corrida de cada consumidor—, que
  acepte su caso violatorio y rechace los legítimos, un **control no-op** de trabajo
  honesto que ningún regex debe morder, y que toda regla de marca de la constitución tenga
  **decidido** su estado frente al linter (decir «no» vale; dejarlo sin decir, no).

  Y la que hace que las nueve anteriores signifiquen algo: **cada comprobación muerde**.
  Ocho mutaciones —el bloque retirado entero, sin `files`, en `warn`, un selector sin su
  caso, un regex roto, un regex que deja de detectar su violación, un regex ensanchado que
  muerde trabajo honesto, y una regla del canónico sin decidir— tienen que poner en rojo
  la comprobación que les toca, y si el ancla de una mutación se mueve eso también es
  rojo. Se mutan **copias** en un directorio temporal: el andamio del repo no se toca, así
  que un fallo a mitad de camino no puede dejarlo modificado.

  `pruebas/marca/banco-eslint.mjs` (10 casos violatorios, 18 legítimos y un control, con
  ESLint 9 real): cierra el hueco que la guarda de CI **no puede** cerrar. El marco no
  tiene `package.json` ni `node_modules` —es una propiedad, no un descuido— así que su CI
  no puede invocar ESLint y no puede verificar que `Literal`, `TemplateElement`, `JSXText`
  y `JSXOpeningElement` seleccionen los nodos que creemos. Este banco se corre a mano
  contra un repo que tenga las dependencias, y su salida va como evidencia al PR. Trae
  además un modo `--medir` que cuenta violaciones por regla en un árbol real, que es la
  única forma de saber si las reglas encuentran algo o son teoría.

  Los selectores se **leen** del andamio en las dos piezas, nunca se copian: una copia se
  desincroniza y a partir de ahí la prueba pasa contra un archivo que ya no es el que se
  distribuye.

### Cambiado

- **La ventana de gracia de la constitución se retira: un artefacto atrasado es rojo el
  día que la versión se publica.** Había un piso obligatorio de 28 días entre `publicada`
  y `exigible_desde`, más una puerta `"urgente": true` para saltárselo. Se retira la
  **política**; el **mecanismo** sobrevive como opt-in.

  El motivo está escrito y es que la razón de la ventana **caducó**. El spec vivo la
  justificaba así: «el marco se consume por un tag móvil, así que una verificación nueva
  aparece en el pipeline de cada proyecto sin que nadie la haya leído». Eso dejó de ser
  cierto el 2026-08-21, cuando la distribución pasó a versión exacta: desde entonces nada
  aparece en el pipeline de nadie, **llega dentro de un PR de bump**. El «modo aviso» ERA
  el PR. Lo único que la ventana seguía produciendo era su otro efecto: un repo podía
  estar atrasado y **verde** durante cuatro semanas.

  Y un segundo efecto, más silencioso: la fecha que un consumidor veía no salía de la
  versión que le llegaba, salía de la **entrada pendiente más vieja**. Quien cortaba una
  versión no decidía la ventana que su consumidor iba a percibir: la heredaba de un
  release anterior.

  **Qué sobrevive, y por qué no se borró el mecanismo:** `AGENTS.md` sigue diciendo que
  un endurecimiento «se estrena en modo aviso», así que borrarlo dejaría esa regla sin
  forma de cumplirse. Una versión que declare un `exigible_desde` posterior a su
  `publicada` sigue avisando hasta esa fecha. Es **opt-in de quien publica** y ya no el
  trato por defecto de cada cambio de texto.

  Detalles: se va la constante del piso de 28 días y el aviso `version-urgente` (la puerta
  de atrás de una puerta que ya no existe); las tres entradas del manifiesto pasan a
  `exigible_desde` = `publicada` — `publicada` **no se toca**, guarda la fecha real: lo que
  cambió es una política y el campo de política se alinea con ella. El output
  `exigible_desde` de la action **se queda** (se consideró quitarlo y se descartó: quitar
  un output es breaking por la letra de `AGENTS.md` y el beneficio era cero). La propiedad
  queda **enunciada en un spec vivo**, donde no estaba: vivía solo en el código y en la
  documentación de su action. Change: `ventana-vencida`.

### Corregido

- **La afirmación «el tag móvil `v1` se retiró» era falsa y estaba en cinco archivos.**
  `v1` dejó de ser el **canal** el 2026-08-21 pero no se pudo retirar: sobrevive porque
  `marco-ci.yml` referencia a una action hermana por `@v1`, y un pin a la versión que se
  está cortando pone en rojo al PR que la corta. La frase se arregló tres veces en
  archivos distintos y volvía a aparecer en otro; en `actions/aviso-version` era además
  una **regresión** (un commit reemplazó un texto que era correcto). Corregida en
  `aviso-version`, `cableado.mjs`, `AGENTS.md` y `docs/reglas-no-escritas.md`.

  Y lo que impide la sexta vez: **dos aserciones nuevas** en
  `pruebas/andamio/pinado.test.mjs`. Una es completamente decidible —`marco-ci.yml` tiene
  que tener **exactamente una** invocación por `@v1` y tiene que ser `guardrail-deltas`—;
  la otra es una lista de las formas exactas que ya aparecieron, **con su límite escrito**:
  no detecta una redacción nueva, sí impide que la que ya se coló cinco veces se cuele
  copiada.

- **Dos mensajes le recomendaban `@v1` a un consumidor, que es lo que el marco llama «el
  modo de falla más callado de todo el bootstrap».** Un repo pinado al tag móvil no recibe
  PR de bump de Dependabot y no aparece en el censo — y no falla, se queda callado. Uno era
  un `::warning::` que se imprime **en el pipeline del consumidor** diciéndole que dejara
  sus invocaciones «en el tag móvil del marco»; el otro, el snippet de ejemplo del
  encabezado de `marco-ci.yml`, o sea el que un consumidor copia. Los dos ahora dicen
  versión exacta. El segundo lo encontró la aserción nueva de arriba en su primera
  corrida, porque el banco de pines excluye los comentarios a propósito.

- **Tres números publicados estaban mal, todos medidos con el método equivocado.** El
  presupuesto del canónico era **683 de 700** (margen 17) y no 673: la action une las diez
  secciones y cuenta sobre el cuerpo unido, así que sumar `wc -l` por archivo da otro
  número — y la primera versión rotulaba ese número como «el conteo que manda», que es
  peor que equivocarse. Los hallazgos de marca son **26 en 13 archivos** y no en 17: de los
  33 mensajes de la corrida, 7 son de reglas ajenas al override y 17 era el conteo de
  archivos con cualquier mensaje. Y el modo `--medir` del banco **se comía esos 7 en
  silencio** (caían en un bucket que el reporte no imprimía): ahora los reporta, porque por
  ese mismo camino se iría un error de parseo y el conteo saldría bajo sin que nada avise.

  Los tres los encontró una auditoría adversarial del propio release, con seis lentes
  independientes y un escéptico por hallazgo. Sin ella se publicaban.

### Para consumidores

**Hay una acción, y es de un minuto.** Si tu repo consume el marco y su porción de la
constitución quedó atrás, **el PR de bump a 1.6.0 llega ROJO** (antes llegaba amarillo con
una fecha: eso es lo que cambió). Se arregla dentro del mismo PR y **sin escribir nada**:

1. Bajá el artefacto `constitucion-al-dia` que el propio job sube, y aplicalo; **o**
2. corré `actions/constitucion` en modo `escribir` (si tu repo tiene el workflow semanal
   de actualización del marco, lo hace solo).

Medido contra un consumidor cuyo artefacto declara `1.3.0`: dos hallazgos,
y el modo `escribir` lo deja al día en sus dos superficies en una corrida.

**El bloque de reglas de ESLint de la marca NO te llega.** Vive en el andamio, que se copia
al crear un repo. Un repo que ya existe lo adopta cuando quiera, en un PR suyo, y ahí ve
todas sus violaciones de una vez en vez de una por semana.

**Nada más cambió para vos:** ningún nombre de job, ningún `input`, ningún `output`,
ningún permiso de token. Un repo que no mergea el bump no cambia de color.

## [1.5.0] — 2026-08-22

### Añadido

- **`projects init`: el andamio se instancia en un comando** (`herramientas/projects-init.mjs`).
  Adoptar el marco eran ~30 actos manuales —copiar 23 archivos, sustituir 89 ocurrencias de
  22 marcadores en 15 archivos, `openspec init`, y el render de la constitución—. Nada de
  eso es una decisión: es transcripción. Y la transcripción a mano falla en silencio,
  porque el check del marco verifica **la ausencia** de marcadores y no la corrección de
  los valores que los reemplazaron.

  Falla cerrado en todo, incluido el caso que más importa: **cero sustituciones es error**.
  Si el patrón dejara de matchear, «no encontré nada» saldría en verde y el repo nuevo
  nacería lleno de llaves. Verifica releyendo el árbol escrito, no su propio resultado.

  Lo que **no** hace, declarado: no decide (los 22 valores los llena un humano, y la tabla
  de `plantilla/README.md` sección 2 sigue siendo la fuente de verdad), no borra bloques
  —los tres marcadores con camino «si no existe» los **nombra** en vez de adivinar el
  borrado— y no toca GitHub.

  Se estrena como **piloto acotado**, con el camino manual intacto al lado. Le corresponde
  un change de OpenSpec con el gate del PO, y entra como el primer change del proyecto que
  la usa.

- **`docs/censo-de-consumidores.md`: el censo, lo que se midió de él y su plan B.** El
  censo —saber quién consume el marco— se apoya desde la 1.4.0 en los PRs de bump de
  Dependabot. Tres intentos, tres causas distintas: la falta de acceso al repo privado y
  el grupo único `patterns: ["*"]` están arreglados; el tercero sigue **sin explicación**
  —Dependabot ve el marco, lo evalúa en su grupo y dice `No update needed for 1.4.1` con
  la 1.4.2 publicada 30 minutos antes—.

  El documento deja el log, las cuatro hipótesis descartadas **con su evidencia** (el
  manifiesto equivocado, el límite de PRs abiertos, el grupo, y la release draft) y las dos
  que no se pueden decidir desde afuera.

  Y nombra el punto ciego estructural, que es lo que importa más que el bug: **el censo
  depende del comportamiento de un tercero que el marco no puede verificar**, así que su
  silencio es indistinguible de «no hay consumidores». Eso es la forma de fail-open que
  este marco declara inaceptable en todo lo demás.

  El plan B separa las dos preguntas que hoy están mezcladas: **quién consume** (que la
  adopción puede anotar, sin credenciales) y **quién está al día** (que vive en el repo del
  consumidor, donde su dueño lo ve). La versión que se cumple sola necesita una credencial
  con lectura sobre la organización, y eso es decisión del Builder 1, no de un PR.

- **El `.gitignore` del andamio ignora los residuos de correr los checks en local.** En CI
  viven en `RUNNER_TEMP`; en una máquina esa variable no está seteada y `pendientes.txt` y
  `aviso-version.json` caen en el directorio de trabajo. Sin esas dos líneas un `git add -A`
  los commitea: pasó el 2026-08-21, y la prosa del segundo hizo que el detector de secretos
  tokenizara nombres de paquete inexistentes.

- **El checklist final de `projects init` nombra las tres formas de que el review cruzado no
  exista** y ningún check lo diga: un handle mal escrito, un equipo **vacío**, y un equipo
  sin permiso de escritura. Medido el 2026-08-22: el equipo `po` de la organización tiene
  **cero miembros**, así que hoy el gate del PO no existe y nada se pone rojo. Y agrega el
  issue macro en el Project y las labels `area:*`, que la constitución exige y el checklist
  no pedía.

### Corregido

- **El prompt del bot de GitHub le decía que `v1` no existe.** `claude.yml` inyectaba «el
  tag movil v1 se retiro: no existe, y no propongas moverlo ni recrearlo», y `v1` existe
  (`= v1.4.2`) porque el paso 5 del release **lo mueve**. Lo escribí cuando creía que se
  retiraba; cuando el CI lo refutó corregí la skill de release, `AGENTS.md` y el `README`,
  **y me salté este archivo**. Un agente que le creyera congelaría `guardrail-deltas` en el
  próximo release. Es la misma clase que vengo arreglando toda la semana —prosa que
  contradice la línea que anota— cometida por mí, a medias.

- **El ejemplo de `projects init` nombraba a tres personas y un servidor MCP real.** Projects
  quedó con **cero nombres propios** cuando se extrajo, y su `AGENTS.md` lo declara:
  «handles por rol, nunca nombres propios». El `--ejemplo` los reintrodujo, o sea que el
  marco predicaba la regla y la rompía en la pieza que estrenaba. Ahora van formas
  (`handle-del-po`) y el UUID nulo, **con una prueba que lo mantiene**: poner un handle real
  pone el banco en rojo, verificado con el control.

### Para consumidores

**Nada que hacer, y esta vez el motivo es estructural y no una casualidad.** Todo lo de
esta versión es del repo del marco (`herramientas/`, `docs/`, el prompt del bot) o del
**andamio para proyectos NUEVOS** (`plantilla/`). Un repo ya creado no consume ninguna de
las dos cosas: el andamio se copió una vez y desde entonces es del proyecto.

`projects init` es una herramienta de **builder**: se corre desde un clon del marco y no se
consume por `uses:`, así que ni siquiera hace falta esta versión para usarla.

> **Una nota de proceso, porque el hueco fue propio.** La entrada de `projects init` llegó en
> un PR posterior al que introdujo la herramienta, contra la regla que este mismo archivo
> declara. Se mergeó una herramienta de 348 líneas y **ningún check se puso rojo**: la
> regla está enunciada y no tiene enforcement. Es la fila 20 del backlog de
> `docs/reglas-no-escritas.md`, con su versión derivada.
## [1.4.2] — 2026-08-22

### Corregido

- **El pin de version exacta dejo de ser una media verdad.** La 1.4.0 movio la
  distribucion a version exacta para que ningun consumidor recibiera comportamiento
  nuevo sin un PR que alguien pudiera leer. Faltaba la mitad: **`marco-ci.yml`
  referenciaba a sus propias actions hermanas por `@v1`**, el tag movil. O sea que un
  repo pinado a `marco-ci.yml@v1.4.1` recibia el workflow de la 1.4.1 y
  `guardrail-deltas` y `constitucion` de lo que `v1` apuntara **en ese momento**.

  Dos jobs que corren en cada PR de cada consumidor (`marco / openspec` y
  `marco / constitucion-cableada`) tenian esa mezcla de versiones adentro. El pin que
  el consumidor creia exacto no lo era, y el aviso que la 1.4.0 prometia —el rojo
  dentro del PR de bump— no cubria esas dos actions.

  Se descubrio al intentar **retirar `v1`**: los dos `uses:` son `uses:` VIVOS, asi que
  borrar el tag habria roto el CI de todo consumidor con un error de "no se pudo
  resolver la action" que parece un typo en la ruta del repo.

- **El texto canonico de la constitucion ya no ensena el canal viejo.**
  `canonico/20-marco-version.md` —el que se renderiza en el arbol de cada consumidor y
  cargan los agentes— decia que el repo consume `@v1`, que `v1` es un tag movil y que
  lo que Projects publique "llega a este pipeline sin que nadie aca toque una linea". Y
  una de sus reglas le pedia al consumidor **no pinar una version**, con la
  justificacion de que asi "un arreglo llega a todos". Con el bump por PR eso esta al
  reves: pinar la version exacta ES el modelo. Los cinco ids de regla se conservan.

  Tambien se corrigio la regla que prometia un "PR semanal que regenera este archivo":
  ese PR solo existe si el repo cableo `actualizar-marco.yml`, y ninguno de los dos
  consumidores lo tenia. Una regla que nombra un dueno inexistente entrena a ignorar el
  resto del archivo.

### Acotado (y no retirado: se intento y no se pudo)

- **El tag movil `v1` queda reducido a UNA linea, y el intento de borrarlo fallo por
  una razon que vale escribir.** La idea era pinar tambien las dos invocaciones
  internas por version exacta y borrar el ref. El CI de este mismo PR lo refuto:
  *"Unable to resolve action ...@v1.4.2, unable to find version v1.4.2"*. El tag se
  crea **despues** de mergear el PR de release, asi que una linea que pina la version
  que se esta cortando pone en rojo al PR que la corta — **circular por construccion**,
  no por orden de los pasos.

  Y no hay rodeo: GitHub no admite expresiones en `uses:`, asi que un workflow reusable
  no puede referenciar su propio ref; y una ruta local dentro de un reusable se resuelve
  contra el arbol de QUIEN LLAMA. O sea que `@v1` no era descuido del autor original:
  era el unico mecanismo disponible para que el workflow y sus actions avanzaran juntos.

  Queda entonces en **una** invocacion —`actions/guardrail-deltas`, la unica cuyo ref se
  resuelve durante el CI del propio marco; la de `actions/constitucion` no, porque su
  job se saltea aca— y el paso 5 del release la mueve. El banco la exceptua **por lista
  exacta** (archivo, ref y action): una segunda `@v1` da rojo, verificado con el control.

  El skew que queda, dicho entero: un consumidor pinado a `marco-ci.yml@vX.Y.Z` recibe
  ese workflow en X.Y.Z y `guardrail-deltas` en la ultima 1.x. Acotado a un verificador
  de deltas. La version derivada —la particion que ya usa la constitucion— elimina el
  skew y deja morir a `v1`, y no entro aca porque toca la logica del veredicto agregado
  que heredan todos los consumidores, a dos dias del piloto.

### Anadido

- **La compuerta del pinado ahora cubre `.github/workflows/` y `actions/`**, que es
  donde estaban los pines vivos. La primera version del banco (esta misma manana)
  miraba solo `plantilla/` y `.claude/skills/`: mas angosto que el problema, y por eso
  no vio los dos `uses:` de `marco-ci.yml`. Quedan fuera los directorios `pruebas/`
  —sus fixtures usan `@v1` a proposito, porque prueban el parseo de un ref cualquiera—
  y las lineas de comentario, por la misma razon que la prosa.

### Para consumidores

**Dos cosas, y las dos hay que hacerlas.**

1. **Si tu `uses:` del marco dice `@v1`, cambialo a la version exacta.** El tag sigue
   existiendo —por una linea interna del marco, ver arriba— asi que tu pipeline NO se
   rompe. Lo que pasa es peor de tan callado: Dependabot no propone bump para un tag
   mayor, asi que ese repo no recibe versiones nuevas por PR y **no aparece en el censo**.
   Al 2026-08-22 los repos con esa linea son `intranet#1` y `riesgos-investigaciones#2`,
   los dos en PRs sin mergear.
2. **Regenera la porcion del marco de tu constitucion.** El texto canonico cambio, asi
   que tu artefacto quedo atrasado: el check lo dice en `::warning::` y pasa a rojo el
   `exigible_desde` que el propio aviso imprime. La forma de que deje de ser manual es
   cablear `actualizar-marco.yml`, que el andamio ya trae.

### Corregido

- **Un proyecto nuevo nace pinado a la versión exacta, no al tag móvil `v1`.** La
  1.4.0 movió la distribución a versión exacta con bump por PR de Dependabot, y ese
  cambio se aplicó al consumidor real y **no al andamio**: con la 1.4.1 ya publicada,
  `plantilla/` y la skill de adopción seguían pinando `@v1` en seis `uses:`. El
  siguiente proyecto creado desde el andamio habría nacido con el modelo viejo.

  El modo de falla es **callado**, que es lo que lo hace caro: Dependabot no propone
  bump para `@v1` —desde su punto de vista `v1` ya es la mayor vigente, y las 1.4.x
  dentro de `v1` no mueven el ref— así que el repo no falla, no avisa, y simplemente
  nunca recibe una versión nueva por PR. Como desde la 1.4.0 **esos PRs son el censo
  de consumidores**, un repo así tampoco aparece en el censo: el marco no tendría
  forma de saber que existe.

  Va también la skill `projects-validar-consumidor`, cuyo `sed` buscaba `@v1` en el
  consumidor para reemplazarlo por el SHA bajo prueba. Desde la 1.4.0 los consumidores
  pinan `@vX.Y.Z`, y sobre `@v1.4.1` ese patrón **parte el ref**: matchea el prefijo
  `v1` y deja el resto colgando, o sea `@<SHA-COMPLETO>.4.1`.
  GitHub no resuelve ese ref, así que el ensayo muere con un error que parece un typo
  en la ruta del repo, a tres pasos de la línea que lo causó. El patrón ahora acepta
  `@vX.Y.Z` y la verificación comprueba que **ningún ref quedó partido**, que es la
  propiedad que importa (contar reemplazos habría dado 2 y pasado igual).

### Añadido

- **Un banco que se pone rojo si el andamio queda atrás de la versión publicada**
  (`pruebas/andamio/pinado.test.mjs`, 4 aserciones). Comprueba que ningún `uses:` del
  marco apunte a `@v1` y que todo pin exacto sea igual a la versión más alta del
  CHANGELOG. La clase es «se arregló en el consumidor y no en el andamio», y pasó
  **dos veces el 2026-08-21** —antes con el grupo de Dependabot—, así que se cierra
  con una aserción y no con una línea más en el checklist del release.

  Trae su propio control de no-op: si el escaneo encuentra menos de cinco pines, eso
  es rojo. Un escaneo que no matchea nada pasaría vacuamente, y ese mismo día `node
  --test` con un glob vacío dio exit 0.

### Para consumidores

**Nada que hacer.** Estos cambios son del andamio (`plantilla/`), de las skills del
marco y del banco de pruebas: un repo ya creado no los consume. Lo que cambia es con
qué nace el **próximo** proyecto.

Y una cosa que conviene revisar igual, porque no la caza ningún check del marco: que
tu `.github/dependabot.yml` tenga al marco en **su propio grupo**. Si comparte el
grupo `*` con las demás actions, un PR del grupo trabado deja de proponer el bump del
marco — medido el 2026-08-21 en un repo consumidor, donde la 1.4.1 no se propuso por
un PR abierto de `actions/upload-artifact`.

## [1.4.1] — 2026-08-21

### Corregido

- **Un artefacto que el marco GENERA ya no reprueba el check que el marco escribe.** El
  paso de *Ejecutores de paquetes pinados* puso en rojo a un consumidor por
  `.cursor/rules/00-marco.mdc`, que es la porcion del marco renderizada para Cursor: su
  texto cita `npx --yes openspec` **como contraejemplo** —es la regla del pin
  explicandose— y `.mdc` no es `.md`, asi que el pathspec que exime la prosa no lo
  cubria. Nadie podia arreglarlo a mano, porque es generado.

  Es la **cuarta vez esta semana** de la misma clase: prosa que explica lo correcto, en un
  archivo cuya extension el check no exime. Las tres anteriores fueron una expresion de
  Actions en la `description` de un input, otra en un comentario de JS dentro de un
  `run:`, y el payload de `aviso-version` commiteado por error en un `.json`.

  **Y el arreglo que una prueba rechazo, que vale mas que el arreglo.** Se intento
  filtrar por el **sello** del artefacto (`projects:constitucion`, que viaja en su primera
  linea) en vez de por extension: deriva en vez de enumerar y cierra la clase entera. El
  banco lo tumbo con la prueba «el sello lo valida UNA sola pieza: ningun workflow del
  marco lo verifica por su cuenta», y tiene razon — dos lugares interpretando el mismo
  sello es el defecto de las **12 contra 64 posiciones hexadecimales** que se arreglo esta
  misma semana. Revertido antes de entrar.

### Para consumidores

**Nada que hacer.** Este release solo quita un rojo que el propio marco producia sobre un
archivo que el propio marco escribe. Si tu repo declara la superficie `cursor`, el rojo
desaparece sin que toques nada.

**La clase queda ABIERTA y declarada:** la exencion sigue adivinando el origen por la
extension del archivo, asi que una superficie de agente nueva que renderice a `.txt` o
`.toml` vuelve a caer. La version derivada exige que `actions/constitucion` publique sus
rutas como output. Esta como fila **17** de `docs/reglas-no-escritas.md`, con su medicion.

## [1.4.0] — 2026-08-21

### Corregido

- **Un paso amortiguado del veredicto vuelve a ser ROJO, y no el residuo de lectura.**
  La 1.3.0 salió sana, pero el modo aviso que se le agregó después aflojó más de lo que
  su propio texto decía: **nueve ortografías** del amortiguador puesto en el *paso* de
  `ci-ok` que cobra `needs.<job>.result` pasaron de exit 1 a exit 0, mientras las mismas
  seis a nivel *job* seguían en rojo. El corte quedó justo al revés de lo que el check
  afirmaba.

  Importa porque `continue-on-error: true` en ese paso es **la línea más barata para
  desbloquear un merge**: con la regresión, el marco decía «cableado y esperado por
  ci-ok» en amarillo sobre un repo cuyo check requerido está demostrablemente
  neutralizado.

  La causa era una clase confundida: `textosVivosDe()` descartaba el paso amortiguado
  **antes** de clasificar, así que «hay un paso que cobra y alguien lo tapó» y «no hay
  ningún paso que cobre» caían en el mismo veredicto. Son dos cosas distintas: que el
  paso exista y esté neutralizado **se lee del YAML** —decidible, y por lo tanto rojo—
  mientras la segunda es el residuo de lectura que el check declara.

  Verificado con nueve pruebas nuevas que **fallan contra el árbol roto** (38 tests, 29
  pass, 9 fail) y pasan acá (38/38). Y sobre un espejo de solo lectura del consumidor,
  idéntico antes y después: no se le agregó ni se le quitó ningún rojo.

- **Un fallo de E/S vuelve a ser rojo, y sin el residuo equivocado pegado.** El bucket
  que no pudo **leer** un archivo (`ENOENT`) había caído en la misma bolsa que los dos
  productores indecidibles del check de ejecutores: pasó de rojo a aviso, con el texto
  del residuo A16 —que habla de la ortografía del comodín— colgado de un error de
  lectura. No poder leer un archivo es un hecho decidido, y el propio paso ya trata el
  `rc>1` de `git grep` como rojo con ese mismo argumento.

### Añadido

- **El descubrimiento se produce fuera del repositorio y entra como insumo de la
  sesión.** Regla nueva en el delta de `gobierno-contribucion`, con dos más que viajan
  con ella: el descubrimiento llega al contrato **con procedencia** y no lo reemplaza, y
  **el estado experimental de un change caduca por fecha**. Son deltas de un change
  activo: **no rigen para los consumidores hasta que el change se archive**.

### Para consumidores

**Qué cambia de verdad para un repo que consume el marco.** Dos cosas, y las dos son
correcciones que van en la dirección de más rigor, no de menos:

1. Si tu `ci-ok` tiene un `continue-on-error` o un `if` constante falso **en el paso que
   compara el resultado**, eso pasa a ser **rojo**. Antes salía en amarillo diciendo que
   el cableado estaba bien. Si te aparece, el arreglo es sacarle el `continue-on-error`
   al paso que compara, **no agregar otro paso**.
2. Si el check de ejecutores no puede **leer** uno de tus archivos, eso pasa a ser rojo
   en vez de aviso. Suele significar que el paso corre después de un borrado.

**Lo que NO cambia:** los dos residuos declarados en la 1.3.0 siguen declarados y siguen
en modo aviso. El de A01 es el paso que consulta el resultado en su propio `if`; el de
A16 es el comodín del allowlist escrito separado del gestor. Los dos están medidos, con
su fila en `docs/reglas-no-escritas.md`, y ninguno se cerró en esta versión.

**Y desde esta versión el marco se distribuye por versión exacta.** El PR de bump lo
abre Dependabot en cada repo, en vez de que el tag móvil `v1` empuje el cambio a todos a
la vez. El motivo, medido el 2026-08-20: un check nuevo enrojeció a un consumidor que el
día anterior pasaba, y nadie lo pidió. Con el bump por PR, el rojo aparece **dentro del
PR**, que es donde se puede mirar antes de mergear. El tag `v1` sigue existiendo y deja
de ser el canal de distribución.

### Cambiado

- **Dos checks pasan a MODO AVISO en la parte que no pueden verificar, y lo dicen
  en su propia salida.** No es aflojar lo que funciona: es que dos afirmaciones se
  estaban cobrando como compuertas sin serlo, y cada una tiene su medición.

  - **A01 — el modo `cableado` de `actions/constitucion`.** Su condición 5 promete
    que *un rojo de la compuerta impide que `ci-ok` salga verde*, que es una
    propiedad de un **camino** (del job de la compuerta, por cada eslabón de
    `needs`, hasta el check run que el ruleset exige) y lo que verifica es un
    patrón sintáctico sobre un **nodo**. Medido con oráculo semántico
    independiente: **70 falsos verdes sobre 2928 casos generados**, una sola clase,
    cuya forma más corta es un paso de `ci-ok` con
    `if: needs.<job>.result == 'success'` — que satisface la compuerta
    **salteándose**. Desde ahora «ningún paso vivo consulta el `result`» sale
    `::warning::` con el residuo nombrado; los hechos del **grafo** siguen siendo
    rojos (que exista el check run del veredicto, que cuelgue por `needs`, que
    declare `if: always()`, que ningún eslabón lave el rojo con
    `continue-on-error` o un `if` constante falso), igual que las condiciones 1 a 4.
  - **A16 — el paso *Ejecutores de paquetes pinados*.** El alfabeto compara el
    gestor y su subcomando por igualdad exacta contra tokens que traen la
    puntuación del lenguaje anfitrión. Medido: `Bash(npm *)`, `Bash(pnpm *)`,
    `Bash(yarn *)` y `Bash(bun *)` dan **exit 0 con cero anotaciones** y
    `Bash(npx *)` da **exit 1** — el mismo permiso, una ortografía de diferencia.
    Desde ahora lo **indeterminado** dentro de un allowlist sale `::warning::` con
    el residuo nombrado en vez de rojo; un paquete **legible** sin versión exacta
    sigue siendo rojo, que es donde vive el caso real del squatter de `openspec`
    (`Bash(npx --yes openspec:*)`, medido exit 1 también después del cambio).

  **Qué tiene que hacer un consumidor: nada, y su CI no se enrojece.** El cambio
  sólo baja severidades y agrega avisos, así que ninguna corrida que hoy pasa
  empieza a fallar. Lo que sí cambia es la lectura: **un verde de estos dos checks
  ya no acredita** que el rojo llegue al check requerido (A01) ni que el allowlist
  esté libre de permisos anchos (A16). Las dos filas quedan en el backlog de
  `docs/reglas-no-escritas.md` con su medición y con la forma concreta de
  cerrarlas, y los agujeros están fijados como casos de banco que **afirman el
  agujero**: el día que se cierren, el banco se cae y se ve en el diff.

## [1.3.0] — 2026-08-21

### Añadido

- **Check estático nuevo en el job `higiene`: *Ejecutores de paquetes pinados*.**
  Se pone rojo si un archivo rastreado del repo corre un paquete por un ejecutor
  que **descarga** (`npx`, `bunx`, `npm exec`, `npm x`, `bun x`, `pnpm dlx`,
  `yarn dlx`, cada uno con o sin banderas globales entre el gestor y su
  subcomando, incluidas las que se llevan su **valor en el argumento siguiente**
  como `pnpm -C . dlx` o `npm --prefix ./x exec`) sin clavarlo a una versión
  exacta.

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

  **La decisión la toma un tokenizador, no un regex.** Las dos primeras versiones
  del check leían la línea con dos expresiones regulares —una en el prefiltro de
  `git grep` y otra en el lector— que intentaban seguir la gramática de una línea
  de comando. Las dos acumularon parches y las dos volvieron a caer con la
  ortografía siguiente: medido en `exit 0` con el mensaje *"no hay nada que
  pinar"* sobre `pnpm -C "./mi dir" dlx openspec update`, y lo mismo con comilla
  simple, porque un valor **entrecomillado con espacio** cegaba a las dos a la vez.
  El lector ahora parte la línea en palabras respetando el entrecomillado de POSIX
  shell (comilla simple literal, comilla doble con escapes, barra invertida suelta)
  más la puntuación de los formatos donde estas líneas viven de verdad (coma y
  corchete de un array JSON, paréntesis y punto y coma de shell); y cuando una
  palabra salió entrecomillada y su contenido menciona un gestor, la **desenvuelve
  y la vuelve a tokenizar**, que es lo que hace legible un comando que viaja dentro
  de un string de JSON — la forma exacta que tiene una entrada de allowlist de
  agente. El prefiltro dejó de intentar parsear: ahora pregunta qué **archivos**
  mencionan el nombre de un gestor, y el lector recorre el archivo completo.
  Mencionar el nombre es condición necesaria de toda la clase, así que el prefiltro
  es más ancho que el lector por construcción y no por revisión.

  Límites declarados en el propio paso, porque esto **lee texto y no ejecuta
  nada**: los `.md` quedan fuera (son prosa, y la documentación del marco cita la
  forma incorrecta como contraejemplo, así que un comando de runbook escrito en un
  README no queda cubierto); las líneas que arrancan en comentario quedan fuera
  (un comentario no se ejecuta — y sin esa regla el check se pone rojo a sí mismo
  al documentarse); y el pin no prueba que el nombre sea el paquete que uno quería:
  hace ruidoso el error, no lo hace imposible. Un pin que llega por variable —el pin
  canónico del marco es un `input` de este mismo workflow— cuenta como pinado y se
  informa aparte. Una invocación partida con `\` **sí** se lee, desde que el
  prefiltro selecciona archivos en vez de líneas.

  **Residuos, y son tres.** (0) *Nuevo, medido, y el más caro de los tres*: los
  allowlists reales de las **skills de este repo** viven en el frontmatter
  `allowed-tools:` de archivos `.md`, y los `.md` están **fuera del universo del
  check** por el pathspec. Medido hoy en el árbol de Projects: dos skills
  (`.claude/skills/projects-adoptar/SKILL.md` y
  `.claude/skills/projects-archive-change/SKILL.md`) autorizan `Bash(npx:*)` y
  `Bash(pnpm:*)` — exactamente la clase que esta ronda acaba de cerrar, y el check
  no las ve por construcción. No se cierra acá porque las dos salidas son cambios
  de comportamiento con su propia discusión: leer los `.md` en general estrella el
  check contra toda la prosa del marco, que cita la forma incorrecta como
  contraejemplo a propósito; leer solo la línea `allowed-tools:` de un `.md` es
  angosto y defendible, pero **pone el árbol de Projects en rojo el día que entra** y
  el arreglo pasa por reescribir permisos de agente, que no se decide dentro de un
  PR de arreglo. Va como change propio, y hasta entonces está escrito acá y no
  descubierto por la próxima ronda. (1) *Irreducible*: si el nombre del gestor o su
  subcomando llegan por indirección (`pnpm $SUB pkg`, `eval "$CMD"`, un alias de
  shell, dos mitades concatenadas), el texto de la línea no contiene la invocación
  y ninguna lectura estática la puede ver — cerrarlo pediría ejecutar, que es justo
  lo que este paso no hace, y queda fijado en el banco como caso *límite* y no como
  caso que pasa. (2) *Abierto y no cerrado en esta ronda*: la familia de
  scaffolding descarga igual y sigue afuera del alfabeto — `npm init <pkg>` resuelve
  `create-<pkg>` desde npm, `npm create` es su alias, y `pnpm create`, `yarn
  create` y `bun create` hacen lo mismo (los `init` de pnpm, yarn y bun andamian
  **local** y no descargan, así que meterlos sería puro falso rojo). Se declara en
  vez de cerrarse porque cerrarlo bien pide una distinción nueva que este paso no
  tiene: para `exec`/`x`/`dlx` un ejecutor sin argumento es *indeterminado*,
  mientras que para `init`/`create` sin argumento significa que **no descarga
  nada** — y sin esa distinción `npm init -y`, local e inofensivo, saldría rojo
  dentro de un allowlist. Medido: cero ocurrencias de esa familia en el árbol de
  Projects y cero en el consumidor real, así que declararlo no deja ningún hallazgo
  sin reportar hoy; cerrarlo es un cambio de comportamiento propio y va en su
  propio change.

  **El banco tiene dos mitades y hacen cosas distintas.** Los casos concretos de
  `pruebas/marco-ci/casos/ejecutores.md` son regresión: fijan por código de salida
  lo que ya se sostiene. El **corpus generado** (`pruebas/marco-ci/generar.mjs`) es
  el que puede encontrar algo nuevo: cruza los ejes de la gramática de
  entrecomillado, de banderas, de ortografía del ejecutor y de envoltorio contra un
  **alfabeto propio**, y hoy son 2582 entradas.

  Ese alfabeto propio es el arreglo de la última ronda, y vale explicarlo porque la
  misma tautología volvió dos veces disfrazada. Primero el invariante recorría una
  lista de casos escrita a mano: no podía cazar un miembro nuevo porque solo
  preguntaba por lo ya pensado. La ronda siguiente pasó a generar por producto de
  ejes, pero leyendo el alfabeto **del propio paso** — y eso arregla el eje de las
  formas y deja intacto el de los gestores: un corpus derivado de la regla que
  audita solo puede preguntar por los miembros que la regla ya conoce. Está medido
  con el mismo arnés sobre el mismo código viejo: el corpus derivado del paso
  encontraba **0** entradas invisibles y el corpus con alfabeto propio encontraba
  **200**. Desde esta ronda el alfabeto del banco sale de la documentación de cada
  gestor y vive en `pruebas/marco-ci/casos/ortografias.md`, con la fuente escrita
  por gestor; el generador ya no puede leer el paso, y eso es una aserción del
  banco y no un comentario pidiéndolo.

  Lo que ese corpus encontró, todo medido por código de salida archivo por archivo:
  una bandera con valor separado sin forma de paquete (`npx --registry <url>
  openspec`) que hacía al lector rendirse con un `::warning::` —que no pone rojo
  ningún job— sobre una invocación real y sin pinar; el **corte del reporte a los 64
  KiB** (abajo, en *Corregido*); y la familia del **comodín del anfitrión**, que era
  el agujero más grande de los tres.

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

### Corregido — la mitad de la clase que el arreglo anterior dejó abierta

La auditoría midió que el check de ejecutores toleraba banderas globales entre el
gestor y su subcomando. El arreglo anterior lo cumplió **a medias**: toleraba las
banderas sin valor (`--silent`) y las que lo traen pegado (`--loglevel=error`), y
seguía ciego a las que se llevan el valor en el **argumento siguiente**. Medido el
2026-08-20, un archivo y una línea por caso: `pnpm -C . dlx openspec update`,
`npm --prefix ./x exec openspec` y `yarn --cwd . dlx openspec update` salían los
tres **exit 0**, y no por el lector sino ya por el prefiltro, imprimiendo «no hay
nada que pinar» — el mismo verde que afirma haber mirado que la auditoría vino a
cazar. **Un consumidor no tiene que hacer nada**: el check queda más estricto, no
más suave.

- **Se tolera la bandera con valor separado, en los dos alfabetos.** La forma se
  escribe **general** —una bandera y, opcional, un token que no arranca con
  guion— y no como lista cerrada de banderas, porque el defecto es de **clase**:
  npm resuelve cualquier clave de config como `--clave <valor>` antes del
  subcomando, así que una lista no se puede terminar y la bandera siguiente
  reabriría el agujero como falso verde mudo. Las banderas que originaron la
  regla salen de la documentación de cada gestor y de su `--help`, no de la
  intuición, y están escritas en el propio paso: npm (`--prefix` / `-C`,
  `--loglevel`, `--registry`, `--workspace` / `-w`), pnpm (`-C` / `--dir`,
  `--filter`, `--loglevel`, `--reporter`, `--store-dir`,
  `--workspace-concurrency`), yarn (`--cwd`) y bun (`--cwd`, `-c` / `--config`).
  El **prefiltro** de `git grep` se ensancha igual: dejarlo atrás lo volvía más
  angosto que el lector, que es la forma de volver al exit 0 con «no hay nada que
  pinar».

- **`pnpm exec` y `yarn exec` siguen fuera del alfabeto**, con banderas y con
  valores: fallan cerrado y son la salida que ofrece el mensaje de error. Hay caso
  de control por cada una.

- **Costo asumido y fijado en el banco como caso `limite`**: sin lista cerrada no
  hay forma de saber que `--silent` es booleana, así que `npm --silent run x algo`
  se lee como bandera + valor + ejecutor y cae del lado del ejecutor. Es un falso
  **rojo** legible en un check de seguridad, que es el lado conservador; el falso
  verde no lo es.

### Corregido — dos «no medido» declarados, ahora fijados por su forma

`gitleaks` no está en la máquina donde corre el banco y el banco **no baja
binarios**, así que dos propiedades quedaban declaradas sin medir: que la
herramienta acepte `--log-opts` y le reenvíe a `git` el
`--diff-merges=first-parent`, y que acepte `[extend] useDefault = true`. **Siguen
sin medir contra el binario y el nombre de cada test lo dice.** Lo que se cierra
es la **forma** del argumento, que es donde vive el modo de fallar barato: se
rompe en silencio, el detector arranca igual y mira menos de lo que dice.

- El valor de `--log-opts` tiene que viajar como **un solo** argumento entre
  comillas (el detector lo parte por espacios él mismo; sin comillas lo parte
  antes el shell y el rango se le va como posicional), sin tabuladores, sin
  espacios dobles —que le dan un token vacío— y con `--diff-merges=first-parent`
  escrito con `=` en un token propio. Que esa lista de tokens sea una línea de
  `git log` válida se mide con git, por código de salida.

- La config del marco tiene que ser **exactamente** `[extend]` +
  `useDefault = true`: la clave es camelCase y el booleano va desnudo. Cualquier
  otra grafía la ignora el detector en silencio, se queda sin reglas por defecto,
  y un barrido sin reglas sale exit 0 sobre cualquier repo — indistinguible de un
  repo limpio.

- Los dos tests **miden el binario si aparece en el `PATH`** y anuncian con
  `t.diagnostic` cuando no está, en vez de saltar callados. Un salto silencioso
  sería el fail-open del 2026-08-05 otra vez.

### Corregido — el comodín del anfitrión, y un reporte que llegaba mutilado

**El comodín pegado al ejecutor cegaba el check por completo.** El alfabeto se
comparaba por **igualdad exacta** contra tokens que todavía traían la puntuación
que aporta el lenguaje **anfitrión** del archivo. En un allowlist de Claude Code la
entrada se escribe `Bash(<comando>:*)` para decir «con cualquier argumento», y ese
`:*` puede quedar pegado al paquete, al subcomando **o al ejecutor**. Se limpiaba
en **uno** de los tres sitios que comparan contra el alfabeto —el del paquete— así
que la misma herramienta con una ortografía de diferencia daba veredictos opuestos.
Medido punta a punta con el paso real, archivo por archivo, un caso por repo:

| entrada en `.claude/settings.json` | antes | después |
| --- | --- | --- |
| `Bash(npx openspec:*)` | exit 1 | exit 1 |
| `Bash(npx:*)` | exit 0, **cero líneas** | exit 1 |
| `Bash(pnpm dlx:*)` | exit 0, **cero líneas** | exit 1 |
| `Bash(npm x:*)` · `Bash(npm exec:*)` | exit 0, **cero líneas** | exit 1 |
| `Bash(bunx:*)` · `Bash(bun x:*)` · `Bash(yarn dlx:*)` | exit 0, **cero líneas** | exit 1 |
| `Bash(npm:*)` | exit 0, **cero líneas** | exit 1 |
| `pnpm.cmd dlx openspec` · `npx.exe openspec` | exit 0, **cero líneas** | exit 1 |
| `Bash(npm run build:*)` (control) | exit 0 | exit 0 |
| `Bash(npx openspec@1.9.0:*)` (control) | exit 0 | exit 0 |

No es una ortografía suelta: son **diez** formas de escribir un permiso permanente
para descargar y ejecutar, todas mudas, en el archivo donde la línea no es un
comando que alguien vaya a revisar cuando falle. Tres arreglos, todos en el mismo
lugar conceptual: la limpieza se aplica en **los tres** sitios que comparan contra
el alfabeto; el nombre del gestor se compara sin el **sufijo de ejecutable** de
Windows (`npx.cmd`, `pnpm.cmd`, `bun.exe`: los deja la propia herramienta en el
`PATH` y descargan igual); y un gestor con el comodín pegado y **sin subcomando**
—`Bash(npm:*)`, que autoriza `npm exec` y todo lo demás— cuenta como
indeterminado, o sea rojo dentro de un allowlist. Esta última la encontró el
corpus con alfabeto propio en su primera corrida, no una persona.

La condición del último caso es angosta **a propósito**, y la angostura es lo que
la hace usable: hace falta que el comodín esté pegado al gestor. Sin eso habría que
marcar todo gestor sin subcomando reconocido, o sea `npm ci`, `npm run build`,
`pnpm install` — cada línea de cada pipeline del área. Un check que marca eso se
apaga en el tercer PR. `Bash(npm run build:*)` queda en verde y hay un caso de
regresión que lo fija.

**Y el reporte se perdía a los 64 KiB.** El paso marcaba el rojo con
`process.exit(1)`, y Node no espera a que se vacíe el `stdout` cuando la salida es
un pipe — que es lo que pone Actions siempre. Medido en la corrida `32412180384`:
de **1252** anotaciones llegaron **90**, y 90 × 739 bytes = 66510, o sea el corte
cae exactamente en los 65536 del buffer del pipe; las que llegaron son un
**prefijo exacto** de las esperadas, que es la firma de un corte de salida y no de
un defecto de lectura (un defecto de lectura agrupa por forma, no por posición). El
job igual quedaba rojo: lo que se perdía era el reporte que dice **qué** arreglar.
Ahora el rojo se marca con `process.exitCode` y la línea verde pasó a un `else`,
para que no imprima «ninguno cae» abajo de la lista de los que sí caen. El mismo
arreglo va en *Scripts de verificación sin enmascaramiento*, que tiene la misma
forma; ahí todavía no se midió un corte porque ningún repo del área llega a esa
cantidad de scripts, pero es el mismo defecto y no se deja plantado esperando al
repo que sí llegue.

**En Windows esto no se reproduce** porque ahí el `stdout` de Node es sincrónico, y
eso es la lección más incómoda de la ronda: el banco de la máquina del builder daba
**58/58 en verde** sobre un reporte que en CI llegaba mutilado. La aserción que lo
fija es sobre el **texto** del paso —tiene que usar `process.exitCode` y no
`process.exit(`— y el test dice por qué no puede ser sobre la conducta. La conducta
la sigue midiendo el corpus rojo, que en Linux vuelve a cazar esto solo.
- **`actions/constitucion` — la porción del marco de la constitución deja de
  copiarse y pasa a entregarse.** El texto común (OpenSpec, git y despliegue,
  fronteras, seguridad y observabilidad, infra/AWS/secretos, agentes y modelos,
  GitHub) vive **una vez** en `actions/constitucion/canonico/` y viaja adentro de
  la action, por el mismo transporte que `guardrail-deltas` y por la misma razón:
  el `GITHUB_TOKEN` de un consumidor no lee otro repositorio. El modo `escribir`
  renderiza un artefacto por **superficie de agente** declarada contra los valores
  del proyecto (`.projects-valores.json`); el modo `verificar` compara lo presente
  contra el re-render y deja el artefacto al día en disco para `upload-artifact`.
  No commitea, no pushea y no abre PRs.

  El agujero que cierra está medido, no supuesto: la copia del marco en un
  consumidor había perdido **114 líneas** de 355, se le habían caído reglas con
  check vivo detrás, y una regla de seguridad estaba **invertida** — decía lo
  contrario de lo que el marco manda, y ningún check podía verla porque nadie
  compara prosa copiada.

  Tres cosas que hay que leer antes de aprobar, porque no son detalles:
  - **La ventana de gracia es de fecha, no de release.** El manifiesto declara
    `publicada` y `exigible_desde`, y la action rechaza un manifiesto con menos de
    **28 días** entre las dos (`urgente: true` es la puerta de atrás y sale por
    `::warning::`, nunca muda). Artefacto ausente o atrasado = `::warning::` hasta
    esa fecha y `::error::` desde ella. **Nunca `exit 0` mudo.**
  - **El sello de la cabecera cubre el CANÓNICO, no el cuerpo renderizado.** Es
    deliberado: si cubriera el cuerpo, el arreglo obvio para un rojo de "editado a
    mano" sería recomputar el hash y volver a estampar, que es la debilidad por la
    que se descartaron los bloques sellados. La autoridad sobre el cuerpo es el
    re-render, y hay prueba de que resellar **no** tapa una edición.
  - **Un desvío es una puerta, y se verifica que el motivo EXISTA, no que sea
    sincero.** Cada desvío vivo se reimprime como `::notice::` en cada corrida y
    queda impreso pegado a la regla que anula, dentro del artefacto que los
    agentes cargan; uno cuya regla ya no existe es rojo por muerto, con el motivo
    que tenía escrito. Nada limita cuántos declara un proyecto.

  **Límite declarado, y no es una nota al pie:** esto cierra el hueco de
  **distribución**, no el de comportamiento. Lo que el check compara son bytes en
  un archivo. Que la regla esté, íntegra y al día, en la superficie que el agente
  carga no dice nada sobre si la va a aplicar en el turno 40 de una sesión larga.

- **Dos checks nuevos al final del job `higiene`**, sin una sola llamada a la API
  (solo leen el árbol ya checkouteado; el permiso que exigen es `contents: read`,
  que ya es el techo del job): *Constitución del marco al día* y *Permisos del
  agente sin escritura*. El segundo se pone rojo si el allowlist de
  `.claude/settings.json` autoriza una operación **mutante** sin desvío declarado
  —por verbo, por método HTTP de escritura, por tool MCP cuyo nombre escribe, o
  por comodín en la **posición del subcomando** (`terraform *` autoriza `apply`)—
  y avisa, nunca falla, si falta un ítem del piso recomendado. Con el perfil de
  producción el subcomando tiene que estar **clavado**: un comodín ahí es rojo, y
  toda entrada con ese perfil sale como `::notice::` en cada corrida. Un rojo seco
  por el solo hecho de usar el perfil de prod contradiría a `AGENTS.md`, que
  autoriza expresamente **leer** producción por CLI.

### Corregido — el cableado de la constitución se comprobaba con un `grep`

La segunda corrida de la auditoría, el mismo 2026-08-20, midió la otra mitad de la
afirmación A01. La primera mitad era cierta: el paso mudo se había borrado y el
scaffold cablea la action de verdad. La segunda —«y `marco-ci` comprueba
estáticamente ESE cableado»— era falsa: el check era un
`grep -rE 'uses:.*actions/constitucion' .github/workflows`, o sea que exigía que la
**línea** existiera en cualquier archivo bajo ese directorio. Se midieron **cinco**
configuraciones donde nada verifica nada y el paso sale `exit 0`, cuatro de ellas
**mudas** (cero anotaciones):

- **el caso que el propio marco reparte**: un consumidor con el `ci.yml` del scaffold
  anterior (sin el job) más `plantilla/.github/workflows/actualizar-marco.yml` tal
  cual, que invoca la action en modo **escribir** y cuyo encabezado dice, textual,
  «este workflow no verifica: solo propone el arreglo». Circularidad completa
  declarada sana;
- un job con `if: false` cableando la action;
- la única invocación en un workflow `on: workflow_dispatch`, en modo escribir;
- la action cableada sólo en `.github/workflows/archivo/viejo.yml` — GitHub Actions
  **no ejecuta subdirectorios** de `.github/workflows` («workflows must be defined at
  the top level of the .github/workflows/ directory», y la doc de reusables lo repite:
  «subdirectories of the workflows directory are not supported»), pero `grep -r` entra
  igual;
- **la perilla**: un `plantilla/.github/workflows/ci.yml` vacío y **sin rastrear**
  apagaba el check entero en un repo adoptado, porque el skip del distribuidor se
  decidía con `test -f`.

Lo que cambia:

- **`actions/constitucion` tiene un tercer modo, `cableado`, y PARSEA el YAML.** Un
  cableado cuenta sólo si, en un workflow del **primer nivel** de
  `.github/workflows` que corre en `pull_request` o en `push` a la rama por defecto,
  la invocación está en **modo verificar**, el job y el paso no están apagados por un
  `if` constante falso ni tapados con `continue-on-error: true`, y el job **cuelga de
  `ci-ok` por `needs`**, directa o transitivamente. El lector de YAML va sin
  dependencias (`actions/constitucion/cableado.mjs`, Node pelado) y **cuando ninguna
  invocación cuenta, cada candidata sale con el motivo exacto**: el pecado del paso
  anterior no era el color, era el silencio.
- **El paso del `marco-ci.yml` dejó de ser un `grep` y es un `uses:`** de ese modo.
  Corre en el carril que el consumidor hereda por llamar al workflow reusable, así que
  borrar su job de la constitución no apaga al que denuncia que falta.
- **El skip del distribuidor es una propiedad POSITIVA con tres candados**: el
  `plantilla/.github/workflows/ci.yml` tiene que estar **rastreado**, el repo **no**
  puede versionar `.projects-valores.json`, y el scaffold que reparte tiene que **cablear**
  la verificación con las cinco condiciones. Un repo adoptado no se apaga agregando un
  archivo, y un distribuidor que reparte un scaffold sin el cableado es **rojo** en vez
  de silencio.
- **El sello dejó de ser evadible.** Subir a mano `version=1.3.0` a `version=9.9.9`
  sobre un cuerpo amputado daba **exit 0** con avisos de `artefacto-adelantado`: el
  cuerpo no se comparaba contra nada y se podía borrar cualquier regla. Con esta action
  como único verificador del contenido, ese era el último bypass. Ahora hay **dos
  discriminadores independientes** y cada uno alcanza solo: el `sha` cubre
  `version + secciones`, así que una cabecera que declara una versión más nueva y trae
  **el sha que esta copia calcula para la suya** se contradice sola (`exit 1`); y si los
  workflows del repo invocan la action **sólo con el tag móvil**, no hay pin que
  explique un artefacto más nuevo que la copia que corre (`exit 1`). La causa benigna
  —un pin a un SHA o a un tag viejo— sigue siendo **aviso**. Se lee el árbol y no
  `GITHUB_ACTION_REF`: esa variable **no** está en la referencia de variables de GitHub,
  y una garantía no se apoya en algo indocumentado.
- **El artefacto ya no sale con dobles llaves que vienen de un desvío.** Los marcadores
  se medían sobre el texto sustituido y **antes** de insertar los desvíos, con el
  argumento de que el motivo de un desvío es prosa del proyecto: el argumento era cierto
  y la conclusión estaba al revés. Medido: un motivo que dice «lo aprobó {{PO}} para
  {{PROYECTO}}» viajaba al artefacto tal cual y el modo escribir lo emitía en verde
  (`exit 0`, 2 marcadores en el archivo), mientras el rojo lo cobraba el check vecino
  del propio consumidor sobre un archivo que el marco escribió. Ahora la medición es
  sobre el **cuerpo final** y hay un hallazgo propio, `desvio-con-marcadores`, que manda
  a arreglar `.projects-desvios.json` en vez de a buscar un valor que no falta.
- **El piso recomendado de permisos se mide por ENTRADA, no sobre la concatenación del
  allowlist.** Medido: un allowlist de **puro relleno** —seis cadenas que no son entrada
  de permiso de nada: `["lint", "format", "typecheck", "test", "build", "openspec"]`— se
  declaraba **100% cubierto**, exit 0 y cero avisos. La medición no decía «el agente
  puede correr el linter sin pedir permiso», decía «en algún lugar del archivo aparece
  la palabra lint». Ahora la propiedad se busca dentro de **una** entrada y con la
  **misma herramienta** que el ítem recomienda: el mismo allowlist da 6 de 6 sin cubrir.
  Sigue siendo **aviso** y jamás rojo, por la razón que ya estaba escrita.
- **Bancos nuevos y ampliados.** `actions/constitucion/pruebas/cableado.test.mjs` (27
  casos, uno por cada una de las cinco configuraciones medidas más el lector de YAML), y
  el banco de regresiones suma el sello, el desvío con marcadores, el piso de relleno y
  **el recorte del comodín del allowlist**, que no tenía ninguna prueba: borrándolo el
  banco quedaba entero en verde mientras se creaba un falso rojo sobre
  `Bash(terraform validate:*)` —la entrada que el propio scaffold reparte—, denunciada
  como si autorizara `terraform apply`. El programa de ese paso va inline en el YAML, así
  que la prueba lo **extrae del workflow** y lo corre: es la única forma de que el código
  que llega a todos los consumidores por `@v1` pase por un caso controlado.

Las cinco configuraciones se corrieron contra el paso anterior antes de escribir el
reemplazo (las cinco: `exit 0`; cuatro con cero anotaciones) y las doce mutaciones del
código nuevo matan a su prueba, una por una.

### Corregido — la constitución del marco tenía dos verificadores y ninguno verificaba

Una auditoría adversarial del 2026-08-20 puso a prueba por **código de salida** las
afirmaciones de este change y refutó siete. Cinco tenían una sola causa estructural:
la misma propiedad estaba verificada en **dos** lugares —`actions/constitucion` y un
paso inline del `marco-ci.yml` que heredan todos los consumidores— y las dos verdades
ya discrepaban en esquema, en severidad y en formato de sello. En una doble
contabilidad la declaración siempre pierde contra el check, así que el arreglo no fue
conciliar las copias: fue **dejar una**.

- **El paso inline «Constitucion del marco al dia» se BORRÓ**, y con él su copia del
  calendario del canónico. Era **verde permanente** en el único repo que venía a
  proteger: con el esquema de `superficies` que el scaffold emite hoy
  (`["claude-code","cursor"]`) salía **exit 0 mudo** —cero `::error::`, cero
  `::warning::`— sobre un repo sin `.projects/` y sin ningún artefacto, y también con la
  versión ya exigible. Y cuando el artefacto **sí** estaba lo rechazaba: exigía un
  `sha` de 64 hex del cuerpo y la action emite 12 hex del canónico, así que desde el
  2026-09-16 iba a ser exit 1 sobre artefactos **correctos**, con un mensaje que
  mandaba a correr el escritor que acababa de generarlos. En cascada, la detección de
  desvíos muertos quedaba apagada: la misma condición que en la action da exit 1 con
  el motivo escrito, ahí entraba en `avisos` y salía exit 0 en cualquier fecha.
  La pieza que sobrevive es la que compara contra el **re-render** del canónico:
  recomputar un sello es un `git commit` y cambiar el canónico no.
- **`plantilla/.github/workflows/ci.yml` gana el job `constitucion`**, que corre
  `actions/constitucion@v1` en modo verificar y cuelga de `ci-ok`. Hasta ahora la
  action **no se invocaba en ningún carril de verificación de ningún consumidor**: su
  única invocación era el workflow de actualización, en modo escribir, que declara no
  verificar nada y delegaba en el paso inline apagado. Circularidad completa. Corre en
  los **dos** carriles, sin `if` de solo-docs: la constitución es documentación, y un
  PR de solo docs es justo el que puede editarla a mano.
- **Check nuevo en `higiene`: *Constitucion del marco cableada*.** Una action que
  nadie invoca no verifica nada, y ese era el estado real. Asimétrico y sin calendario
  propio: un repo que no versiona `.projects-valores.json` recibe **aviso** (todavía no
  adoptó, y adoptar es un PR de migración que este check no puede exigir de un día
  para otro); un repo que **sí** lo versiona y no cablea la verificación recibe
  **rojo**, porque tiene la maquinaria y se saltea el check —y se arregla en el mismo
  PR que adopta. Skip por propiedad para el repo que distribuye el scaffold.
- **Un valor cuyo TEXTO es el propio marcador ya no cuenta como valor.** Copiando
  `plantilla/.projects-valores.json` tal cual —que trae `"PROYECTO": "{{PROYECTO}}"` y 14
  entradas iguales, o sea el estado normal de un proyecto recién scaffoldeado— el modo
  escribir salía **exit 0** y el artefacto quedaba con 27 líneas de dobles llaves, el
  título incluido, mientras el modo verificar afirmaba «está al día en 2
  superficie(s)». El rojo llegaba, pero de **otro** check: la propiedad estaba cubierta
  por casualidad de vecindad y no por el guardrail que la declara. Ahora es rojo con su
  nombre, más un cinturón que vuelve a mirar el cuerpo antes de sellarlo.
- **La action reconoce las dos clases de desvío** (`regla` y `permiso`). Solo conocía
  la primera, así que un desvío de permiso bien formado salía `desvio-sin-regla`:
  cablearla habría puesto roja a la action sobre un archivo correcto, y ese falso rojo
  era el último obstáculo para que su camino rojo del desvío muerto fuera alcanzable.
  Nuevos: `desvio-sin-objeto` (no nombra qué anula) y `desvio-ambiguo` (nombra las dos
  cosas, y entonces el motivo escrito deja de decir de qué es).
- **El piso recomendado de permisos se declara y se mide en UNA sola pieza.** El
  manifiesto del canónico lo declaraba y el paso de permisos lo verificaba con una
  lista literal escrita a mano, sin derivación: `grep -rn 'piso_permisos' .github/` no
  daba una coincidencia. Las dos copias ya habían divergido en las **dos** direcciones
  —el manifiesto declaraba `Bash(pnpm build)` que el paso no miraba, el paso exigía
  `openspec` que el manifiesto no declaraba— y mutar el manifiesto no movía el
  veredicto del paso ni un milímetro: seguía midiendo su propio arreglo. Ahora cada
  ítem declara la `entrada` que el marco recomienda y la propiedad que `cubre` (con el
  invariante de que `cubre` esté **dentro** de `entrada`, para que las dos mitades de
  la misma declaración no deriven), y lo mide quien lo transporta.
- **Fail-open silencioso de `PERFIL_PROD`, ahora ruidoso.** El `::warning::` cubría
  solo «existe y no parsea»; si `.projects-valores.json` no estaba, o no declaraba el
  perfil, la detección se apagaba **en silencio** y el paso informaba «0 corre(n) con
  el perfil de produccion» sobre un allowlist que contenía a la vista
  `Bash(AWS_PROFILE=… terraform plan *)`. Un conteo falso reportado como hecho es
  indistinguible de que la función no exista: es el incidente del 2026-08-05. Ahora
  avisa y el propio resumen dice que ese 0 significa «no se buscó».
- **`.projects-valores.json` ausente entra por la ventana de gracia en modo verificar.**
  La action abortaba con exit 1 **antes** de ramificar por modo, así que el repo que
  todavía no adoptó recibía un rojo seco el primer día —un endurecimiento estrenado
  sin modo aviso, contra la regla del propio `AGENTS.md`— y el escritor que debía
  depositar el artefacto por primera vez también fallaba. En modo escribir sigue
  siendo rojo: sin valores no hay con qué renderizar.
- **El canónico ya no anuncia un hueco que el marco cerró.** La regla
  `openspec-validar-tras-editar` decía que el guardrail de deltas «no avisa si el
  título de un requirement del `MODIFIED` no existe en el spec vivo». Medido: avisa y
  sale 1, con las dos salidas legítimas en el mensaje, y el arreglo ya viaja por `@v1`.
  La otra mitad (un `MODIFIED` que pierde escenarios) también está cubierta. Ese texto
  viaja en el artefacto que **todos** los consumidores cargan en **cada** sesión y
  costaba doble: mandaba a revisar a mano algo que el CI caza, y enseñaba que las
  advertencias del canónico pueden estar viejas —justo el crédito que este change
  existe para construir. En su lugar quedan los límites que **sí** están medidos: el
  guardrail solo dice la verdad **antes** del archive, y el archive cuenta operaciones
  **declaradas** y no cambios efectivos.
- **Banco nuevo: `actions/constitucion/pruebas/regresiones-auditoria.test.mjs`** (25
  casos). Ninguno pasaba contra el código anterior: se corrieron en rojo primero.
  Cuatro no ejercitan una función sino que comprueban que la **segunda contabilidad no
  vuelva** —ni el calendario, ni el piso, ni un segundo validador del sello en ningún
  workflow del marco, y el cableado de la action presente en el scaffold.

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

**Esta acción obligatoria YA ESTÁ HECHA en el repo donde se detectó.** Ese repo
tenía cinco invocaciones sin versión exacta en `.claude/settings.json` —`npx --yes
openspec ...`, con el nombre pelado que en npm es de otra persona— y el PR #155 las
pinó a `@fission-ai/openspec@1.9.0` el 2026-08-20, antes de que este tag se moviera.
Medido hoy sobre su `main`: 5 de 5 pinadas, 0 sin pinar.

**Lo que sigue pendiente en ese repo, y es el orden que importa:** su
`.projects-falsos-positivos.json` **no existe todavía** (`git ls-files` vacío), así que
el detector de secretos le va a dar rojo en sus tres hallazgos declarables el día
que este tag se mueva. Ese PR va ANTES del movimiento del tag, igual que fue el del
allowlist. Si el orden no se puede garantizar, el endurecimiento se estrena en modo
aviso y endurece en el major siguiente, como manda `AGENTS.md`.

**Y hay tres consumidores, no uno.** Al medir el impacto del tag apareció
`riesgos-investigaciones` con cuatro PRs abiertos contra `@v1` y un `README.md` que
declara «consume Projects v1.2.0»; y `riesgos-moc` ya tiene en su `main` el change de
adopción sin ejecutar. Ninguno de los dos estaba en la lista. Las **57 referencias
externas al marco son todas `@v1`**: ningún repo está pinado a un SHA, así que no
existe consumidor a salvo del movimiento del tag.

Verificado cuando el check se escribió: sobre `projects` pasaba en verde (8
invocaciones, 5 con versión literal y 3 por variable) y sobre el repo consumidor
daba rojo exactamente en las cinco líneas reales, sin un solo falso positivo — el
`pnpm exec playwright` del deploy, el `pnpm exec prisma generate` del Dockerfile y
los `tsc`/`vitest`/`eslint` de los `scripts` de cada `package.json` no se tocan,
porque ninguno pasa por un ejecutor que descargue.

Volver a medir después de completar el alfabeto (`npm x`, `bun x`, banderas
intermedias, comodín del allowlist) **no movió esos números**: `projects` sigue en
verde con las mismas 8 invocaciones y cero avisos, y el consumidor sigue en
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
mueva `v1`** — mismo precedente, misma razón. En el consumidor son **tres
declaraciones**, medidas y no estimadas: la sonda de auth de `deploy.yml` (token
basura literal, existe para que el API responda 401 exacto) y la misma frase de
prosa del spec de observabilidad en dos lugares (el spec vivo y su copia
congelada en el archive). El número importa: un barrido de regex a mano sobre ese
mismo árbol daba 17 candidatos, y esa diferencia es la que decide si el check
sobrevive al tercer PR o alguien lo apaga.

**No se encontró ningún secreto real** en los archivos rastreados de ninguno de
los repos revisados. Verificado antes de publicar, con el `run:` del paso
ejecutado tal cual: `projects` con el paso ya adentro pasa en verde en los dos planos;
el consumidor da rojo en sus tres hallazgos y pasa a verde con las tres
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

**De la constitución entregada hay una acción obligatoria de seis pasos, y los
pasos 1, 2 y 4 no son opcionales.** En el repo del proyecto: (1) escribir
`.projects-valores.json` con los valores del proyecto —sin él no hay render posible, y
un valor que quedó siendo el propio marcador `{{…}}` **no cuenta como valor**—;
(2) **cablear el job `constitucion`** en su `ci.yml`, invocando
`actions/constitucion@v1` en modo verificar y colgándolo de `ci-ok`: una action que
nadie invoca no verifica nada, y el marco ahora comprueba estáticamente que esté; (3)
generar el artefacto por cada superficie declarada; (4) dejar el import y **borrar el
texto duplicado** del `AGENTS.md` propio —completar sin borrar deja al agente una
prohibición y una autorización sobre lo mismo, y la que queda en el archivo del
proyecto es la permisiva—; (5) excluir `.projects/` y el artefacto de Cursor del
formateador, igual que ya están fuera los artefactos del CLI de OpenSpec; (6)
declarar como desvío, con motivo y aprobador, toda diferencia real que el proyecto
quiera conservar.

Los pasos 1 y 2 van **en el mismo PR**, y el orden dentro de él no importa pero la
compañía sí: el check de cableado da **rojo** al repo que versiona
`.projects-valores.json` sin invocar la verificación —tiene la maquinaria y se saltea el
check—, y **aviso** al que todavía no adoptó ninguna de las dos cosas. Adoptar a
medias es el único estado que enrojece, y es el que se evita haciendo los dos pasos
juntos.

**Un artefacto ya generado con el texto anterior de la regla
`openspec-validar-tras-editar` queda divergente y hay que reemitirlo.** Es el
mecanismo funcionando, no un efecto colateral: el texto del canónico cambió, así que
el artefacto de una versión anterior ya no coincide con el re-render. Medido sobre la
rama de migración de un consumidor: exit 1 con `artefacto-divergente` en sus dos
superficies, y el diff es **exactamente** esa regla y nada más (14 líneas nuevas, 6
borradas, más el `sha` de la cabecera, que identifica al canónico). El arreglo es
correr el modo escribir —lo hace solo el PR semanal de actualización— o bajar el
artefacto al día que el propio job sube como `constitucion-al-dia`.

**El estreno va en MINOR con la ventana de gracia activa: amarillo para todos
desde el día uno, rojo para nadie.** Medido sobre los dos repos reales antes de
publicar: los dos salen `::warning::` con la fecha en que pasa a fallar, ninguno
sale rojo. Sigue valiendo con el check de cableado nuevo, y las dos mitades están
medidas contra los árboles reales y no estimadas: en el `main` del
consumidor no hay un solo archivo `.projects*`
(`git ls-tree -r --name-only origin/main | grep '^\.projects'` → sin coincidencias), así
que cae en la rama del **aviso**; y su rama de migración, que sí versiona
`.projects-valores.json`, ya declara el job `constitucion` con `modo: verificar` y lo
cuelga del `needs` de `ci-ok`, así que cae en la rama **verde**. El estado que
enrojece —versionar los valores sin cablear la verificación— no existe hoy en ningún
árbol. `v1` se mueve **después** de que los PRs de migración estén mergeados y
verificados, no antes.

**Lo que este bloque NO trae resuelto, y hay que decidirlo a mano antes de mover
`v1`:** el texto normativo de las tres reglas nuevas de gobernanza (escalar de
modelo, configuración de repo u organización, e infra base fijada) se redactó a
partir de decisiones conversacionales y no existe en ningún archivo aprobado —una
de ellas **reemplaza** texto vigente que decía lo contrario—; el número de versión
del manifiesto y sus dos fechas los fija quien corte el release; y hay un hueco
conocido y fijado por prueba: subir a mano la versión de la cabecera a una que la
copia del marco no conoce deja el cuerpo **sin comparar**, así que el aviso lo
nombra y el cierre propuesto (rojo cuando la action se resolvió con el tag móvil)
está escrito y sin implementar.

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
primero el consumidor.** El consumidor hoy no cablea el censo, así que el
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
  primero**. Si el tag se mueve antes, ese repo queda roto sin haber
  tocado una línea, que es exactamente la definición de breaking de `AGENTS.md`.
- **El scaffold todavía no cablea ninguno de los dos pasos**: tal como está,
  todo proyecto nuevo nacería rojo el día uno por el check de cableado. Hay que
  cerrarlo antes del tag, no después.
- Probar las dos actions desde el consumidor apuntando a la **rama** del change
  y revertir ese pin en el mismo PR, como manda `AGENTS.md`.

---

## [1.1.0] — 2026-08-18

**El marco empieza a hacerse cumplir solo.** Tres checks nuevos que cierran
huecos donde el marco afirmaba algo y nada lo verificaba. Validado contra un
consumidor real antes de mover el tag móvil: quedó verde de punta a punta con el
job `higiene` corriendo.

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

**Checks 2 y 3: nada que hacer.** Se verificó contra un consumidor real antes de
publicar: los pasa sin tocar una línea (con un hallazgo real de `shellcheck` que
se arregló en su propio repo, no acá).

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

Validado contra un consumidor real antes de publicarse: ese repo
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

Los ocho specs del marco, extraídos de specs que ya estaban vivos en un proyecto real:
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

### De dónde salen las reglas

El marco se escribe desde el estado **actual** de proyectos que ya corren en
producción, no desde un starter previo: `projects-starter` quedó archivado el
2026-08-14. Cada guardrail que entra a Projects trae su incidente detrás —la tabla
del README los enumera con fecha— y esa trazabilidad es un requisito, no un
adorno: el post-mortem es el proposal del change que crea el guardrail.

