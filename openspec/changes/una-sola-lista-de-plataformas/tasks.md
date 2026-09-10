---
artefacto: tasks
dri: Builder 1
aprueba: Builder 2 (builder par)
estado: pendiente-de-revision
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
