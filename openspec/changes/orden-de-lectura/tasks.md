---
artefacto: tasks
dri: PO
---

# orden-de-lectura — Tasks

- [x] Escribir `pruebas/docs/enlaces.test.mjs` **antes** de renombrar nada, y
      comprobar que muerde en las dos direcciones (enlace muerto y ancla muerta).
- [x] Medir la línea de base con ese banco: 418 enlaces relativos, 0 rotos.
- [x] Reescribir las 475 referencias en 41 archivos, del nombre más largo al más
      corto y con barrera `(?<![\w-])`, que es lo que impide que
      `consumidores.md` muerda dentro de `censo-de-consumidores.md`.
- [x] Renombrar los doce archivos con `git mv`.
- [x] Verificar 0 enlaces rotos y 0 anclas rotas después del renombrado.
- [x] Agregar la cuarta exención de la regla de dígitos, y comprobar que un
      número de versión en prosa sigue saliendo rojo.
- [x] Convertir `01-introduccion.md` en introducción: qué se logra, qué no se
      logra, cuánto lleva, qué hay que tener antes, y el camino al final.
- [x] Declarar en la sección "lo que este marco NO hace por vos" que todavía no
      publica la aplicación — el hueco que la auditoría encontró escondido en
      documentos técnicos.
- [x] Partir el índice en tres secciones con el criterio escrito.
- [x] Corregir las dos afirmaciones del banco que el renombrado dejó falsas.
- [x] Banco completo en verde: 957/957.
- [x] Corregir los dos defectos que el propio verificador se hizo en su primer
      viaje: leía como enlace el código en línea, y solo veía archivos ya
      comprometidos —por eso dio verde en local y rojo en CI—.
- [ ] Revisión escéptica adversarial del cambio completo.
- [ ] Entrada de CHANGELOG.
