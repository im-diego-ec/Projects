# ADR 005 — El bump del pin y la constitución regenerada viajan en un solo PR, abierto por el repo del proyecto

- **Fecha**: 2026-08-23
- **Estado**: aceptada (implementación diferida — ver *trigger* al final)
- **Decisores**: builders

## Contexto

El marco llega a un proyecto por cuatro carriles, y uno de ellos es distinto a
los otros tres. Lo **referenciado** (`uses: .../projects/...@vX.Y.Z`) no se copia:
se resuelve en cada corrida. La **constitución**, en cambio, es texto que los
agentes **cargan desde el árbol** (`.projects/AGENTS-marco.md`,
`.cursor/rules/00-marco.mdc`), así que tiene que existir como archivo
commiteado en el repo del proyecto.

Consecuencia: cada versión del marco mueve **dos cosas** que deben quedar
consistentes — los pines y el artefacto derivado. Hoy las mueven dos mecanismos
distintos: los pines por un PR de Dependabot, el artefacto por el workflow
semanal `actualizar-marco.yml` del andamio.

**Ese reparto no funciona, y está medido, no deducido.**

`actualizar-marco.yml` corre la action de la versión que el repo **ya tiene
pinada**, y el canónico viaja *dentro* de esa action. En modo escribir, por lo
tanto, regenera el artefacto de la versión que ya estaba. Medido el 2026-08-22
en un repo consumidor con el pin en `1.4.1`: salida `version 1.3.0, sha
22b7d8ee231f`, byte por byte idéntica al archivo del árbol, sin cambios y sin
PR. Para su propio caso de uso —*el marco publicó, traeme la constitución al
día*— **es un no-op**.

Y el PR de bump, del otro lado, nace rojo. Simulado el 2026-08-23 con los pines
en `1.6.0` y el artefacto intacto en `1.3.0`:

```
exit 1
::error::.projects/AGENTS-marco.md declara la version 1.3.0 y el marco publica
la 1.6.0: le faltan reglas. Es exigible desde 2026-08-22, asi que ya es un fallo.
```

O sea un **bloqueo circular**: el PR del bump está rojo porque le falta el
artefacto; el workflow que regenera el artefacto corre el pin viejo y no puede
producirlo; y el pin nuevo —el único con el que se puede regenerar— vive
adentro del PR rojo.

### Alternativas evaluadas

1. **A mano** (lo que pasa hoy): bajar el artifact `constitucion-al-dia` que el
   job de marco sube en cada corrida y commitearlo sobre el PR del bump.
   Funciona, y con un consumidor cuesta dos minutos. **Descartada como
   destino**: es un paso manual **por consumidor y por versión**, y la premisa
   del marco —escrita en el encabezado del propio workflow— es que *un ritual
   que alguien debe recordar no cuenta como enforcement*. El costo real no son
   los minutos: un bump molesto es un bump que se posterga, y un consumidor que
   deja de subir versiones es exactamente lo que se buscaba evitar al **retirar
   la ventana de gracia** en la 1.6.0.
2. **Un workflow que reaccione al PR de Dependabot** y le empuje el artefacto a
   la rama. Confirmado contra la documentación de GitHub (2026-08-23): una
   corrida disparada por un evento de Dependabot recibe un `GITHUB_TOKEN` de
   **solo lectura** y los únicos secrets disponibles son los **secrets de
   Dependabot** — los de GitHub Actions no están disponibles. No es imposible,
   pero exige **duplicar la credencial en un segundo almacén** —y rotarla en
   los dos— para escribir desde una corrida cuyo propio token no puede
   escribir. Es la configuración más fácil de dejar mal.
3. **Que el check tolere un bump en vuelo**, comparando la versión pinada en la
   base contra la de la cabeza. Cero permisos nuevos. **Descartada**: mueve el
   atraso a `main`. Después del merge, `main` queda con el pin nuevo y el
   artefacto viejo, así que el **PR siguiente** sale rojo por algo que no es
   suyo — y un rojo que no es tuyo es la forma más rápida de enseñar a ignorar
   los rojos. Debilita la compuerta exactamente donde el artefacto se carga en
   cada sesión.
4. **Que el marco abra el PR en cada consumidor**. Descartada **por
   principio**, y el principio no se negocia: *el marco jamás escribe en el
   repositorio de un proyecto*. Un marco con permiso de escritura sobre todos
   los repos del área es un punto único de falla catastrófica.

