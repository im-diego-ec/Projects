---
artefacto: proposal
dri: Builder 1
aprueba: PO  # `gobierno-contribucion`: qué acredita que una versión se puede
             # publicar es modelo operativo del área
informado: PO / Builder 2
estado: pendiente-de-revision
---

# El procedimiento destruía el único rastro de su propia precondición

## Por qué

`AGENTS.md` fija que **ninguna versión se publica sin probarse contra un
consumidor real**. La evidencia de ese ensayo es una terna —id de corrida + SHA
del consumidor + SHA del marco pineado— y hasta hoy vivía en **un comentario del
PR del ensayo**.

Ese PR lo cierra el paso 5 de `projects-validar-consumidor` con
`--delete-branch`. **El procedimiento manda destruir el único rastro reproducible
de la precondición que el release declara haber cumplido.**

Y la única verificación mecánica del paso 6 del release era:

```bash
gh release view vX.Y.Z --json body --jq '.body | length'
```

El largo dice que hay texto. No dice que se haya probado nada. **Medido:
`grep -c "actions/runs" CHANGELOG.md` devolvía `0` sobre 237 KB.** O sea: cero
releases con evidencia recuperable, y ninguna compuerta que lo notara.

Es el patrón que `AGENTS.md` prohíbe de frente: *«si no falla solo, no es un
guardrail»*. La precondición 1 del release se apoyaba en una premisa que nadie
comprobaba.

## Qué cambia

1. **La terna va al `CHANGELOG.md`**, en la entrada de la versión que se valida —
   no a un comentario. No hace falta inventar superficie: el paso 6 del release
   **ya** recorta el changelog a las notas publicadas.
2. **El paso 6 exige la evidencia** antes de dar el release por cerrado: un id de
   corrida y al menos un SHA de 40 caracteres en el cuerpo publicado, con el texto
   diciendo que sin eso el release **no está cerrado**.

## Por qué el CHANGELOG y no un archivo nuevo

Porque ya se verifica y ya viaja. Un archivo nuevo sería una superficie más que
alguien tiene que acordarse de mirar, que es la clase de guardrail que este marco
no acepta. La regla derivada: *hacer que el dato viaje a una superficie que ya se
verifica* — más barato y más difícil de saltear que inventar una.

## Lo que NO se hizo, y es deliberado

**No se quitó el `--delete-branch`.** Dejar la rama viva conservaría el rastro,
pero también el **pin temporal al SHA**, que es peor: `AGENTS.md` prohíbe
apuntar a un SHA fuera del ensayo. Un caso del banco fija que el cierre sigue ahí,
para que nadie «arregle» esto por el lado equivocado.

## Lo que queda declarado

**Ninguna compuerta de CI verifica que las entradas publicadas del `CHANGELOG.md`
traigan la terna.** Hoy es una comprobación del procedimiento, no del pipeline, y
las 19 versiones ya publicadas no la tienen. Convertirla en check pondría rojo el
archivo entero de entrada.

**Destino:** change propio, estrenando en modo aviso y acotado a las entradas
**nuevas** —la fecha de la versión decide—, que es la única forma de no enrojecer
la historia.

## Impacto en los proyectos consumidores

**Ninguno en su pipeline.** Cambia el procedimiento de publicación del marco.
Lo que sí ganan es una nota de release que dice contra qué se probó. Es MINOR.
