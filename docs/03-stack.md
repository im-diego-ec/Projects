# El stack, en un solo sitio

**Qué contesta esta página.** Con qué tecnología corre esto, por qué esa y no
otra, y —lo que casi nunca está escrito— **quién decide cada pieza**: cuáles fija
el marco para todos y cuáles elige cada proyecto.

**Lo que esta página no trae es la lista de números de versión**, y es a
propósito. Los trae el comando de la última sección, leídos de los archivos que
los declaran. Si venís buscando «qué versión de X corre acá», bajá directamente
ahí.

Cuando una palabra del marco suene rara, está definida en una línea en el
[glosario](02-glosario.md).

**Para quién es esta página.** Para quien tiene que decidir, revisar o discutir
una pieza de tecnología: un builder, un arquitecto, y también quien evalúa si
esto obliga a pagar algo. **Es una página técnica**, y no evita el vocabulario:
lo que hace es dejarlo enlazado. Si lo que buscás es qué es el marco y qué te
va a pedir, empezá por
[01-introduccion.md](01-introduccion.md).

**Palabras del marco que vas a ver acá**, cada una definida en una línea:
[ADR](02-glosario.md), [builder](02-glosario.md), [carril](02-glosario.md),
[compuerta](02-glosario.md),
[constitución](02-glosario.md), [delta](02-glosario.md), [guardrail](02-glosario.md),
[marcador](02-glosario.md), [monorepo](02-glosario.md), [pin](02-glosario.md),
[referenciado](02-glosario.md), [reusable](02-glosario.md), [scaffold](02-glosario.md),
[spec](02-glosario.md), [veredicto agregado](02-glosario.md).

---

## La carta: qué vas a construir

**Ésta es la decisión que más cuesta si se toma tarde**, y es la primera. No es
sobre tecnologías —eso se deriva de acá— sino sobre **quién entra a lo que estás
construyendo y cómo llega**.

Son cuatro formas. Cada una trae un andamio distinto, y elegir bien acá te ahorra
mantener piezas que tu proyecto no usa.

| | Forma | Quién entra | Estado |
| --- | --- | --- | --- |
| **A** | Un sitio para leer | cualquiera, sin cuenta | ✅ **construida y probada** |
| **B** | Una aplicación detrás de una puerta | quien tiene usuario | 🕳️ falta construirlo — hoy te toca **B+** |
| **B+** | Lo mismo, con servidor propio | quien tiene usuario | ✅ **es lo que hay hoy** |
| **C** | Las dos cosas a la vez | ambos | → cae en A o en B, ver abajo |
| **D** | Una app que se instala en el teléfono | quien la baja de la tienda | 🕳️ falta construirlo |

> **La columna «estado» dice la verdad y va a cambiar.** Una forma marcada con
> 🕳️ está explicada acá pero **el asistente todavía no te la ofrece**, porque
> ofrecer una opción que después no funciona es peor que no ofrecerla. Cuando una
> forma esté construida y probada, aparece en las preguntas del asistente y esta
> tabla lo dice.

---

### A · Un sitio para leer

Páginas que alguien abre y lee: un blog, un manual, la web de un producto, un
catálogo. **Nadie se registra, nadie inicia sesión, nadie guarda nada.**

**Con qué se construye, y qué se midió.** Con **Astro**. Lo que sigue no es una
promesa del folleto: son las tres cifras que salieron de compilar un sitio recién
generado con esta forma.

```text
medido el 2026-08-26 sobre un proyecto recien generado

  la pagina compilada pesa       512 bytes
  etiquetas de programa            0
  archivos de JavaScript           0
```

Eso es lo que quiere decir «manda cero JavaScript por defecto», y por eso estas
páginas abren al instante.

**Por qué la elegirías.** Es la más barata de todas, en todo sentido: no hay base
de datos que mantener, no hay servidor que se caiga, no hay contraseñas que
proteger. Y las páginas se abren instantáneamente porque no hay nada que esperar
—la herramienta que trae esta forma, **Astro**, manda cero programa al navegador
por defecto y solo agrega lo justo donde de verdad hace falta interactividad—.
Además es lo único que aparece bien en Google y se previsualiza al compartir un
enlace.