## Decisión

`actualizar-marco.yml` —que ya vive en el repo del proyecto y ya tiene permiso
de escritura sobre él— **mueve también el pin**. En una corrida:

1. resuelve la última versión publicada del marco;
2. reescribe los pines del repo a esa versión;
3. corre `actions/constitucion` **de esa** versión en modo escribir;
4. abre **UN** PR: pines nuevos + artefacto regenerado.

Ese PR **nace verde**, porque las dos mitades de un mismo cambio llegan juntas.
Es la propiedad que se está comprando; todo lo demás es consecuencia.

**El disparador se corrige de paso.** El evento que importa no es el calendario
sino *el marco publicó una versión*. El cron semanal queda como aproximación
barata mientras no exista el aviso de publicación (fila 14 del backlog de
[reglas no escritas](../08-reglas-no-escritas.md)), pero deja de pretender que
hace algo que medimos que no hace.

**Corolario que hay que decir en voz alta**: el bump del marco **deja de venir
por Dependabot**. Con él se cae la idea de usar sus PRs como censo de
consumidores — y no es pérdida: barrer la organización por API da la lista en un
minuto y **no depende del comportamiento de un tercero**, que era el punto ciego
que [el censo](../10-censo-de-consumidores.md) ya nombraba. Cada mecanismo hace una
cosa: el censo sale del barrido, el bump sale de este workflow.

## Consecuencias

- Las dos mitades de un cambio viajan en un PR y llegan verdes. No hay paso
  manual por consumidor por versión, y el marco sigue sin escribir en ningún
  repo de proyecto.
- **Caro y hay que asumirlo**: el consumidor necesita un token con lectura al
  repo privado del marco para resolver la última versión. Eso convierte
  `TOKEN_ACTUALIZAR_MARCO` de **opcional en requerido** por repo — carga
  operativa real, más rotación. Debe ser una **GitHub App de la organización**,
  no un PAT personal: un PAT personal ata el mecanismo a una persona y muere con
  su cuenta.
- El bump del marco sale de la cobertura de Dependabot, así que **nada externo
  contrasta** que el pin esté al día. Mitigación existente: el check de
  constitución se pone rojo cuando el artefacto queda atrás, y
  `pruebas/andamio/pinado.test.mjs` cubre el lado del marco.
- **La dirección de fondo, que este ADR no resuelve**: el problema existe porque
  el artefacto es un **derivado commiteado**, y mantener sincronizado un derivado
  en N repos siempre cuesta algo. La salida real es que deje de estar
  commiteado — que se genere en la máquina y en el CI desde la versión pinada, e
  ignorado por git. Eso exige un canal por el que una máquina de desarrollo pueda
  bajar el canónico de un repo privado; hoy solo Actions puede. O sea un registro
  de paquetes que el área no tiene.
- **Trigger de reevaluación**: si aparece un registro de paquetes privado, se
  reconsidera todo esto contra el derivado no commiteado. Y si con el segundo
  consumidor el token por repo resulta peor que el paso manual, gana el paso
  manual y este ADR se reemplaza.
- **Trigger de implementación**: cuando exista el **segundo** consumidor del
  marco (repo del proyecto Supply Chain, desde el 2026-08-24). A propósito no
  antes: con un solo consumidor, los defectos de este workflow se descubrirían en
  el único consumidor que hay.

## Cómo lo hace cumplir el marco

| Regla | Check que falla solo |
|---|---|
| El artefacto de la constitución no puede quedar atrás del pin | Ya existe: el job de marco del `ci.yml` se pone rojo y sube el artefacto corregido como `constitucion-al-dia` |
| Ningún `uses:` del marco apunta a un tag móvil ni a una versión vieja | Ya existe: `pruebas/andamio/pinado.test.mjs` |
| **El pin y el artefacto se mueven juntos, en un PR** | **Nada, todavía** — fila 21 del [backlog](../08-reglas-no-escritas.md#backlog-de-automatización) |

La tercera fila es la decisión de este ADR y hoy **no está enforzada**: hasta que
el workflow mueva el pin, lo que pasa es la alternativa 1 —el paso manual—, y el
encabezado de `plantilla/.github/workflows/actualizar-marco.yml` lo declara ahí
mismo, con la medición y con el arreglo. Una decisión estructural que depende de
que alguien la recuerde no está tomada, está deseada: por eso queda con fila
propia en el backlog y no como buena intención en este archivo.
