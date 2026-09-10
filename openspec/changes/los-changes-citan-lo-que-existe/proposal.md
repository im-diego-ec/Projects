---
artefacto: proposal
dri: Builder 1
aprueba: Builder 2 (builder par)  # NO el PO: su gate está acotado a
                              # `gobierno-contribucion` (.github/CODEOWNERS)
informado: PO / Builder 2
estado: pendiente-de-revision
---

# Cinco citas al canónico apuntaban a un archivo que el fork renombró

## Por qué

Projects se bifurcó de Rigel el 2026-08-24 y generalizó su constitución: el
archivo `60-infra-aws-secretos.md` pasó a llamarse
`60-infra-plataforma-secretos.md`, porque el marco dejó de fijar AWS.

**Cinco citas en changes ACTIVOS quedaron apuntando al nombre viejo**, en cuatro
archivos de dos changes (`stack-estandar` e `infra-exigible`). Un agente que abra
uno de esos changes para ejecutarlo va a buscar su evidencia y no la encuentra; y
lo peor que puede concluir —que la regla no existe— es exactamente lo contrario
de lo que pasa.

## Y hay algo más grave que el nombre

Corregir la ruta **no alcanza**, y merece decirse porque es la parte que un
renombre automático habría tapado: **el contenido citado también cambió de
sentido.**

| Change | Lo que cita | Lo que el canónico dice hoy |
|---|---|---|
| `stack-estandar` | «El marco publica una base tecnológica **única** y es la primera opción» | «Lo que el marco fija son **CUATRO CAPACIDADES, no un producto** […] fijarlo acá era un proveedor disfrazado de invariante» |
| `infra-exigible` | «IaC = Terraform, **sin excepción**» | «Terraform es la **forma por defecto**» + «una plataforma cuyo despliegue no pasa por Terraform **lo declara en su adaptador**» |

Los dos changes se apoyan en una versión endurecida de una regla que **Projects
ablandó a propósito** al generalizar la plataforma. Renombrar la ruta los habría
dejado *pareciendo* consistentes con una premisa muerta.

Por eso cada uno lleva ahora un **aviso del fork** al principio del proposal, que
dice qué cambió y qué hay que revisar antes de ejecutarlo.

## La decisión que queda para el PO

`stack-estandar` propone una **base tecnológica única**. El canónico vigente de
Projects dice **cuatro capacidades con el producto elegido por el proyecto**, y
`una-sola-lista-de-plataformas` refuerza ese modelo. **Son incompatibles.**

O Projects vuelve al modelo de base única —el de Rigel— o `stack-estandar` se
cierra como superado. **No se decide acá**: se deja escrito y visible para que no
se ejecute por inercia.

## Qué cambia

1. Las cinco citas apuntan al archivo real.
2. Los dos changes afectados llevan su aviso del fork.
3. **Una compuerta**: toda cita al canónico desde un change activo tiene que
   apuntar a un archivo que exista.

## Por qué la compuerta sólo mira el canónico

Un change **propone** cosas, así que cita archivos que todavía no existen — es su
trabajo. Exigir que toda ruta exista pondría rojo al change que propone crear
algo, que es al revés de lo que hace falta.

El canónico es distinto: se cita como **evidencia** de lo que la constitución ya
dice. Una evidencia que no existe no es una promesa: es un error.

## Impacto en los proyectos consumidores

**Ninguno.** Son documentos internos del marco y un banco. Es PATCH.
