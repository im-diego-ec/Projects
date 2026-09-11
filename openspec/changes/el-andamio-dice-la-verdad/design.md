---
artefacto: design
dri: Builder 1
aprueba: Builder 2 (builder par)
estado: pendiente-de-revision
---

# Design — el-andamio-dice-la-verdad

## Clasificación de distribución

Los cuatro son **scaffold**: viajan al proyecto y desde ahí son suyos.

| Pieza | Qué hereda un proyecto nuevo |
|---|---|
| `plantilla/docs/accesos.md` | una página nueva, vacía de filas y con su forma |
| `plantilla/infra/adaptadores.md` | un pendiente corregido y la sección de la mudanza |
| `plantilla/.github/workflows/desplegar.yml` | un comentario sin la promesa sin fuente |
| `plantilla/.github/workflows/ci.yml` | la excepción del E2E con su destino |

**Que sean scaffold es justamente por qué esto necesitaba un change**, y es el
motivo por el que existe este documento: se copian una vez y después son del
proyecto, así que un error viaja y **no vuelve**. No hay bump que lo corrija.

## Por qué se escribe después y no antes

No es lo correcto y conviene decirlo sin adornos: el orden que `AGENTS.md` fija es
proposal → specs → design → tasks → implementar. Acá la implementación fue primero,
en dos commits que trataron los cuatro archivos como correcciones de prosa.

**El error de juicio fue tratar «corregir una afirmación falsa» como si fuera menos
que «cambiar lo que se hereda».** Es lo mismo: un proyecto nuevo hereda la
afirmación corregida, y uno viejo se quedó con la falsa para siempre.

Se documenta en vez de rehacerse porque rehacer el orden a esta altura sería
teatro: los commits existen y su contenido es correcto. Lo que sí cambia es que
queda escrito, con su spec, y que el defecto de proceso está nombrado.

## Por qué la capability es `documentacion-del-marco`

Los cuatro cambios son sobre **lo que el andamio dice**, no sobre lo que hace: ni
un `input`, ni un permiso, ni un job cambia de nombre. La capability que gobierna
la veracidad de lo que se reparte es ésa.

`accesos.md` es el caso límite —agrega un archivo, no corrige uno— pero lo que lo
motiva es la misma propiedad: el canónico lo citaba como fuente de una respuesta y
no estaba, o sea que el andamio afirmaba tener algo que no tenía.