**Qué te cuesta.** No hay botón de publicar. Cada corrección de un texto es un
cambio en el repositorio, no una edición en una pantalla de administración.

**El límite real, el que sorprende después.** El día que dos o tres personas
quieran escribir sin tocar código, vas a necesitar un gestor de contenido, y eso
es otro proyecto. En un sitio de una persona no molesta nunca; con tres autores
te lo piden a los dos meses.

---

### B · Una aplicación detrás de una puerta

La gente entra con usuario y contraseña y trabaja adentro un rato largo: un panel
de gestión, un inventario, un sistema interno, una herramienta de trabajo.

**Por qué la elegirías.** Se siente como un programa y no como un sitio: entrás
una vez y de ahí en adelante las pantallas cambian al instante, sin que la página
parpadee. Es la forma correcta para algo donde la gente **entra a hacer**, no a
leer.

**Qué te cuesta.** La primera visita se baja la aplicación entera antes de
mostrar algo. Con buena conexión son décimas de segundo y nadie lo nota; con mala
se nota.

**El límite real.** Ninguna de tus pantallas va a aparecer en Google, ni se va a
previsualizar cuando alguien comparta el enlace. Y **no se arregla con un
ajuste** — se arregla mudándose a otra forma, que es un proyecto entero. Si nadie
de afuera entra por un enlace, este límite no te toca jamás. Si algún día hay una
parte pública, te toca seguro: conviene decidirlo ahora.

**Y viene en dos sabores, que se deciden con una sola pregunta:** *¿va a haber
alguna vez una clave secreta de un tercero — cobrar con tarjeta, mandar mails,
hablar con un servicio que se paga?*

- **No** → **B**, sin servidor propio. El navegador habla directo con la base de
  datos, y lo que protege los datos son reglas escritas en la propia base. Menos
  piezas, menos cosas que se rompen. **Ojo: esta forma todavía no está
  construida** (🕳️ en la tabla de arriba). Mientras tanto te toca **B+**, que
  hace lo mismo y además trae el servidor — de más, pero funciona.
- **Sí** → **B+**, con servidor propio. Es lo que el andamio trae hoy: un
  programa aparte que guarda esas claves y habla con la base por vos.

---

### B+ · La misma aplicación, con servidor propio

Es **B**, más un programa aparte que corre del lado del servidor. Es lo que el
andamio trae hoy, y por eso es la única forma disponible mientras las otras se
construyen.

**Por qué la elegirías.** Porque hay algo que no puede vivir en el navegador de
tu gente: una clave secreta de un tercero. Cobrar con tarjeta, mandar mails,
hablar con un servicio que se paga — todo eso usa una clave que si viaja al
navegador, **la puede leer cualquiera**. El servidor propio es el lugar donde esa
clave vive sin que nadie la vea.

También la elegís si tu proyecto tiene que **moler** datos: procesar archivos
grandes, generar documentos, recorrer miles de filas. Eso no lo hace un navegador
y tampoco lo hace bien el plan gratuito de una plataforma sin servidor.

**Qué te cuesta.** Una pieza más que mantener, actualizar y que se puede caer. Y
una advertencia medida: si tu proyecto **no** tiene ninguna de esas dos
necesidades, este servidor no te da nada y te cobra todo — el que el andamio
reparte hoy son veintidós archivos para tres rutas de ejemplo, contra una base
que todavía no tiene ni una tabla.

**El límite real.** Los planes gratuitos de las plataformas sin servidor cortan
por **tiempo de procesador**, no por tiempo de reloj: esperar a la base no
cuenta, pero calcular sí. Si tu proyecto muele datos de verdad, esta forma sale
del plan gratuito, y conviene saberlo antes y no con la primera factura.

---

### C · Las dos cosas: una parte pública y una parte con llave

Una portada, precios, quizás un blog — y detrás, la aplicación de verdad.

**Y acá va un consejo en contra de agregar una opción**, porque es lo honesto:
**esto casi nunca es una tercera cosa.**

- Si la parte pública son **cuatro pantallas que casi no cambian**, esto es **B
  con cuatro páginas estáticas al lado**. Elegir una herramienta «mixta» es pagar
  complejidad sin cobrar beneficio.
- Si la parte pública **es** el producto —un medio, un catálogo grande— y la
  parte privada es un rincón, esto es **A con una puerta**.

