# Que un proyecto pueda llegar a producción, y saber cómo

## Por qué

**Hoy un proyecto nacido de este andamio no tiene forma de llegar a producción, y
su propia constitución dice que sí.** Las dos mitades están medidas.

La constitución que aterriza en **todo** proyecto declara, como práctica vigente:

> Promoción por ambientes: merge de código → deploy a DEV → smoke API → E2E →
> deploy a PROD → verificar-prod.

Y el andamio no reparte **ninguno** de esos pasos. Medido sobre las seis
combinaciones de forma y plataforma:

| Forma + plataforma | ¿Publica? | ¿Trae infraestructura? |
| --- | --- | --- |
| aplicación + Supabase | **no** | no |
| aplicación + AWS | **no** | sí (Terraform) |
| aplicación + ninguna | **no** | no |
| sitio + Supabase | sí, a un solo destino | no |
| sitio + AWS | sí, a un solo destino | no |
| sitio + ninguna | sí, a un solo destino | no |

Una regla que describe maquinaria inexistente es **peor que una regla ausente**:
los agentes que trabajan en ese repositorio la leen como la práctica de todos los
días y planifican contra ella. Hoy eso está tapado con un desvío declarado —lo
honesto mientras no exista— pero un desvío es una deuda anotada, no una solución.

**Y hay un segundo hallazgo que salió midiendo el primero, y es más grave:** la
elección de `plataforma` **no afecta el despliegue en absoluto**. Un sitio publica
en Cloudflare elija lo que elija; una aplicación no publica en ningún lado, elija
lo que elija. Hoy esa pregunta decide **una sola cosa**: si viaja el Terraform de
AWS.

Alguien que elige **«AWS»** entendiendo «mi aplicación va a correr en AWS» recibe
infraestructura y ningún despliegue. La palabra promete una cosa y entrega otra —
que es exactamente el defecto que este marco ya pagó dos veces, con Slack y con
GCP, y que su propia carta describe: *«ofrecer una opción que después no funciona
es peor que no ofrecerla»*.

## Qué cambia

1. **Un proyecto puede publicar en un ambiente de prueba antes que en producción**,
   y la promoción de uno al otro es un acto deliberado con su propia compuerta.
2. **La forma «una aplicación» pasa a tener un despliegue.** Hoy no tiene ninguno,
   y es la forma que el asistente recomienda por defecto.
3. **La pregunta de plataforma pasa a significar lo que dice**, o se rediseña para
   que lo diga. Es la decisión del `design.md` y depende de lo que se resuelva acá.
4. **El desvío sobre `promocion-por-ambientes` se cierra** en los proyectos donde
   la promoción exista de verdad — y sigue declarándose donde no.
5. **La carta de `docs/03-stack.md` dice qué publica cada camino**, con su columna
   de estado, igual que ya hace con las formas.

## Qué NO cambia

- **La compuerta del verde sigue siendo la misma y no se relaja.** Nada llega a
  ningún ambiente sin que las verificaciones hayan pasado. Un ambiente de prueba
  no es un lugar donde se afloja: es un lugar donde se mira antes.
- **No se agrega un proveedor por gusto.** Cada uno que entre suma una cuenta que
  abrir, un secreto que rotar y una factura que puede llegar. El marco ya eligió
  Cloudflare y Supabase; salir de ahí necesita un motivo escrito.
- **Nada de esto exige que el proyecto sea de un equipo.** Tiene que funcionar
  para una persona sola, que es el caso que el marco declara soportar.

## Lo que hay que decidir antes de diseñar

Estas preguntas **no las contesta un técnico**: la respuesta correcta depende de
cuánto se quiere gastar, cuánto riesgo se acepta y para quién es el proyecto. Van
acá y no en el `design.md` a propósito.

1. **¿Cuánto puede costar por mes un proyecto nuevo?** Hoy el camino recomendado
   es gratis de punta a punta. Si el despliegue de una aplicación exige pagar,
   deja de serlo — y eso cambia quién puede usar este marco.
2. **¿Qué significa «ambiente de prueba» acá?** Un destino desplegado y separado,
   o una dirección temporal por cada cambio propuesto. Las dos son defendibles y
   cuestan distinto.
3. **¿Quién autoriza el pase a producción cuando hay una sola persona?** GitHub
   ofrece revisores obligatorios y esperas temporizadas, y el marco ya midió que
   varias de esas piezas **no existen** en un repositorio privado del plan
   gratuito.
4. **¿Se rediseña la pregunta de plataforma en este mismo trabajo, o se declara
   su límite y se deja para otro?** Rediseñarla toca el asistente, la carta y el
   reparto de archivos.

**Los datos para decidir cada una —costos reales, límites de los planes gratuitos
y actos humanos de cada opción— se investigaron y viven en `alternativas.md`, al
lado de este archivo.** Este proposal no elige por vos: pone los números delante.

## Cómo se construye

**En rebanadas, y cada una entregable sola.** Es una condición del proposal, no un
detalle de planificación: un trabajo de este tamaño que sólo sirve cuando está
entero es un trabajo que no se puede abandonar a mitad de camino si algo cambia.

La primera rebanada tiene que ser **la más barata que ya deje algo funcionando**, y
por eso es el ambiente de prueba de la forma que hoy **ya publica**: es un
incremento sobre algo que anda, no una capacidad nueva.
