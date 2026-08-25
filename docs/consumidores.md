# Registro de consumidores del marco

**Para quién es esta página.** Para quien mantiene el marco y necesita saber a
quién le rompe un cambio. **Es una página técnica y hoy es una tabla vacía**: no
hay nada que hacer acá salvo agregar una fila cuando un repositorio adopta el
marco.

**Palabras del marco que vas a ver acá**, cada una definida en una línea:
[bump](glosario.md), [censo](glosario.md), [fail-open](glosario.md),
[pin](glosario.md).

> **Este archivo está VACÍO a propósito y eso no significa «cero consumidores».**
> Significa que ninguna adopción pasó todavía por él. Es la mitad barata de la
> recomendación B1 de [censo-de-consumidores.md](censo-de-consumidores.md): el lugar
> donde se escribe la línea existe; **lo que falta es lo que la escribe**, y eso vive
> en `herramientas/projects-init.mjs`. Leer una tabla vacía como «nadie consume el
> marco» sería exactamente el fail-open que el censo denuncia — un escaneo que no
> encontró nada saliendo verde por construcción.

## Qué es y por qué está acá

El marco no puede razonar sobre su propio impacto si no sabe quién lo consume: a
quién le rompe un cambio breaking, quién quedó atrás de una corrección de seguridad,
y si una regla nueva la está cumpliendo alguien. El diseño vigente para contestarlo
—los PRs de bump de Dependabot **son** el censo— tiene un punto ciego estructural que
[censo-de-consumidores.md](censo-de-consumidores.md) explica entero: depende del
comportamiento de un tercero que el marco no puede verificar, y si ese tercero deja de
proponer bumps el censo no falla en rojo, se queda vacío y callado.

Este registro es el otro lado. Adoptar el marco es **el único momento** en que se sabe
con certeza que un repo lo consume, y es un momento en el que hay una persona con las
manos en el teclado. La línea se escribe ahí, cuando la información existe, en vez de
reconstruirse después.

## La regla

**Una fila por repo que consuma el marco, escrita en el PR de la adopción, contra este
repo.** Tres columnas, y ninguna de las tres se adivina:

| Columna | De dónde sale |
|---|---|
| **Repo** | La coordenada `<cuenta>/<repo>` con la que GitHub lo resuelve, escrita como se escribe |
| **Fecha de adopción** | El día en que `projects init` corrió sobre ese repo, o el día en que la skill `projects-adoptar` lo migró |
| **Versión con la que nació** | El `@vX.Y.Z` que quedó en el `uses:` de su `ci.yml`. Es una versión **exacta**: un repo pinado a un tag móvil no recibe PR de bump ni aparece en el censo, y por eso ese caso se anota igual, con el pin que tenga |

## El registro

| Repo | Fecha de adopción | Versión con la que nació |
|---|---|---|
| *(sin filas)* | | |

**Por qué no hay ninguna fila, dicho de frente y con sus dos causas separadas:**

1. **Los consumidores anteriores a este archivo no están acá y no se pueden reponer
   desde el árbol.** Reponerlos es la recomendación B2 —derivar el censo buscando en la
   organización—, que necesita una credencial de organización y por eso no entra por un
   PR. Escribir de memoria las filas que faltan sería inventar datos, que es peor que la
   tabla vacía: una fila inventada no se distingue de una medida.
2. **Las adopciones nuevas todavía no lo escriben solas.** Hoy la línea depende de que
   alguien se acuerde, y por la premisa de este marco eso no cuenta como enforcement.

La adopción que está en curso al 2026-08-24 tiene su propio registro de fricción en
[adopciones/2026-08-24-supply-chain.md](adopciones/2026-08-24-supply-chain.md), con la
versión del marco que pina y el repo destino; cuando aterrice, es la primera fila de
esta tabla.

## Lo que falta para que la fila no dependa de nadie

`herramientas/projects-init.mjs` ya imprime al final la lista numerada de pendientes
humanos que sale después de `escritos N archivos`. La línea del registro es **un
pendiente más de esa lista**: nombra este archivo, dice qué tres datos van en la fila,
y le dice a quien arranca que abra el PR contra el marco. Mientras eso no exista, el
comando lo mide:

```bash
node <ruta-al-clon>/herramientas/projects-init.mjs --valores valores.json \
  --destino <repo> --sin-herramientas 2>&1 | grep -i consumidores
```

Hoy ese `grep` no devuelve nada y sale **1**, que es exactamente la medición de que la
mitad automática no existe. El día que devuelva la línea, este párrafo se borra.

**El límite honesto, que sigue en pie aun con las dos mitades hechas:** es un paso que
alguien tiene que mergear. Lo que compra no es enforcement, es que una omisión se
vuelve *visible*: un repo en el registro sin PR de bump, y un PR de bump de un repo que
no está en el registro, son dos preguntas distintas y las dos se pueden hacer.
