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
[change](02-glosario.md), [compuerta](02-glosario.md), [fail-open](02-glosario.md),
[marcador](02-glosario.md), [pin](02-glosario.md), [ruleset](02-glosario.md).

---

## 1 · Qué publica y qué no, en una tabla

| Tu forma | ¿Se publica solo? | Dónde | Qué falta |
| --- | --- | --- | --- |
| **Un sitio para leer** | **Sí** | Cloudflare Workers | una cuenta y una credencial, las dos humanas y de una sola vez |
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

## 3 · Un sitio para leer: publicarlo · *unos minutos, sin tarjeta*

El proyecto ya trae la configuración (`sitio/wrangler.jsonc`) y el paso
automático (`.github/workflows/desplegar.yml`).

**Lo que falta son dos cosas que sólo una persona puede hacer**, y por eso están
acá y no automatizadas: abrir una cuenta y crear una credencial.

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
pnpm -C sitio run build
pnpm -C sitio run desplegar:prueba
```

El segundo comando hace todo **menos subir**: lee la configuración, encuentra
los archivos y te dice cuánto pesaría la subida. No necesita cuenta ni
credencial, y sirve para saber que la configuración está bien **antes** de tener
nada creado.

### Cómo sabés que salió bien, y cuál es tu dirección

El paso de publicación **imprime la dirección**. La primera vez tiene la forma:

```
https://<tu-proyecto>.<tu-subdominio>.workers.dev
```

Ese `<tu-subdominio>` del medio lo elegís vos al abrir la cuenta, y **el marco
no puede saberlo cuando genera el proyecto**. Por eso, si contestaste que
todavía no tenés dominio propio, el proyecto quedó anotado con
`<tu-proyecto>.workers.dev` —sin la parte del medio— y eso está declarado como
pendiente en `.projects-desvios.json`.

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

**Mientras tanto**, la aplicación se levanta en tu máquina con `pnpm dev`, y eso
alcanza para construirla y mostrarla. El día que el paso exista, va a llegar por
la vía de siempre: subís la versión del marco y aparece.

---

## Y con esto se cierra el camino

| Tramo | Página |
| --- | --- |
| Configurar | [04-arrancar-acompanado.md](04-arrancar-acompanado.md) · [05-arrancar-tecnico.md](05-arrancar-tecnico.md) |
| Descubrir | [08-descubrimiento.md](08-descubrimiento.md) |
| Construir | [09-construir-con-openspec.md](09-construir-con-openspec.md) |
| **Publicar** | **esta página** |

De acá en adelante el ciclo se repite: un change, un pull request, `main` en
verde, y lo que publica publica solo.
