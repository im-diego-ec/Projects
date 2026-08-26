# Introducción

**Empezá por acá.** Es la primera de doce páginas numeradas, y el número dice en
qué lugar del camino va cada una — no cuánto importa.

Esta página es para quien tiene que **entender y aplicar** este marco sin
escribir código: un analista de negocio, alguien que recién ocupa el rol de
[PO](02-glosario.md), quien tenga que decidir si esto se adopta o no. No supone
conocimiento previo y no te va a pedir que programes.

Existe porque faltaba la página de antes de todas las demás. La documentación
que había arranca —con razón— por la maquinaria: qué corre, cuándo corre y con
qué herramienta. Esta arranca por el problema que esa maquinaria resuelve.

### Qué vas a lograr si seguís las páginas en orden

Un repositorio nuevo, tuyo, con las verificaciones automáticas ya conectadas y
en verde. Es decir: un lugar donde escribir software con las reglas del equipo
puestas desde el primer día, en vez de acordadas y olvidadas.

Y, en el paso 7, **vas a verlo andando en tu navegador**: una página con el
nombre de tu proyecto, corriendo en tu computadora. No es gran cosa todavía —es
fea a propósito— pero es la diferencia entre haber configurado algo y haber
construido algo.

**Lo que todavía NO vas a lograr,** y conviene saberlo antes de empezar y no a
mitad de camino: el marco **no lo publica en internet**. Verlo en tu computadora
sí; darle una dirección a otra persona para que entre, todavía no. Esa parte
falta y está declarada en la sección 6.

### Cuánto lleva

| Tramo | Tiempo |
| --- | --- |
| Leer esta página | 10 minutos |
| Las decisiones que solo vos podés tomar | de media hora a dos días |
| Armar el repositorio y dejarlo en verde | menos de un minuto de reloj |
| Dejar GitHub configurado como corresponde | una hora larga |

El tramo caro no es técnico: son las decisiones. Están en la sección 4 de esta
página y se contestan una sola vez.

### Qué necesitás tener antes de empezar

- **Una cuenta de GitHub.** Si no tenés, se crea gratis en un minuto.
- **Acceso de lectura al repositorio del marco.** Es privado: si no te lo
  compartieron, no vas a poder bajarlo, y eso lo destraba una persona, no un
  comando.
- **Una terminal.** No hace falta saber usarla: la página 04 te dice
  exactamente qué escribir y qué vas a ver.

**La regla de esta página:** ningún término técnico aparece sin explicarse acá
mismo o sin enlazar al [glosario](02-glosario.md), donde cada palabra propia del
marco tiene una línea. Si encontrás una que no cumple eso, es un defecto de la
página, no de tu lectura — y hay una comprobación automática que lo mide en cada
cambio, contra el glosario y contra una lista de palabras que esta página tiene
prohibido usar.

---

## 1. Qué es esto, en cuatro frases

Un equipo de software acumula acuerdos: se revisa antes de integrar, no se
manda una notificación de prueba a un cliente real, una contraseña que rota sola
no se copia a mano. **Projects es ese conjunto de acuerdos convertido en
verificaciones que corren solas**, más el repositorio de arranque que ya viene
con todas ellas conectadas.

Cada vez que alguien propone un cambio, el sistema comprueba que cumpla lo que el
equipo ya prometió. Si no lo cumple, no lo deja entrar. No decide **qué**
software se construye —eso es del negocio— sino **cómo** se construye, cómo se
revisa y cómo se entrega.

---

## 2. Por qué existe: la diferencia entre una regla y un acuerdo

Un acuerdo depende de que alguien se acuerde. Una regla no.

Ese es el corazón del asunto, y no es una frase de manual: cada verificación de
este marco nació de un incidente concreto con fecha y con costo, y todas siguen
el mismo patrón. Alguien sabía la regla. Alguien la aplicaba. Un día, con
prisa, no. La lista completa —qué pasó, qué enseñó y qué quedó construido— está
al principio del [`README.md`](../README.md) del repositorio, y vale la pena
leerla aunque no entiendas los detalles técnicos: se lee como una historia
clínica.

De ahí sale el criterio con el que entra o no entra cada pieza al marco:

