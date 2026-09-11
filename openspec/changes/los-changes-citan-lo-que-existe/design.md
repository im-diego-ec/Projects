---
artefacto: design
dri: Builder 1
aprueba: Builder 2 (builder par)
estado: pendiente-de-revision
---

# Design — los-changes-citan-lo-que-existe

## Clasificación de distribución

| Pieza | Forma | Por qué |
|---|---|---|
| `openspec/changes/{stack-estandar,infra-exigible}/*.md` | canónico | documentos internos del marco |
| `pruebas/ci-del-marco/changes-citan-lo-que-existe.test.mjs` | canónico | banco del marco |

Nada viaja al consumidor.

## Por qué un aviso y no reescribir los changes

La tentación era corregir el «Why» de los dos changes para que citaran el texto
nuevo. Se descarta: **el argumento de un change es de quien lo escribió**, y
cambiarle la premisa desde afuera produce un documento que ya no dice lo que su
autor sostuvo, con su nombre en el `dri`.

El aviso hace lo contrario: deja el argumento original intacto, y encima le pone
lo que cambió. Quien lo lea decide si el argumento sobrevive.

## Por qué el archive queda fuera de la compuerta

Los changes archivados también citan el nombre viejo. **No se tocan.** Sus citas
eran correctas el día que se archivaron, y el archive es el registro de lo que
pasó: reescribirlo es reescribir la historia para que parezca que nunca hubo un
renombre. El banco recorre sólo los activos, y el motivo queda escrito en el
propio banco.

## El límite, declarado

La compuerta comprueba que el archivo **exista**, no que el texto citado siga
diciendo lo mismo. Las dos citas que motivaron esto tenían **las dos cosas** mal
—ruta rota y contenido cambiado— y un `existsSync` sólo caza la primera.

Cazar la segunda exigiría anclar cada cita a un fragmento verificable, que es
otro change y bastante más caro. Queda declarado en vez de sugerido.
