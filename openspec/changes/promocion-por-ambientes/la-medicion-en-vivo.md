# Lo que hay que hacer a mano, paso a paso

> **Para Diego.** Son dos cosas independientes: podés empezar por cualquiera. La
> primera cuesta **cero dólares** y desbloquea la mitad del trabajo que queda; la
> segunda valida todo lo que ya está escrito.
>
> Cada paso dice **qué vas a ver si salió bien** y **qué significa si sale mal**. Un
> paso sin eso no es un paso: es un deseo.

---

## A · La medición de Hyperdrive — cero dólares, ~20 minutos

**Qué se está midiendo, en una línea:** si Cloudflare puede hablarle a una base de
Supabase del plan gratuito. De eso depende que la mitad API de una aplicación pueda
correr por 0 USD/mes en vez de pagar otro proveedor.

**Por qué puede fallar:** Cloudflare dice usar la cadena *Direct connection* de
Supabase, y en el plan gratuito esa cadena es **IPv6**. Si no la alcanza, la salida
es usar el *pooler*, que es IPv4 en todos los planes. **Si falla, no cambiás de
proveedor: cambiás de cadena.**

### A1 · Tener un proyecto de Supabase

Si ya tenés uno, salteá esto.

1. Entrá a `supabase.com` y creá una cuenta.
2. Creá un proyecto. **Anotá la contraseña de la base que te pide**, en algún lado
   donde la puedas copiar y pegar: la vas a necesitar en A2, y **no se puede
   recuperar después** — sólo resetear.
3. Esperá a que termine de aprovisionar.

**Salió bien si:** el proyecto aparece como *Active*.

> **Ojo con el plan gratuito:** permite **dos** proyectos activos y los **pausa a la
> semana** sin uso. Si vas a tener dev y prod, son los dos.

### A2 · Copiar las dos cadenas de conexión

En tu proyecto, apretá **Connect**, arriba de la página. Ésa es la ruta que la
documentación da, y es una sola. Vas a ver varios métodos; necesitás **dos**:

- **Direct connection** — la que Cloudflare dice usar. Es la que puede ser IPv6.
- **Shared pooler, session mode** — la alternativa si la primera falla.

> Si los rótulos no dicen exactamente eso, **buscá las palabras «direct» y «session»**:
> los nombres del panel cambiaron más de una vez. Hay también un *transaction mode* y
> un *dedicated pooler*: no son los que necesitamos.

**Copiá las dos a un archivo temporal.** No las pegues en un chat, ni en un issue, ni
las commitees.

**Ojo, esto es lo que más se rompe.** La cadena que copiás trae el texto
`[YOUR-PASSWORD]` en el medio, **corchetes incluidos** — no trae tu contraseña.
Reemplazá ese pedazo, corchetes y todo, por la contraseña que anotaste en A1. **En
las dos cadenas.**

**Salió bien si:** tenés dos cadenas que empiezan con `postgresql://`, son distintas
entre sí, y **en ninguna aparece la palabra `PASSWORD` ni un corchete `[`**. Si ves un
corchete, todavía no terminaste este paso.

> Por qué insisto: si dejás el marcador, A3 falla con un error de autenticación y vas
> a anotar «falló la medición» cuando lo que falló fue un copiar-pegar. Es el error más
> caro de toda esta guía, porque da una respuesta falsa a la pregunta que estamos
> midiendo.

### A3 · Crear el binding de Hyperdrive con la cadena *Direct*

> **Antes de A3 necesitás una cuenta de Cloudflare.** Si ya hiciste B1, ya está. Si
> empezaste por A, creala ahora en `cloudflare.com`: es gratis y tarda dos minutos.
> **No** necesitás tener un Worker creado, ni instalar nada, ni registrar el subdominio
> de B1 — Hyperdrive se crea solo, desde el panel.

1. En el panel de Cloudflare, andá a la página de **Hyperdrive** y creá una
   configuración nueva. *(La documentación dice «go to the Hyperdrive page»; si no la
   encontrás en el menú, buscá «Hyperdrive» en el buscador del panel.)*
2. Pegá la cadena **Direct connection** — la que ya tiene tu contraseña puesta.
3. Ponele un nombre que después reconozcas, por ejemplo `medicion-directa`.
4. Guardá.

**Salió bien si:** la configuración se crea y no da error de conexión.
**Esto es la medición.** Anotá el resultado.