> *¿Esto se puede hacer cumplir con una verificación automática, o depende de que
> un humano se acuerde?*

Si depende de que alguien se acuerde, **no cuenta como cumplido**. Es una
posición incómoda y deliberada: prefiere admitir que una regla no está garantizada
antes que declararla vigente porque está escrita en algún lado.

---

## 3. Qué cambia en tu día

| Lo que ganás | Lo que te va a pedir |
|---|---|
| Nadie puede meter un cambio sin que se revise y sin que las verificaciones pasen. No es una política: es mecánico | Que lo que el sistema tiene que hacer se escriba **antes** de construirlo, en un formato corto y sin código |
| Un proyecto nuevo nace con todo conectado —revisión, verificaciones, documentación de proceso— en un comando | Que tomes un puñado de decisiones que una plantilla no puede adivinar (te las enumero en la sección cuatro) |
| Los errores que ya costaron caro una vez no se pueden repetir: quedaron convertidos en verificaciones | Que cuando algo se bloquee, se destrabe arreglando lo que señala, no aprobándolo igual |
| Las mejoras del marco llegan solas a cada proyecto, como una propuesta que alguien revisa antes de aceptar | Que el proyecto no edite el marco por su cuenta: pide un parámetro, o propone el cambio para todos |

La palabra que vas a ver para «verificación que bloquea» es
[compuerta](02-glosario.md): una verificación que, si lo que mira está mal, no deja
pasar el cambio. Se opone a una que solo mira y anota.

---

## 4. Las preguntas que traés de verdad

### ¿Cuánto cuesta?

**El marco no cobra nada y no obliga a contratar ningún servicio propio.** Lo
que ejecuta son las verificaciones automáticas de GitHub —que corren en la
cuenta donde vive el repositorio, con el plan que esa cuenta tenga— y
herramientas de línea de comandos de código abierto, sin licencia. No hay
servidor que mantener: no hay nada corriendo entre cambio y cambio. Lo que sí
puede costar es el plan de esa cuenta, y está desglosado abajo.

Los tres lugares donde sí puede aparecer un costo, dichos sin adorno:

1. **Dónde se despliega el proyecto.** Es el gasto grande y **no lo decide el
   marco**: el proveedor lo elige cada proyecto. El marco verifica *propiedades*
   —que se pruebe en un ambiente antes que en producción, que dos despliegues
   simultáneos no se pisen, que lo desplegado se verifique después— y esas
   propiedades se cumplen igual en un proveedor caro que en uno con plan
   gratuito. La tabla capa por capa, con quién decide cada una, está en
   [03-stack.md](03-stack.md).
2. **La cuenta de GitHub.** Acá hay tres puntos, y el más importante es cuál de
   ellos está medido y cuál no. **El marco no cobra**: lo que puede cobrar es la
   cuenta donde vive el repositorio, según su plan.

   - **Protección de la rama principal — medido.** En un repositorio **privado**
     de plan gratuito, GitHub no la ofrece. O sea que la regla «para entrar a la
     rama principal hay que pasar por revisión» no se puede activar sin pagar un
     plan o sin hacer el repositorio público. Está medido, con el error que
     devuelve GitHub y con las tres salidas posibles, en
     [`.github/proteccion-main.md`](../.github/proteccion-main.md).
   - **Que un repositorio privado use las verificaciones de otro — depende del
     plan.** La forma en que las correcciones del marco llegan solas a un
     proyecto es que el proyecto **referencie** los archivos de este repositorio
     en vez de copiarlos. Para que eso funcione entre dos repositorios privados
     hay que habilitar un permiso de acceso entre repositorios, y esa opción
     depende del plan de la cuenta: el [`README.md`](../README.md) lo anota como
     requisito operativo, en «Principio de distribución», junto con el plan que
     hoy lo sostiene acá. Con los dos repositorios públicos no hace falta nada.
   - **El tiempo de máquina de las verificaciones — no medido acá.** En
     repositorios públicos GitHub no lo cobra; en repositorios privados la
     cuenta trae una cantidad incluida por mes y a partir de ahí se factura por
     uso. Cuánto viene incluido lo fija GitHub y cambia con el plan, así que ese
     número no se escribe en esta página: se mira en la factura de la cuenta.

   Fuera de eso, **las verificaciones en sí no tienen licencia que pagar**: son
   GitHub Actions y herramientas de código abierto.
