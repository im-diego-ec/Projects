---
artefacto: proposal
dri: Builder 1
aprueba: Builder 1                 # change técnico del estándar de trabajo; el gate
                              # del PO se reserva para el dominio de producto
informado: PO / Builder 2
estado: pendiente-de-revision
---

# marco-se-cumple-solo — Proposal

## Why

La premisa de Projects es que **el cumplimiento del marco es automático**: un ritual
que alguien debe recordar no cuenta como enforcement. Una auditoría del marco
recién publicado (v1.0.0) encontró cuatro lugares donde el propio marco **promete
algo que ningún check hace cumplir**. Son deuda de la peor clase: se leen como
garantía y se comportan como sugerencia.

1. **La forma de distribución «regenerado» no tiene enforcement.** El marco pina
   la versión del CLI de OpenSpec y le dice a cada proyecto que regenere sus
   skills y comandos desde ese pin. Nada verifica que lo haya hecho. En el
   proyecto de origen las skills llevaban un mes generadas por una versión
   anterior a la que CI validaba, y nadie se enteró: cada `SKILL.md` declara en
   su cabecera con qué versión se generó, así que la divergencia era visible y
   aun así invisible. De las cuatro formas de distribución, es la única sin un
   check que falle solo.

2. **Los workflows del marco no se validan como código.** Projects **es** workflows
   —es su producto principal— y su carril rápido excluye la ruta donde viven, de
   modo que editar un workflow mergea sin más verificación que la de OpenSpec. Un
   error de sintaxis o una expresión inválida solo aparece cuando ya está
   publicado y algún proyecto lo consume por `@v1`.

3. **Nada verifica que el scaffold quedó lleno.** Un proyecto que copia la
   plantilla debe sustituir sus placeholders antes del primer commit. Hoy eso lo
   garantiza un ítem de checklist en la guía del bootstrap — o sea, la memoria de
   quien la lee. Un repo puede nacer con `{{PLACEHOLDER}}` sin sustituir en su
   propia constitución y en su CODEOWNERS: un CODEOWNERS con un placeholder no
   falla, simplemente no asigna a nadie, y el review cruzado desaparece sin ruido
   desde el día uno.

4. **La serialización de despliegues vive en la prosa, no en el contrato.** El
   README del marco la enumera entre los guardrails que dejó un incidente real
   —dos deploys concurrentes sobre el mismo ambiente compartido, ambas corridas
   verdes y la configuración corrupta— pero ningún spec la exige. Un proyecto
   puede cumplir todos los specs vigentes y volver a pisar ese rastrillo.

## What Changes

Cuatro requirements nuevos, enunciados como **propiedades observables**, y los
checks que los hacen cumplir:

- `pipeline-entrega` — **los artefactos regenerados no divergen de la versión
  pinada**. El job de marco compara lo declarado en los artefactos generados
  contra el pin vigente y falla nombrando el comando exacto de regeneración.
- `calidad-codigo` — **las definiciones de pipeline se validan como código**, con
  la misma dureza que el resto: un error de sintaxis o una expresión inválida
  detiene el CI antes del merge, no en el primer consumidor.
- `calidad-codigo` — **un repositorio nacido del scaffold no conserva marcadores
  sin resolver**. Los placeholders y los huecos marcados del scaffold dejan de
  depender de un checklist.
- `despliegue-ci` — **los despliegues a un ambiente compartido se serializan y
  hacen cola**, nunca se cancelan entre sí.

## Capabilities

### Modified Capabilities

- `pipeline-entrega`: requirement nuevo sobre artefactos regenerados.
- `calidad-codigo`: dos requirements nuevos — validación de las definiciones de
  pipeline y ausencia de marcadores del scaffold.
- `despliegue-ci`: requirement nuevo sobre serialización en ambientes compartidos.

## Impact

**Distribución:** lo que cambia es **canónico** (los specs del marco) y
**referenciado** (los checks nuevos viajan en el workflow reusable, así que
llegan solos a todo consumidor de `@v1`).

**¿Rompe a los adoptantes existentes?** Depende del check, y conviene decirlo con
precisión porque la respuesta no es uniforme:

- La validación de las definiciones de pipeline y el check de marcadores del
  scaffold **pasan en verde hoy** en el único consumidor real. Nacen como fallo
  directo: no rompen nada.
- El check de artefactos regenerados **pondría rojo al consumidor actual desde el
  primer día**, porque su divergencia es precisamente el hallazgo que lo motiva.
  Se coordina en la misma ventana: el proyecto regenera y el check entra. Es
  minutos de trabajo, y estrenarlo como aviso primero solo enseñaría a convivir
  con el aviso.

Para un proyecto consumidor, el efecto neto es que **cuatro promesas del marco
pasan a fallar solas**. No hay nada que copiar ni que configurar: los checks
llegan por el tag móvil.
