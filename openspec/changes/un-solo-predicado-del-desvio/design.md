---
artefacto: design
dri: Builder 1
aprueba: Builder 2 (builder par)
estado: pendiente-de-revision
---

# Design — un-solo-predicado-del-desvio

## Clasificación de distribución

| Pieza | Forma | Por qué |
|---|---|---|
| `.github/workflows/marco-ci.yml` (paso inline) | **referenciado** | los consumidores lo ejecutan por `uses:`; un cambio acá les llega con el bump |
| `pruebas/marco-ci/permisos-compuerta.test.mjs` | canónico | banco del marco |

Es la primera pieza referenciada que toca esta tanda, y por eso es la única con
sección «Para consumidores» en el CHANGELOG.

## Por qué no se unifican los predicados, que era lo obvio

La respuesta instintiva —exportar el predicado de `constitucion.mjs` y que el
paso lo importe— **no se puede**: `marco-ci.yml` es un workflow reusable, y
cuando lo llama un consumidor el checkout de ese job trae el árbol del
**consumidor**. El código del marco no está en disco; llega como composite
action, no como archivos.

Por eso el predicado está duplicado inline desde el principio. No fue descuido:
fue la única forma disponible. Lo que sí fue descuido es que las dos copias
**divergieran** sin que nada las cruzara.

Unificarlas de verdad exige mover la lectura de desvíos **dentro** de la
composite action y que el paso la invoque. Eso cambia el contrato de una pieza
publicada, así que va en su propio change, junto con el endurecimiento: son la
misma decisión.

## Por qué el aviso y no el rojo

Regla de `AGENTS.md`: endurecer un check que hoy dejan pasar repos que no
pidieron el cambio es breaking, y se estrena avisando.

No es hipotético: el caso verde que **ya existía** en este banco declara desvíos
con aprobador y **sin fecha**. Endurecer hoy lo pondría rojo, y con él a
cualquier consumidor en la misma situación.

## Anti-vacuidad

Tres guardas, porque un aviso es fácil de cablear mal:

1. el desvío **completo** NO avisa — si avisara siempre, los otros dos casos
   pasarían midiendo nada;
2. la **mutación** quita el predicado y comprueba que el aviso desaparece;
3. el caso sin aprobador exige **`exit 0`**, o sea que fija la absorción de HOY.
   Sin esa tercera, el día que alguien endurezca sin abrir la mayor, el banco lo
   dejaría pasar.

La tercera además obligó a corregir el fixture: con un solo permiso declarado el
repo salía rojo por el otro, y el caso no medía absorción sino otra cosa.
