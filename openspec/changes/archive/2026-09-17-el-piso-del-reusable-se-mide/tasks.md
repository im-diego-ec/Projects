---
artefacto: tasks
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: archivado
---

# Tasks — el-piso-del-reusable-se-mide

## 1. La compuerta

- [x] 1.1 Lee los `permissions:` de los jobs del reusable y los cruza contra las
      tres declaraciones del piso. Evidencia: `pruebas/andamio/piso-del-reusable.test.mjs`.
- [x] 1.2 Guarda anti-vacuidad: si no se lee ningún permiso del reusable, rojo.
- [x] 1.3 MUERDE: simula el caso real del upstream (`issues: read` nuevo) y
      comprueba que el predicado lo detecta.

## 2. Verificación

- [x] 2.1 Banco nuevo en verde (3/3).
- [x] 2.2 Banco completo sin regresión.

## 3. Alcance declarado, que NO entra acá

- **La consecuencia descrita en los tres bloques no está verificada.** Dicen que
  sin `pull-requests: read` la detección «cae al fail-open»; desde que el job
  declara su propio bloque, la corrida podría fallar al arrancar. **Destino:**
  change propio, con una corrida real de CI como evidencia — un PR en un repo de
  juguete con el permiso recortado. No se reescribe el texto sin esa medición.

## Cierre — 2026-09-17, bajo el desvío de revisión de `AGENTS.md`

- [x] Revisión adversarial, registrada en `revision-adversarial.md` de esta
      carpeta: cuatro lentes (contrato, evidencia, mordida, consumidores y
      coherencia) y veredicto «archivable con correcciones (el nombre del caso central decía «EXACTAMENTE» y la aserción es «al menos»: corregido)». La mordida se midió mutando un clon
      descartable del árbol, no leyendo el banco.
- [x] Archive con `projects-archive-change`, sin el CLI: pin leído con
      `aplicar-deltas.mjs --pin-openspec .github/workflows/marco-ci.yml` → `1.9.0`;
      `validate --all --strict` en verde antes de empezar; simulacro contrastado
      con el inventario (1 ADDED → `openspec/specs/calidad-codigo/spec.md`); aplicado con exit 0; `git mv` a
      `openspec/changes/archive/2026-09-17-el-piso-del-reusable-se-mide` con `git ls-files` de la ruta
      original vacío.
- [x] Conteo de escenarios antes/después (`aplicar-deltas.mjs --escenarios`), sin
      ninguna baja: `calidad-codigo` 47 → 56, `documentacion-del-marco` 0 → 8,
      `base-tecnologica` 0 → 3 (los seis archives del día juntos).
- [x] `Purpose` de las capabilities nuevas completado en el mismo commit, y la
      página `openspec/cobertura-de-requirements.md` actualizada: su banco
      (`pruebas/docs/cobertura-de-requirements.test.mjs`) → 13/13.

