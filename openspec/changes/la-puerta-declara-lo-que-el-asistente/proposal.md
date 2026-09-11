---
artefacto: proposal
dri: Builder 1
aprueba: PO  # `gobierno-contribucion`: qué se declara al nacer un proyecto
informado: PO / Builder 2
estado: pendiente-de-revision
---

# El camino más no-coder perdía la declaración más importante

## Por qué

El asistente por terminal pregunta si el repositorio va a ser público o privado, y
con **privado** emite un desvío:

> «El repositorio es privado en el plan gratuito de GitHub, donde la protección de
> rama **no existe** y la API responde 403. Las reglas del marco quedan escritas sin
> nada que las haga cumplir.»

**La puerta web no lo preguntaba ni lo derivaba.** `CAMPOS` son cinco —forma,
plataforma, equipo, compañero, dominio— y `visibilidad` no está entre ellos, así que
el valor llegaba **sin definir** y el desvío nunca se emitía.

O sea: **el camino más no-coder que ofrece el marco era el único que perdía esa
declaración.** El proyecto nacía sin compuerta de rama y sin decirlo — exactamente
el fail-open que `AGENTS.md` prohíbe, en el camino donde menos capacidad hay de
notarlo.

## Qué cambia, y por qué NO es una quinta pregunta

La respuesta obvia era agregar la pregunta al formulario. **Se descarta, y el propio
archivo ya tenía escrita la razón** — para el tipo de cuenta:

> «NO SE PREGUNTA, y no es un atajo: GitHub ya lo sabe y lo pone en el evento.
> Preguntárselo a la persona sería pedirle que averigüe algo sobre su propia cuenta
> que la herramienta tiene delante.»

El argumento vale igual para la visibilidad: está en el mismo evento
(`github.event.repository.visibility`). Se **deriva**, el formulario sigue teniendo
cuatro preguntas, y la declaración aparece.

## El default es «privado», y la asimetría es deliberada

Si el dato no llega, se asume **privado** — el caso sin protección — y se declara el
desvío de más.

**Un desvío sobrante se ve y se borra. Una protección que se dio por supuesta y no
existe no se ve hasta que alguien empuja a `main`.** Los dos errores no cuestan lo
mismo, así que el default no puede ser simétrico.

## Y el `ambientes: "uno"` cableado

`projects-puerta.mjs` fijaba `ambientes: "uno"` **sin un comentario que lo
explicara**, siendo que todos los demás valores de ese objeto tienen el suyo. Ahora
lo tiene, y con destino: la decisión del PO del 2026-09-10 elimina esa pregunta y la
topología pasa a ser siempre Local → DEV → PROD, así que el campo desaparece con
ella (`promocion-por-ambientes`, tarea 3.1).

No se borra acá porque hoy `ambientes` todavía alimenta a `projects-init.mjs`, y
sacarlo sin la promoción sería romper el contrato entre las dos herramientas por la
mitad.

## Impacto en los proyectos consumidores

**Ninguno en su pipeline.** Un proyecto nacido por la puerta web ahora recibe un
desvío más —el que le correspondía desde siempre— en su `.projects-desvios.json`. Es
MINOR.
