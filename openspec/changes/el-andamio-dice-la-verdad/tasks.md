---
artefacto: tasks
dri: Builder 1
aprueba: Builder 2 (builder par)
estado: pendiente-de-revision
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
