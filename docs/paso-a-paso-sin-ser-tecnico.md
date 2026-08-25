# Hacelo conmigo: arrancar un proyecto, paso a paso

**Para quién es esta página.** Para quien no es técnico y tiene que **hacerlo
igual**: copiar comandos, mirar la pantalla y saber si salió bien. Su hermana
[empezar-sin-ser-tecnico.md](empezar-sin-ser-tecnico.md) contesta *qué es esto y
por qué existe*; ésta contesta *qué escribo, en qué orden, y cómo sé que
funcionó*.

**La regla de esta página** es la misma que la de su hermana: ninguna palabra
técnica aparece sin explicarse acá mismo o sin enlazar al
[glosario](glosario.md), donde cada palabra propia del marco tiene una línea.
Hay una comprobación automática que lo mide en cada cambio.

**Palabras del marco que vas a ver acá, cada una definida en una línea:**
[andamio](glosario.md), [marcador](glosario.md), [ci-ok](glosario.md),
[compuerta](glosario.md), [CODEOWNERS](glosario.md), [constitución](glosario.md),
[change](glosario.md), [proposal](glosario.md), [spec](glosario.md),
[PO](glosario.md), [builder](glosario.md), [pin](glosario.md),
[bump](glosario.md), [censo](glosario.md), [ruleset](glosario.md),
[scaffold](glosario.md), [guardrail](glosario.md),
[veredicto agregado](glosario.md).

> **Esta página no es la única, y no es la más completa.** El paso a paso
> **técnico**, con las variantes de Windows, los comandos de comprobación contra
> GitHub y las trampas de cada fase, está en
> [arrancar-un-proyecto.md](arrancar-un-proyecto.md). Si algo de acá y algo de
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
| **Google Cloud** — contenedores | Sí, para crear la cuenta | 2 millones de peticiones por mes | La base de datos administrada **no** está en el plan siempre gratis: o se combina con Supabase, o se paga desde el primer día |
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

## Antes de empezar (2): los cuatro programas

Se instalan una vez en tu computadora y sirven para todos los proyectos.

