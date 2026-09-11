---
artefacto: tasks
dri: Builder 1
aprueba: Builder 2 (builder par)
estado: pendiente-de-revision
---

# Tasks — el-piso-del-reusable-se-mide

## 1. La compuerta

- [x] 1.1 Lee los `permissions:` de los jobs del reusable y los cruza contra las
      tres declaraciones del piso. Evidencia: `pruebas/andamio/piso-del-reusable.test.mjs`.
- [x] 1.2 Guarda anti-vacuidad: si no se lee ningún permiso del reusable, rojo.
- [x] 1.3 MUERDE: simula el caso real del upstream (`issues: read` nuevo) y
      comprueba que el predicado lo detecta.

## 2. Verificación

- [x] 2.1 Banco nuevo en verde (3/3).
- [x] 2.2 Banco completo sin regresión.

## 3. Alcance declarado, que NO entra acá

- **La consecuencia descrita en los tres bloques no está verificada.** Dicen que
  sin `pull-requests: read` la detección «cae al fail-open»; desde que el job
  declara su propio bloque, la corrida podría fallar al arrancar. **Destino:**
  change propio, con una corrida real de CI como evidencia — un PR en un repo de
  juguete con el permiso recortado. No se reescribe el texto sin esa medición.
