---
artefacto: tasks
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: archivado
---

# Tasks — el-andamio-dice-la-verdad

## 1. Los cuatro archivos

- [x] 1.1 `plantilla/docs/accesos.md` existe, con bus factor y la regla de no
      escribir valores de credencial. Evidencia: `pruebas/docs/lo-que-lee-el-consumidor.test.mjs`,
      que lo exige clasificado y sin vocabulario del marco sin explicar.
- [x] 1.2 `plantilla/infra/adaptadores.md`: el pendiente dice lo que falta de verdad.
- [x] 1.3 `plantilla/infra/adaptadores.md`: sección «La mudanza».
- [x] 1.4 `plantilla/.github/workflows/desplegar.yml` sin la promesa sin fuente.
      Evidencia: `pruebas/docs/promesas-sin-fuente.test.mjs`, ahora que mira `.yml`.
- [x] 1.5 `plantilla/.github/workflows/ci.yml`: la excepción del E2E con su destino.

## 2. Verificación

- [x] 2.1 Banco completo en verde.
- [x] 2.2 El banco del consumidor exige que toda página que viaja esté clasificada
      y explique su vocabulario: `accesos.md` pasó por ahí.

## 3. Lo que este change reconoce y no arregla

- **El orden se invirtió.** La implementación fue primero y el change se escribe
  después. Queda nombrado en el `design.md` en vez de disimulado.
- **Ninguna compuerta exige que un cambio en `plantilla/` traiga change de
  OpenSpec.** Es lo que habría cazado esto el día uno. **Destino:** change propio —
  necesita distinguir el archivo que viaja del que no, y decidir qué pasa con un
  cambio de una sola línea.

## Cierre — 2026-09-17, bajo el desvío de revisión de `AGENTS.md`

- [x] Revisión adversarial, registrada en `revision-adversarial.md` de esta
      carpeta: cuatro lentes (contrato, evidencia, mordida, consumidores y
      coherencia) y veredicto «archivable». La mordida se midió mutando un clon
      descartable del árbol, no leyendo el banco.
- [x] Archive con `projects-archive-change`, sin el CLI: pin leído con
      `aplicar-deltas.mjs --pin-openspec .github/workflows/marco-ci.yml` → `1.9.0`;
      `validate --all --strict` en verde antes de empezar; simulacro contrastado
      con el inventario (1 ADDED → crea `openspec/specs/documentacion-del-marco/spec.md`); aplicado con exit 0; `git mv` a
      `openspec/changes/archive/2026-09-17-el-andamio-dice-la-verdad` con `git ls-files` de la ruta
      original vacío.
- [x] Conteo de escenarios antes/después (`aplicar-deltas.mjs --escenarios`), sin
      ninguna baja: `calidad-codigo` 47 → 56, `documentacion-del-marco` 0 → 8,
      `base-tecnologica` 0 → 3 (los seis archives del día juntos).
- [x] `Purpose` de las capabilities nuevas completado en el mismo commit, y la
      página `openspec/cobertura-de-requirements.md` actualizada: su banco
      (`pruebas/docs/cobertura-de-requirements.test.mjs`) → 13/13.