**Si falla:** no es un problema tuyo ni del marco — es la incógnita que estamos
midiendo. **Anotá el mensaje Y el número de error si aparece**, porque distinguen dos
cosas muy distintas: «Cloudflare no llega a esa dirección» (lo que estamos midiendo) y
«la contraseña está mal» (un copiar-pegar de A2). Después pasá a A4.

> **Si abrís la página oficial de Cloudflare vas a ver un «Step 1 · Allow Hyperdrive
> access» con un `CREATE ROLE`. No lo necesitás para esta medición.** La misma página
> dice que se puede conectar con el usuario `postgres` que Supabase ya creó — que es el
> que viene adentro de la cadena que copiaste. El rol aparte es opcional, y el SQL que
> proponen le da los mismos privilegios de todos modos, así que no te compra nada acá.

### A4 · Sólo si A3 falló — reintentar con el pooler

Repetí A3 pegando la cadena del **Shared pooler, session mode** en vez de la directa.
**Poneles nombres distintos** —`medicion-directa` y `medicion-pooler`— y **no borres
la primera**: sirve de evidencia y no molesta.

> Crear configuraciones de Hyperdrive **no requiere plan pago**: está incluido en el
> plan gratuito de Workers, con un tope de **diez** bases configuradas por cuenta. Lo
> que el plan gratuito sí limita es el *uso*, y eso todavía no lo estamos tocando.

**Salió bien si:** se crea. Entonces la respuesta es «Hyperdrive sí, pero por el
pooler», y el andamio se escribe con esa cadena.

**Si también falla:** anotá el error textual. Esa es la respuesta que cierra la
medición, y cambia el proveedor de cómputo.

### A5 · Contarme el resultado

Con esto alcanza, y **no me mandes las cadenas**:

- ¿A3 funcionó, o hubo que ir a A4?
- Si falló, el mensaje de error **tal cual, con el número de error si lo trae**. Ese
  número es lo que separa «Cloudflare no llega» de «la contraseña está mal»; sin él, la
  medición queda sin responder aunque el paso se haya hecho.

Con eso se escribe el adaptador de la API y se cierra la mitad del trabajo que queda.

---

## B · El primer despliegue real — valida todo lo ya escrito

**Qué se está validando:** que el workflow de promoción que ya está escrito funcione
de verdad. Hoy tiene banco de forma, pero **nunca corrió contra Cloudflare**.

### B1 · Cuenta de Cloudflare y subdominio

1. Creá una cuenta en `cloudflare.com` si no tenés.
2. Andá a **Workers & Pages**. Tu cuenta tiene un subdominio propio —algo como
   `tu-nombre.workers.dev`— y ahí se ve cuál es. Si no elegiste ninguno todavía, la
   pantalla te deja hacerlo; si ya tenés uno, anotalo y seguí.

**Por qué este paso y no después:** todas las direcciones de este marco —la de prueba
y la de producción— cuelgan de ese subdominio. Si no está resuelto, la publicación
sube los archivos y la dirección no contesta. El workflow te lo va a decir, pero es
una vuelta perdida.

**Salió bien si:** en Workers & Pages ves cuál es tu subdominio.

### B2 · El identificador de cuenta

Cualquiera de las dos, la que te resulte más fácil:

- **La rápida:** entrá a cualquier página de tu cuenta en el panel y mirá la barra de
  direcciones del navegador. La URL tiene la forma
  `dash.cloudflare.com/<algo-largo>/...` — ese `<algo-largo>` **es** el Account ID.
- **La otra:** buscá «Account ID» en el panel; aparece con un botón de copiar al lado.

**Salió bien si:** tenés una cadena larga de letras y números, sin espacios.

### B3 · El token de API

1. En el panel, entrá a tu perfil y buscá **API Tokens**. Ahí, **Create Token**.
2. Buscá la opción llamada **Edit Cloudflare Workers**. Según en qué versión del panel
   caigas puede aparecer de dos formas: como una **plantilla** en la lista, o dentro de
   **Permission policies**, abriendo el desplegable **Custom**. Es el mismo nombre en
   las dos: **buscá el nombre, no la pantalla.**
3. Antes de crearlo, mirá **Account Resources**: tiene que decir **Include** y tu
   cuenta, la misma de la que copiaste el Account ID en B2. Si tenés una sola cuenta ya
   viene bien; si tenés varias, elegí a mano la correcta — un token apuntando a otra
   cuenta falla recién al desplegar, y el mensaje no te dice que es eso.
4. Creá el token y **copialo ahora**: no se vuelve a mostrar.

