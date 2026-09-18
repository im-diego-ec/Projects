---
artefacto: tasks
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: archivado
---

# Tasks — los-changes-citan-lo-que-existe

## 1. Las citas

- [x] 1.1 Las cinco citas apuntan a `60-infra-plataforma-secretos.md`.
      Evidencia: `grep -rn "60-infra-aws-secretos" openspec/changes/ | grep -v archive` → 0.

## 2. Los avisos del fork

- [x] 2.1 `stack-estandar` declara que su premisa —base tecnológica única— está en
      discusión con el canónico vigente, que dice cuatro capacidades.
- [x] 2.2 `infra-exigible` declara que la regla que cita como textual **se ablandó**:
      «sin excepción» pasó a «forma por defecto, y la excepción se declara en el adaptador».

## 3. La compuerta

- [x] 3.1 Toda cita al canónico desde un change activo apunta a un archivo que existe.
- [x] 3.2 Guarda anti-vacuidad: si ningún change cita el canónico, rojo.
- [x] 3.3 MUERDE: una cita sintética a un canónico inexistente se caza.

## 4. Verificación

- [x] 4.1 Banco completo en verde (1388/1388).

## 5. La decisión que NO se toma acá

- **¿Projects fija una base tecnológica única, o cuatro capacidades con el producto
  elegido por el proyecto?** `stack-estandar` propone lo primero; el canónico vigente
  y `una-sola-lista-de-plataformas` sostienen lo segundo. Son incompatibles y la
  decisión es del PO. **Destino:** el aviso del fork en `stack-estandar/proposal.md`,
  que lo deja visible para que no se ejecute por inercia.

## 6. Alcance declarado

- **La compuerta no verifica que el TEXTO citado siga diciendo lo mismo**, sólo que
  el archivo exista. **Destino:** change propio; exigiría anclar cada cita a un
  fragmento verificable.
- **El archive no se toca**: sus citas eran correctas cuando se archivaron.

## Cierre — 2026-09-17, bajo el desvío de revisión de `AGENTS.md`

- [x] Revisión adversarial, registrada en `revision-adversarial.md` de esta
      carpeta: cuatro lentes (contrato, evidencia, mordida, consumidores y
      coherencia) y veredicto «archivable». La mordida se midió mutando un clon
      descartable del árbol, no leyendo el banco.
- [x] Archive con `projects-archive-change`, sin el CLI: pin leído con
      `aplicar-deltas.mjs --pin-openspec .github/workflows/marco-ci.yml` → `1.9.0`;
      `validate --all --strict` en verde antes de empezar; simulacro contrastado
      con el inventario (1 ADDED → `openspec/specs/calidad-codigo/spec.md`); aplicado con exit 0; `git mv` a
      `openspec/changes/archive/2026-09-17-los-changes-citan-lo-que-existe` con `git ls-files` de la ruta
      original vacío.
- [x] Conteo de escenarios antes/después (`aplicar-deltas.mjs --escenarios`), sin
      ninguna baja: `calidad-codigo` 47 → 56, `documentacion-del-marco` 0 → 8,
      `base-tecnologica` 0 → 3 (los seis archives del día juntos).
- [x] `Purpose` de las capabilities nuevas completado en el mismo commit, y la
      página `openspec/cobertura-de-requirements.md` actualizada: su banco
      (`pruebas/docs/cobertura-de-requirements.test.mjs`) → 13/13.

