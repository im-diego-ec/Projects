---
artefacto: tasks
dri: Builder 1
aprueba: Builder 2 (builder par)
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
