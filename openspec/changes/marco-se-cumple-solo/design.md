---
artefacto: design
dri: Builder 1
aprueba: Builder 1
informado: PO / Builder 2
estado: pendiente-de-revision
---

# marco-se-cumple-solo — Design

## Context

Los cuatro huecos comparten una forma: el marco **afirma** algo (en un README, en
una guía de bootstrap, en un comentario de YAML) y nada lo verifica. La pregunta
de diseño no es *qué* verificar —eso ya lo dice la afirmación— sino **dónde vive
el check** para que llegue solo a todos los proyectos, y **cómo falla** para que
el mensaje resuelva el problema en vez de solo señalarlo.

## Decisions

### D1 — Los checks viajan en el workflow reusable, no en el scaffold

Los cuatro nacen dentro del job de marco del workflow reusable. Un check que se
copia al scaffold llega una sola vez y después es del proyecto: si el marco
descubre un caso que el check no cubría, la corrección no llega a los repos ya
creados. Referenciado es la única forma que cumple «se arregla una vez para
todos», y es la razón por la que los proyectos consumen el marco por un tag móvil.

Consecuencia deliberada: los checks nuevos aparecen en cada consumidor sin que
nadie los active. Por eso su comportamiento en el consumidor actual se verificó
antes de proponerlos (ver Impact del proposal).

### D2 — El mensaje de fallo trae el arreglo, no el diagnóstico

Un check que dice «hay divergencia» obliga a quien lo recibe a investigar; uno
que dice «corré este comando exacto» lo resuelve. El marco ya pagó esta lección
tres veces con permisos de token: el fallo era detectable pero el síntoma no
nombraba la causa. Todos los checks de este change emiten el comando o la ruta
concreta que cierra el hallazgo.

Esto es también lo que hace barato el fallo del check de regenerados cuando
aparezca: viene con su propia solución.

### D3 — El check de regenerados compara declaraciones, no contenidos

La herramienta que genera los artefactos deja registrada en cada uno la versión
que lo produjo. El check compara esa declaración contra el pin vigente. La
alternativa —regenerar en CI y comparar el árbol resultante— se descartó: obliga
a ejecutar la herramienta en cada corrida, es sensible a cualquier diferencia
cosmética entre entornos, y convierte un check de segundos en uno frágil.

Límite asumido y declarado: detecta divergencia de **versión**, no manipulación
manual del contenido. Alguien que edite un artefacto generado sin tocar su
cabecera pasa el check. Es la deuda que este diseño acepta, y se prefiere a un
check frágil que el equipo termine ignorando.

### D4 — Verificar la ausencia de marcadores, no la corrección de los valores

El check de bootstrap comprueba que no quedan marcadores sin resolver. **No**
intenta validar que los valores sustituidos sean correctos —que el handle exista,
que la cuenta sea la del proyecto—: eso exige credenciales, red y conocimiento
del contexto, y su falso positivo bloquearía merges legítimos.

Es una elección de alcance, no un olvido: el modo de falla real observado es el
placeholder que sobrevive al bootstrap, no el valor bien sustituido pero
equivocado.

**Quién queda exento, y cómo se decide.** Un repositorio que *distribuye* el
scaffold —el marco mismo— contiene los marcadores a propósito: en la plantilla y
en toda la documentación que la explica. La exención se detecta **sola**, por la
presencia del scaffold en el repositorio, en vez de pedirse por parámetro: un
parámetro sería una perilla que un proyecto puede apagar por descuido, y este
check protege justamente contra el descuido.

La consecuencia se declara en vez de disimularse: de los tres checks, este es el
único que el marco **no se aplica a sí mismo**. Su valor está entero del lado de
los proyectos, y el log lo dice en cada corrida en vez de pasar en silencio.

### D5 — El requirement de serialización habla de propiedades, no de mecanismos

Se enuncia como **hacer cola sin cancelar** sobre ambientes compartidos, sin
nombrar el mecanismo del proveedor de CI ni un identificador de cola concreto.
Un proyecto con otra topología de ambientes debe poder cumplirlo.

Esto también preserva la asimetría que el marco ya practica y que sin enunciarla
parece un descuido: en la verificación **sí** se cancela lo obsoleto (una corrida
que un push nuevo dejó sin sentido no cuesta nada perder), mientras que en el
despliegue **no** (una corrida a medias deja el ambiente compartido en estado
corrupto). Lo que distingue los dos casos es si la interrupción deja estado, y el
requirement lo dice así.

## Cómo se hace cumplir solo

| Requirement | Check | Falla cuando |
|---|---|---|
| Artefactos regenerados sin divergencia | job de marco | la versión declarada en un artefacto generado ≠ el pin vigente |
| Definiciones de pipeline validadas | job de marco | una definición de pipeline no parsea o tiene una expresión inválida |
| Sin marcadores del scaffold | job de marco (no aplica al repo que distribuye el scaffold) | queda un placeholder o un hueco marcado en el repo consumidor |
| Despliegues serializados | — | **no tiene check automático** |

La última fila es la excepción honesta de este change: la serialización se
configura en el workflow de despliegue de cada proyecto, que el marco **no**
provee todavía (el esqueleto de entrega es un change posterior). Hasta entonces
el requirement es contrato verificable en revisión, no check. Se declara acá como
deuda en vez de dejar la tabla dando a entender que los cuatro se cumplen solos.

## Riesgos

- **El check de regenerados encontraría rojo al consumidor actual.** La
  constitución del marco define como breaking «endurecer un check de modo que un
  repo que hoy pasa mañana falle», y prescribe estrenar en modo aviso y endurecer
  en el major siguiente. Acá se resuelve por **orden** en vez de por modo aviso:
  la regla habla de un consumidor *que no modifica una sola línea*, así que si el
  consumidor regenera primero y el check aterriza después, no hay repo roto y no
  hay major que abrir. El modo aviso queda para el caso que la regla contempla
  —endurecer contra consumidores que no controlamos—, que hoy no aplica: hay uno
  solo y es nuestro. Cuando haya varios, se estrena como aviso.
- **Un check nuevo que falla en falso bloquea a todos los consumidores a la vez.**
  Es el precio de referenciar en vez de copiar. Por eso los tres automatizables se
  verificaron contra el consumidor real antes de proponerse, y por eso el marco se
  valida a sí mismo con su propio workflow: si un check no sirve para este repo,
  tampoco sirve para los demás.
- **El de marcadores puede dar falso positivo** si un proyecto usa legítimamente
  la misma sintaxis de doble llave en su documentación. El patrón se restringe a
  la forma exacta que el scaffold emite, que ya se distingue de las expresiones
  del proveedor de CI.
