# Registro de consumidores del marco

**Para quién es esta página.** Para quien mantiene el marco y necesita saber a
quién le rompe un cambio. **Es una página técnica y hoy es una tabla vacía**: no
hay nada que hacer acá salvo agregar una fila cuando un repositorio adopta el
marco.

**Palabras del marco que vas a ver acá**, cada una definida en una línea:
[andamio](02-glosario.md), [bump](02-glosario.md), [censo](02-glosario.md),
[fail-open](02-glosario.md), [pin](02-glosario.md).

> **Este archivo está VACÍO a propósito y eso no significa «cero consumidores».**
> Significa que ninguna adopción pasó todavía por él. Es la mitad barata de la
> recomendación B1 de [13-censo-de-consumidores.md](13-censo-de-consumidores.md).
> **La mitad que escribe la fila YA existe**: `herramientas/projects-init.mjs` la
> imprime resuelta al terminar un arranque (ver «De dónde sale la fila», más abajo).
> Lo que falta es el acto humano que no se puede automatizar desde acá — abrir y
> mergear el PR contra este repositorio — y la ruta de la skill `projects-adoptar`,
> para el repo que adopta el marco sin pasar por el arranque. Leer una tabla vacía
> como «nadie consume el marco» sería exactamente el fail-open que el censo denuncia
> — un escaneo que no encontró nada saliendo verde por construcción.

## Qué es y por qué está acá

El marco no puede razonar sobre su propio impacto si no sabe quién lo consume: a
quién le rompe un cambio breaking, quién quedó atrás de una corrección de seguridad,
y si una regla nueva la está cumpliendo alguien. El diseño vigente para contestarlo
—los PRs de bump de Dependabot **son** el censo— tiene un punto ciego estructural que
[13-censo-de-consumidores.md](13-censo-de-consumidores.md) explica entero: depende del
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
2. **Las adopciones nuevas ya no dependen de que alguien se acuerde de los datos, pero
   sí de que alguien mergee el PR.** El arranque imprime la fila con sus tres columnas
   resueltas; lo que no puede hacer es abrir un pull request contra **otro**
   repositorio desde una máquina que puede no tener credenciales para escribir ahí.
   Eso sigue siendo un acto humano, y este documento no lo llama enforcement.

La adopción que está en curso al 2026-08-24 tiene su propio registro de fricción en
[adopciones/2026-08-24-supply-chain.md](adopciones/2026-08-24-supply-chain.md), con la
versión del marco que pina y el repo destino; cuando aterrice, es la primera fila de
esta tabla.

## De dónde sale la fila

`herramientas/projects-init.mjs` la entrega **resuelta** al terminar un arranque,
como un pendiente más de la lista numerada de actos humanos. No pide averiguar
nada: imprime las tres columnas en su orden, listas para pegar.

```
  7. La fila de ESTE repo en el registro de consumidores del marco.
     Va por PR contra el repo del marco, en docs/14-consumidores.md:
       | Ejemplo-Org/people-agenda | 2026-09-10 | v1.9.6 |
```

**La versión se lee del `ci.yml` que la herramienta acaba de escribir en el
destino, no de una constante.** El pin lo fija el andamio y lo mueve el paso 5 del
release; declararlo aparte en la herramienta sería un segundo lugar donde vive el
mismo hecho, y nada lo cruzaría. Leerlo del árbol hace que la línea no pueda
mentir: dice el pin que el repo **tiene**. Si no se puede leer, la fila lo declara
—`NO SE PUDO LEER`— en vez de completar un valor adivinado, porque una versión
inventada no se distingue de una medida. Lo verifica
`pruebas/init/consumidor-se-anota.test.mjs`, cruzando las dos lecturas.

La medición que este documento usaba para saber si la mitad automática existía:

```bash
node <ruta-al-clon>/herramientas/projects-init.mjs --valores valores.json \
  --destino <repo> --sin-herramientas 2>&1 | grep -i consumidores
```

Hoy devuelve la línea y sale **0**.

**El límite honesto, que sigue en pie:** es un paso que alguien tiene que
mergear, y el PR va contra **otro** repositorio —el del marco— desde una máquina
que puede no tener credenciales para escribir ahí. Lo que se compra no es
enforcement: es que la omisión se vuelve *visible*. Un repo en el registro sin PR
de bump, y un PR de bump de un repo que no está en el registro, son dos preguntas
distintas y las dos se pueden hacer.

**Lo que sigue faltando, y no lo tapa esta mitad:** la migración por la skill
`projects-adoptar` todavía no nombra el registro, así que un repo que adopta el
marco sin pasar por el arranque no recibe la línea.
