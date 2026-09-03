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

**La investigación de `alternativas.md` estrechó dos de estas cuatro y dejó las
otras dos igual de abiertas.** Se declara cuál es cuál para que no se pierda
tiempo discutiendo lo que ya tiene respuesta.

### Lo que la investigación ya contestó

**Qué significa «ambiente de prueba» acá.** Cloudflare ofrece tres formas y gana
una con claridad: **versiones con dirección de vista previa**. Es la única que
promueve **el artefacto que ya se verificó** — las otras dos vuelven a compilar
para producción, y entonces lo que salió publicado no es exactamente lo que se
miró. Y no cuesta **un solo acto humano nuevo**: la credencial que la persona ya
carga hoy alcanza.

**Cuánto cuesta.** Las primeras cuatro rebanadas —la promoción del sitio, la de la
parte web de una aplicación, y la compuerta— salen **cero dólares y cero actos
humanos nuevos**. El costo aparece recién cuando se despliega el `api/`, y ahí
depende de una medición que todavía no se hizo.

### Lo que sigue siendo tuyo

1. **¿El repositorio del proyecto es público o privado?** Es la decisión que más
   arrastra y no es técnica. En un repositorio **privado del plan gratuito no
   existe ninguna compuerta de environment** —ni revisores, ni temporizador, ni
   política de rama— y tenerlas cuesta **21 USD por persona al mes**. En uno
   público son gratis. El marco ya se comió este mismo muro con la protección de
   rama.

2. **¿Cuánto puede costar por mes desplegar el `api/`?** Hay una medición de una
   tarde que decide entre **~5 USD sin agregar ningún proveedor** (Cloudflare
   Containers, si sus containers pueden hablar con Postgres — su documentación no
   lo afirma) y **13 USD con un proveedor nuevo** (Render, que sí resuelve las
   migraciones dentro del despliegue). **Se puede decidir después**: no bloquea
   nada de lo anterior.

3. **¿Se rediseña la pregunta de plataforma en este mismo trabajo?** La
   investigación dice que hoy son **dos preguntas colapsadas en una** —dónde viven
   los datos y dónde corre la aplicación—, y que para un sitio directamente no
   corresponde. Separarlas toca el asistente, la carta y el reparto de archivos.

**Los números, sus fuentes y lo que no se pudo verificar están en
`alternativas.md`, al lado de este archivo.** Este proposal no elige por vos: pone
los datos delante y separa lo que ya tiene respuesta de lo que no.

## Cómo se construye

**En rebanadas, y cada una entregable sola.** Es una condición del proposal, no un
detalle de planificación: un trabajo de este tamaño que sólo sirve cuando está
entero es un trabajo que no se puede abandonar a mitad de camino si algo cambia.

La primera rebanada tiene que ser **la más barata que ya deje algo funcionando**, y
por eso es el ambiente de prueba de la forma que hoy **ya publica**: es un
incremento sobre algo que anda, no una capacidad nueva.
