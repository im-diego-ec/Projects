# Las alternativas, con sus números

Este archivo existe para que la decisión del `proposal.md` se tome **con los datos
delante y no con la opinión de quien lo escribió**. Todo lo de acá se investigó
contra las fuentes de cada proveedor, se verificó una segunda vez por alguien
distinto, y lleva su fecha: **2026-09-01**.

> **Los precios y los límites de los planes gratuitos cambian, y este archivo
> envejece.** No es una tabla de referencia: es una foto del día en que se tomó la
> decisión. Si estás leyendo esto meses después, lo que vale es el motivo escrito,
> no el número.

---

## 1 · Cómo se hace un ambiente de prueba en Cloudflare

Tres formas, y una gana con claridad.

| Forma | Qué da | Costo | Actos humanos nuevos |
| --- | --- | --- | --- |
| **Versiones + preview URL** | una dirección por versión subida, y una promoción que publica **esa misma versión** | gratis, 1 Worker de los 100 del plan libre | **cero** |
| Environments de wrangler | un segundo Worker, `<proyecto>-pruebas` | gratis, 2 Workers de 100 | cero |
| Segundo Worker por `--name` | lo mismo que el anterior, sin declarar bloques `env` | gratis, 2 Workers de 100 | cero |

**Gana «versiones», y el motivo es el que más importa para una promoción:** es la
única que promueve **un artefacto ya construido**. Las otras dos vuelven a compilar
para producción, y entonces lo que se verificó en prueba **no es exactamente lo que
sale publicado** — que es justo lo que un ambiente de prueba existe para garantizar.

**Y no cuesta un solo acto humano nuevo:** verificado, el permiso «Edit Cloudflare
Workers» de la credencial que la persona **ya carga hoy** alcanza para subir una
versión y para promoverla.

Dos cosas que la investigación corrigió y conviene no perder:

- **`preview_urls` cambió de default tres veces durante 2025.** Hay que declararlo
  a propósito en `wrangler.jsonc`, con el comentario que diga por qué — dejarlo
  implícito es apoyarse en un default que ya demostró moverse.
- **Declarar cualquier bloque `env` hace que todo comando de wrangler sin `--env`
  emita un warning**, y obliga a cambiar el `wrangler deploy` que ya está en el
  workflow. Es un costo real de las opciones 2 y 3 que no se ve hasta que se
  prueban.

---

## 2 · Quién autoriza el pase a producción

**Acá hay una condición que decide todo lo demás, y no es técnica: si el
repositorio es público o privado.**

| Compuerta | Repo público, plan gratuito | Repo privado, plan gratuito |
| --- | --- | --- |
| Revisores obligatorios del environment | **sí, gratis** | **no** — exige Enterprise, 21 USD por persona al mes |
| Temporizador de espera | **sí, gratis** | no |
| Política de rama del environment | **sí, gratis** | no |
| `workflow_dispatch` manual | sí | sí |

**En un repositorio privado del plan gratuito no existe ninguna compuerta de
environment.** No es una limitación que se pueda rodear: los environments
directamente no están disponibles. Es el mismo muro que el marco ya se comió con
la protección de rama, y está documentado en `docs/11-reglas-no-escritas.md`.

Dos precisiones que la verificación trajo y que cambian el cálculo:

- El salto para tener compuertas en un repositorio privado **no son 4 USD**: es
  Enterprise, **21 USD por persona al mes**. El plan Pro ni siquiera aparece hoy en
  la página de precios de GitHub.
- Una corrida esperando aprobación más de 30 días **falla**, no se cancela. Importa
  para el diseño: una compuerta que nadie atiende deja el despliegue en rojo, no en
  silencio.

**Con una sola persona**, los revisores obligatorios funcionan: *«alcanza con que
uno de los revisores obligatorios apruebe»*, y esa persona puede ser la misma que
disparó la corrida.

---

## 3 · Dónde corre una aplicación

**Ésta es la decisión cara, y la investigación encontró una medición que la puede
volver barata.**

| Opción | Costo mensual | Actos humanos | Migraciones de Prisma | ¿Sin terminal? |
| --- | --- | --- | --- | --- |
| **Cloudflare Containers** | ~5 USD | cero proveedores nuevos | por medir | sí |
| Render, escalón pago | **13 USD** (7 cómputo + 6 base) | 4, todos en el navegador | **sí**, con `pre-deploy command` | sí |
| Render, escalón gratuito | 0 USD | 3, sin tarjeta | no — hay que resolverlo aparte | sí |
| Heroku | 10 USD | 4 | sí, con `release phase` | sí |
| DigitalOcean App Platform | 12 USD | 4 | sí | sí |
| AWS App Runner | 1 USD por app + cómputo + build | varios, con IAM de por medio | a mano | no |

**La medición que falta, y es de una tarde:** ¿puede un container de Cloudflare
abrir una conexión TCP saliente al puerto 5432 de Postgres? **La documentación de
Cloudflare no lo afirma en ninguna parte** — y la respuesta cambia el resultado por
completo:

- **Si pasa:** la aplicación corre por ~5 USD al mes **sin agregar un solo
  proveedor**. La persona ya tiene cuenta de Cloudflare, ya tiene la credencial
  cargada, y no aprende nada nuevo.
- **Si no pasa:** Render a 13 USD al mes es lo más barato que cumple sin terminal,
  y su `pre-deploy command` es el único lugar donde `prisma migrate deploy` corre
  **dentro** del despliegue, que es lo que la promoción del marco necesita.

**El escalón gratuito de Render no sirve para producción, y conviene decirlo con
sus números:** el servicio se duerme a los 15 minutos sin tráfico y tarda **un
minuto en despertar** —lo paga el primer visitante de cada rato, y también la
verificación post-despliegue— y su base de datos **expira a los 30 días de creada**.

---

## 4 · Qué debería significar la pregunta de plataforma

Medido: **hoy no significa casi nada.** Decide una sola cosa —si viaja el Terraform
de AWS— y **no afecta el despliegue en absoluto**.

Lo que la investigación propone, y es una decisión del `design.md`:

**Son dos preguntas colapsadas en una.** «Dónde viven mis datos» y «dónde corre mi
aplicación» son decisiones distintas, con proveedores distintos y costos distintos.
Hoy están mezcladas en una sola palabra, y por eso ninguna de las dos se puede
contestar bien.

**Y para un sitio, la pregunta directamente no corresponde:** un sitio publica en
Cloudflare elija lo que elija. Preguntársela es hacerle creer que eligió algo.

---

## Lo que la investigación NO pudo verificar

Va acá y no escondido, porque son los lugares donde una decisión se puede
equivocar:

1. **Si un container de Cloudflare puede abrir TCP al 5432.** Es la medición que
   decide entre 5 y 13 USD al mes. Una tarde de trabajo, cero dólares.
2. **El comportamiento exacto de `preview_urls`** con la versión de wrangler que el
   marco pina hoy. Se sabe que el default se movió tres veces; hay que fijarlo y
   comprobarlo contra el binario pineado.
3. **Cuánto consume de los 500 minutos mensuales de build** una imagen de este
   andamio en Render. Importa sólo si se va por ese camino.
