---
artefacto: tasks
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: archivado
---

# Tasks — una-sola-lista-de-plataformas

## 1. El hueco se declara

- [x] 1.1 `PLATAFORMAS_PENDIENTES` con su razón y su destino.
- [x] 1.2 `PLATAFORMAS_DECLARADAS` derivada, no escrita aparte.
      Evidencia: caso «las declaradas son las implementadas mas las pendientes».

## 2. El mensaje distingue los dos casos

- [x] 2.1 Una plataforma admitida-y-no-implementada recibe su propio mensaje, con
      el destino. Medido: `plataforma=cloudflare` ya no dice «no es una opcion».

## 3. La compuerta

- [x] 3.1 Cruza las cuatro copias. Evidencia: los tres casos por copia.
- [x] 3.2 Guarda: una pendiente no puede figurar como implementada.
- [x] 3.3 MUERDE: quitar `gcp` de la constitución que viaja pone rojo ese caso.

## 4. Verificación

- [x] 4.1 Banco nuevo en verde (5/5).
- [x] 4.2 Banco completo sin regresión.

## 4-bis. Lo que el banco del marco obligó a arreglar de paso

- [x] 4bis.1 `openspec/cobertura-de-requirements.md` suma el requirement nuevo
      (base-tecnologica: 3 → 4, 0 → 1 con compuerta).
- [x] 4bis.2 `capabilidadesEnVuelo()` **acumula** entre changes. Hacía
      `salida[cap] = ...`, así que con dos changes vivos sobre la misma capability
      en vuelo ganaba el último por orden alfabético y los requirements del otro
      desaparecían de la página sin que nada lo dijera. Este change fue el primero
      en tocar una capability en vuelo que otro ya tocaba, y lo destapó.
      Evidencia: caso «dos changes sobre la misma capability EN VUELO se SUMAN».

## 5. Alcance declarado, que NO entra acá

- **Implementar `cloudflare` y `gcp`.** Es el adaptador, y va con las tres
  preguntas abiertas de ese change. **Destino:** `openspec/changes/promocion-por-ambientes`.

## Cierre — 2026-09-17, bajo el desvío de revisión de `AGENTS.md`

- [x] Revisión adversarial, registrada en `revision-adversarial.md` de esta
      carpeta: cuatro lentes (contrato, evidencia, mordida, consumidores y
      coherencia) y veredicto «archivable». La mordida se midió mutando un clon
      descartable del árbol, no leyendo el banco.
- [x] Archive con `projects-archive-change`, sin el CLI: pin leído con
      `aplicar-deltas.mjs --pin-openspec .github/workflows/marco-ci.yml` → `1.9.0`;
      `validate --all --strict` en verde antes de empezar; simulacro contrastado
      con el inventario (1 ADDED → crea `openspec/specs/base-tecnologica/spec.md`); aplicado con exit 0; `git mv` a
      `openspec/changes/archive/2026-09-17-una-sola-lista-de-plataformas` con `git ls-files` de la ruta
      original vacío.
- [x] Conteo de escenarios antes/después (`aplicar-deltas.mjs --escenarios`), sin
      ninguna baja: `calidad-codigo` 47 → 56, `documentacion-del-marco` 0 → 8,
      `base-tecnologica` 0 → 3 (los seis archives del día juntos).
- [x] `Purpose` de las capabilities nuevas completado en el mismo commit, y la
      página `openspec/cobertura-de-requirements.md` actualizada: su banco
      (`pruebas/docs/cobertura-de-requirements.test.mjs`) → 13/13.

