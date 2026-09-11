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
2. Creá un proyecto. Anotá la contraseña de la base que te pide: **no se puede
   recuperar después**, sólo resetear.
3. Esperá a que termine de aprovisionar.

**Salió bien si:** el proyecto aparece como *Active*.

> **Ojo con el plan gratuito:** permite **dos** proyectos activos y los **pausa a la
> semana** sin uso. Si vas a tener dev y prod, son los dos.

### A2 · Copiar las dos cadenas de conexión

En tu proyecto, buscá los datos de conexión (*Connect*, o *Project Settings →
Database*). Vas a ver más de una cadena. Necesitás **dos**:

- **Direct connection** — la que Cloudflare dice usar. Es la que puede ser IPv6.
- **Session pooler** — la alternativa si la primera falla.

**Copiá las dos a un archivo temporal.** Llevan la contraseña adentro: no las pegues
en un chat, ni en un issue, ni las commitees.

**Salió bien si:** tenés dos cadenas que empiezan con `postgresql://` y son distintas
entre sí.

### A3 · Crear el binding de Hyperdrive con la cadena *Direct*

1. En el panel de Cloudflare: **Storage & Databases → Hyperdrive → Create
   configuration**.
2. Pegá la cadena **Direct connection**.
3. Guardá.

**Salió bien si:** la configuración se crea y no da error de conexión.
**Esto es la medición.** Anotá el resultado.

**Si falla:** no es un problema tuyo ni del marco — es la incógnita que estamos
midiendo. Pasá a A4.

### A4 · Sólo si A3 falló — reintentar con el pooler

Repetí A3 pegando la cadena del **Session pooler** en vez de la directa.

**Salió bien si:** se crea. Entonces la respuesta es «Hyperdrive sí, pero por el
pooler», y el andamio se escribe con esa cadena.

**Si también falla:** anotá el error textual. Esa es la respuesta que cierra la
medición, y cambia el proveedor de cómputo.

### A5 · Contarme el resultado

Con esto alcanza, y **no me mandes las cadenas**:

- ¿A3 funcionó, o hubo que ir a A4?
- Si falló, el mensaje de error **tal cual**.

Con eso se escribe el adaptador de la API y se cierra la mitad del trabajo que queda.

---

## B · El primer despliegue real — valida todo lo ya escrito

**Qué se está validando:** que el workflow de promoción que ya está escrito funcione
de verdad. Hoy tiene banco de forma, pero **nunca corrió contra Cloudflare**.

### B1 · Cuenta de Cloudflare y subdominio

1. Creá una cuenta en `cloudflare.com` si no tenés.
2. Andá a **Workers & Pages**. La primera vez te va a pedir que **registres un
   subdominio** —algo como `tu-nombre.workers.dev`—. Hacelo ahora.

**Por qué este paso y no después:** sin el subdominio registrado, la publicación
sube los archivos y la dirección no contesta. El workflow te va a decir exactamente
eso, pero es una vuelta perdida.

**Salió bien si:** en Workers & Pages ves tu subdominio elegido.

### B2 · El identificador de cuenta

En el panel de Cloudflare, copiá el **Account ID**.

**Salió bien si:** tenés una cadena hexadecimal larga.

### B3 · El token de API

1. **My Profile → API Tokens → Create Token**.
2. Elegí la plantilla **Edit Cloudflare Workers**.
3. Creá el token y **copialo ahora**: no se vuelve a mostrar.

**Salió bien si:** tenés el token copiado.
**Por qué esa plantilla y no otra:** es la que alcanza para subir una versión **y
para promoverla**. Un token más amplio funciona, pero le da al pipeline permisos que
no necesita.

### B4 · Cargar los dos secretos en el repositorio del proyecto

En el repo de tu proyecto (no en el del marco): **Settings → Secrets and variables →
Actions → New repository secret**. Dos veces:

- `CLOUDFLARE_API_TOKEN` — el de B3
- `CLOUDFLARE_ACCOUNT_ID` — el de B2

**Los nombres van exactos.** El workflow los busca así.

**Salió bien si:** los dos aparecen listados.

> **Mientras no los cargues, nada se pone en rojo**: el paso avisa en amarillo qué
> falta. Eso es a propósito.

### B5 · Disparar la promoción y mirar las dos direcciones

Mergeá algo a `main` —o corré el workflow a mano— y mirá la corrida.

**Salió bien si ves, en este orden:**

1. El job **`dev`** termina en verde y en su resumen aparece una dirección
   `dev-…workers.dev`. **Abrila.** Tiene que mostrar tu sitio.
2. El job **`produccion`** termina en verde y su resumen dice *«Es la MISMA versión
   que pasó por DEV»*.

**Qué mirar si falla, y qué significa cada cosa:**

| Dónde falla | Qué significa |
|---|---|
| `dev`, al leer la dirección | Puede que falte `preview_urls: true` en `wrangler.jsonc` — el error lo nombra |
| `dev`, la dirección no contesta | Casi siempre es el subdominio de B1 sin registrar |
| `produccion`, al promover | La etiqueta no se encontró. Es el caso que más me interesa: significa que el cruce `--tag` / `--version-tag` no funciona como leí en la documentación |
| Cualquiera, en amarillo | Faltan los secretos de B4. No es un fallo |

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
