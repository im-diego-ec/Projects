## GitHub: branches, issues, PRs, Projects

<!-- projects:regla id=github-branches -->

- **Branches**: `feat/*`, `chore/*`, `docs/*` — SIEMPRE desde main actualizado,
  atómico. Se borran al mergear.

<!-- projects:regla id=github-issues-macro-y-sub-issues -->

- **Issues**: los pendientes macro son issues en el Project del área; los hijos
  (sub-issues por tarea o bloque) NO van al board. Para changes de OpenSpec, los
  sub-issues nacen recién con el `tasks.md` aprobado, uno por bloque.

<!-- projects:regla id=github-review-cruzado-automatizado -->

- **Review cruzado AUTOMATIZADO**: `.github/CODEOWNERS` tiene a AMBOS builders como
  owners de todo — GitHub solicita review a los owners que NO son el autor, así que el
  par queda asignado solo. El enforcement duro vive en el ruleset de `main`: 1
  aprobación requerida + review de code owner + firmas requeridas, con `ci-ok` como
  único check requerido. Su estado REAL y los pasos para aplicarlo viven en
  `.github/proteccion-main.md`, y se actualizan en el mismo PR que cambie la
  configuración. La última regla de CODEOWNERS le da al PO la propiedad de proposals y
  specs: ahí su aprobación ES el gate y ningún builder puede satisfacerlo por él.

<!-- projects:regla id=github-closes-desde-la-creacion -->

- **PR ↔ issue, obligatorio y verificable**: todo PR de bloque lleva
  `Closes #<sub-issue>` en el body **desde su creación** (la relación bloque↔PR es
  1:1) — es lo ÚNICO que crea el enlace en la sección Development de ambos lados; un
  "ref #N" en texto plano NO enlaza nada. Error cometido y corregido el 2026-08-13,
  cazado en review y no por ninguna herramienta. La evidencia del bloque va como
  comentario en el sub-issue ANTES del merge; el merge lo cierra solo — no se cierran
  sub-issues a mano.

<!-- projects:regla id=github-closes-apunta-al-sub-issue -->

- `Closes` apunta solo al sub-issue 1:1; el issue macro del change lo cierra
  únicamente el PR final del change.

<!-- projects:regla id=github-labels -->

- **Labels** de dos dimensiones: el campo Type para la naturaleza; `area:*` para el
  dominio. Sin milestones (deploy continuo).
