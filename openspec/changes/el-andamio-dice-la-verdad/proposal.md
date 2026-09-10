---
artefacto: proposal
dri: Builder 1
aprueba: Builder 2 (builder par)  # NO el PO: su gate está acotado a
                              # `gobierno-contribucion` (.github/CODEOWNERS)
informado: PO / Builder 2
estado: pendiente-de-revision
---

# Lo que el andamio le entrega a un proyecto nuevo, y decía cosas que no eran

## Por qué

Cuatro archivos de `plantilla/` —lo que **viaja** a cada proyecto nuevo— cambiaron
en esta tanda **sin un change que los cubriera**. Los cambios eran correctos; el
proceso no. `AGENTS.md` es explícito: *«el contenido del scaffold cuando cambia lo
que un proyecto nuevo hereda»* es materia de change, y esa regla existe porque un
error ahí se multiplica por cada repo que nazca.

Este change los cubre, en retrospectiva y diciéndolo.

## Los cuatro

| Archivo | Qué decía | Qué dice ahora |
|---|---|---|
| `plantilla/docs/accesos.md` | **no existía**, y el canónico lo citaba como el lugar donde vive la matriz de accesos | existe, con su columna de *bus factor* y la regla de no escribir ningún valor de credencial |
| `plantilla/infra/adaptadores.md` | «la clave todavía no la lee nadie» — falso: `noViajanPorPlataforma` la lee y decide qué viaja. Mandaba a sostener a mano una coherencia que la herramienta ya sostiene | dice lo que falta de verdad (el despliegue) y adónde va. Y gana la sección **«La mudanza»**, que era la mitad ausente de la razón de ser del marco |
| `plantilla/.github/workflows/desplegar.yml` | prometía «gratis, **sin tarjeta**» sobre Cloudflare, sin que nadie lo hubiera comprobado | dice que tiene plan gratuito y que lo de la tarjeta **no está comprobado por el marco** |
| `plantilla/.github/workflows/ci.yml` | la excepción del paquete E2E decía su motivo real pero **no su destino** | nombra `promocion-por-ambientes` 6.1 y dice que hasta entonces el paquete viaja y no corre |

## El hilo que los une

Los cuatro son la misma clase de defecto: **el andamio afirmaba algo que el árbol
contradecía**. En un marco cuya tesis es *«lo que no se puede sostener no se
escribe»*, y cuyo destinatario es alguien que **no puede verificar** lo que lee,
una afirmación falsa cuesta más que una omisión: nadie la contradice, porque quien
abre esas páginas las abre para enterarse.

## Impacto en los proyectos consumidores

**Ninguno en su pipeline.** Ningún `input`, `secret`, `output`, permiso ni nombre
de job cambia. Lo que cambia es lo que un proyecto **nuevo** hereda; uno ya creado
se quedó con la copia que le tocó el día que nació, y el marco no reescribe repos
ajenos. Es MINOR.