La pregunta que desempata: *¿dónde está el producto de verdad, adelante o
atrás?*

---

### D · Una app que se instala en el teléfono

Con su ícono en la pantalla del celular y su ficha en la App Store y en Google
Play.

**Por qué la elegirías.** Porque tu producto necesita algo que un sitio web no
puede: estar en la pantalla de inicio como cualquier otra app, mandar avisos aun
cuando está cerrada, usar la cámara o el sensor de huella con todas sus
capacidades.

**Qué te cuesta, y esto es lo que más sorprende.** Dejás de ser solamente quien
programa. Lo que sigue lo deciden Apple y Google, no este marco, así que va con
la fecha en que se leyó de sus páginas —y conviene volver a mirarlo antes de
decidir, porque cambia sin avisarle a nadie:

```text
medido el 2026-08-26 en developer.apple.com y play.google.com

  Apple      USD 99 por AÑO, mientras quieras seguir en la tienda.
             No es una compra: es suscripción. Si dejás de pagar, tu app se va.
  Google     USD 25 una sola vez.
             Con cuenta PERSONAL: 12 personas reales instalando tu app
             y manteniendola puesta 14 dias seguidos antes de poder publicar.
```

Y tres cosas que no se miden en dinero:

- **Cada versión espera revisión humana**, incluida la corrección de una errata.
- **Tu identidad se vuelve pública.** Si te anotás como persona física, tu nombre
  legal aparece como vendedor.
- **No termina nunca.** Las tiendas exigen actualizarse a versiones nuevas del
  sistema con fecha límite, o tu app deja de aparecer.

**Lo bueno, y es más de lo que parece:** la herramienta de esta forma es **React
Native**, y no es «otro React» — **es el mismo React**. Quien sabe hacer la web
ya sabe la mayor parte. Lo que cambia no es el cerebro, es la mano: escribís
`<View>` y `<Text>` en vez de `<div>` y `<p>`.

**El consejo, y es en contra de elegir esto primero.** Nada de la suscripción, ni
de las personas que tienen que probarla, ni de la revisión, sirve para
**averiguar si alguien quiere tu producto**. El camino barato es hacer la web de
forma que se pueda **instalar en el teléfono** —se puede, y se ve con su ícono— y
construir la app de verdad el día que haya gente pidiéndola. Ese pedido ya pagó
la suscripción. Y como comparte React con la web, ese trabajo no se tira.

---

### Lo que el marco decide por vos, y lo dice

Un marco puede tener opiniones. Lo que no puede es tenerlas sin declararlas, así
que acá están: **TypeScript**, un solo gestor de paquetes, un solo comando de
verificación, **Vitest** para las pruebas, validación de todo dato que venga de
afuera, la base guarda las fechas en UTC, las bajas son lógicas, una sola base
por proyecto, y los secretos se resuelven al arrancar cada tarea y jamás se
copian al compilado.

**Tres preguntas que este marco decidió NO hacerte**, con el motivo:

| No se pregunta | Por qué |
| --- | --- |
| ¿React, Svelte o Vue? | Las tres hacen lo mismo y la diferencia no cambia nada de lo que tu producto hace. Cambiarla del lado del marco cuesta rehacer el revisor de estilo y todas las pruebas — es trasladarte un costo disfrazado de libertad |
| ¿Qué capa de datos? | No es contestable sin saber de la cocina. La pregunta honesta que hay detrás es «¿la seguridad la hace la base o tu servidor?», y ésa ya la contestaste al elegir entre **B** y **B+** |
| ¿Con qué corredor de pruebas? | Sin ninguna consecuencia para tu producto, y las dos opciones son gratis |

---

## Por qué esta página no escribe versiones

La respuesta a «¿con qué corre esto?» está repartida por el repositorio, y
ninguno de esos lugares está equivocado: el manifiesto de la raíz del andamio y
el de cada uno de sus paquetes, la imagen base del `Dockerfile` del API, los
inputs del workflow reusable que fijan las herramientas del pipeline, y el piso
de Node de la herramienta que instancia un proyecto. Son varios archivos, cada uno con su
dueño, y ninguno se lee entero de una sentada. Eso es lo que esta página viene a
cerrar: **el mapa está acá; los números siguen donde estaban.**

