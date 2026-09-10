---
artefacto: tasks
dri: Builder 1
aprueba: Builder 2 (builder par)
estado: pendiente-de-revision
---

# Tasks — el-comando-que-se-pega-funciona

## 1. Las comillas

- [x] 1.1 Función que entrecomilla una ruta cuando lo necesita, exportada para
      el banco. Evidencia: `pruebas/init/comando-pegable.test.mjs`.
- [x] 1.2 Los cinco sitios de `projects-init.mjs` que emiten rutas dentro de un
      comando la usan. Evidencia: caso «ninguna ruta con espacio viaja desnuda».

## 2. Los bancos que la ruta con espacio rompía

- [x] 2.1 `el-doble-clic-llega.test.mjs` extrae el comando aceptando argumentos
      entrecomillados. Evidencia: el caso de punta a punta pasa con el clon en
      una ruta con espacio.
- [x] 2.2 `guardrail-deltas.test.mjs` usa `fileURLToPath` en vez de `.pathname`.
      Evidencia: el caso «compara mas de cero» pasa.

## 3. Verificación

- [x] 3.1 Los dos casos que estaban en rojo pasan.
- [x] 3.2 El banco completo sin regresión.
- [x] 3.3 MUERDE: quitar las comillas vuelve a poner rojo el caso de punta a punta.

## 4. Alcance declarado, que NO entra acá

- **El guardrail de deltas sale VERDE ante un directorio que no existe** — es un
  fail-open que `AGENTS.md` prohíbe. **Destino:** change propio, porque toca una
  action publicada y endurecerla puede enrojecer a un consumidor que hoy pasa:
  se estrena en modo aviso y endurece en la mayor siguiente.
