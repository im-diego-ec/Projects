## Cómo trabajamos: OpenSpec

La fuente de verdad del comportamiento es **`openspec/`**.

<!-- projects:regla id=openspec-roles -->

**Roles**: **{{PO}} es el PO** — dueño del _qué_ y el _por qué_ (proposal y specs,
con los scenarios en lenguaje de negocio). **{{BUILDER_1}} y {{BUILDER_2}} son
builders** — dueños del _cómo_ (design, tasks, implementación), con review cruzado
entre ellos: el builder que no escribió, revisa. Independiente del rol, la regla
operativa se mantiene: **toda escritura en producción exige el OK explícito de
{{BUILDER_1}}**.

<!-- projects:regla id=openspec-flujo -->

1. **Proposal** → por qué y qué cambia. **Aprueba {{PO}} (PO)**.
2. **Specs** → deltas con `#### Scenario:` (ADDED/MODIFIED/REMOVED), en lenguaje de
   negocio. **Aprueba {{PO}} (PO)**.
3. **Design** → decisiones con alternativas descartadas. Lo escribe un builder; **lo
   revisa el otro** (gate técnico).
4. **Tasks** → bloques ejecutables con evidencia. Al aprobarse: sub-issues por bloque
   colgados del issue macro.
5. **Implementar** → TDD (rojo evidenciado en LOCAL), un PR por bloque, **review
   cruzado entre builders** de cada diff.
6. **Verify + archive** → el change cierra solo cuando los specs vivos validan
   `--strict` y las tareas tienen evidencia; el PR final cierra el issue macro vía
   `Closes`.

<!-- projects:regla id=openspec-validar-tras-editar -->

- Tras editar CUALQUIER archivo de `openspec/`: `openspec validate --strict` **más**
  relectura de coherencia entre proposal/specs/design/tasks antes de commitear. Las
  herramientas verdes no bastan para specs que cambian contrato: un delta `MODIFIED`
  debe reproducir **todos** los escenarios vigentes del requirement o el archive los
  borra en silencio, y el guardrail de deltas tiene un hueco conocido — si el
  **título de un requirement** del delta no existe en el spec vivo, no avisa.

<!-- projects:regla id=openspec-ciclo-de-vida -->

**El ciclo de vida de los specs** (modelo mental, en analogía git):

- `openspec/specs/` = **el contrato vigente** ("main"): lo que el sistema garantiza
  HOY. Documentos completos y autónomos; CI los valida `--strict` en cada PR. Para
  saber cómo se comporta algo, se lee AQUÍ.
- `openspec/changes/<nombre>/specs/` = **deltas** ("el diff del PR"): propuestas
  ADDED/MODIFIED/REMOVED contra los specs vivos. Solo existen mientras el change está
  activo.
- `openspec archive` = **el merge**: funde los deltas en los specs vivos (una
  capability nueva NACE ahí; una existente se actualiza) y mueve el change a
  `changes/archive/` como historia inmutable. Tras archivar, nadie lee el delta para
  entender el sistema — lee el spec vivo; el archive responde "por qué quedó así".
- ⚠️ Gotcha del CLI: una capability creada por archive nace con `Purpose: TBD` —
  completarlo en el MISMO PR del archive, no dejarlo.

<!-- projects:regla id=openspec-change-o-pr-directo -->

**¿Change de OpenSpec o PR directo?** La pregunta diaria del builder:

- **Change de OpenSpec** cuando cambia el COMPORTAMIENTO o un contrato: feature
  nueva, regla de negocio, contrato de API o schema de datos, topología del pipeline,
  cualquier cosa que un spec vivo tendría que describir distinto después del merge.
- **PR directo** (con test y su issue si existe) cuando se RESTITUYE comportamiento
  ya especificado o no se toca comportamiento: bugfix contra un scenario existente,
  dependencias (salvo majors de auth o del runtime), refactor sin cambio observable,
  docs, tooling.
- Duda = pregunta corta al PO o al builder par en el PR. Regla de olfato: si el PR
  necesitaría explicar una DECISIÓN (no solo un arreglo), era un change.

<!-- projects:regla id=openspec-archive-es-el-changelog -->

- El **archive de OpenSpec ES el changelog** del proyecto — no se mantiene un
  `CHANGELOG.md` aparte. Las decisiones estructurales viven como ADRs en `docs/adr/`;
  los incidentes dejan post-mortem en `docs/postmortems/` (48h, sin culpas) y lo
  operativo del "qué hago cuando suena la alarma" vive en `docs/runbooks/`.

<!-- projects:regla id=leccion-de-incidente-sube-al-marco -->

- **La lección de un incidente no se queda acá.** Un post-mortem de {{PROYECTO}} que
  deja una lección accionable se propone como change **en Projects**, en frío, dentro de
  las 48 horas: un guardrail que solo protege al repo donde ardió es trabajo a
  medias. Si no se puede generalizar, se escribe la razón. "No se pudo" es una
  conclusión válida; "no lo intentamos", no.

---