3. **Tiempo de gente.** Escribir lo que el sistema tiene que hacer antes de
   construirlo cuesta horas al principio y las devuelve después. Es el costo
   real de adoptar esto, y es el único que ninguna herramienta te va a ahorrar.

### ¿Cuánto tarda arrancar un proyecto?

La parte mecánica es **un comando**: copia el repositorio de arranque completo,
reemplaza los valores del proyecto, y deja las verificaciones conectadas. Esa
parte no se mide en días.

Lo que tarda es lo que **no se automatiza a propósito**, porque no es
transcripción sino decisión o acto humano:

- crear el repositorio vacío,
- decidir los valores del proyecto (la sección siguiente),
- cargar en GitHub los valores y las credenciales que las verificaciones
  automáticas necesitan para correr,
- activar la protección de la rama principal, como acto deliberado.

Cada uno está enumerado, con su trampa conocida, en
[05-arrancar-tecnico.md](05-arrancar-tecnico.md). Esa página va de «no tengo
repositorio» a «las verificaciones están en verde». No traigas una estimación de
acá: traé la lista, que es lo que se puede planificar.

**Y si lo vas a hacer vos**, sin ser técnico, hay una página que te acompaña
comando por comando: [04-arrancar-acompanado.md](04-arrancar-acompanado.md).
Cada paso dice qué copiar, **qué vas a ver en pantalla**, cómo saber que salió
bien y cuánto tarda; trae además las cuentas que hay que abrir con sus límites
gratuitos medidos, y una tabla de los rojos que son esperados.

### ¿Qué decisiones voy a tener que tomar yo?

Tres grupos, y ninguno es técnico en el sentido de escribir código:

**Al arrancar** — una lista cerrada de valores que la plantilla no puede
adivinar: cómo se llama el proyecto, qué equipos revisan qué, qué dominios usa
cada ambiente, en qué canal suenan las alarmas. Están enumerados uno por uno, con
un ejemplo y el caso raro de cada uno, en
[`plantilla/README.md`](../plantilla/README.md). La lista es cerrada a propósito:
crece solo cuando se agrega una decisión nueva, y eso pasa con una propuesta de
por medio.

**Al principio del proyecto** — dónde se despliega. Es la decisión con más
impacto en el costo y la única que el marco deliberadamente no toma por vos.

**Todo el tiempo, si ocupás el rol de [PO](02-glosario.md)** — aprobar o devolver
cada propuesta de cambio. Eso tiene su propia página, con las cuatro preguntas
que sirven para rechazar una: [06-para-el-po.md](06-para-el-po.md).

### ¿Y si el equipo es una sola persona?

Funciona, y hay que ser preciso sobre qué parte se degrada.

**Lo que sigue funcionando igual**, que es la mayor parte del valor: todas las
verificaciones automáticas. No les importa cuánta gente hay. El que trabaja solo
es justamente quien más las necesita, porque no tiene a nadie que le mire el
trabajo.

**Lo que no puede funcionar**: la revisión cruzada. El marco pide que quien
revisa no sea quien escribió, y con una sola persona eso no existe. La regla
de GitHub que lo haría obligatorio está **declarada como diferida, con su
motivo escrito**, no apagada en silencio —encenderla con un solo revisor
bloquearía todo—. Esa distinción es una regla del marco: lo que se decide no
activar se declara; nunca se omite ni se presenta como activo.

**Lo que conviene saber**: el rol de [PO](02-glosario.md) y el de quien construye
—el [builder](02-glosario.md)— están separados a propósito, para que nadie se
apruebe a sí mismo. Si son la misma persona, la separación no existe. No es una
catástrofe; es una limitación que conviene tener escrita en vez de descubierta.

---

## 5. Cómo se ve el trabajo, de la idea a producción

Cuatro pasos. Los nombres entre paréntesis son los que vas a ver en el
repositorio.

1. **Se escribe por qué** ([proposal](02-glosario.md)). Un documento corto, en
   prosa, que contesta dos cosas: qué problema resuelve y qué cambia. Sin código.
