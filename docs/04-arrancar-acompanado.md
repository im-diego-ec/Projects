# Hacelo conmigo: arrancar un proyecto, paso a paso

**Para quién es esta página.** Para quien no es técnico y tiene que **hacerlo
igual**: copiar comandos, mirar la pantalla y saber si salió bien. Su hermana
[01-introduccion.md](01-introduccion.md) contesta *qué es esto y
por qué existe*; ésta contesta *qué escribo, en qué orden, y cómo sé que
funcionó*.

**La regla de esta página** es la misma que la de su hermana: ninguna palabra
técnica aparece sin explicarse acá mismo o sin enlazar al
[glosario](02-glosario.md), donde cada palabra propia del marco tiene una línea.
Hay una comprobación automática que lo mide en cada cambio.

**Palabras del marco que vas a ver acá, cada una definida en una línea:**
[andamio](02-glosario.md), [marcador](02-glosario.md), [ci-ok](02-glosario.md),
[compuerta](02-glosario.md), [CODEOWNERS](02-glosario.md), [constitución](02-glosario.md),
[change](02-glosario.md), [proposal](02-glosario.md), [spec](02-glosario.md),
[PO](02-glosario.md), [builder](02-glosario.md), [pin](02-glosario.md),
[bump](02-glosario.md), [censo](02-glosario.md), [ruleset](02-glosario.md),
[scaffold](02-glosario.md), [guardrail](02-glosario.md),
[veredicto agregado](02-glosario.md).

> **Esta página no es la única, y no es la más completa.** El paso a paso
> **técnico**, con las variantes de Windows, los comandos de comprobación contra
> GitHub y las trampas de cada fase, está en
> [05-arrancar-tecnico.md](05-arrancar-tecnico.md). Si algo de acá y algo de
> allá se contradicen, **manda esa página**: es la que mantiene quien arranca
> proyectos. Ésta es su versión acompañada, con lo que vas a ver en pantalla.

---

## Cómo leer cada paso

Cada paso trae siempre las mismas cuatro cosas, y la tercera es la que casi
nunca está escrita:

| | |
|---|---|
| **Qué vas a hacer** | La frase en castellano, sin comandos |
| **Qué copiar** | El texto exacto, tal cual, en el orden en que está |
| **Qué vas a ver** | Lo que sale en la pantalla. Si ves otra cosa, algo pasó |
| **Cómo sabés que salió bien** | La señal concreta, no «si no hay error» |

Y arriba de cada paso, **cuánto tarda**. Los tiempos marcados *(medido)* se
tomaron corriendo esto de punta a punta el 2026-08-25, en una computadora
personal y con internet ya despierto. Los demás son estimaciones honestas de
trabajo humano, que es lo que de verdad ocupa el día.

---

## Antes de empezar (1): las cuentas

Son **dos decisiones de cuenta**, y solo la segunda puede costar dinero.

### La cuenta de GitHub

Es donde vive el repositorio y donde corren las verificaciones automáticas. Si
trabajás en una organización, ya existe y no tenés que abrir nada: pedí que te
agreguen.

- **¿Pide tarjeta?** No, para el plan gratuito.
- **Lo que el plan gratuito no da, y conviene saber antes:** en un repositorio
  **privado** no se puede proteger la rama principal. O sea que la regla «para
  integrar hay que pasar por revisión» no se puede encender sin pagar un plan o
  sin hacer público el repositorio. Está medido, con el mensaje exacto que
  devuelve GitHub, en
  [`.github/proteccion-main.md`](../.github/proteccion-main.md).
- **El tiempo de máquina** de las verificaciones no se cobra en repositorios
  públicos; en privados la cuenta trae una cantidad incluida por mes y después
  se factura por uso. Cuánto viene incluido lo fija GitHub y cambia con el plan:
  se mira en la factura, no acá.

### Dónde va a vivir el proyecto cuando esté publicado

Ésta es **la decisión con más impacto en el costo**, y el marco no la toma por
vos. Podés dejarla para después: el valor `ninguna` es una respuesta legítima
mientras nadie fuera del equipo necesite entrar.

Los números de abajo están **medidos el 2026-08-24** y viven, con el resto de
las opciones y con lo que falta decidir en cada una, en
[`plantilla/infra/adaptadores.md`](../plantilla/infra/adaptadores.md). Ese
archivo manda: si dice otra cosa, es porque se volvió a medir.

| Opción | ¿Pide tarjeta? | Qué da gratis | El límite que sorprende |
|---|---|---|---|
| **Supabase** — la base de datos y las cuentas de usuario | No | 500 MB de base de datos, 5 GB de salida de datos, 50 000 usuarios activos por mes, 1 GB de archivos | **Se pausa tras una semana sin actividad**, y hay un máximo de **2 proyectos activos** por cuenta |
| **Cloudflare** — donde corre el programa y las pantallas | No | **100 000 peticiones por día**, 500 publicaciones de sitio por mes | **10 milisegundos de procesador por petición**: no es tiempo de reloj, es trabajo real. Comprimir o procesar imágenes no entra |
| **Google Cloud** — contenedores | Sí, para crear la cuenta | 2 millones de peticiones por mes | 🕳️ **Hoy no se puede elegir.** El marco todavía no tiene escrito cómo se conecta, así que el asistente no te la va a ofrecer. Está acá para que sepas que existe y que no la tenés disponible, no para que la elijas |
| **Amazon Web Services** | Sí, para crear la cuenta | Su plan gratuito es por doce meses, no permanente | El gasto aparece cuando se termina el año, no cuando se crea el recurso |
| **`ninguna`** | — | — | Nada, mientras el proyecto no tenga que estar disponible para alguien de afuera del equipo |

**La combinación de costo cero más usada** es Supabase para la base de datos más
Cloudflare para lo que corre. Combinar dos no es una trampa: lo único que no
vale es dejar una pieza sin dueño escrito.

> **Ojo con la pausa de Supabase**, porque es el rojo más confuso de todos: si
> el proyecto se toca cada dos semanas, se va a pausar, y el síntoma es una
> prueba que falla con un error de conexión que **no dice «pausado»**. Está
> escrito, con qué hacer al respecto, en el mismo archivo de adaptadores.

---

## Antes de empezar (2): los programas

Se instalan una vez en tu computadora y sirven para todos los proyectos.

