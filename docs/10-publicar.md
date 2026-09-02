# Publicar: de `main` en verde a una dirección donde entra la gente

> **Para quién es esta página.** Para quien ya tiene el proyecto andando y quiere
> que lo que construyó salga a una dirección donde entre otra gente. No hace
> falta ser técnico para las partes 1, 2 y 3.

Es la última del camino, y la que cierra el círculo. Las tres anteriores llevan
de una idea a código verificado; ésta lo saca de tu máquina.

Empieza donde termina [09-construir-con-openspec.md](09-construir-con-openspec.md):
con un [change](02-glosario.md) aplicado, un pull request cerrado y `main` en verde.

> **Antes que nada, la verdad incómoda: hoy esto sólo aplica a una de las formas.**
> Si elegiste **«un sitio para leer»**, el proyecto ya trae todo y esta página te
> lleva a publicarlo en unos minutos. Si elegiste **«una aplicación»**, el marco
> **todavía no reparte un paso que publique**, y esta página te dice qué hay y qué
> falta en vez de dejarte descubrirlo solo. La carta de
> [03-stack.md](03-stack.md) lo declara en su columna de estado.

**Palabras del marco que vas a ver acá**, cada una definida en una línea en el
[glosario](02-glosario.md): [andamio](02-glosario.md), [canónico](02-glosario.md),
[change](02-glosario.md), [compuerta](02-glosario.md), [constitución](02-glosario.md),
[fail-open](02-glosario.md), [marcador](02-glosario.md), [pin](02-glosario.md),
[ruleset](02-glosario.md).

---

## 1 · Qué publica y qué no, en una tabla

| Tu forma | ¿Se publica solo? | Dónde | Qué falta |
| --- | --- | --- | --- |
| **Un sitio para leer** | **Sí** | Cloudflare Workers | tres actos humanos de una sola vez: la cuenta, la credencial y el subdominio |
| **Una aplicación** | **No** | — | el paso de publicación no existe todavía en el andamio |

Cómo saber cuál tenés, sin acordarte de nada:

```bash
grep '"forma"' .projects-valores.json
```

---

## 2 · La regla que manda: no se publica lo que no está verde

El paso de publicación **no corre en cada push**. Corre cuando las
verificaciones terminan **en verde** sobre `main`, y sólo entonces.

Eso no es cautela: es la razón de ser del marco. Publicar algo que no pasó las
verificaciones es exactamente lo que todo lo anterior existe para impedir.

Y tiene una consecuencia que conviene tener presente, porque es la forma más
silenciosa de quedarse sin despliegue:

> **Si tu CI está rojo, no se publica nada y nadie te lo dice como un error de
> despliegue.** El despliegue simplemente no ocurre. Si publicaste una vez y
> después dejaste de ver cambios, lo primero que hay que mirar no es Cloudflare:
> es la pestaña **Actions** de tu repositorio.

---

## 3 · Un sitio para leer: publicarlo · *unos minutos*

El proyecto ya trae la configuración (`sitio/wrangler.jsonc`) y el paso
automático (`.github/workflows/desplegar.yml`).

**Lo que falta son tres actos humanos**, y por eso están acá y no automatizados:
**abrir la cuenta**, **crear la credencial** y **registrar el subdominio de tu
cuenta**. Los tres se hacen una sola vez.

> **El tercero cuesta contarlo porque llega tarde.** Cloudflare no te pide el
> subdominio hasta la primera publicación, así que aparece cuando ya creías haber
> terminado con lo humano. Contarlos como dos deja a esa persona sin saber que le
> falta un paso — y ésa es exactamente la sorpresa que esta página existe para
> evitar.

**El paso a paso completo, con las pantallas y los nombres exactos de cada
botón, está en el README del paquete del sitio de tu proyecto** —
`sitio/README.md`. Es el único lugar donde vive, para que no haya dos versiones
que puedan divergir —es la fuente [canónica](02-glosario.md)—.

Lo que esta página agrega es lo que ese README no puede decir, porque vive
adentro de tu proyecto y no del marco:

