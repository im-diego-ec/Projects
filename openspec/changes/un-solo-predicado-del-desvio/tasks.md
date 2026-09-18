---
artefacto: tasks
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: pendiente-de-revision
---

# Tasks — un-solo-predicado-del-desvio

## 1. El aviso

- [x] 1.1 El paso lee `fecha` y comprueba aprobador + fecha; avisa nombrando el
      dato que falta. Evidencia: casos «uno SIN aprobador» y «uno SIN fecha».
- [x] 1.2 El desvío sigue absorbiendo. Evidencia: `exit 0` en el caso sin aprobador.

## 2. Anti-vacuidad

- [x] 2.1 Un desvío completo NO avisa. Evidencia: caso «uno COMPLETO no avisa».
- [x] 2.2 MUERDE: sin el predicado, el aviso desaparece. Evidencia: caso MUTACION.

## 3. Verificación

- [x] 3.1 El banco del paso en verde (11/11).
- [x] 3.2 Banco completo sin regresión.

## 4. Alcance declarado, que NO entra acá

- **Un solo predicado de verdad.** Exige mover la lectura de desvíos dentro de la
  composite action, porque un workflow reusable no tiene el árbol del marco en
  disco. **Destino:** change propio, junto con el endurecimiento de la mayor
  siguiente — son la misma decisión.
- **Un banco que cruce los dos predicados mecánicamente.** Hoy no se puede: la
  validación de desvíos de `constitucion.mjs` no está exportada como función.
  **Destino:** el mismo change de arriba, que ya la va a mover de lugar.

## Cierre — 2026-09-17, bajo el desvío de revisión de `AGENTS.md`

- [x] Revisión adversarial que reemplaza a la cruzada entre builders,
      registrada en `revision-adversarial.md` de esta carpeta: cuatro lentes y
      veredicto «revisado, espera al PO». Hallazgo principal: el requirement fija el modo aviso como contrato, y la decisión del PO del 2026-09-17 lo termina como regla general.
- [ ] Archive. **Motivo por el que queda abierto:** este change toca
      `gobierno-contribucion`, y esa aprobación es del PO; el desvío de la
      revisión cruzada no la alcanza (`AGENTS.md`, recuadro del desvío, «Lo que
      no cambia»). Con el OK del PO —y, si el hallazgo lo pide, el delta
      ajustado—, el archive es `aplicar-deltas.mjs un-solo-predicado-del-desvio` y `git mv` a
      `openspec/changes/archive/`, con `revision-adversarial.md` adentro, que es
      lo que exige `pruebas/ci-del-marco/desvio-de-review-del-marco.test.mjs`.