Copiarlos acá los convertiría en una declaración más — y sería la única sin nadie
que la actualice. Este repositorio ya se comió esa lección dos veces con cifras
escritas a mano: las del andamio en el `README.md`, que crecían con cada archivo
nuevo, y el conteo de filas del [glosario](02-glosario.md). Las dos terminaron
igual, y las dos se arreglaron igual: la prosa dice **dónde se mide**, y un banco
de pruebas se pone rojo cuando deja de ser cierto.

**La regla de esta página, y hay un banco que la sostiene:** fuera de los bloques
de comando no aparece ni un dígito. Quien necesita el número corre el comando;
quien necesita cambiarlo toca el archivo que lo declara. Nunca esta página.

---

## Lo que el marco fija, y por qué no es elección del proyecto

Cada fila de acá está fijada porque **cambiarla no es sustituir una herramienta:
es reescribir la mecánica que el marco reparte**. Ninguna nombra un proveedor de
infraestructura.

| Qué fija el marco | Qué significa en la práctica | Por qué no lo decide cada proyecto |
|---|---|---|
| **El contrato antes que el código** | El comportamiento se escribe como spec de OpenSpec y se aprueba antes de implementarlo | Es el único formato que las compuertas del marco saben leer: el guardrail de deltas compara la propuesta contra el contrato vigente. Otro formato es otro guardrail |
| **GitHub Actions como pipeline** | La mecánica de CI vive en un workflow reusable que el proyecto llama, no copia | El arreglo de un guardrail tiene que llegar a todos los repositorios sin que nadie edite nada. Eso es una propiedad del `uses:`, no de la herramienta genérica «CI» |
| **Un veredicto agregado único** | Un solo check decide si un cambio entra, y reporta siempre —haya compilado algo o no— | Nació de un incidente: exigir un check que solo reporta en un carril dejó el otro bloqueado una semana entera |
| **La gobernanza del repositorio** | Propiedad por rutas, protección de la rama principal, plantilla de propuesta de cambio y registro de cambios obligatorio | Es lo que hace que «se revisa antes de entrar» no dependa de que alguien se acuerde |
| **La distribución por versión exacta** | Cada proyecto apunta a una versión escrita del marco y recibe las nuevas como propuesta de cambio revisable | Un puntero que se mueve solo cambia el pipeline de todos sin diff y sin aviso |
| **Node como intérprete de la mecánica** | Todo lo que el marco ejecuta —sus validadores, sus lectores de manifiestos, su herramienta de arranque— corre con Node y sin instalar dependencias | El marco no tiene manifiesto propio: lo que reparte se ejecuta con lo que el runner ya trae. Agregar un intérprete es agregar algo que instalar en cada corrida de cada consumidor |
| **pnpm con workspaces en el andamio** | El CI que el andamio trae ejecuta pnpm directamente y **deriva de él** la lista de paquetes que hay que verificar | Cambiar de gestor no es cambiar un comando: hay que reescribir ese job y rehacer la garantía del lockfile único en la raíz |

Y una que se lee al revés, porque es la que más se malinterpreta: **el marco no
fija dónde se despliega.** Verifica **propiedades** —que dev se verifique antes
que producción, que los despliegues sobre un ambiente compartido se serialicen,
que lo desplegado se verifique, que los secretos se resuelvan al arrancar y no se
copien al build— y esas propiedades están escritas sin nombrar proveedor, en
[`openspec/specs/`](../openspec/specs/). Un proyecto que despliega en otro lado
sigue obligado a todas ellas.

Eso es también lo que hace posible una configuración de costo bajo o nulo: **el
marco no cobra nada y no obliga a contratar ningún servicio propio**. Todo lo que
ejecuta es GitHub Actions y herramientas de línea de comandos de código abierto,
sin licencia.

Lo que sí depende del plan de la cuenta de GitHub —y no es un solo matiz sino
tres— es la protección de la rama principal de un repositorio privado, el acceso
que hace falta para que un repositorio privado pueda consumir por `uses:` los
workflows de otro, y los minutos de Actions que un repositorio privado tiene
incluidos. Los tres están contados sin adorno, con lo que está medido y lo que
no, en [01-introduccion.md](01-introduccion.md).

---

## Lo que el andamio trae implementado