### Mientras no lo hagas, nada se pone en rojo

El paso de publicación sale con un **aviso amarillo** diciendo qué falta, y el
pipeline sigue en verde.

Está hecho a propósito. Un rojo permanente por algo que todavía no configuraste
enseña a ignorar los rojos, y a partir de ahí la compuerta que sí importa
tampoco se mira.

### El token tiene que ser el de Workers, no el de R2

En Cloudflare hay varios tipos de credencial y **el equivocado falla por
permisos**, con un error que no dice cuál era el correcto.

El que sirve se crea con la plantilla **«Edit Cloudflare Workers»**. No armes
uno a medida: esa plantilla ya tiene el permiso justo y nada más.

Si ves un token acompañado de una *Access Key ID* y una *Secret Access Key*, ése
es de **R2** —que es almacenamiento de archivos— y no sirve para publicar.

### Ese token es un secreto de verdad

Va en **Settings → Secrets and variables → Actions** de tu repositorio, y en
ningún otro lado.

**No lo pegues en un archivo del repositorio, ni en un chat, ni en una captura
de pantalla.** Un secreto que se vio una vez hay que darlo por público: borrarlo
después no borra el que ya se vio. Si te pasó, la salida es revocarlo en
Cloudflare y crear otro — toma dos minutos y no rompe nada.

### Podés ensayar antes de tener cuenta

```bash
corepack pnpm -C sitio run build
corepack pnpm -C sitio run desplegar:prueba
```

> **Va `corepack pnpm` y no `pnpm` a secas.** La máquina que armaste en
> [04](04-arrancar-acompanado.md) tiene **corepack**, que es lo que trae `pnpm`
> cuando hace falta; `pnpm` suelto sólo funciona si además lo instalaste aparte.
> Es la misma forma que usás desde el Paso 5.

El segundo comando hace todo **menos subir**: lee la configuración, encuentra
los archivos y te dice cuánto pesaría la subida. No necesita cuenta ni
credencial, y sirve para saber que la configuración está bien **antes** de tener
nada creado.

### Cómo sabés que salió bien, y cuál es tu dirección

El paso de publicación **imprime la dirección**. La primera vez tiene la forma:

```
https://<tu-proyecto>.<tu-subdominio>.workers.dev
```

Ese `<tu-subdominio>` del medio **lo registrás vos en el panel de Cloudflare**
—en **Workers & Pages → Subdomain**— y Cloudflare te lo pide recién en la primera
publicación, no al abrir la cuenta. **El marco no puede saberlo cuando genera el
proyecto**. Por eso, si contestaste que
todavía no tenés dominio propio, el proyecto quedó anotado con
`<tu-proyecto>.workers.dev` —sin la parte del medio— y eso está declarado como
pendiente en `.projects-desvios.json`.

> **Si armaste tu proyecto por el camino del [builder](02-glosario.md)** —escribiendo el archivo de
> valores a mano en vez de contestarle al asistente— **ese archivo te salió
> vacío**: `{"desvios": []}`. Los desvíos hoy los escribe el asistente, no
> `--valores`. Es una asimetría del marco, no algo que hiciste mal; hasta que se
> cierre, en ese camino los pendientes de esta página hay que anotarlos a mano.

**Cuando veas la dirección real, cambiala en dos lugares:**

| Dónde | Qué es |
| --- | --- |
| `README.md`, sección Ambientes | lo que lee cualquiera que entre al repo |
| `sitio/astro.config.mjs`, clave `site` | de ahí salen los enlaces canónicos del HTML |

---

## 4 · Una aplicación: qué hay hoy y qué falta

Sé honesto contigo mismo acá, porque es donde más fácil se pierde tiempo: **el
andamio no trae un paso que publique una aplicación.** No es que esté
escondido; no existe.

Lo que sí trae, y sirve:

| Qué | Dónde | Para qué |
| --- | --- | --- |
| La verificación completa | `.github/workflows/ci.yml` | que nada entre a `main` sin pasar |
| La infraestructura, con sus pendientes declarados | `infra/`, `infra-prod/` | el Terraform de AWS, con lo derivable funcionando y cada decisión pendiente marcada con su criterio |

