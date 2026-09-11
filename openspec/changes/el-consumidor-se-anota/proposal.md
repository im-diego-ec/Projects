---
artefacto: proposal
dri: Builder 1
aprueba: PO  # la capability `gobierno-contribucion` es el modelo operativo del
             # area, y su gate es del PO (.github/CODEOWNERS, ultimas lineas).
             # NO puede ser el propio `dri`: un autor que se aprueba a si mismo
             # no es un review, y con `required_approving_review_count` en `0`
             # nada mas lo detiene
informado: PO / Builder 2
estado: pendiente-de-revision
---

# El consumidor se anota solo, en el unico momento en que el dato existe

## Por qué

`docs/14-consumidores.md` es una tabla con **`*(sin filas)*`**, y el propio
archivo explica por qué: el lugar donde se escribe la línea existe, pero **lo
que la escribe no**. Hoy la fila depende de que alguien se acuerde, y por la
premisa de este marco eso no cuenta como enforcement — es exactamente el
guardrail que `AGENTS.md` prohíbe: *«si no falla solo, no es un guardrail (es
documentación)»*.

**El dato es perecedero, y ahí está la urgencia.** Adoptar el marco es el único
instante en que se sabe con certeza que un repo lo consume, con una persona
mirando la pantalla. Pasado ese instante el dato sólo se puede reconstruir
—recomendación B2 del censo, que necesita una credencial de organización— o
inventar, y una fila inventada no se distingue de una medida. **Cada repo que
nazca antes de que esta línea exista es un consumidor que se pierde para
siempre.**

**Lo que hoy queda bloqueado por no tener el dato.** El marco no puede
responder ninguna de estas sin el registro: a quién le rompe un cambio
breaking, quién quedó atrás de una corrección, contra qué árbol correr una
compuerta nueva antes de publicarla, y si una regla nueva la está cumpliendo
alguien. `docs/13-censo-de-consumidores.md` ya nombra el punto ciego del diseño
vigente —los PRs de Dependabot **son** el censo— y dice que cuando ese tercero
deja de proponer bumps, el censo «se queda vacío y callado, que es exactamente
el fail-open que este marco prohíbe en todo lo demás».

## Qué cambia

`herramientas/projects-init.mjs` gana **un pendiente más** en la lista numerada
de actos humanos que ya imprime al final: nombra `docs/14-consumidores.md`, trae
los **tres datos ya resueltos** —no le pide a nadie que los averigüe— y dice que
se abre un PR contra el marco.

Los tres datos, y de dónde sale cada uno:

| Columna | De dónde sale |
|---|---|
| Repo | `ORG/PROYECTO`, los valores con los que se acaba de instanciar |
| Fecha de adopción | el día en que corrió, en ISO |
| Versión con la que nació | **se lee del `ci.yml` recién escrito en el destino** |

**La tercera se lee del archivo y no de una constante, a propósito.** El pin lo
fija `plantilla/.github/workflows/ci.yml` y lo mueve el paso 5 del release; una
constante en la herramienta sería una segunda declaración del mismo hecho, que
es el patrón que este marco ya se cazó a sí mismo más de una vez. Leerlo del
árbol recién escrito hace que la línea no pueda mentir: dice el pin que el repo
**tiene**, no el que alguien creyó que iba a tener.

## Qué NO cambia, y por qué

**Esto no automatiza la fila.** Sigue siendo un acto humano: alguien abre el PR
y alguien lo mergea. Lo que compra no es enforcement —el propio `docs/14` lo
declara como su límite honesto— sino que **la omisión se vuelve visible**: un
repo en el registro sin PR de bump, y un PR de bump de un repo que no está en el
registro, son dos preguntas distintas y las dos se pueden hacer. Prometer más
que eso sería escribir en la documentación una compuerta que no existe, que es
el defecto que este change viene a cerrar, no a repetir.

**No se reponen los consumidores anteriores.** Sigue en pie la causa 1 del
`docs/14`: escribir de memoria las filas que faltan es inventar datos.

## Impacto en los proyectos consumidores

**Ninguno en su pipeline.** El cambio vive en la herramienta que corre en la
máquina de quien arranca un proyecto, no en ningún workflow reusable: no toca
`inputs`, `secrets`, `outputs`, permisos del token ni nombres de jobs. Un repo
ya adoptado no ve absolutamente nada. Es MINOR.

## Cómo se mide que quedó hecho

El propio `docs/14-consumidores.md` dejó escrita la medición, y hoy sale 1:

```bash
node <ruta-al-clon>/herramientas/projects-init.mjs --valores valores.json \
  --destino <repo> --sin-herramientas 2>&1 | grep -i consumidores
```

Cuando devuelva la línea, ese párrafo del documento se borra — el documento
mismo lo dice.