| Programa | Para qué | Cómo se instala |
|---|---|---|
| **Git** | Guardar y enviar los cambios | [`git-scm.com`](https://git-scm.com) |
| **Node** | El intérprete con el que corre todo lo del marco | [`nodejs.org`](https://nodejs.org) — la versión con soporte de largo plazo |
| **pnpm** | El instalador de las piezas del proyecto. **No lo instalás aparte**: viene con Node y se enciende con `corepack` | Ver el paso 0 |
| **gh** | Hablar con GitHub desde la consola | [`cli.github.com`](https://cli.github.com) |

---

## Paso 0 — Comprobar que todo está · *2 minutos*

**Qué vas a hacer.** Preguntarle a cada programa su versión. Es la única forma
de no descubrir a mitad de camino que falta uno.

**Qué copiar** (una línea por vez):

```bash
git --version
node --version
gh auth status
corepack --version
```

**Qué vas a ver.** Un número de versión por cada uno. El tercero es distinto:
contesta con la cuenta de GitHub con la que estás dentro.

```
git version 2.50.1
v24.19.0
✓ Logged in to github.com account <tu-usuario>
0.35.0
```

**Cómo sabés que salió bien.** Los cuatro contestaron. Si `gh auth status` dice
que no estás dentro, corré `gh auth login` y volvé acá; si te lo salteás, el paso 1
falla con un **«no encontrado»** que parece un error de escritura en la ruta y
no lo es.

> **Node tiene un piso.** La herramienta de arranque exige una versión mínima y
> lo dice sola si no la alcanza, con la frase «esta herramienta necesita Node
> … o más nuevo». No hace falta que lo compruebes vos.

---

## Paso 1 — Traer el marco a tu computadora · *1 minuto*

**Qué vas a hacer.** Bajar una copia del repositorio del marco. Se hace **una
sola vez**, y sirve para todos los proyectos que arranques.

**Qué copiar:**

```bash
gh repo clone im-diego-ec/Projects
```

**Qué vas a ver.** Las líneas de la descarga y, al final, la carpeta creada.

**Cómo sabés que salió bien.** Existe una carpeta `Projects` y adentro hay un
archivo `README.md`. **Anotá dónde quedó**: en los pasos siguientes esa ruta se
escribe como `<ruta-al-clon>`.

> **No la pongas en una carpeta temporal.** El clon te sirve para todos los
> proyectos, no para éste, y en Windows la carpeta `/tmp` ni siquiera existe.

---

## Paso 2 — Crear el repositorio vacío · *2 minutos, más lo que tarde quien te lo apruebe*

**Qué vas a hacer.** Crear el repositorio en GitHub, vacío, y bajarlo a tu
computadora. La herramienta del paso 5 **no crea repositorios**: escribe adentro
de uno que ya existe.

**Qué copiar** (cambiá `<org>` y `<proyecto>` por los tuyos):

```bash
gh repo create <org>/<proyecto> --private --clone
cd <proyecto>
```

> **Qué va en cada uno, para no tener que preguntarlo.** En `<org>` va la
> organización de GitHub donde vive el repositorio. **Si arrancás solo, sin
> organización, ahí va tu propio nombre de usuario de GitHub** — el que aparece
> arriba a la derecha cuando entrás a github.com, y el mismo que te muestra
> `gh api user --jq .login`. En `<proyecto>` va el nombre del repositorio: en
> minúsculas y con guiones en vez de espacios.

**Qué vas a ver.** La dirección del repositorio recién creado y, después, la
descarga de una carpeta vacía.

**Cómo sabés que salió bien.** Estás parado adentro de la carpeta del proyecto y
está vacía salvo por la carpeta oculta `.git`.

---

## Paso 3 — Pedir la hoja de decisiones · *1 minuto*

**Qué vas a hacer.** Generar un archivo con **una casilla por cada decisión** que
una plantilla no puede adivinar. Son 21.

**Qué copiar:**

```bash
node <ruta-al-clon>/herramientas/projects-init.mjs --ejemplo > valores.json
```

**Qué vas a ver.** Nada en pantalla: la hoja se escribió en el archivo. Abrilo y
vas a encontrar esto, con valores de ejemplo ya puestos:

```json
{
  "PROYECTO": "people-agenda",
  "ORG": "Ejemplo-Org",
  "PAQUETE_API": "api",
  "PAQUETE_WEB": "web",
  "PAQUETE_E2E": "e2e",
  "GENERAR_CLIENTE_DATOS": "prisma generate",
  "EQUIPO_BUILDERS": "builders",
  "EQUIPO_PO": "po",
  "...": "y trece más"
}
```

**Cómo sabés que salió bien.** El archivo `valores.json` existe y empieza con
`{`.

---

## Paso 4 — Llenar las 21 decisiones · *de media hora a dos días*

**Qué vas a hacer.** Reemplazar cada valor de ejemplo por el de tu proyecto.
**Éste es el paso largo**, y no por escribir: dos de las casillas dependen de
otra persona —el nombre del equipo que revisa y el del [PO](glosario.md)— y ésas
se piden **el primer día**, no el último.

**Dónde está escrito qué va en cada una.** En
[`plantilla/README.md`](../plantilla/README.md), sección 2: una fila por casilla,
con un ejemplo y el caso raro de cada una. Es la lista que manda.

**Qué copiar.** Nada, y es el único paso donde no hay nada que copiar: éste se
escribe. Abrí `valores.json` con cualquier editor de texto, cambiá el valor que
está a la derecha de cada dos puntos y **no toques lo que está a la izquierda**,
que es el nombre de la casilla. Dejá las comillas y las comas donde están.

**Qué vas a ver.** El mismo archivo del paso 3, con tus valores en vez de los de
ejemplo: `"PROYECTO": "el-nombre-de-tu-proyecto"` en vez de
`"PROYECTO": "people-agenda"`, y así con las 21. Ninguna casilla queda vacía y
ninguna dice todavía `Ejemplo-Org`.

**Cómo sabés que salió bien.** No lo sabés todavía: lo dice el paso 5. Si dejás
una casilla vacía o de más, la herramienta **no escribe nada** y te nombra la
que falta.

> **Las cuentas y los dominios de ejemplo son inventados a propósito.** En el
> marco no se escriben datos reales de ningún proyecto: los números de cuenta
> de los ejemplos son `111111111111` y `222222222222`.

---

## Paso 5 — Armar el repositorio y dejarlo en verde, de un tirón · *25 segundos (medido)*

**Qué vas a hacer.** Un solo comando que hace **dos cosas seguidas**: copia el
[andamio](glosario.md) —el árbol de archivos con el que nace un proyecto—
reemplazando cada [marcador](glosario.md) por tu valor, y después **arranca el
proyecto**: baja las piezas, arma el cliente de la base de datos, ordena el texto
y corre todas las verificaciones.

**Qué copiar** (parado en la carpeta del proyecto; el punto final significa
«acá»):

```bash
node <ruta-al-clon>/herramientas/projects-init.mjs --valores valores.json --destino .
```

**Qué vas a ver.** Mucho texto, y está bien. Va en tres tramos, en este orden:

```
escritos 75 archivos, 196 ocurrencias sustituidas
cero marcadores sobrevivientes

ARRANQUE con corepack pnpm en /ruta/a/tu/proyecto — 4 pasos, la salida de cada uno tal cual sale:

── 1/4  instalar las dependencias  (corepack pnpm install)
── 2/4  generar el cliente de la capa de datos  (corepack pnpm run datos)
── 3/4  formatear el arbol  (corepack pnpm run format)
── 4/4  verificar el proyecto entero  (corepack pnpm run verificar)

LISTO, y el proyecto quedo arrancado y en verde. Lo que sigue NO lo puede hacer esta herramienta:
...
```

Entre una línea `── n/4` y la siguiente va **la salida cruda de esa herramienta,
tal cual sale**: listas de piezas, nombres de archivo, resúmenes de pruebas. No
hace falta que la entiendas; hace falta que llegues a la línea siguiente.

**Cómo sabés que salió bien.** Por **cuatro señales**, en este orden:

1. La segunda línea dice **`cero marcadores sobrevivientes`**. Si dijera otra
   cosa, quedaron huecos sin rellenar y están nombrados uno por uno.
2. Aparecieron los **cuatro** encabezados `── n/4`, del 1 al 4.
3. En ninguna parte aparece **`[ELIFECYCLE] Command failed`**. Ésa es la palabra
   a buscar cuando algo se corta.
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
> los pasos 8 a 12 de esta página son exactamente esa lista, contada despacio.
> La herramienta la imprime porque **no puede hacerla ella**: son decisiones y
> actos humanos, no transcripción.

**Si algo sale mal**, la herramienta **no deja el repositorio a medias en
silencio**: aborta antes de escribir y dice qué falta. Los tres avisos que vas a
ver, si los ves, son claros: falta un valor, sobra un valor, o la carpeta ya
tenía archivos del andamio (y entonces te dice cuáles).

---

## Paso 6 — Los cuatro pasos del arranque, uno por uno · *5 minutos de lectura*

**Qué vas a hacer.** Entender qué hizo cada uno de los cuatro. No es curiosidad:
son los mismos cuatro que vas a volver a correr cada vez que toques algo, y los
mismos que GitHub va a correr sobre tu cambio.

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
> que el marco llama un [bump](glosario.md)—.

---

## Paso 7 — Volver a comprobarlo cada vez que toques algo · *13 segundos (medido)*

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

> **Cuándo lo vas a necesitar de verdad:** después del paso 12, cuando edites el
> `README.md` a mano. Medido hoy: cambiar el ancho de una celda de una tabla
> alcanza para que la etapa del formato salga roja con `[warn] README.md` y
> `Code style issues found in the above file`. **No es un defecto**: se arregla
> con `corepack pnpm run format` y volvés a correr esto.

---

## Paso 8 — El primer envío va DIRECTO a la rama principal · *5 minutos*

**Qué vas a hacer.** Guardar todo el esqueleto y enviarlo. **Sin propuesta de
cambio y sin revisión**, y ésta es la única vez que eso está bien.

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
> - La [compuerta](glosario.md) de cobertura mide **las líneas que una propuesta
>   agrega sin pruebas**. Este primer guardado agrega el esqueleto entero: por el
>   camino normal saldría roja; enviada directo a la rama principal, contesta
>   `NO APLICABLE`.
> - El [veredicto agregado](glosario.md) —la única verificación que la rama
>   principal va a exigir, y que se llama [`ci-ok`](glosario.md)— **no aparece en
>   la lista de GitHub hasta que haya corrido una vez**. O sea que la protección
>   del paso 10 no se puede encender antes de este envío.
>
> El orden es: enviar → que corran las verificaciones → **recién ahí** proteger
> la rama → y desde ese momento, todo por propuesta.

---

## Paso 9 — Mirar las verificaciones, y esperar un rojo · *4 minutos de reloj*

**Qué vas a hacer.** Abrir la pestaña **Actions** del repositorio y mirar la
corrida. Va a haber **un rojo**, y es el rojo correcto.

**Qué copiar** (si preferís no salir de la consola):

```bash
gh run watch
```

**Qué vas a ver.** Una lista de trabajos con su tilde o su cruz. Todos en verde
menos uno: **«Sin marcadores del scaffold sin resolver»**.

**Cómo sabés que salió bien.** Que el único rojo sea ése. Cualquier otro rojo sí
es un problema, y el paso 12 te dice adónde ir.

---

## Paso 10 — Proteger la rama principal · *10 minutos*

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
[`ci-ok`](glosario.md) — **ninguna otra**.

> **Encendé 4 de las 8 reglas, no las 8.** Exigir aprobación + revisión del
> dueño de la ruta + nadie que pueda saltarse la regla, **con un equipo de una
> sola persona, deja el repositorio sin ninguna forma de integrar nada**. Las
> otras cuatro se dejan **declaradas como diferidas, con su motivo escrito**;
> eso es una regla del marco: lo que se decide no activar se declara, nunca se
> omite en silencio.

---

## Paso 11 — Los cinco ajustes que nadie extraña · *15 minutos*

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
| **Las seis etiquetas `area:*`** | Se crean con los seis comandos que la herramienta te imprimió al final del paso 5 | La [constitución](glosario.md) las exige y un repositorio nuevo nace sin ninguna |
| **Dependabot, en tu repositorio** | `Settings → Advanced Security` → *Dependency graph* y *Dependabot security updates* | Tu repositorio **no recibe las versiones nuevas del marco** y **no aparece en el [censo](glosario.md)** de quién lo usa |
| **El permiso de Dependabot sobre el repositorio del marco** | Es un ajuste **de la organización**, no del repositorio | Lo mismo que arriba, y es el más fácil de confundir porque se busca en el lugar equivocado |
| **Los dos secretos** | `Settings → Secrets and variables → Actions` | Ninguno frena las verificaciones. Sin el primero, el asistente no contesta en las propuestas; sin el segundo, la propuesta semanal del marco nace sin verificaciones y ella misma lo avisa |
| **Los nombres de [CODEOWNERS](glosario.md)** | Se comprueban contra la organización | Hay **tres** formas de que la revisión cruzada no exista y nada lo diga: un nombre mal escrito, un equipo vacío y un equipo sin permiso de escritura. GitHub no asigna a nadie, sin avisar |

---

## Paso 12 — Apagar el rojo esperado y quedar en verde · *20 minutos de trabajo real*

**Qué vas a hacer.** Resolver los **tres recuadros 🕳️** que el andamio dejó a
propósito, borrarlos, y enviar de nuevo.

**Qué copiar** (para ver cuáles quedan):

```bash
grep -rn "🕳" --include="*.md" .
```

**Qué vas a ver.** Tres resultados: dos en `AGENTS.md` y uno en
`.github/proteccion-main.md`.

**Qué hay que resolver en cada uno:**

1. `AGENTS.md`, `Antes del primer commit` — mirá la tabla de tecnologías y
   **borrá la fila** de lo que este proyecto no vaya a tener.
2. `AGENTS.md`, `reglas de este repo` — escribí las propias, o borrá el recuadro
   si todavía no hay ninguna.
3. `.github/proteccion-main.md` — pasá los 🔴 a 🟢 con la fecha, y escribí el
   motivo de las reglas que dejaste diferidas.

**Cómo sabés que salió bien.** El comando de arriba **no imprime nada**, y el
siguiente envío deja todas las verificaciones en verde.

> **Cuidado con «no imprime nada».** Después del paso 6 existe una carpeta
> `node_modules` con miles de archivos, así que el comando tarda; y en la
> consola vieja de Windows el emoji no sobrevive a la lectura del archivo: **no
> encuentra nada y sale sin error**, que es justo lo que querías ver. Sin salida
> no prueba nada si la herramienta no sabe leer el carácter.

---

## Esto va a salir en rojo, y es normal

Cinco casos reales. Ninguno es un defecto de tu repositorio.

| Cuándo | Qué vas a ver | Por qué pasa | Qué hacer |
|---|---|---|---|
| Paso 7, si te saltaste el `format` del paso 6 | `[warn] README.md` y `Code style issues found in the above file` | Al reemplazar los marcadores cambian los anchos del texto y las tablas quedan desalineadas | `corepack pnpm run format` y de nuevo. Pasa una sola vez |
| Paso 9, primera corrida | Un solo trabajo en rojo: «Sin marcadores del scaffold sin resolver» | Los tres recuadros 🕳️ que un humano tiene que resolver. Y **no se pueden resolver todos antes** del primer envío: uno de ellos manda proteger la rama, y eso necesita que las verificaciones hayan corrido una vez | Paso 12 |
| Si intentás enviar el esqueleto como propuesta en vez de directo | La [compuerta](glosario.md) de cobertura en rojo | Mide las líneas que una propuesta agrega sin pruebas, y el esqueleto entero son muchas | Enviar directo a la rama principal la primera vez, como dice el paso 8 |
| En el paso 7, un recuadro con `Update available` | No es rojo, pero parece un problema | Es la herramienta de la base de datos avisando que hay versión nueva | Nada. Las versiones nuevas llegan como propuesta revisable |
| Semanas después, si elegiste Supabase y el proyecto estuvo quieto | Las pruebas fallan con un error **de conexión** que no dice «pausado» | El plan gratuito **pausa el proyecto tras una semana sin actividad** | Despertarlo desde su panel. Si el proyecto va a tener rachas, está escrito qué decidir en [`plantilla/infra/adaptadores.md`](../plantilla/infra/adaptadores.md) |

---

## Cuánto tarda todo

| Tramo | Tiempo |
|---|---|
| Pasos 0 a 3 — comprobar, traer el marco, crear el repositorio, pedir la hoja | **unos 6 minutos** |
| Paso 4 — llenar las 21 decisiones | **de media hora a dos días**, y depende de otras personas |
| Pasos 5 a 7 — armar, bajar piezas y comprobar | **menos de 30 segundos de máquina** *(medido: 1 s + 11 s + 13 s)* |
| Pasos 8 a 12 — enviar, proteger, ajustar y quedar en verde | **una hora**, casi toda en pantallas de GitHub |

**La lectura honesta:** lo mecánico no se mide en días —son segundos—, y lo que
ocupa el día es **decidir** y **esperar a otra gente**. Si alguien te pide una
estimación, la respuesta útil no es un número: es esta lista.

---

## Si algo no coincide con lo que dice acá

Esta página se escribió **mirando la pantalla**, no de memoria: los textos de
ejemplo salieron de una corrida real del 2026-08-25. Aun así, el marco cambia, y
lo que primero se mueve es la lista de pendientes del paso 5, porque cada cosa
que se automatiza sale de ahí.

**La regla:** manda lo que la herramienta imprime, después
[arrancar-un-proyecto.md](arrancar-un-proyecto.md), y al final esta página. Si
encontrás una diferencia, **anotala** con la plantilla de
[`plantillas/registro-de-friccion.md`](plantillas/registro-de-friccion.md): así
es como esta guía se corrige, y no adivinando.

---

## Si querés seguir

- [empezar-sin-ser-tecnico.md](empezar-sin-ser-tecnico.md) — qué es esto y por
  qué existe, cuánto cuesta y qué decisiones te va a pedir.
- [glosario.md](glosario.md) — cada palabra propia del marco en una línea.
- [para-el-po.md](para-el-po.md) — si además vas a aprobar cambios: qué te toca
  y con qué cuatro preguntas se devuelve uno.
- [arrancar-un-proyecto.md](arrancar-un-proyecto.md) — la misma ruta, en versión
  técnica y completa.
