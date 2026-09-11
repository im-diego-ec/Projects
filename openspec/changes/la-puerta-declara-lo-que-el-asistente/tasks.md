---
artefacto: tasks
dri: Builder 1
aprueba: Builder 2 (builder par)
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