El [andamio](02-glosario.md) —el árbol que se copia una vez el día que nace el
repositorio— no llega con huecos: trae el esqueleto de aplicación funcionando,
con sus pruebas en verde y las compuertas del marco pasando. Estas son sus
piezas, capa por capa:

| Capa | Pieza | Por qué está |
|---|---|---|
| Frontend | React con TypeScript, Vite, Tailwind y shadcn/ui | Es la base que el área ya usaba, escrita a mano en cada proyecto hasta que empezó a divergir en los detalles |
| Backend | Node con TypeScript y Express | Lo mismo, y comparte intérprete con la mecánica del marco: una sola versión de Node que gobernar |
| Datos | PostgreSQL a través de Prisma | El esquema y las migraciones quedan versionados en el repositorio, que es lo que permite exigir que una migración pase por revisión |
| Identidad | Supabase Auth (la fila que `plantilla/AGENTS.md` todavía escribe como **Clerk**) | Verificación del token en el backend sin llamada de red por request, y un solo archivo del frontend —`web/src/auth.ts`— tocando el SDK del proveedor. **Fila en transición, y se dice de frente**: lo que el andamio INSTALA hoy es Supabase —`@supabase/supabase-js` en el frontend, `jose` en el API, y ninguna dependencia `@clerk/*` en ningún manifiesto—, mientras [`plantilla/AGENTS.md`](../plantilla/AGENTS.md) sigue congelando **Clerk** en su tabla. Mientras difieran manda **lo que declaran los manifiestos del andamio**, que es lo que el proyecto instala y ejecuta; la fila que hay que corregir es la de `plantilla/AGENTS.md`, y ese arreglo no es de esta página |
| Validación de input externo | Zod | Todo lo que entra de afuera se valida contra un esquema declarado, en vez de confiar en el tipo estático |
| Pruebas | Vitest para unidad e integración, Playwright para extremo a extremo | La cobertura del diff que el marco exige se mide sobre el reporte que Vitest emite |
| Empaquetado | Imagen de contenedor construida desde la raíz del monorepo | La arquitectura se declara en el `Dockerfile` en vez de heredarse de la máquina que construye |

**Esa tabla llega congelada, y quien la congela es
[`plantilla/AGENTS.md`](../plantilla/AGENTS.md)** —el archivo de constitución que
el proyecto hereda el día que nace—. Su tabla trae una fila más que esta: la de
la plataforma, que no aparece acá porque no la fija nadie del lado del marco.
Salvo esa, ninguna de sus filas es elección del proyecto: las fija el área y el
andamio las entrega implementadas.

Congelada no quiere decir jaula. Introducir un framework, un ORM, una base de
datos o un servicio que no esté en la tabla es una **decisión declarada** —se
pregunta antes de implementarla y queda escrita con su motivo—, no un accidente
que aparece en una propuesta de cambio. La diferencia importa: el marco no puede
impedir que un proyecto use otra cosa, y no lo intenta; lo que exige es que la
alternativa esté decidida y no encontrada.

Y si algún día esta página y `plantilla/AGENTS.md` dicen cosas distintas, **manda
`plantilla/AGENTS.md`**: es el que viaja al proyecto. Hay un caso del banco que
compara las dos y se pone rojo antes de que la divergencia llegue a nadie.

---

## Lo que elige el proyecto

- **Dónde se despliega**, y con qué proveedor. Es la única fila de la tabla
  congelada de [`plantilla/AGENTS.md`](../plantilla/AGENTS.md) que el proyecto
  elige, y la decisión con más impacto en el costo: por eso no la toma el marco.
- **Su dominio entero**: sus modelos, sus endpoints, sus pantallas. El marco no
  tiene una sola línea de código de aplicación, y eso también es una frontera
  escrita.
- **Los valores del repositorio**: cuentas, dominios, equipos, canal de alertas.
  Están enumerados uno por uno, con ejemplo y caso borde, en
  [`plantilla/README.md`](../plantilla/README.md).
- **Apartarse de una fila congelada**, por el camino que fija
  [`plantilla/AGENTS.md`](../plantilla/AGENTS.md): se pide, se decide y queda
  escrito. Eso no es elegir de nuevo — es cambiar una decisión que ya estaba
  tomada, y por eso cuesta más que la primera.

