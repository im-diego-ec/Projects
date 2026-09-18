---
artefacto: tasks
dri: PO
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: archivado
---

# orden-de-lectura — Tasks

- [x] Escribir `pruebas/docs/enlaces.test.mjs` **antes** de renombrar nada, y
      comprobar que muerde en las dos direcciones (enlace muerto y ancla muerta).
- [x] Medir la línea de base con ese banco: 418 enlaces relativos, 0 rotos.
- [x] Reescribir las 475 referencias en 41 archivos, del nombre más largo al más
      corto y con barrera `(?<![\w-])`, que es lo que impide que
      `consumidores.md` muerda dentro de `censo-de-consumidores.md`.
- [x] Renombrar los doce archivos con `git mv`.
- [x] Verificar 0 enlaces rotos y 0 anclas rotas después del renombrado.
- [x] Agregar la cuarta exención de la regla de dígitos, y comprobar que un
      número de versión en prosa sigue saliendo rojo.
- [x] Convertir `01-introduccion.md` en introducción: qué se logra, qué no se
      logra, cuánto lleva, qué hay que tener antes, y el camino al final.
- [x] Declarar en la sección "lo que este marco NO hace por vos" que todavía no
      publica la aplicación — el hueco que la auditoría encontró escondido en
      documentos técnicos.
- [x] Partir el índice en tres secciones con el criterio escrito.
- [x] Corregir las dos afirmaciones del banco que el renombrado dejó falsas.
- [x] Banco completo en verde: 957/957.
- [x] Corregir los dos defectos que el propio verificador se hizo en su primer
      viaje: leía como enlace el código en línea, y solo veía archivos ya
      comprometidos —por eso dio verde en local y rojo en CI—.
- [x] Revisión escéptica adversarial del cambio completo. Hecha el 2026-09-17
      bajo el desvío que `AGENTS.md` declara para todo el repositorio, y
      registrada en `revision-adversarial.md` de esta carpeta: cuatro lentes y
      veredicto «archivable con correcciones». Encontró y corrigió dos defectos
      —un escenario del delta que fijaba un hecho con fecha como propiedad, y la
      introducción contradiciéndose sobre qué publica el marco— y reportó uno
      que no se corrige acá (tres documentos dicen que el repositorio del marco
      es privado, y es público).
- [x] Entrada de CHANGELOG. Existía desde la versión 1.8.0 y la casilla había
      quedado sin tildar: `CHANGELOG.md:1464` (el verificador de enlaces) y
      `:1476-1488` (la numeración y la introducción), sección `[1.8.0]`.

## Cierre — 2026-09-17, bajo el desvío de revisión de `AGENTS.md`

- [x] Revisión adversarial, registrada en `revision-adversarial.md` de esta
      carpeta: cuatro lentes (contrato, evidencia, mordida, consumidores y
      coherencia) y veredicto «archivable con correcciones (un escenario del delta con un hecho fechado, y la introducción contradiciéndose: los dos corregidos)». La mordida se midió mutando un clon
      descartable del árbol, no leyendo el banco.
- [x] Archive con `projects-archive-change`, sin el CLI: pin leído con
      `aplicar-deltas.mjs --pin-openspec .github/workflows/marco-ci.yml` → `1.9.0`;
      `validate --all --strict` en verde antes de empezar; simulacro contrastado
      con el inventario (2 ADDED → `openspec/specs/documentacion-del-marco/spec.md`, sobre la capability que creó `el-andamio-dice-la-verdad`); aplicado con exit 0; `git mv` a
      `openspec/changes/archive/2026-09-17-orden-de-lectura` con `git ls-files` de la ruta
      original vacío.
- [x] Conteo de escenarios antes/después (`aplicar-deltas.mjs --escenarios`), sin
      ninguna baja: `calidad-codigo` 47 → 56, `documentacion-del-marco` 0 → 8,
      `base-tecnologica` 0 → 3 (los seis archives del día juntos).
- [x] `Purpose` de las capabilities nuevas completado en el mismo commit, y la
      página `openspec/cobertura-de-requirements.md` actualizada: su banco
      (`pruebas/docs/cobertura-de-requirements.test.mjs`) → 13/13.

