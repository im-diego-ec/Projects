---
artefacto: tasks
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: pendiente-de-revision
---

# Tasks — la-puerta-declara-lo-que-el-asistente

## 1. La visibilidad se deriva

- [x] 1.1 `visibilidadDelRepo()` en la puerta, con el default seguro en «privado».
- [x] 1.2 `personalizar.yml` pasa `github.event.repository.visibility`.
- [x] 1.3 La puerta incluye `visibilidad` en los valores que entrega.

## 2. El banco

- [x] 2.1 La visibilidad NO es una pregunta del formulario.
- [x] 2.2 Sin el dato, «privado»: el desvío de más se ve, la protección supuesta no.
- [x] 2.3 Cruce contra el YAML: sin la variable, derivarlo no sirve de nada.
- [x] 2.4 MUERDE: una variable con otro nombre cae al default seguro.

## 3. El `ambientes` cableado

- [x] 3.1 Deja de estar sin explicación: comentario con su motivo y su destino.

## 4. Verificación

- [x] 4.1 Banco de la puerta en verde (28/28).
- [x] 4.2 Banco completo sin regresión (1396/1396).

## 5. Alcance declarado, que NO entra acá

- **Borrar `ambientes`.** Hoy todavía alimenta a `projects-init.mjs`, y sacarlo sin
  la promoción rompería el contrato entre las dos herramientas por la mitad.
  **Destino:** `promocion-por-ambientes`, tarea 3.1.

## Cierre — 2026-09-17, bajo el desvío de revisión de `AGENTS.md`

- [x] Revisión adversarial que reemplaza a la cruzada entre builders,
      registrada en `revision-adversarial.md` de esta carpeta: cuatro lentes y
      veredicto «revisado, espera al PO». Hallazgo principal: la corrección todavía no está en las plantillas publicadas; llega con el paso 5-bis del próximo release.
- [ ] Archive. **Motivo por el que queda abierto:** este change toca
      `gobierno-contribucion`, y esa aprobación es del PO; el desvío de la
      revisión cruzada no la alcanza (`AGENTS.md`, recuadro del desvío, «Lo que
      no cambia»). Con el OK del PO —y, si el hallazgo lo pide, el delta
      ajustado—, el archive es `aplicar-deltas.mjs la-puerta-declara-lo-que-el-asistente` y `git mv` a
      `openspec/changes/archive/`, con `revision-adversarial.md` adentro, que es
      lo que exige `pruebas/ci-del-marco/desvio-de-review-del-marco.test.mjs`.