---

## Dónde se declara cada versión

Cada fila dice **qué archivo manda** sobre esa versión y bajo qué clave. La
tercera columna es la que decide quién la mueve, y esta página no la inventa:
sale de la tabla «Principio de distribución» del [`README.md`](../README.md),
que declara dónde vive cada forma.

- **Referenciado** es lo que el proyecto consume por `uses:` —lo que vive en
  `.github/workflows/` y en `actions/`—, así que subirlo acá lo sube para todos.
- **Scaffold** es lo que vive en `plantilla/`: se copia una vez y desde ese día
  es del proyecto.
- **No viaja** es la etiqueta que el README no tiene, porque no es una forma de
  distribución: el archivo no llega al proyecto de ninguna manera. Es el caso de
  la herramienta que se corre una sola vez, desde el clon del marco, para crear
  el repositorio. Llamarla «Referenciado» le prometería al proyecto una
  corrección que nunca va a recibir, porque de su lado no hay nada que corregir.

| Pieza | Dónde se declara | Forma |
|---|---|---|
| Node — los jobs del marco | `.github/workflows/marco-ci.yml` → `version_node` | Referenciado |
| Node — piso de la herramienta de arranque | `herramientas/projects-init.mjs` → `NODE_MINIMO` | No viaja |
| CLI de OpenSpec | `.github/workflows/marco-ci.yml` → `version_openspec` | Referenciado |
| actionlint — validador de los pipelines | `.github/workflows/marco-ci.yml` → `version_actionlint` | Referenciado |
| gitleaks — detector de secretos | `.github/workflows/marco-ci.yml` → `version_gitleaks` | Referenciado |
| Node — imagen del API | `plantilla/api/Dockerfile` → `node:` | Scaffold |
| pnpm | `plantilla/package.json` → `packageManager` | Scaffold |
| TypeScript | `plantilla/api/package.json` → `typescript` | Scaffold |
| React | `plantilla/web/package.json` → `react` | Scaffold |
| Vite | `plantilla/web/package.json` → `vite` | Scaffold |
| Tailwind | `plantilla/web/package.json` → `tailwindcss` | Scaffold |
| Express | `plantilla/api/package.json` → `express` | Scaffold |
| Prisma | `plantilla/api/package.json` → `@prisma/client` | Scaffold |
| Driver de PostgreSQL | `plantilla/api/package.json` → `pg` | Scaffold |
| Identidad — verificación del token en el API | `plantilla/api/package.json` → `jose` | Scaffold |
| Identidad — frontend | `plantilla/web/package.json` → `@supabase/supabase-js` | Scaffold |
| Zod | `plantilla/api/package.json` → `zod` | Scaffold |
| Vitest | `plantilla/api/package.json` → `vitest` | Scaffold |
| Playwright | `plantilla/e2e/package.json` → `@playwright/test` | Scaffold |
| Astro | `plantilla/sitio/package.json` → `astro` | Scaffold |
| ESLint | `plantilla/package.json` → `eslint` | Scaffold |
| Prettier | `plantilla/package.json` → `prettier` | Scaffold |

> **Astro solo viaja con una de las formas.** Su fila dice `Scaffold` como las demás
> porque así es como se distribuye —el andamio lo copia al proyecto—, pero el andamio
> lo copia **únicamente** cuando la forma elegida es «un sitio para leer». En las otras
> formas la carpeta `sitio/` no llega, igual que `infra/` no llega cuando la plataforma
> no es AWS.

**Lo que esta tabla no cubre, declarado.** Terraform aparece en el andamio como
infraestructura como código —con su piso de versión en el `main.tf` de cada
raíz— y el pipeline del marco le corre formato y validación **si el repositorio
tiene raíces de Terraform**; no las exige. Como la plataforma es del proyecto,
esa fila no se fija acá. Tampoco están las dependencias transitivas: lo que
acota el árbol que baja el CLI de OpenSpec es el input `huella_openspec` del
workflow reusable, que se declara y se compara, no una versión más en esta tabla.

---

## Cómo leer los números de hoy

Desde la raíz del repositorio, sin instalar nada:

```bash
node pruebas/docs/versiones.mjs
```