2. **Se escribe qué tiene que pasar** (un [spec](02-glosario.md): la lista de
   promesas que el sistema va a cumplir, cada una con un caso concreto que
   permita verificarla). Esta es la parte que aprueba el negocio, y es legible
   sin ser técnico — está explicada línea por línea en
   [06-para-el-po.md](06-para-el-po.md).
3. **Se construye**, y en el camino las verificaciones automáticas comparan lo
   construido contra lo prometido.
4. **Entra**, si y solo si todo pasó. Al final el contrato vigente incorpora lo
   nuevo, y a partir de ahí las discusiones se ganan citándolo.

El paquete completo de esos documentos se llama [change](02-glosario.md), y cada
uno vive en su carpeta. Es todo texto: se puede leer, comentar y rechazar sin
abrir una línea de código.

---

## 6. Lo que este marco NO hace por vos

- **No decide qué construir.** No hay opinión de producto acá adentro.
- **No reemplaza el criterio del equipo.** Las verificaciones atrapan lo que ya
  pasó una vez. Lo que todavía no pasó lo tiene que cazar alguien pensando.
- **No garantiza que un proyecto salga bien.** Garantiza que no salga mal por
  una de las razones que ya se pagaron.
- **No se aplica solo a la fuerza.** Un proyecto puede apartarse de casi
  cualquier pieza; lo que el marco exige es que apartarse sea una **decisión
  declarada, con su motivo**, y no algo que se descubre después.
- **No publica tu aplicación, todavía.** Es el hueco más grande y está medido:
  en la guía paso a paso no aparece ni una vez la palabra «desplegar». Al
  terminar el recorrido tenés el proyecto verificado, en GitHub y **andando en
  tu computadora** —eso sí lo vas a ver, en el paso 7—; lo que falta es que
  alguien más pueda entrar desde internet. Se dice acá, y no escondido en una
  página técnica, porque enterarse al final es peor que saberlo al principio.

---

## El camino, y dónde estás

Vas por la primera. Las **diez** primeras se leen **en orden**; de la 11 en
adelante se abren el día que hace falta y no antes.

| | Página | Qué te deja |
| --- | --- | --- |
| **01** | Introducción | ← estás acá |
| **02** | [02-glosario.md](02-glosario.md) | Cada palabra rara del marco en una línea. Va segunda a propósito: de la 03 en adelante todas las páginas enlazan acá, y conviene haberla visto antes de tropezarse con el primer enlace |
| **03** | [03-stack.md](03-stack.md) | Con qué tecnología corre esto y, sobre todo, la decisión de **dónde va a vivir tu proyecto** — la que más cuesta si se toma tarde |
| **04** | [04-arrancar-acompanado.md](04-arrancar-acompanado.md) | El «hacelo conmigo»: qué comando copiar, qué vas a ver en pantalla, cómo saber que salió bien y qué rojos son normales |
| **05** | [05-arrancar-tecnico.md](05-arrancar-tecnico.md) | El mismo camino, contado para quien se mueve en una consola. Es el que manda si las dos se contradicen |
| **06** | [06-para-el-po.md](06-para-el-po.md) | Cuando el repositorio ya está verde y hay que aprobar o devolver la primera propuesta |
| **07** | [07-para-el-builder.md](07-para-el-builder.md) | La otra mitad del reparto: qué le toca a quien construye. Aunque hagas los dos roles, vale leer la que no estás ocupando |
| **08** | [08-descubrimiento.md](08-descubrimiento.md) | De los documentos del negocio a saber **qué** hay que construir. Es el tramo que más tiempo lleva y el único que no puede hacer una herramienta sola |
| **09** | [09-construir-con-openspec.md](09-construir-con-openspec.md) | De eso a un cambio que otra persona pueda revisar y aprobar. Es el **cómo** |
| **10** | [10-reglas-no-escritas.md](10-reglas-no-escritas.md) | Cómo se trabaja adentro una vez que todo anda |

Y el [`README.md`](../README.md) del repositorio, que es la puerta de entrada
para el equipo entero, empezando por la tabla de incidentes: cada verificación
de este marco nació de uno.
