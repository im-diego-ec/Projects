---
artefacto: tasks
dri: Builder 1
estado: en-curso
---

# ventana-vencida — Tasks

Un solo bloque: el cambio es chico y no se puede partir sin dejar el árbol en un estado
donde la política dice una cosa y el manifiesto otra.

## 1. Retirar la política

- [ ] 1.1 `actions/constitucion/constitucion.mjs`: se va la constante
      `DIAS_DE_GRACIA_MINIMOS` y la rama de validación que exigía 28 días o
      `"urgente": true`. Se va también el hallazgo `version-urgente`, que era el aviso de
      una puerta de atrás a una puerta que ya no existe.
      Se QUEDA `hallazgoPorFecha` con sus dos ramas (D1): el estreno con aviso sigue siendo
      posible, deja de ser el default.
      Evidencia: `exigible_desde` igual a `publicada` deja de ser un problema de
      validación, y sigue siéndolo un `exigible_desde` ausente o mal formado.
- [ ] 1.2 `canonico/manifiesto.json`: las tres entradas con `exigible_desde` =
      `publicada` (D2). `publicada` no se toca.
      Evidencia: la corrida de la action sobre el consumidor simulado pasa de **aviso con
      fecha 2026-09-19** a **rojo**, con el mismo arreglo escrito.
- [ ] 1.3 La descripción del output `exigible_desde` en `action.yml`, que hoy describe la
      política vieja («fecha desde la cual esa version deja de ser aviso»). El output NO se
      quita (D4). Y el bloque de cabecera de `action.yml` que promete «::warning:: hasta el
      exigible_desde… ::error:: desde esa fecha» pasa a describir el default nuevo.
      Evidencia: ningún consumidor tocado — medido: no lo lee nadie, y sigue existiendo.
- [ ] 1.4 Las dos pruebas de la ventana, reescritas (no borradas): la que exigía el piso de
      28 días pasa a exigir que **cero días sea válido**, y la de `urgente` pasa a exigir
      que el campo **ya no cambie nada**. Y se agrega la que faltaba: un `exigible_desde`
      futuro **sigue** dando aviso, que es la mitad que sobrevive y que nadie estaba
      fijando como propiedad deliberada.
      Evidencia: las 381 pruebas de `actions/**/pruebas` en verde, con el conteo antes y
      después.
- [ ] 1.5 La documentación que la promete: `actions/README.md` (los dos párrafos del
      calendario) y `.claude/skills/projects-release/SKILL.md` (la instrucción de crear la
      entrada con «28 dias minimo, y la puerta `urgente`»). Una política retirada del
      código y viva en la skill del release es la clase de defecto que este repo ya cazó
      cuatro veces: se arregla en un lugar y sobrevive en otro.
      Evidencia: `grep -rn "28 dias\|DIAS_DE_GRACIA\|urgente"` sin resultados fuera de
      pruebas y del CHANGELOG histórico.
- [ ] 1.6 Entrada en el CHANGELOG **en este mismo PR**, en la sección de la versión que se
      publica, con «Para consumidores» diciendo **en mayúsculas** que el PR de bump de un
      repo atrasado llega rojo y cómo se arregla sin escribir nada.
- [ ] 1.7 El delta enuncia la propiedad por primera vez (D5). Evidencia:
      `openspec validate --all --strict` en verde y el guardrail de deltas en cero.

## Fuera de alcance, declarado

- La ventana de la **cobertura** (`calidad-codigo` 265-275, cierre 2026-09-30) no se toca:
  otro mecanismo, otra decisión (D6).
- El artefacto del consumidor de referencia **no se regenera acá**: eso pasa en su PR de
  bump.
