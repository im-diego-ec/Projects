# ADR 001 — OpenSpec como fuente de verdad del comportamiento

- **Fecha**: 2026-07 (retroactivo, registrado 2026-08-14; nació en el
  proyecto piloto como ADR 006)
- **Estado**: aceptada
- **Decisores**: builders, con el {{PO}} como dueño del *qué*

## Contexto

El primer intento fue un `spec/` casero estilo SDD-lite: markdown libre,
una carpeta por tema, todo escrito a mano. No escaló y se vio exactamente
dónde:

- **Sin deltas.** Cada cambio reescribía el documento entero, así que el
  diff del PR mezclaba "lo que cambia" con "lo que se reacomodó". Revisar
  un cambio de comportamiento exigía releer el spec completo.
- **Sin validación.** Nada impedía que un spec quedara a medias, se
  contradijera con otro o describiera un sistema que ya no existía. La
  única red era que alguien se acordara.
- **Sin flujo de aprobación por artefacto.** El *por qué* y el *cómo* se
  aprobaban juntos, o sea nunca: quien revisaba el diseño técnico ya venía
  arrastrando la decisión de producto.

Cuando una auditoría de buenas prácticas devolvió 74 hallazgos que había
que ordenar en un plan de trabajo, la falta de estructura dejó de ser
incómoda y pasó a ser bloqueante.

## Decisión

**OpenSpec** (paquete `@fission-ai/openspec`) es la fuente de verdad del
comportamiento. El código es el artefacto generado y verificable.

Tres piezas y un ciclo:

- `openspec/specs/` — **el contrato vigente**, análogo a `main`: lo que el
  sistema garantiza HOY, en documentos completos y autónomos. Para saber
  cómo se comporta algo, se lee acá.
- `openspec/changes/<nombre>/` — **el change activo**, análogo a un PR:
  `proposal` (por qué) → `specs` (deltas ADDED/MODIFIED/REMOVED con
  `#### Scenario:`) → `design` (cómo, con alternativas descartadas) →
  `tasks` (bloques ejecutables con evidencia).
- `openspec/changes/archive/` — **la historia inmutable**: al archivar, los
  deltas se funden en los specs vivos y el change entero se mueve acá.
  **El archive ES el changelog del proyecto** — no se mantiene un
  `CHANGELOG.md` aparte.

Reglas duras que acompañan la decisión:

1. **Versión del CLI PINNEADA**, la misma en CI y en las máquinas del
   equipo. Dos motivos: que la validación dé el mismo veredicto en los dos
   lados, y que el nombre `openspec` a secas en npm sea un paquete ajeno
   (squatting) — el correcto es `@fission-ai/openspec`. El proceso para
   subir el pin vive en [upgrade-openspec.md](../upgrade-openspec.md).
2. **`openspec validate --all --strict` en CI**, en TODO PR y push, sea de
   código o de docs. Es barato (sin base de datos, sin instalar el
   monorepo) y es el único check que corre en los dos carriles.
3. **Tras editar cualquier artefacto**: `validate --strict` **más** una
   relectura de coherencia entre `proposal`/`specs`/`design`/`tasks` antes
   de commitear. El validador ve la forma; la coherencia entre artefactos
   la ve una persona.
4. **Aprobación por artefacto y por rol**: proposal y specs los aprueba el
   {{PO}} (son el *qué* y el *por qué*, en lenguaje de negocio); design y
   tasks los revisa el builder que **no** los escribió (gate técnico).

Un spec anterior a la adopción no se borra: se mueve a `docs/legacy-spec/`
con un LEEME que revoca su autoridad. Historia preservada, autoridad
revocada — si contradice a `openspec/`, gana `openspec/`.

## Consecuencias

- Todo cambio de comportamiento deja rastro completo: por qué, qué, cómo y
  con qué evidencia. Un año después, la pregunta "¿por qué esto funciona
  así?" tiene respuesta sin entrevistar a nadie.
- El costo es real: un change chico son cuatro artefactos y dos
  aprobaciones. Por eso existe la frontera **change vs PR directo** — se
  abre change cuando cambia comportamiento o un contrato, y va PR directo
  cuando se RESTITUYE comportamiento ya especificado (bugfix contra un
  scenario existente, refactor sin cambio observable, deps, docs, tooling).
  Regla de olfato: si el PR necesitaría explicar una DECISIÓN y no solo un
  arreglo, era un change.
- **El archive tiene filos conocidos** (cazados en producción, no en
  teoría):
  - Un `MODIFIED` reemplaza el requirement COMPLETO. Si el delta omite un
    escenario vigente, el archive lo **borra** del spec vivo. Pasó una vez;
    de ahí salió el guardrail de deltas en CI.
  - El guardrail y el validador comparan por TÍTULO de requirement: si el
    delta retitula, se trata como requirement nuevo y al archivar
    sobreviven los dos. Los títulos se conservan textualmente.
  - Una capability que NACE por archive nace con `Purpose: TBD`, porque los
    deltas no transportan el Purpose. Se completa en el MISMO PR del
    archive.
  - En Windows, `openspec archive` puede fallar con `EPERM` y hacer
    rollback silencioso de todo — ver
    [upgrade-openspec.md](../upgrade-openspec.md).

## Cómo lo hace cumplir el marco

| Regla | Check que falla solo |
|---|---|
| Specs y changes válidos | `openspec validate --all --strict` en el workflow de CI del marco, en todo PR y push, en los dos carriles (código y docs) |
| Sin pérdida de escenarios al archivar | Guardrail de deltas en CI: compara el delta contra el spec vivo y falla si un `MODIFIED` omite escenarios vigentes |
| Versión única del CLI | El pin vive en UN solo lugar del marco; los repos que consumen el workflow reusable no repiten el número |
| Aprobación por rol | CODEOWNERS más el ruleset: el par revisor se asigna solo y el PR no mergea sin su aprobación |

Lo que **no** está automatizado y depende de disciplina: la relectura de
coherencia entre artefactos, el `Purpose` real de una capability nacida por
archive, y la conservación textual de los títulos de requirement. Los tres
están anotados como backlog en
[reglas-no-escritas.md](../reglas-no-escritas.md).
