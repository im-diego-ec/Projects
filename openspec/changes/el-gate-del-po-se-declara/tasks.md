---
artefacto: tasks
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: pendiente-de-revision
---

# Tasks — el-gate-del-po-se-declara

## 1. El séptimo desvío

- [x] 1.1 Se emite sobre `openspec-roles`, con los cuatro campos del contrato.
      Evidencia: `pruebas/init/asistente.test.mjs`, caso «el gate del PO queda declarado».
- [x] 1.2 El motivo distingue solo / con compañero, y con compañero **nombra** a
      quien puede tomar el rol. Evidencia: caso «CON companero el motivo es OTRO».
- [x] 1.3 Con salida disponible, la revisión es inmediata y no condicionada.

## 2. Anti-confusión

- [x] 2.1 MUERDE: los dos desvíos existen por separado y sin repetidos.

## 3. Verificación

- [x] 3.1 Banco del asistente en verde (34/34).
- [x] 3.2 Banco completo sin regresión (1385/1385).

## 4. Alcance declarado, que NO entra acá

- **Que el andamio asigne el rol de PO al compañero automáticamente.** Quién decide
  el qué es del equipo, no del andamio; elegirlo en silencio es el mismo defecto
  con el signo cambiado. **Destino:** ninguno — es una no-decisión deliberada, y
  queda escrita acá para que no se proponga como «mejora» más adelante.

## Cierre — 2026-09-17, bajo el desvío de revisión de `AGENTS.md`

- [x] Revisión adversarial que reemplaza a la cruzada entre builders,
      registrada en `revision-adversarial.md` de esta carpeta: cuatro lentes y
      veredicto «revisado, espera al PO». Hallazgo principal: ninguno que cambie el contrato.
- [ ] Archive. **Motivo por el que queda abierto:** este change toca
      `gobierno-contribucion`, y esa aprobación es del PO; el desvío de la
      revisión cruzada no la alcanza (`AGENTS.md`, recuadro del desvío, «Lo que
      no cambia»). Con el OK del PO —y, si el hallazgo lo pide, el delta
      ajustado—, el archive es `aplicar-deltas.mjs el-gate-del-po-se-declara` y `git mv` a
      `openspec/changes/archive/`, con `revision-adversarial.md` adentro, que es
      lo que exige `pruebas/ci-del-marco/desvio-de-review-del-marco.test.mjs`.