| Programa | Para qué | Cómo se instala |
|---|---|---|
| **Claude Code** | **Donde ocurren los tramos 2 y 3**: el descubrimiento y la construcción se hacen conversando con un agente, no escribiendo código. Sin esto, esas dos páginas no se pueden seguir | [`claude.com/code`](https://claude.com/code) — tiene costo, y conviene saberlo ahora |
| **Git** | Guardar y enviar los cambios | [`git-scm.com`](https://git-scm.com) |
| **Node** | El intérprete con el que corre todo lo del marco | [`nodejs.org`](https://nodejs.org) — la versión con soporte de largo plazo |
| **corepack** | Lo que trae el instalador de las piezas del proyecto (`pnpm`) sin que tengas que instalarlo aparte | **No lo instalás.** Viene con Node, y el Paso 0 lo comprueba. Todos los comandos de esta página lo llaman con el prefijo `corepack pnpm` |
| **gh** | Hablar con GitHub desde la consola | [`cli.github.com`](https://cli.github.com) |
| **Docker Desktop** | **Sólo si tu proyecto es una aplicación**, no si es un sitio: es lo que levanta la base de datos en tu máquina. No lo vas a necesitar hasta el paso 6 | [`docker.com/products/docker-desktop`](https://www.docker.com/products/docker-desktop/) — gratis para uso personal |

> **Docker es el único de esta lista que el marco NO comprueba por vos**, y el
> que da el peor error cuando falta: la terminal contesta `command not found:
> docker` y nada más. Si tu proyecto es una aplicación, instalalo ahora aunque
> recién lo uses en el paso 6 — la descarga es grande y es una espera que
> conviene no tener en el medio.

> **Lo de Claude Code merece una línea aparte, porque cambia lo que este camino
> es.** Los pasos 0 a 14 de esta página se hacen **con comandos**: los copiás y
> los pegás. Pero el descubrimiento —[08](08-descubrimiento.md)— y la
> construcción —[09](09-construir-con-openspec.md)— se hacen **conversando con un
> agente**, y ese agente es Claude Code. No es una preferencia del marco: las
> herramientas de esos dos tramos (BMAD y OpenSpec) llegan como *skills* y
> *comandos* de Claude Code, y fuera de una sesión suya no existen.
>
> Si no lo vas a tener, **esta página igual te sirve entera** y terminás con un
> repositorio sano y andando. Lo que no vas a poder hacer es el ciclo de cambios
> tal como el marco lo describe.

### Y una cosa más, que no es un programa

**Acceso de lectura al repositorio del marco.** `im-diego-ec/Projects` es
**privado**: si no te lo compartieron, el Paso 1 no lo va a poder bajar, y el
error que vas a ver no dice eso. Compruébalo antes de empezar:

```bash
gh repo view im-diego-ec/Projects
```

Si contesta cualquier cosa que empiece con `name:` seguido del nombre del
repositorio, **tenés acceso** — no te fijes en nada más, el resto de la salida es
larga y no importa. Si en cambio contesta
`Could not resolve to a Repository`, **todavía no**: eso lo destraba una persona
—quien administra la cuenta te agrega como lector—, no un comando.

---

## Antes del Paso 0: qué vas a construir

**Es la decisión que más cuesta si se toma tarde**, y conviene mirarla antes de
tocar nada. No es sobre tecnologías: es sobre **quién entra a lo que estás
construyendo**. Un sitio para leer, una aplicación detrás de una puerta, o una
app que se instala en el teléfono no se arman igual.

Las cuatro formas están explicadas —con por qué elegirías cada una, qué te cuesta
y su límite real— en **[la carta de 03-stack.md](03-stack.md#la-carta-qué-vas-a-construir)**.
Son cinco minutos de lectura y te ahorran mantener piezas que tu proyecto no usa.

> **Lo que podés elegir hoy, dicho de frente.** De las formas de la carta hay
> **dos construidas**, y el asistente te las va a ofrecer: **un sitio para leer**
> y **una aplicación con servidor propio**. Las otras están explicadas en la
> carta pero todavía no se pueden elegir; la carta lo marca con 🕳️ en su columna
> de estado.
>
> **La diferencia que más te va a importar** no es técnica: el sitio **se publica
> solo** —falta que abras una cuenta gratuita y crees una credencial, una sola
> vez— y la aplicación **todavía no**, porque el marco no reparte ese paso.
> Está explicado en [10-publicar.md](10-publicar.md). Si tu proyecto tiene que
> estar en internet pronto, eso pesa más que cualquier otra cosa de esta página.
>
> Esta guía te lleva por cualquiera de las dos.

---

## Antes del Paso 0 — el camino sin instalar nada · *3 clics*

**Si no querés instalar nada en tu computadora, no hace falta.** Hay un camino
que ocurre entero dentro de GitHub, desde el navegador.

| | |
| --- | --- |
| **1** | En [el repositorio del marco](https://github.com/im-diego-ec/Projects), apretá el botón verde que dice **«Use this template»** → **«Create a new repository»**. Poné el nombre que quieras para tu proyecto. |
| **2** | En **tu** repositorio nuevo, andá a la pestaña **Actions** y elegí **«Armar mi proyecto»** en la lista de la izquierda. |
| **3** | Apretá el botón `Run workflow`. Se abre un formulario con cuatro o cinco preguntas en castellano. Contestalas y apretá el botón verde. |

**Qué vas a ver.** El trabajo tarda un par de minutos. Cuando termina, volvés a
la portada de tu repositorio y están todos los archivos de tu proyecto.

**Cómo sabés que salió bien.** La corrida queda con un tilde verde, y abajo de
ella hay un resumen que dice **«Tu proyecto está armado»** con lo que elegiste.

> **Lo que este camino no te da:** el proyecto queda armado en GitHub, pero para
> *trabajarlo* —abrir el código, probarlo en tu máquina— vas a necesitar las
> herramientas del Paso 0 igual. La diferencia es que ahora podés decidir eso
> **después de ver tu proyecto**, y no antes de tener nada.

---

## Paso 0 — Comprobar que todo está · *2 minutos*

**Qué vas a hacer.** Abrir un archivo que revisa todo y te dice qué falta.

**En la carpeta que descargaste hay un archivo que se llama `arrancar`.
Hacele doble clic.** Eso es todo: se abre una ventana negra, revisa tu
computadora, y te dice si está todo o qué falta.

| Si usás… | El archivo es |
| --- | --- |
| **Mac** | `arrancar.command` |
| **Windows** | `arrancar.cmd` |
| **Linux** | `arrancar.sh` |

> **La primera vez, la Mac te va a preguntar si confiás en el archivo.** Es lo
> que hace con todo lo que no bajó de su tienda. Si te lo bloquea: clic derecho
> sobre `arrancar.command` → **Abrir** → **Abrir** otra vez. Sólo hace falta la
> primera vez.

> **Si preferís escribirlo vos**, el archivo `arrancar` no hace más que llamar a
> `node ~/Projects/herramientas/projects-INEXISTENTE.mjs` — es exactamente lo mismo,
> y está acá por si te resulta más cómodo.

**Qué vas a ver**, si está todo:

```
Esto es lo que necesita el marco para funcionar en esta computadora.

  [OK  ] Node  24.19.0
  [OK  ] Git  2.50.1
  [OK  ] corepack  0.35.0
  [OK  ] gh  2.98.0
  [OK  ] Docker Desktop  27.5.1

  [OK  ] Sesión de GitHub  tu-usuario

Todo lo que hace falta está. Ya podés seguir con el paso 1.
```

**Y si falta algo, te lo dice con el enlace de dónde bajarlo**, sin que tengas
que buscarlo en ningún lado:

```
  [FALTA] Docker Desktop  (opcional)
           levanta la base de datos en tu máquina
           sólo si vas a construir una APLICACIÓN. Para un sitio no hace falta
           Se baja de: https://www.docker.com/products/docker-desktop/ — gratis para uso personal
```

**Cómo sabés que salió bien.** La última línea dice **«Ya podés seguir con el
paso 1»**. Si dice otra cosa, arriba está exactamente qué falta y de dónde se
baja. Instalá eso y **volvé a correr el mismo comando**: es la única señal que
tenés que mirar.

> **Docker es el único opcional**, y depende de lo que vayas a construir: una
> **aplicación** lo necesita, un **sitio para leer** no. Si no sabés todavía cuál
> vas a hacer, instalalo igual — la descarga es grande y es una espera que
> conviene no tener en el medio.

> **Antes esto eran cuatro comandos y comparar a ojo.** Se cambió porque comparar
> a ojo no comprueba nada: el piso de versión de Node vive en el código, no en la
> pantalla. Y porque Docker no estaba en ninguna lista, y era el único requisito
> que nada comprobaba.

---

## Paso 1 — Traer el marco a tu computadora · *1 minuto*

**Qué vas a hacer.** Bajar una copia del repositorio del marco. Se hace **una
sola vez**, y sirve para todos los proyectos que arranques.

**Qué copiar:**

```bash
gh repo clone im-diego-ec/Projects
cd Projects
pwd
cd ..
```

**Qué vas a ver.** Una sola línea de la descarga, `Cloning into 'Projects'...`, y
después la ruta completa de la carpeta que imprime `pwd`, algo así:

```
Cloning into 'Projects'...
/Users/tu-nombre/Projects
```

En tu pantalla, entre esas dos, `git` puede meter unas cuantas líneas más de la
descarga —cuántos archivos bajó, a qué velocidad—. No importan. **La que tenés
que copiar es la última: la que empieza con una barra `/` y termina en
`/Projects`.** Guardala en una nota o en un papel: es lo que en los Pasos 3 y 5
se escribe como `<ruta-al-clon>`, y ningún otro comando la vuelve a imprimir.

**Cómo sabés que salió bien.** Existe una carpeta `Projects`, adentro hay un
archivo `README.md`, y tenés la ruta anotada.

> **Si en vez de la descarga ves `Could not resolve to a Repository`**, hay dos
> causas y la página no puede saber cuál es la tuya:
>
> 1. **No estás autenticado.** Corré `gh auth login` y volvé a intentar.
> 2. **Estás autenticado pero no te dieron acceso** al repositorio, que es
>    privado. Eso lo destraba una persona, no un comando: pedile a quien
>    administra la cuenta que te agregue como lector.
>
> **Cómo distinguirlas.** El mensaje no es el mismo, y eso ayuda:
>
> - Si dice `Could not resolve to a Repository`, GitHub te está contestando que
>   ese repositorio no existe **para vos** — o sea, la causa 2. Responde eso
>   tanto para lo que no existe como para lo que existe y no es tuyo, a propósito,
>   así que no podés saber cuál de las dos es sin preguntarle a una persona.
> - Si en cambio el mensaje habla de que no estás dentro de tu cuenta, es la
>   causa 1 y la arreglás vos con `gh auth login`.

> **No la pongas en una carpeta temporal.** El clon te sirve para todos los
> proyectos, no para éste, y en Windows la carpeta `/tmp` ni siquiera existe.

---

## Paso 2 — Crear el repositorio vacío · *2 minutos, más lo que tarde quien te lo apruebe*

**Qué vas a hacer.** Crear el repositorio en GitHub, vacío, y bajarlo a tu
computadora. La herramienta del paso 5 **no crea repositorios**: escribe adentro
de uno que ya existe.

**Antes de copiar nada, comprobá dónde estás parado.** El proyecto nuevo va **al
lado** del clon, nunca adentro:

```bash
pwd
```

Si el Paso 1 lo hiciste tal cual está escrito, ya estás en el lugar correcto: ese
bloque terminaba con `cd ..`, que te devolvió justo afuera del clon. La ruta que
ves **no** tiene que terminar en `/Projects`. Si termina ahí, corré `cd ..` una
vez —**una sola**— y volvé a comprobar.

**Qué copiar (cambiá `<org>` y `<proyecto>` por los tuyos):

```bash
gh repo create <org>/<proyecto> --public --clone
cd <proyecto>
```

> **Qué va en cada uno, para no tener que preguntarlo.** En `<org>` va la
> organización de GitHub donde vive el repositorio. **Si arrancás solo, sin
> organización, ahí va tu propio nombre de usuario de GitHub** — el que aparece
> arriba a la derecha cuando entrás a github.com, y el mismo que te muestra
> `gh api user --jq .login`. En `<proyecto>` va el nombre del repositorio: en
> minúsculas y con guiones en vez de espacios.

> **Por qué `--public`, y cuándo cambiarlo.** Público quiere decir que cualquiera
> puede **leer** tu código; nadie puede cambiarlo sin que vos lo apruebes. Y hay
> algo que solo público te da **gratis**: poder proteger la rama principal, o sea
> que las reglas de este marco se puedan hacer cumplir de verdad. En un
> repositorio **privado del plan gratuito esa protección no existe** —GitHub
> responde un error— y el Paso 12 te lo va a decir de frente cuando llegues.
>
> **Si tu código no puede ser público**, cambiá `--public` por `--private` acá
> mismo y seguí igual: todo lo demás funciona. Lo único que perdés es esa
> protección, y para recuperarla hay que pagar GitHub Pro o mover el repositorio
> a una organización. El asistente del Paso 3 te va a volver a preguntar esto y
> deja tu respuesta anotada con su motivo.

**Qué vas a ver.** La dirección del repositorio recién creado y, después, la
descarga de una carpeta vacía.

**Cómo sabés que salió bien.** Estás parado adentro de la carpeta del proyecto y
está vacía salvo por la carpeta oculta `.git`.

---

## Paso 3 — Contestar las decisiones · *de 5 minutos a dos días*

**Qué vas a hacer.** Contestar unas preguntas en castellano. El programa arma con
tus respuestas el archivo que necesita para construir el proyecto, así que no
tenés que llenar nada a mano.

**Dónde tenés que estar parado.** Adentro de la carpeta de tu proyecto — que es
donde te dejó el Paso 2, con su `cd <proyecto>`. Compruébalo antes de seguir:

```bash
pwd
```

La ruta tiene que terminar con el nombre de tu proyecto. **No** es la carpeta del
marco: si termina en `/Projects`, estás en el lugar equivocado.

**Qué copiar:**

```bash
node <ruta-al-clon>/herramientas/projects-init.mjs --asistente --solo-valores valores.json
```

**Qué vas a ver.** Una pregunta por vez, numerada, con sus opciones. Cada opción
te dice por qué la elegirías, qué te cuesta y qué límite tiene. Así:

```
[3/8]  ¿Trabajás solo en este proyecto, o hay más gente que va a revisar el código?

  1) Solo yo, por ahora   ← recomendada
     El marco automatiza que otra persona revise cada cambio antes de que entre.
     Con una sola persona eso es imposible por construcción: GitHub le pide
     revisión a los dueños del código EXCEPTO al autor, así que todo cambio tuyo
     le pediría revisión a nadie. Encender esa exigencia te bloquearía TODO merge
     sin salida. Se deja apagada, se anota como decisión firmada, y el pull
     request con su verificación en verde siguen siendo obligatorios.

  2) Somos dos o más
     ...

  Elegí un número [Enter = 1]:
```

**Cuántas preguntas son.** Depende de lo que contestes, y ésa es la idea:

| Si elegís | Son |
| --- | --- |
| Supabase, trabajando solo, sin dominio propio | **9 preguntas**, y solo dos hay que escribirlas |
| AWS con dos copias del proyecto | **14**, porque ahí los datos de la nube existen de verdad |
| Todo lo que suma: AWS, dos copias, otra persona, dominio propio y Slack | **17**, el máximo |

Las que no escribís se contestan con **Enter**, que elige la opción recomendada.
Nunca te va a pedir un dato de AWS si no elegiste AWS.

**El número de la izquierda sube y el de la derecha también.** Vas a ver `[1/8]` y
más adelante `[6/13]`: no es un error. Cuántas preguntas quedan depende de lo que
vayas contestando, así que el total se recalcula en cada una.

**Si te equivocás en una.** No pasa nada: al terminar imprime un resumen de todo
lo que elegiste. Y podés volver a correr **el mismo comando** en la misma
carpeta: lo primero que va a decir es `Retomando lo que contestaste antes`, y
cada pregunta te ofrece tu respuesta anterior —Enter la mantiene—, así que solo
cambiás lo que quieras.

**Cómo sabés que salió bien.** Termina con el resumen de tus decisiones y dice
`Escrito: valores.json`, más otros dos archivos:

- **`.projects-respuestas.json`** — lo que contestaste, para que volver a
  correrlo no te haga empezar de cero.
- **`.projects-desvios.json`** — qué queda apartado de lo que el marco supone,
  por qué, y cuándo conviene revisarlo. **Casi siempre va a haber al menos uno**,
  y no es una señal de que algo salió mal: trabajar solo ya es uno, porque apaga
  la revisión de otra persona. Leelo: es la lista de las cosas que el marco
  normalmente te garantiza y en tu caso no.

> **Lo que no puede adivinar nadie.** Dos respuestas dependen de otra persona o
> de una cuenta que quizá no tenés todavía: el nombre del repositorio y tu
> usuario de GitHub. El resto tiene una recomendación puesta.

---

## Paso 4 — Revisar lo que quedó escrito · *5 minutos*

**Qué vas a hacer.** Abrir el archivo que armó el asistente y mirarlo una vez.
No para corregirlo —ya está validado— sino para saber qué hay adentro.

**Qué copiar:**

```bash
cat valores.json
```

**Qué vas a ver.** Las 23 casillas que el programa necesita, llenas con lo que
derivó de tus 9 respuestas. Por ejemplo, si dijiste que no tenés dominio propio,
vas a encontrar la dirección gratuita de Cloudflare ya puesta:

```json
{
  "PROYECTO": "agenda-de-personas",
  "ORG": "tu-usuario",
  "DOMINIO_PROD": "agenda-de-personas.workers.dev",
  ...
}
```

**Qué hacer si algo no te gusta.** Volvé a correr el comando del paso 3 con
`--valores valores.json` agregado: te vuelve a preguntar, ofreciéndote lo que ya
habías contestado, y reescribe el archivo.

**Cómo sabés que salió bien.** El archivo existe y ninguna casilla dice
`RELLENAR` ni tiene dobles llaves `{{así}}`.

> **Si preferís llenarlo a mano.** El camino de antes sigue existiendo y es
> idéntico: `--ejemplo > valores.json` te da la hoja con las 23 casillas y sus
> valores de ejemplo, y qué va en cada una está en la sección 2 de
> [`plantilla/README.md`](../plantilla/README.md). Es el camino de quien ya sabe
> lo que quiere; el asistente es el mismo destino por otra puerta.

> **Los números de cuenta de los ejemplos son inventados a propósito.** En el
> marco no se escriben datos reales de ningún proyecto: son `111111111111` y
> `222222222222`, y hay una comprobación automática que se pone roja si alguien
> escribe uno de verdad.

---

## Si te equivocaste en una respuesta

Pasa, y tiene arreglo en los dos momentos en que te podés dar cuenta.

### Antes de armar el proyecto · *1 minuto*

**Volvé a correr el asistente. No te va a hacer contestar todo de nuevo.**

```bash
./arrancar.sh
```

Lo primero que vas a ver es esto:

```
Retomando lo que contestaste antes (…/.projects-respuestas.json). Enter mantiene cada respuesta.
```

De ahí en adelante, **Enter deja cada respuesta como estaba**. Llegás a la que
querías cambiar, escribís la nueva, y seguís apretando Enter hasta el final. Y si
te pasás de largo, en cualquier pregunta podés escribir `volver` para retroceder
una: la respuesta que ya diste no se pierde.

> En Windows es `arrancar.cmd` y en macOS `arrancar.command` — el mismo archivo
> que abriste la primera vez.

### Después de armar el proyecto

Acá depende de cuánto trabajo tuyo haya adentro:

**Si todavía no escribiste nada propio** —o sea, acabás de armarlo— lo más
limpio es **borrar la carpeta del proyecto, volver a crearla vacía y correr el
Paso 5 otra vez** con la respuesta corregida. Tarda lo mismo que la primera vez.

**Si ya trabajaste ahí adentro**, no borres nada. El proyecto tiene un archivo
`.projects-valores.json` con las 23 casillas y el valor que quedó en cada una:
abrilo, buscá la que está mal, y reemplazá **ese valor viejo por el nuevo** en el
proyecto. Es una búsqueda y reemplazo de texto, y ese archivo te dice exactamente
qué texto buscar.

> **Ojo con los valores muy cortos.** Si lo que cambia es, por ejemplo, un nombre
> de usuario de tres letras, ese texto puede aparecer en lugares que no tienen
> nada que ver. Mirá cada coincidencia antes de reemplazarla, una por una.

---

## Paso 5 — Armar el repositorio y dejarlo en verde, de un tirón · *25 segundos (medido)*

**Qué vas a hacer.** Un solo comando que hace **dos cosas seguidas**: copia el
[andamio](02-glosario.md) —el árbol de archivos con el que nace un proyecto—
reemplazando cada [marcador](02-glosario.md) por tu valor, y después **arranca el
proyecto**: baja las piezas, arma el cliente de la base de datos, ordena el texto
y corre todas las verificaciones.

**Qué copiar** (en la misma carpeta del Paso 3, la de tu proyecto; el punto final significa
«acá»):

```bash
node <ruta-al-clon>/herramientas/projects-init.mjs --valores valores.json --destino .
```

**Qué vas a ver.** Mucho texto, y está bien. Va en tres tramos, en este orden:

```
escritos 75 archivos, 196 ocurrencias sustituidas
cero marcadores sobrevivientes

ARRANQUE con corepack pnpm en . — 4 pasos, la salida de cada uno tal cual sale:

── 1/4  instalar las dependencias  (corepack pnpm install)
── 2/4  generar el cliente de la capa de datos  (corepack pnpm run datos)
── 3/4  formatear el arbol  (corepack pnpm run format)
── 4/4  verificar el proyecto entero  (corepack pnpm run verificar)

LISTO, y el proyecto quedo arrancado y en verde. Lo que sigue NO lo puede hacer esta herramienta:
...
```

Ese ejemplo es el de **una aplicación**, que corre cuatro pasos; un sitio corre
tres y lo dice en la misma línea `ARRANQUE con …`.

Entre una línea `── n/N` y la siguiente va **la salida cruda de esa herramienta,
tal cual sale**: listas de piezas, nombres de archivo, resúmenes de pruebas. No
hace falta que la entiendas; hace falta que llegues a la línea siguiente.

**Cómo sabés que salió bien.** Por **cuatro señales**, en este orden:

1. La segunda línea dice **`cero marcadores sobrevivientes`**. Si dijera otra
   cosa, quedaron huecos sin rellenar y están nombrados uno por uno.
2. Aparecieron **todos** los encabezados `── n/N`, del 1 hasta el último. Cuántos
   son depende de tu forma —una aplicación corre cuatro pasos y un sitio tres,
   porque no tiene capa de datos que generar— y **el programa lo dice antes de
   empezar**: la línea `ARRANQUE con … — N pasos`. Si saltea alguno, también lo
   dice, con el motivo.
3. En ninguna parte aparece **`::error::`**. Ésa es la palabra a buscar cuando
   algo se corta: la escribe esta herramienta, no el gestor de paquetes, y por eso
   es la señal fiable. Si aparece, la línea siguiente dice qué paso falló, por qué
   existe ese paso y cómo se destraba.
4. La última sección empieza con **`LISTO, y el proyecto quedo arrancado y en
   verde.`**

Los números `75` y `196` de la primera línea **van a ser otros cuando lo corras
vos**, y eso no es un problema: crecen cada vez que entra un archivo nuevo al
andamio. Lo que importa es que la línea exista.

> **Esto cambió hace poco, y en tu favor.** Hasta hace unos días esa lista de
> pendientes empezaba con «antes del primer envío, bajá las piezas y ordená el
> texto»: dos comandos que había que acordarse de correr, y saltearlos dejaba las
> verificaciones en rojo por una razón que no era tuya. Ahora los corre la
> herramienta. **Si la lista que ves no coincide exactamente con esta página,
> manda la lista**: es la que se automatiza, y esta página va detrás.

> **La sección que empieza en `LISTO,` es tu lista de tareas.** No la cierres:
> los pasos 9 a 13 de esta página son exactamente esa lista, contada despacio.
> La herramienta la imprime porque **no puede hacerla ella**: son decisiones y
> actos humanos, no transcripción.

**Si algo sale mal, hay dos momentos distintos y conviene no confundirlos.**

**Antes de escribir nada.** Si falta un valor, sobra un valor o la carpeta ya
tenía archivos del andamio, la herramienta **aborta sin tocar tu carpeta** y te
dice cuál es el problema. No hay nada que limpiar.

**Después de escribir, durante el arranque.** Acá el repositorio **ya quedó
escrito**, y la herramienta te lo dice con esas palabras. No hay que volver a
instanciar nada: hay que destrabar el paso que falló, y el `::error::` dice cuál
es y cómo. Si de todas formas querés empezar de cero sobre la misma carpeta, hace
falta agregar `--forzar` al comando, porque encontrarla con archivos del andamio
adentro es justamente una de las cosas que la hace abortar.

---

## Paso 6 — Los pasos del arranque, uno por uno · *5 minutos de lectura*

**Qué vas a hacer.** Entender qué hizo cada uno. No es curiosidad: son los
mismos que vas a volver a correr cada vez que toques algo, y los mismos que
GitHub va a correr sobre tu cambio.

> **Son cuatro para una aplicación y tres para un sitio.** El de la capa de datos
> no corre en un sitio, porque un sitio para leer no tiene base de datos que
> generar — y el programa lo dice en voz alta cuando lo saltea, en vez de
> desaparecerlo.

**Qué copiar.** Nada ahora. Éstos son, por si más adelante querés correr uno
suelto:

```bash
corepack pnpm install        # 1/4
corepack pnpm run datos      # 2/4
corepack pnpm run format     # 3/4
corepack pnpm run verificar  # 4/4
```

**Qué vas a ver**, tramo por tramo:

| Paso | Qué hace | La señal de que fue bien |
|---|---|---|
| **1/4** `install` | Baja las piezas de las que depende el proyecto y escribe el archivo que fija sus versiones exactas, `pnpm-lock.yaml`. Ese archivo **se guarda con el proyecto**: es lo que hace que mañana se baje lo mismo | Termina con `Done in Ns` |
| **2/4** `datos` | Arma el cliente con el que el programa habla con la base de datos. **Va antes que todo lo demás**: sin él, los tres siguientes salen rojos por una razón que no es tuya | `✔ Generated Prisma Client` |
| **3/4** `format` | Ordena el texto de todos los archivos. No es cosmética: al reemplazar los marcadores cambian los anchos y las tablas quedan desalineadas, y la verificación siguiente lo marca | Una línea por archivo revisado |
| **4/4** `verificar` | Corre **todo** encadenado: datos, revisión de estilo, formato, tipos, pruebas y compilación | El resumen de cobertura y, al final, `✓ built in ...` |

**Cómo sabés que salió bien.** Ya lo sabés: es la señal 4 del paso anterior. Este
paso no cambia nada, te da el mapa.

> **Un recuadro que parece un error y no lo es.** Dentro del tramo 2/4 puede
> aparecer un aviso enmarcado que dice `Update available 7.9.1 -> 8.0.0-rc.10`.
> Es la herramienta de la base de datos avisando que hay versión nueva. **No la
> subas a mano**: las versiones nuevas llegan solas como propuesta revisable —lo
> que el marco llama un [bump](02-glosario.md)—.

---

## Paso 7 — Ver tu proyecto andando · *3 minutos*

**Qué vas a hacer.** Levantarlo en tu computadora y abrirlo en el navegador. Es la
primera vez en todo el camino que vas a ver algo que se parece a una aplicación, y
vale la pena: hasta acá tenés un repositorio sano, que no es lo mismo que un
proyecto que hace algo.

**Qué copiar.** Depende de tu forma, y es la única vez en toda la página que
cambia. La sabés con el comando del Paso 14, o mirando si tu proyecto tiene una
carpeta `api/`.

**Si tu forma es «una aplicación»** (en la carpeta de tu proyecto, las tres líneas):

```bash
cp api/.env.example api/.env
cp web/.env.example web/.env
corepack pnpm dev
```

Las dos primeras copian los archivos de configuración de ejemplo. Traen valores
que sirven para tu computadora y **para nada más**: no hay ninguna contraseña de
verdad adentro.

**Si tu forma es «un sitio para leer»**, una sola línea y nada que copiar antes:

```bash
corepack pnpm dev
```

Un sitio no tiene servidor ni base de datos, así que no hay configuración que
llenar. Por eso tampoco trae los `.env.example`: pedírtelos sería mandarte a
buscar dos archivos que ese proyecto no tiene.

**Qué vas a ver.** En **un sitio**, una línea con la dirección (medido el
2026-08-31 sobre un proyecto recién generado):

```
sitio dev$ astro dev
sitio dev: Dev server running at http://localhost:4321
```

En **una aplicación**, texto de las dos partes arrancando, y en algún momento
estas dos líneas, que son las que importan:

```
web dev:   VITE v8.2.2  ready in 104 ms
web dev:   ➜  Local:   http://localhost:5173/
api dev: {"puerto":3000,"nivel":"info","msg":"tu-proyecto-api escuchando"}
```

Abrí en el navegador **la dirección que imprima tu caso** —`4321` para un sitio,
`5173` para una aplicación—. Vas a ver una página con el nombre de tu proyecto.
Es fea a propósito: es el punto de partida, no un diseño.

> **Si la línea dice otro número, usá ése.** Cuando el 5173 ya está ocupado por
> otra cosa, la herramienta no falla: avisa `Port 5173 is in use, trying another
> one...` y se muda al 5174, o al siguiente libre. **La dirección buena es
> siempre la que imprime `Local:`**, no la de este texto. Es la trampa más fácil
> de este paso: abrir el 5173 y ver la página de otro programa, o nada.

**Cómo sabés que salió bien.** La página abre y el título de la pestaña dice el
nombre de tu proyecto. **Para un sitio, con eso ya está.**

En **una aplicación**, si querés comprobar la otra mitad, abrí
`http://localhost:3000/api/health`: tiene que contestar algo así:

```json
{ "estado": "ok", "servicio": "tu-proyecto-api" }
```

Para apagarlo, **Ctrl+C** en la terminal.

> **Una parte NO va a andar, y es esperado.** Todo lo que necesita la base de
> datos —por ejemplo `http://localhost:3000/api/db/health`— va a contestar un
> error. Es correcto: la base todavía no existe. Para levantarla hace falta
> **Docker**, que no está en la lista de programas de esta página porque no lo
> necesitás hasta que empieces a guardar datos de verdad. Cuando llegue ese
> momento, los comandos están en `comandos-levantar-servicios.txt`, en la raíz
> de tu proyecto.

---

## Paso 8 — Volver a comprobarlo cada vez que toques algo · *13 segundos (medido)*

**Qué vas a hacer.** Correr en tu computadora **las mismas verificaciones** que
GitHub va a correr después. Es la diferencia entre enterarte ahora o enterarte
delante de todo el equipo. Este comando es el que más vas a usar de toda la
página.

**Qué copiar:**

```bash
corepack pnpm run verificar
```

**Qué vas a ver.** Seis etapas encadenadas, cada una anunciándose con un `$`. Al
final, el resumen de cobertura y el resultado de compilar:

```
$ pnpm datos && pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build
✔ Generated Prisma Client (v7.9.1)
Checking formatting...
All matched files use Prettier code style!
=============================== Coverage summary ===============================
Statements   : 100% ( 33/33 )
================================================================================
✓ built in 371ms
```

**Cómo sabés que salió bien.** Llegó hasta la línea `✓ built in ...` y **no**
apareció `[ELIFECYCLE] Command failed`.

> **Cuándo lo vas a necesitar de verdad:** después del paso 13, cuando edites el
> `README.md` a mano. Medido hoy: cambiar el ancho de una celda de una tabla
> alcanza para que la etapa del formato salga roja con `[warn] README.md` y
> `Code style issues found in the above file`. **No es un defecto**: se arregla
> con `corepack pnpm run format` y volvés a correr esto.

---

## Paso 9 — Llenar la portada y hacer el primer envío · *20 minutos*

**Qué vas a hacer.** Dos cosas: escribir lo que solo vos sabés de tu proyecto, y
después guardar todo y enviarlo. **Sin propuesta de cambio y sin revisión**, y
ésta es la única vez que eso está bien.

### Primero: la portada, que nace con huecos

El `README.md` de tu proyecto es lo primero que ve cualquiera que entre al
repositorio, y nace con **huecos marcados `RELLENAR`**: son las respuestas que
ninguna herramienta puede inventar —qué hace tu proyecto, a quién le sirve, a
quién llamar cuando algo se rompe—. La herramienta del Paso 5 ya te lo dijo: es
lo primero de su lista de pendientes.

**Qué copiar** (para ver cuántos son y dónde están):

```bash
grep -n RELLENAR README.md
```

**Qué vas a ver.** Una línea por hueco, con su número. Hoy son nueve, y **no son
nueve cosas para escribir**: seis son huecos de verdad y tres están adentro del
recuadro de instrucciones que abre el archivo — ése no se rellena, **se borra
entero**, y el propio recuadro te lo dice en su última línea.

**Qué hacer.** Abrí el `README.md` y:

1. **Reemplazá cada `RELLENAR` por tu respuesta.** No hace falta que sean largas
   —una o dos frases alcanzan— y se pueden mejorar después. Lo que no conviene es
   dejarlas: nada se pone en rojo por un `RELLENAR` sin llenar, así que si no lo
   hacés ahora, se queda ahí para siempre.
2. **Borrá el recuadro de arriba**, el que empieza con «Este archivo lo genera la
   herramienta que creó el repositorio». Ya cumplió su función y no es para quien
   entre al repositorio.

**Cómo sabés que salió bien.** El mismo comando **no imprime nada**. Si todavía
imprime dos o tres líneas y todas empiezan con `>`, es que te faltó el punto 2:
son las que viven adentro del recuadro.

### Después: el envío

**Qué copiar:**

```bash
git add -A
git commit -m "chore: bootstrap del proyecto con el andamio del marco"
git push -u origin main
```

**Qué vas a ver.** La cuenta de archivos guardados y, después, las líneas de
envío terminando en `main -> main`.

**Cómo sabés que salió bien.** En GitHub, la portada del repositorio ya no está
vacía, y en la pestaña **Actions** aparece una corrida en curso.

> **Por qué directo y no por el camino normal.** Por dos motivos medidos, y los
> dos empujan igual:
>
> - La [compuerta](02-glosario.md) de cobertura mide **las líneas que una propuesta
>   agrega sin pruebas**. Este primer guardado agrega el esqueleto entero: por el
>   camino normal saldría roja; enviada directo a la rama principal, contesta
>   `NO APLICABLE`.
> - El [veredicto agregado](02-glosario.md) —la única verificación que la rama
>   principal va a exigir, y que se llama [`ci-ok`](02-glosario.md)— **no aparece en
>   la lista de GitHub hasta que haya corrido una vez**. O sea que la protección
>   del paso 11 no se puede encender antes de este envío.
>
> El orden es: enviar → que corran las verificaciones → **recién ahí** proteger
> la rama → y desde ese momento, todo por propuesta.

---

## Paso 10 — Mirar las verificaciones, y esperar un rojo · *4 minutos de reloj*

**Qué vas a hacer.** Abrir la pestaña **Actions** del repositorio y mirar la
corrida. Va a haber **un rojo**, y es el rojo correcto.

**Qué copiar** (si preferís no salir de la consola):

```bash
gh run watch
```

**Qué vas a ver.** Una lista de trabajos con su tilde o su cruz. Todos en verde
menos uno: **«Sin marcadores del scaffold sin resolver»**.

**Cómo sabés que salió bien.** Que el rojo de los marcadores esté, y que el paso
13 lo apague.

> **Puede haber más de un rojo, y conviene saber cuáles son tuyos.** Además del
> de los marcadores, hoy hay uno que **no es tuyo y no lo podés arreglar**: el
> trabajo **`constitucion`**, que compara la constitución de tu proyecto contra la
> versión del marco que tus verificaciones usan. Cuando el marco publicó una versión y su
> texto ya cambió, esas dos no coinciden y el trabajo sale rojo. **Se arregla del
> lado del marco, publicando la versión siguiente** — no del tuyo.
>
> Cómo distinguirlos, sin saber nada de esto: los rojos que **sí** son tuyos
> nombran un archivo de tu proyecto. El de `constitucion` habla de versiones del
> marco.

---

## Paso 11 — Proteger la rama principal · *10 minutos*

> 🛑 **Leé este recuadro antes de encender nada, porque este paso no se deshace
> solo.**
>
> Vas a exigir que `ci-ok` esté en verde para que un cambio pueda entrar a la rama
> principal. Si en este momento
> `ci-ok` está **rojo por algo que no es tuyo** —el trabajo `constitucion` de
> arriba es el caso—, quedás en un repositorio **donde no va a poder entrar
> ningún cambio**, ni siquiera el que arregla eso.
>
> **Antes de encenderlo, comprobá que `ci-ok` está en verde:**
>
> ```bash
> gh run list --limit 1
> ```
>
> **Si `ci-ok` no está en verde, no hagas este paso todavía.** No es urgente:
> tu proyecto funciona igual. Encendelo el día que la corrida quede limpia.
>
> **Y si ya lo encendiste y quedaste trabado**, la salida existe y son dos
> líneas: en `Settings → Rules → Rulesets`, poné la regla en **Disabled**, dejá
> entrar lo que necesites, y volvé a activarla. No hay que borrar nada.

**Qué vas a hacer.** Encender la regla que hace que, de ahora en adelante,
**nada entre sin pasar por revisión y sin las verificaciones en verde**. Es un
acto deliberado y es el que convierte los acuerdos en reglas.

**Qué copiar.** Nada: esto se hace en las pantallas de GitHub. El repositorio
nuevo trae el instructivo adentro, en el archivo
`.github/proteccion-main.md`, con las reglas una por una.

**Qué vas a ver.** En `Settings → Rules → Rulesets`, la lista de verificaciones
que se pueden exigir. **`ci-ok` tiene que estar en esa lista**; si no aparece, es
que las verificaciones todavía no corrieron ni una vez y te falta el paso 9, no
que esté mal escrito.

**Cómo sabés que salió bien.** El archivo `.github/proteccion-main.md` de tu
repositorio queda con su estado real escrito, y la verificación exigida es
[`ci-ok`](02-glosario.md) — **ninguna otra**.

> **No las encendés todas, y el archivo te dice cuáles.** Abrilo: tiene **dos
> tablas**. La primera son las que hay que encender ahora y la segunda las que
> quedan **diferidas, con su motivo escrito**. Contá las filas de cada una en tu
> archivo —el número depende de lo que contestaste en el Paso 3— y no te fíes de
> ningún número escrito acá, que envejecería solo.
>
> **Por qué no se encienden todas.** Exigir aprobación + revisión del dueño de la
> ruta + nadie que pueda saltarse la regla, **con un equipo de una sola persona,
> deja el repositorio sin ninguna forma de integrar nada**: todo cambio tuyo
> pediría la aprobación de alguien que no existe. Lo que se decide no activar se
> **declara**, nunca se omite en silencio.

---

## Paso 12 — Los cinco ajustes que nadie extraña · *15 minutos*

**Qué vas a hacer.** Encender cinco cosas cuya falta **no produce ningún rojo**.
Ése es exactamente el problema: si no las hacés, nada te avisa.

**Qué copiar.** Solo el primero de los cinco tiene comandos — los otros cuatro se
hacen en las pantallas de GitHub, y están en la tabla de abajo. Éstos son los
seis que la herramienta ya te imprimió al final del paso 5:

```bash
gh label create "area:backend"   --color 0052CC --description "Area: backend"
gh label create "area:ci-cd"     --color 006B75 --description "Area: ci-cd"
gh label create "area:datos"     --color FBCA04 --description "Area: datos"
gh label create "area:frontend"  --color 1D76DB --description "Area: frontend"
gh label create "area:infra"     --color 5319E7 --description "Area: infra"
gh label create "area:seguridad" --color B60205 --description "Area: seguridad"
```

**Qué vas a ver.** Una línea por etiqueta creada, con la dirección de cada una.
Si una ya existía, esa línea dice que no se puede crear dos veces; no rompe nada.

**Cómo sabés que salió bien.** El listado te devuelve las seis:

```bash
gh label list
```

| Qué | Dónde | Qué pasa si no lo hacés |
|---|---|---|
| **Las seis etiquetas `area:*`** | Se crean con los seis comandos que la herramienta te imprimió al final del paso 5 | La [constitución](02-glosario.md) las exige y un repositorio nuevo nace sin ninguna |
| **Dependabot, en tu repositorio** | `Settings → Advanced Security` → *Dependency graph* y *Dependabot security updates* | Tu repositorio **no recibe las versiones nuevas del marco** y **no aparece en el [censo](02-glosario.md)** de quién lo usa |
| **El permiso de Dependabot sobre el repositorio del marco** | Es un ajuste **de la organización**, no del repositorio | Lo mismo que arriba, y es el más fácil de confundir porque se busca en el lugar equivocado |
| **Los dos secretos** | `Settings → Secrets and variables → Actions` | Ninguno frena las verificaciones. Sin el primero, el asistente no contesta en las propuestas; sin el segundo, la propuesta semanal del marco nace sin verificaciones y ella misma lo avisa |
| **Los nombres de [CODEOWNERS](02-glosario.md)** | Se comprueban contra la organización | Hay **tres** formas de que la revisión cruzada no exista y nada lo diga: un nombre mal escrito, un equipo vacío y un equipo sin permiso de escritura. GitHub no asigna a nadie, sin avisar |

---

## Paso 13 — Apagar el rojo esperado y quedar en verde · *20 minutos de trabajo real*

**Qué vas a hacer.** Resolver los **dos recuadros 🕳️** que el andamio dejó a
propósito, borrarlos, y enviar de nuevo.

**Qué copiar** (para ver cuáles quedan):

```bash
grep -rn "🕳" --include="*.md" .
```

**Qué vas a ver.** Los **dos recuadros 🕳️** que quedan, los dos en `AGENTS.md`.

Antes había un tercero en `.github/proteccion-main.md`, y ya no está porque la
herramienta del Paso 5 **reescribió ese archivo con lo que midió** de tu
repositorio en vez de dejarte el hueco. No lo busques.

**Qué hay que resolver en cada uno:**

1. `AGENTS.md`, `Antes del primer commit` — mirá la tabla de tecnologías y
   **borrá la fila** de lo que este proyecto no vaya a tener.
2. `AGENTS.md`, `reglas de este repo` — escribí las propias, o borrá el recuadro
   si todavía no hay ninguna.

**Cómo sabés que salió bien.** El comando de arriba **no imprime nada**, y el
siguiente envío deja todas las verificaciones en verde.

> **Cuidado con «no imprime nada».** Después del paso 5 existe una carpeta
> `node_modules` con miles de archivos, así que el comando tarda; y en la
> consola vieja de Windows el emoji no sobrevive a la lectura del archivo: **no
> encuentra nada y sale sin error**, que es justo lo que querías ver. Sin salida
> no prueba nada si la herramienta no sabe leer el carácter.

---

## Esto va a salir en rojo, y es normal

Cinco casos reales. Ninguno es un defecto de tu repositorio.

| Cuándo | Qué vas a ver | Por qué pasa | Qué hacer |
|---|---|---|---|
| Paso 8, si algo quedó sin formatear | `[warn] README.md` y `Code style issues found in the above file` | Al reemplazar los marcadores cambian los anchos del texto y las tablas quedan desalineadas | `corepack pnpm run format` y de nuevo. Pasa una sola vez |
| Paso 9, primera corrida | Un solo trabajo en rojo: «Sin marcadores del scaffold sin resolver» | Los dos recuadros 🕳️ que un humano tiene que resolver. Y **no se pueden resolver antes** del primer envío: uno de ellos manda pedirle al marco que genere su archivo, y para eso la receta que lo genera tiene que estar ya en la rama principal | Paso 13 |
| Si intentás enviar el esqueleto como propuesta en vez de directo | La [compuerta](02-glosario.md) de cobertura en rojo | Mide las líneas que una propuesta agrega sin pruebas, y el esqueleto entero son muchas | Enviar directo a la rama principal la primera vez, como dice el paso 9 |
| En el paso 5, un recuadro con `Update available` | No es rojo, pero parece un problema | Es la herramienta de la base de datos avisando que hay versión nueva | Nada. Las versiones nuevas llegan como propuesta revisable |
| Semanas después, si elegiste Supabase y el proyecto estuvo quieto | Las pruebas fallan con un error **de conexión** que no dice «pausado» | El plan gratuito **pausa el proyecto tras una semana sin actividad** | Despertarlo desde su panel. Si el proyecto va a tener rachas, está escrito qué decidir en [`plantilla/infra/adaptadores.md`](../plantilla/infra/adaptadores.md) |

---

## Cuánto tarda todo

| Tramo | Tiempo |
|---|---|
| Pasos 0 a 2 — comprobar, traer el marco, crear el repositorio | **unos 5 minutos** |
| Pasos 3 y 4 — contestar las decisiones y revisarlas | **de 10 minutos a dos días**, y lo que lo estira no es escribir: es decidir y esperar a otra gente |
| Pasos 5 y 8 — armar, bajar piezas y comprobar | **unos 40 segundos de máquina** *(medido: 25 s el 5 y 13 s el 8)* |
| Paso 6 — entender qué hizo el arranque | **5 minutos de lectura tuya**, y no hay nada que correr |
| Paso 7 — verlo andando en tu navegador | **3 minutos**, y es la primera vez que ves algo |
| Pasos 9 a 13 — llenar la portada, enviar, proteger, ajustar y quedar en verde | **una hora y cuarto**: 20 minutos de escribir lo que solo vos sabés, el resto en pantallas de GitHub |

**La lectura honesta:** lo mecánico no se mide en días —son segundos—, y lo que
ocupa el día es **decidir** y **esperar a otra gente**. Si alguien te pide una
estimación, la respuesta útil no es un número: es esta lista.

---

## Si algo sale mal y necesitás pedir ayuda

**No hace falta que cuentes de memoria lo que decía el error.** Cada corrida de
la herramienta del Paso 5 deja una copia de todo lo que salió por pantalla, y la
última línea te dice dónde quedó:

```
Todo esto quedó copiado en un archivo, para que puedas pedir ayuda mandándolo en vez
de contar de memoria lo que decía:
  /ruta/a/tu-proyecto/bitacora-del-arranque.txt
```

Ese archivo es lo que hay que mandar. Trae, además del texto de la pantalla, los
datos que hacen falta para entender un rojo ajeno: **tu sistema operativo, tu
versión de Node, la versión del marco y las banderas con las que corriste**. Sin
eso, la mitad de las preguntas que te van a hacer son justamente ésas.

**No lleva secretos.** Esta herramienta no recibe ninguno —las claves de acceso
se guardan en GitHub, no en el archivo de respuestas— y la copia no agrega nada
que la pantalla no te haya mostrado ya. Por eso se puede mandar sin leerla entera.

**Dos cosas que conviene saber:**

- **Si la corrida salió bien**, la copia queda dentro de tu proyecto y el andamio
  la ignora en git, así que no viaja en tu primer envío.
- **Si la corrida falló**, queda en la carpeta temporal del sistema y **no** en tu
  proyecto: un fallo tiene que dejar la carpeta como estaba, entre otras cosas
  para que puedas reintentar sin borrar nada. La ruta completa está impresa.

**Lo que ese archivo NO trae** es la salida de `pnpm` y `openspec`, que se
imprime en vivo con su barra de progreso. Si el rojo fue de uno de ellos,
copiala de tu terminal: el archivo te dice cuál de los pasos la produjo.

---

## Si algo no coincide con lo que dice acá

Esta página se escribió **mirando la pantalla**, no de memoria: los textos de
ejemplo salieron de una corrida real del 2026-08-25. Aun así, el marco cambia, y
lo que primero se mueve es la lista de pendientes del paso 5, porque cada cosa
que se automatiza sale de ahí.

**La regla:** manda lo que la herramienta imprime, después
[05-arrancar-tecnico.md](05-arrancar-tecnico.md), y al final esta página. Si
encontrás una diferencia, **anotala** con la plantilla de
[`plantillas/registro-de-friccion.md`](plantillas/registro-de-friccion.md): así
es como esta guía se corrige, y no adivinando.

---

## Paso 14 — Averiguar cómo sale de tu máquina · *2 minutos*

**Qué vas a hacer.** Llegaste hasta acá con un repositorio en verde, y falta la
pregunta que motivó todo: **¿cómo lo ve otra persona?** La respuesta depende de
qué elegiste construir en el Paso 3, y conviene saberla ahora y no después de
buscar un botón que no está. Este paso no publica nada: te dice cuál de los dos
caminos te tocó.

**Qué copiar** (en la carpeta de tu proyecto):

```bash
grep '"forma"' .projects-valores.json
```

**Qué vas a ver.** Una sola línea, con una de estas dos palabras:

```
  "forma": "sitio",
```

```
  "forma": "aplicacion",
```

Qué significa cada una:

| Si dice | Qué pasa |
| --- | --- |
| `"sitio"` | Ya trae todo lo necesario para publicarse. Faltan **cuatro actos humanos de una sola vez**: abrir una cuenta de Cloudflare (gratis), registrar el subdominio, crear una credencial y guardarla en GitHub |
| `"aplicacion"` | El marco **todavía no reparte un paso que publique**. Se levanta en tu máquina con `pnpm dev`, y el día que ese paso exista llega solo, subiendo la versión del marco |

**Cómo sabés que salió bien.** Sabés cuál de las dos te tocó, y por lo tanto si
te queda trabajo por hacer o no. Las dos respuestas son buenas: ninguna de las
dos es un error de tu proyecto.

**Y ahora sí, el paso a paso: [10-publicar.md](10-publicar.md)**, la última
página del camino. Ahí está lo que más fácil se hace mal —hay dos tipos de
credencial de Cloudflare y la equivocada falla por permisos, con un error que no
dice cuál era la correcta— y cómo **ensayar la publicación sin tener cuenta
todavía**.

> **Una cosa que conviene saber desde hoy**, aunque no publiques nunca: el paso
> de publicación corre **sólo cuando las verificaciones terminan en verde** sobre
> `main`. Si algún día publicaste y después dejaste de ver tus cambios, lo
> primero que hay que mirar no es Cloudflare: es la pestaña **Actions**.

---

## Si querés seguir

- [01-introduccion.md](01-introduccion.md) — qué es esto y por
  qué existe, cuánto cuesta y qué decisiones te va a pedir.
- [02-glosario.md](02-glosario.md) — cada palabra propia del marco en una línea.
- [08-descubrimiento.md](08-descubrimiento.md) — el tramo siguiente: de una idea
  a un documento que dice qué hay que construir.
- [10-publicar.md](10-publicar.md) — el último tramo: cómo sale a una dirección
  donde entra la gente.
- [06-para-el-po.md](06-para-el-po.md) — si además vas a aprobar cambios: qué te toca
  y con qué cuatro preguntas se devuelve uno.
- [05-arrancar-tecnico.md](05-arrancar-tecnico.md) — la misma ruta, en versión
  técnica y completa.