**Salió bien si:** tenés el token copiado.
**Por qué esa plantilla y no otra:** es la que alcanza para subir una versión **y
para promoverla**. Un token más amplio funciona, pero le da al pipeline permisos que
no necesita.

### B4 · Cargar los dos secretos en el repositorio del proyecto

En el repo de tu proyecto (no en el del marco): **Settings → Secrets and variables →
Actions**.

> **Esa pantalla tiene DOS pestañas: *Secrets* y *Variables*.** Tienen que ir en
> **Secrets**. Si los cargás en *Variables*, el workflow no los encuentra, sigue
> avisando en amarillo que faltan, y no hay nada que te diga por qué.

Apretá **New repository secret**, dos veces:

- `CLOUDFLARE_API_TOKEN` — el de B3
- `CLOUDFLARE_ACCOUNT_ID` — el de B2

**Los nombres van exactos.** El workflow los busca así.

**Salió bien si:** los dos aparecen listados.

> **Mientras no los cargues, nada se pone en rojo**: el paso avisa en amarillo qué
> falta. Eso es a propósito.

### B5 · Disparar la promoción y mirar las dos direcciones

Mergeá algo a `main`. Van a aparecer **dos corridas, una después de la otra**, y es a
propósito:

1. Primero corre **CI**, que verifica el commit. El despliegue no arranca hasta que CI
   termine en verde: publicar algo que no pasó las verificaciones es justo lo que este
   marco existe para impedir.
2. Cuando CI termina, aparece sola una segunda corrida llamada **desplegar**. **Ésa**
   es la que tenés que mirar: es la que tiene los jobs `dev` y `produccion`.

Si CI termina en rojo, `desplegar` **no arranca nunca** y no vas a ver una corrida
nueva. No es que falle en silencio: es la compuerta funcionando.

**Dónde se mira una corrida:** en tu repo, pestaña **Actions**. A la izquierda está la
lista de workflows; el que importa se llama **desplegar**. Clic en la corrida de más
arriba —la más nueva— para abrir su resumen. Los jobs (`dev`, `produccion`) están en la
columna izquierda: clic en cada uno para ver su log paso a paso.

> **Antes de buscar el botón «Run workflow»:** el archivo `desplegar.yml` tiene que
> estar mergeado en `main`. Mientras viva sólo en una rama, GitHub no muestra el botón
> y tampoco dispara nada solo. Si en Actions no ves el workflow **desplegar**, es eso, y
> no algo que hayas hecho mal.
>
> **Y la corrida a mano no se saltea la compuerta:** también exige que el commit tenga
> el check `ci-ok` en verde. En un repo recién estrenado eso todavía no pasó, así que lo
> normal es **mergear a `main` y dejar que se dispare solo**.

**Salió bien si ves, en este orden:**

1. El job **`dev`** termina en verde y en su resumen aparece una dirección
   `dev-…workers.dev`. **Abrila.** Tiene que mostrar tu sitio.
2. El job **`produccion`** termina en verde y su resumen dice *«Es la MISMA versión
   que pasó por DEV»*.

**Qué mirar si falla, y qué significa cada cosa:**

| Dónde falla | Qué significa |
|---|---|
| `dev`, al leer la dirección | Puede que falte `preview_urls: true` en `wrangler.jsonc` — el error lo nombra |
| `dev`, la dirección no contesta | Casi siempre es el subdominio de B1 sin elegir todavía |
| `produccion`, al promover | La etiqueta no se encontró. Es el caso que más me interesa: significa que el cruce `--tag` / `--version-tag` no funciona como leí en la documentación |
| Cualquiera, en amarillo | Faltan los secretos de B4 — o los cargaste en la pestaña *Variables* en vez de *Secrets*. No es un fallo del proyecto |
| `dev`, primer paso: «este commit no tiene ci-ok en verde» | Disparaste a mano un commit cuyo CI no corrió o no quedó verde. No es un fallo del despliegue: es la compuerta. Mergeá a `main` y dejá que se dispare solo |

### B6 · Contarme

- ¿Las dos direcciones contestaron?
- Si algo falló, **el log del paso**, no el resumen.

---

## Lo que NO tenés que hacer

- **No cargues secretos en el repositorio del marco.** Van en el repo del proyecto.
- **No pegues cadenas de conexión ni tokens en ningún lado** que no sea el campo de
  secretos. Llevan credenciales adentro.
- **No arregles el workflow si falla.** El fallo *es* el dato: si algo no funciona,
  es que lo que está escrito está mal, y eso se corrige en el marco, no a mano en tu
  proyecto.
