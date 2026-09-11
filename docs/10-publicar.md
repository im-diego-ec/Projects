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

| Tu forma | ¿Sale solo a la copia de prueba? | ¿Y a producción? | Dónde | Qué falta |
| --- | --- | --- | --- | --- |
| **Un sitio para leer** | **Sí** | **No: lo publicás vos** | Cloudflare Workers | cuatro actos humanos de una sola vez: la cuenta, el subdominio, la credencial y guardarla en GitHub |
| **Una aplicación** | **No** | **No** | — | el paso de publicación no existe todavía en el andamio |

**Esa segunda columna es el cambio más importante de esta página**, y conviene leerla
dos veces: un sitio **sube solo** a una dirección de prueba y **se detiene ahí**. A
producción lo llevás vos, apretando un botón. Por qué, en la sección 5.

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

**Lo que falta son cuatro actos humanos**, y por eso están acá y no
automatizados: **abrir la cuenta**, **registrar el subdominio**, **crear la
credencial** y **guardarla en GitHub**. Los cuatro se hacen una sola vez.

> **Dos de los cuatro cuestan contarlos, y por motivos distintos.** El subdominio
> llega tarde: Cloudflare no te lo pide hasta la primera publicación, así que
> aparece cuando ya creías haber terminado. Y guardar la credencial en GitHub se
> contaba junto con crearla, siendo que pasa en otro sitio, con otra pantalla, y
> falla distinto —un secreto mal pegado no da error al pegarlo, da error recién
> al publicar—. Contar de menos deja a esa persona sin saber que le falta un
> paso, y ésa es exactamente la sorpresa que esta página existe para evitar.

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

### Si publicaste algo roto, volvé atrás antes de arreglarlo

Mientras el sitio está roto, cada minuto lo paga quien entra. **Volver a la
versión anterior es un comando y tarda segundos**; arreglar el código bien puede
tardar una hora, y el orden correcto es ése.

El paso a paso, con los dos comandos exactos, está en el README del paquete de tu
sitio —es la fuente [canónica](02-glosario.md), como todo lo demás de esta
página—. Lo que conviene saber desde acá es **qué no arregla**:

**Volver atrás cambia lo que Cloudflare sirve, no lo que hay en tu repositorio.**
El código roto sigue en la rama principal, así que la próxima publicación lo sube
otra vez. Te compra tiempo, no te arregla el problema. Con el sitio ya sano, el
arreglo de verdad es deshacer el cambio en el repositorio, con el botón **Revert**
del trabajo que lo causó.

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

## 5 · El paso a producción

**Ésta es la pregunta que más se hace y la que peor contestada estaba.** Hoy la
respuesta depende de tu forma, y son dos respuestas distintas.

### Si tu proyecto es un sitio: hay dos tramos, y el segundo es tuyo

| Tramo | Quién lo dispara | Qué pasa |
| --- | --- | --- |
| **A la copia de prueba** | nadie: sale solo | cuando las verificaciones quedan en verde sobre `main`, tu sitio sube a una dirección `dev-…` y el pipeline **comprueba que conteste** |
| **A producción** | **vos** | vas a **Actions → desplegar → Run workflow**, marcás la casilla, y publica **esa misma versión** |

**Producción no se compila de nuevo.** Se promueve la versión que ya subió y que ya
miraste, byte por byte. Si se recompilara, lo publicado dejaría de ser lo verificado
—otro reloj, otra resolución de dependencias— y la copia de prueba dejaría de probar
lo que sale.

**Y no se puede promover cualquier cosa.** Antes de publicar, el pipeline pregunta si
esa versión pasó por la copia de prueba **y terminó en verde**. Si no puede
preguntar —sin red, sin permiso— **tampoco publica**: no saber no es lo mismo que
estar bien. Apartarse se puede, con una casilla que tiene nombre, y queda escrito en
la corrida quién lo pidió.

### Por qué un botón y no automático

Porque si publicar ocurriera detrás de cada cambio, la decisión de sacar algo al
mundo dejaría de ser tuya y pasaría a ser una consecuencia de haber escrito. El botón
la mantiene tuya, y deja **quién publicó y cuándo** — una decisión sin autor no se
puede revisar después.

**Y podés pedir un segundo candado**, si tu repositorio lo admite: que **otra persona**
apruebe antes de publicar. Si lo admite o no depende del plan y de la visibilidad, y
**tu proyecto lo trae medido sobre sí mismo** en `.github/proteccion-main.md`. Ahí
está también lo que sorprende: una aprobación que queda esperando **caduca**, y la
corrida termina **cancelada, no roja** — no vas a ver una ✗ que te llame la atención.

### Lo que esto NO es, dicho antes de que alguien lo lea de más

**No son dos infraestructuras.** Son dos direcciones del mismo sitio: una versión
subida y otra publicada. **La copia de prueba es pública** para quien tenga el enlace.
Y si tu proyecto tiene base de datos, **no hay una base de prueba aparte** por este
mecanismo: eso lo decidís vos, y el cupo del plan gratuito está dicho en
`infra/adaptadores.md`, adentro de tu proyecto.

### Si tu proyecto es una aplicación: todavía no hay publicación

El andamio **no le reparte** el paso de despliegue: una aplicación no recibe
`.github/workflows/desplegar.yml`. No es un olvido y no se disimula — está declarado
como **desvío** en tu proyecto, con esas palabras.

**Lo que la [constitución](02-glosario.md) de tu proyecto promete**, si abrís
`.projects/AGENTS-marco.md`:

> Promoción por ambientes: merge → deploy a DEV → smoke API → E2E → deploy a PROD
> → verificar-prod.

Para una aplicación **eso sigue siendo el destino y no lo que hace hoy**, y el desvío
lo dice entero. Para un sitio el desvío **ya no dice «no hay deploy a dev»** —lo hay—
sino qué queda fuera de esa cadena de seis pasos: el smoke de API **no aplica** (un
sitio no tiene API) y el E2E **falta**. Distinguir «no aplica» de «falta» importa: lo
primero no se arregla nunca, lo segundo sí.

---

## Y con esto se cierra el camino

| Tramo | Página |
| --- | --- |
| Configurar | [04-arrancar-acompanado.md](04-arrancar-acompanado.md) · [05-arrancar-tecnico.md](05-arrancar-tecnico.md) |
| Descubrir | [08-descubrimiento.md](08-descubrimiento.md) |
| Construir | [09-construir-con-openspec.md](09-construir-con-openspec.md) |
| **Publicar** | **esta página** |
| **Producción** | **esta página, sección 5** — los dos tramos, y cuál de los dos es tuyo |

De acá en adelante el ciclo se repite: un change, un pull request, `main` en
verde, y tu sitio esperándote en la copia de prueba hasta que decidas publicarlo.
