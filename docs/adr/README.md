# ADRs — decisiones estructurales del marco

Un ADR registra una decisión que sería cara de revertir y que alguien, en
seis meses, va a querer entender sin arqueología de Slack. Formato corto y
fijo: **contexto / decisión / consecuencias**. Si te toma más de una página,
probablemente sean dos decisiones.

## Alcance: qué ADR vive acá y cuál vive en tu proyecto

| | Vive en | Ejemplos |
|---|---|---|
| **ADR de marco** | Projects (canónico, este directorio) | cómo se especifica, cómo se promueve a producción, cómo se verifica un deploy |
| **ADR de proyecto** | `docs/adr/` del repo del proyecto | qué base de datos, qué proveedor de auth, qué modelo de cobro |

Los ADRs de marco viven **solo acá**: si un proyecto los copia, nacen dos
verdades y una envejece. Desde el proyecto se referencian por nombre
completo — *"Projects ADR 002"* — y la numeración de los ADRs propios del
proyecto empieza en `001` sin colisionar con esta, porque el prefijo
"Projects" es lo que desambigua.

Discrepancia entre un ADR de proyecto y uno de marco: **gana el de marco**,
o el proyecto abre un ADR propio que diga explícitamente *"nos apartamos de
Projects ADR 00N porque..."*. Apartarse está permitido; hacerlo en silencio, no.

## Formato

```markdown
# ADR 00N — <título en una línea, la decisión, no el tema>

- **Fecha**: AAAA-MM (o AAAA-MM-DD si importa el día)
- **Estado**: propuesta | aceptada | reemplazada por ADR 00M
- **Decisores**: por ROL ({{PO}}, builders), nunca por nombre propio

## Contexto

Qué problema real había, con datos si los hay. Las alternativas evaluadas
y por qué se descartaron van acá o en la decisión — pero van.

## Decisión

Qué se decidió, en presente y en afirmativo.

## Consecuencias

Lo bueno y lo caro. Si la decisión tiene fecha de vencimiento o un
**trigger de reevaluación** ("si pasa X, volvemos a mirar esto"), va acá.

## Cómo lo hace cumplir el marco

Qué check falla solo cuando alguien se aparta. Si la respuesta es "nadie
lo revisa", el ADR está incompleto: o se automatiza, o entra al backlog de
[reglas no escritas](../11-reglas-no-escritas.md).
```

La última sección es propia de Projects y no es decorativa: **una decisión
estructural que depende de que alguien la recuerde no está tomada, está
deseada.**

## ADR retroactivo

Una decisión puede ser anterior a su registro. Pasa siempre: nace dentro
del design de un change, se implementa, y recién después alguien nota que
era estructural. Eso se escribe tal cual:

```markdown
- **Fecha**: 2026-07 (retroactivo, registrado 2026-08-14)
```

Registrar retroactivo **no es deuda ni trampa**: la alternativa real no es
"un ADR puntual", es ningún ADR. Lo que sí es obligatorio es la honestidad
de la fecha doble — la primera dice cuándo el sistema empezó a comportarse
así, la segunda cuándo lo pusimos por escrito. Un ADR fechado el día en que
se escribió, describiendo algo de hace un mes, miente sobre el historial.

## ¿ADR o change de OpenSpec?

- **Change de OpenSpec** cuando cambia el COMPORTAMIENTO o un contrato:
  algo que un spec vivo tendría que describir distinto después del merge.
- **ADR** cuando cambia una decisión ESTRUCTURAL que ningún spec describe:
  la elección de una herramienta, una topología, un principio de operación.
- Muchas veces son los dos: la decisión nace en el `design.md` del change y
  el ADR la extrae para que sobreviva al archive. El archive es historia
  inmutable del *cómo llegamos*; el ADR es el *dónde estamos parados*.

## Índice — ADRs del marco

| # | Decisión |
|---|---|
| [001](001-openspec-fuente-de-verdad.md) | OpenSpec como fuente de verdad del comportamiento |
| [002](002-trunk-based-promocion.md) | Trunk-based single-main con promoción por ambientes |
| [003](003-verificacion-in-pipeline.md) | Verificación post-deploy dentro del pipeline (read-only en prod) |
| [005](005-pin-y-constitucion-en-un-solo-pr.md) | El bump del pin y la constitución regenerada viajan en un solo PR, abierto por el repo del proyecto — **aceptada, implementación diferida** con trigger de reevaluación escrito |

**Por qué no hay 004, y no es un olvido.** El número está tomado por un ADR que
todavía vive en una rama sin mergear (*El área fija su base tecnológica, incluida
la infraestructura*). El 005 nació como 004 y se renumeró para no colisionar
cuando esa rama entre. Se comprueba sin salir del repo:

```bash
git log --all --oneline --diff-filter=AR --name-only -- 'docs/adr/00*'
git branch -a --contains "$(git log --all --format=%H --diff-filter=A -1 \
  -- 'docs/adr/004-base-tecnologica-del-area.md')"
```

El primer comando muestra el `004-base-tecnologica-del-area.md` que ocupa el
número; el segundo, la rama donde vive. Si esa rama se abandona, el hueco deja de
tener motivo y el 005 se renumera; mientras exista, renumerar sería reintroducir
la colisión.

> **Lo que este índice todavía no hace cumplir solo, y el comando que lo cierra.**
> Que las filas de arriba y los archivos del directorio sean los mismos es
> completamente decidible, y hoy depende de que alguien se acuerde — que es lo que
> este marco declara que no cuenta. El caso de banco que falta compara los dos
> conjuntos y exige biyección:
>
> ```bash
> diff <(ls docs/adr/0*.md | xargs -n1 basename | sed 's/-.*//') \
>      <(sed -n 's/^| \[\([0-9]\{3\}\)\].*/\1/p' docs/adr/README.md)
> ```
>
> Hoy sale vacío (comprobado). Vive en `pruebas/docs/documentacion.test.mjs`,
> junto al caso que ya exige que `06-para-el-po.md` y `02-glosario.md` estén enlazados
> desde el índice de `docs/`.

### Procedencia

Los tres primeros nacieron en el proyecto piloto, donde estaban numerados
`006`, `007` y `010` entre ADRs de producto (base de datos, auth, zona
horaria) que **no** son del marco y se quedaron allá. La renumeración es
deliberada: acá el `001` es el primer ADR *del marco*, no el sexto de un
proyecto. Las fechas originales de decisión se conservan intactas.

| Projects | Proyecto piloto |
|---|---|
| 001 | 006 — OpenSpec como fuente de verdad |
| 002 | 007 — Trunk-based single-main + promoción + reuso por tree |
| 003 | 010 — Verificación post-deploy dentro del pipeline |

## Placeholders

Los documentos del marco nombran los valores que cambian por proyecto con
la convención de dobles llaves del repo (`{{PROYECTO}}`, `{{ORG}}`,
`{{PO}}`, `{{BUILDER_1}}`, `{{CANAL_ALERTAS}}`, …). En un ADR son prosa: no
los sustituye ningún script, se leen como "el canal de alertas del
proyecto". En los archivos de **scaffold** sí se sustituyen al crear el
repo — ahí la lista completa vive en la plantilla correspondiente.
