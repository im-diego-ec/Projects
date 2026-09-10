---
artefacto: tasks
dri: Builder 1
aprueba: Builder 2 (builder par)
estado: pendiente-de-revision
---

# Tasks — la-ventana-se-cierra

DUENO DE LA FECHA: 2026-09-30

<!-- La linea de arriba no es decorativa: es la que lee
     pruebas/ci-del-marco/ventanas-con-dueno.test.mjs. Un change que MENCIONA una
     fecha no es su dueno --`ventana-vencida` nombra esta misma fecha para decir
     que NO la toca--, asi que la compuerta exige el marcador explicito y no una
     coincidencia de texto. -->

## 1. Los pendientes heredados quedan con destino

- [x] 1.1 4.5c declarado **no bloqueante** con su razón: su sujeto —un consumidor
      con un paquete `web` bajo el mínimo— no existe en Projects.
- [x] 1.2 4.5d apuntado a este change.

## 2. La compuerta de las fechas con dueño

- [x] 2.1 Banco que exige que toda fecha de gracia viva esté nombrada por un
      change activo. Evidencia: `pruebas/ci-del-marco/ventanas-con-dueno.test.mjs`.
- [x] 2.2 MUERDE: una fecha sintética sin change la pone roja.

## 3. Después del 2026-09-30 — NO se hace todavía, y es el punto del change

- [ ] 3.1 Borrar `VENTANA_DE_GRACIA_HASTA` y su rama en `veredictoDePaquete`
      (`actions/cobertura-diff/medir-cobertura-diff.mjs`). **Destino: este change.**
      No cambia comportamiento: para entonces la ventana ya cerró por fecha.
- [ ] 3.2 Quitar de este `tasks.md` la fecha, y con eso la compuerta del punto 2
      deja de tener nada que exigir sobre ella.

## 4. La decisión, para el PO

- [ ] 4.1 Confirmar que la ventana **se cierra** y no se extiende. El proposal
      asume que se cierra —extenderla aflojaría un mínimo sin medición nueva— pero
      es una decisión, y ahora tiene dónde tomarse antes de que venza.