Por qué no está el paso de publicación, dicho sin adornos: publicar una
aplicación con servidor y base de datos exige decidir dónde corre, cómo se
migran los datos y cómo se vuelve atrás. Son tres decisiones, no un archivo, y
el marco todavía no las tomó. Inventar el paso antes de tomarlas sería adivinar
la forma de una pieza que no está diseñada — y este repositorio ya pagó una
semana de un ruleset pidiendo el check equivocado por hacer exactamente eso.

**Mientras tanto**, la aplicación se levanta en tu máquina con `corepack pnpm dev`, y eso
alcanza para construirla y mostrarla. El día que el paso exista, va a llegar por
la vía de siempre: subís la versión del marco y aparece.

---

## 5 · El paso a producción, dicho como está hoy

**Ésta es la pregunta que más se hace y la que peor contestada estaba: cero
menciones en todo el camino.** Va acá, aunque la respuesta no sea la que se
espera.

### Lo que hoy hay, y es una sola cosa

**Un destino, no dos.** Cuando un sitio se publica, se publica **en un solo
lugar**, y ése es el que ve la gente. No hay una copia de prueba desplegada por un
lado y una de verdad por el otro: hay tu máquina, y hay lo publicado.

Eso vale aunque en el Paso 3 hayas contestado **«dos copias»**. Esa respuesta
cambia lo que tu proyecto **declara** —las direcciones, los nombres de recursos—
pero **hoy no hay nada que despliegue dos ambientes**. Si usaste el asistente,
está anotado con esas palabras en el `.projects-desvios.json` de tu proyecto; si
escribiste los valores a mano, ese archivo salió vacío —ver el aviso de arriba—.

### Lo que la [constitución](02-glosario.md) de tu proyecto promete, y todavía no cumple

Si abrís `.projects/AGENTS-marco.md` vas a leer una regla que dice:

> Promoción por ambientes: merge → deploy a DEV → smoke API → E2E → deploy a PROD
> → verificar-prod.

**Eso es el destino, no lo que tu proyecto hace hoy.** El andamio no reparte
ninguno de esos pasos. Lo decimos acá y además queda declarado como **desvío** en
tu proyecto, porque una regla que describe algo que no existe es peor que una
regla ausente: los agentes que trabajan en tu repositorio la leen como si fuera
la práctica de todos los días.

### Entonces, ¿cómo llega un cambio a la gente?

Con lo que hay hoy, así:

| Paso | Qué pasa |
| --- | --- |
| 1 | Escribís el cambio en una rama |
| 2 | Abrís un pull request y las verificaciones corren sobre él |
| 3 | Con todo en verde, entra a `main` |
| 4 | El sitio se publica solo, al destino único |

**La compuerta que te protege es la del paso 3**, no un ambiente intermedio: nada
llega a la gente sin haber pasado las verificaciones. Es menos de lo que la regla
promete, y es lo que hay.

### Y si tu proyecto necesita de verdad dos ambientes

Es una decisión tuya y el marco todavía no te la resuelve. Lo honesto es decirte
las dos cosas que vas a tener que hacer vos: **un segundo destino** donde publicar
y **un paso que promueva** de uno al otro, con su propia condición de verde. El
día que el marco lo reparta, llega como cualquier otra mejora —subiendo la versión
del marco— y el desvío de tu proyecto se cierra.

---

## Y con esto se cierra el camino

| Tramo | Página |
| --- | --- |
| Configurar | [04-arrancar-acompanado.md](04-arrancar-acompanado.md) · [05-arrancar-tecnico.md](05-arrancar-tecnico.md) |
| Descubrir | [08-descubrimiento.md](08-descubrimiento.md) |
| Construir | [09-construir-con-openspec.md](09-construir-con-openspec.md) |
| **Publicar** | **esta página** |
| **Producción** | **esta página, sección 5** — con lo que hoy no hay, dicho de frente |

De acá en adelante el ciclo se repite: un change, un pull request, `main` en
verde, y lo que publica publica solo.