Imprime una línea por fila de la tabla de arriba: la pieza, el archivo y la clave
de donde salió, y **el valor que ese archivo declara en este momento**. Si alguna
fila no resuelve —el archivo se movió, la clave dejó de declararse— lo dice y
sale con código de error, en vez de imprimir una tabla con un hueco.

Ese mismo comando es la respuesta a «¿esta página sigue siendo cierta?». No hace
falta creerle: se corre.

---

## Qué vigila el banco de pruebas

Vive en [`pruebas/docs/stack.test.mjs`](../pruebas/docs/stack.test.mjs) y corre
en cada propuesta de cambio, junto con el resto del banco del marco. Esto es lo
que pone en rojo:

1. **Una fila que apunta a un archivo que no existe.** La pieza se movió o se
   fue del andamio, y la página quedó afirmándola.
2. **Una fila cuya clave ya nadie declara.** Es el caso que más se da: alguien
   saca una dependencia y la página sigue diciendo que está.
3. **Un dígito en la prosa.** O sea, una versión escrita a mano. El mensaje del
   fallo trae el arreglo: nombrá el archivo que la declara, no el número.
4. **Una forma de distribución que no concuerda con dónde vive el archivo.** La
   forma que se espera **se lee de la tabla «Principio de distribución» del
   `README.md`**, no de la ruta que la fila escribe. Esa distinción es el caso
   entero: derivarla de la misma celda que se está comprobando solo cazaría un
   tipeo, nunca una fila clasificada mal.
5. **Que los paquetes del monorepo que la tabla toca sean exactamente los que
   declara** [`plantilla/pnpm-workspace.yaml`](../plantilla/pnpm-workspace.yaml),
   en las dos direcciones. No hay una lista escrita: los paquetes se derivan de
   las rutas de la propia tabla, así que un paquete nuevo sin fila —o una fila
   que apunta a un paquete que ya no está en el workspace— es rojo.
6. **Que la tabla del andamio nombre todas las herramientas que
   [`plantilla/AGENTS.md`](../plantilla/AGENTS.md) congela.** Es el archivo que
   el proyecto hereda; una pieza que él fija y esta página no cuenta son dos
   documentos diciendo cosas distintas, que es exactamente el defecto que esta
   página vino a cerrar.
7. **Que «Lo que elige el proyecto» no nombre ninguna de esas herramientas
   congeladas.** Ahí solo va lo que de verdad decide el proyecto. Poner una fila
   congelada en esa lista le dice a un equipo que puede cambiarla sin pedir nada,
   y no es cierto.
8. **Que esta página esté enlazada** desde el `README.md` del repositorio y desde
   el [índice de esta carpeta](README.md). Una página que nadie encuentra es una
   página que no existe.
9. **Que ningún spec vivo del marco nombre un proveedor**, y que el `README.md`
   tampoco lo haga al enumerar lo que el marco fija. Es la propiedad en la que se
   apoya todo lo demás: si un requisito nombrara la topología, un proyecto que
   despliega en otro lado no podría cumplirlo por bien que lo hiciera, y el marco
   estaría fijando la plataforma sin decirlo. La lista de nombres vigilados
   incluye los valores de plataforma que `plantilla/AGENTS.md` admite, que son
   justamente los que más chance tienen de volver, y no distingue mayúsculas.
10. **Un número de versión escrito a mano en el ejemplo del `README.md`.** Es
    esta misma regla aplicada afuera: el README manda apuntar al marco por
    versión exacta, escribe el marcador cuando lo explica, y su bloque de ejemplo
    traía un pin que ya nadie movía. El marcador no envejece; la versión vigente
    la declara el `ci.yml` que trae el andamio.

Y cada una de ellas se **vio fallar**: se rompió la condición a propósito —una
versión escrita a mano, una fila que apunta a un archivo borrado, un proveedor
devuelto al `README.md`, un paquete nuevo sin fila, una herramienta congelada
sacada de la tabla— y se comprobó que la comprobación correspondiente la señala,
nombrándola. Una guarda que nunca falló no verifica nada.

**Lo que el banco no puede decir:** si la pieza elegida es la correcta. Que la
página siga siendo cierta no la vuelve una buena decisión — eso lo discute el
equipo, y cuando la decisión es estructural queda escrita como
[ADR](adr/README.md).
