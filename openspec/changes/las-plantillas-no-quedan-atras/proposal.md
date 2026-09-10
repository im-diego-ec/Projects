---
artefacto: proposal
dri: Builder 1
aprueba: PO  # toca `gobierno-contribucion`: qué acredita un release publicado
informado: PO / Builder 2
estado: pendiente-de-revision
---

# Los dos repos plantilla son consumidores que nadie actualiza

## Por qué

`docs/04-arrancar-acompanado.md` manda al **camino más no-coder que existe**: hacer
*Use this template* sobre `im-diego-ec/plantilla-sitio` o `plantilla-aplicacion`, y
después correr el workflow *Personalizar mi proyecto*.

**Ese workflow lee el pin del marco del `ci.yml` de la propia plantilla.**

Entonces: el día que el marco publique una versión y las plantillas se queden en la
anterior, **cada proyecto que nazca por ese camino nace pineado a un marco viejo**,
sin un solo rojo. El proyecto arranca bien. Sólo que con el marco de antes.

**Y son el único consumidor que no recibe PR de Dependabot**, porque no son repos
que alguien mantenga: son moldes que se copian. El mecanismo que el marco usa para
que nadie quede atrás no los alcanza.

**Medido hoy (2026-09-10):** las dos pinan `v1.9.6`, que es la vigente. El problema
no es el estado de hoy — es que **nada lo sostiene mañana**.

## Qué cambia

Un paso **5-bis** en `projects-release`, entre mover `v1` y publicar las notas:
comprobar que las dos plantillas pinen la versión recién publicada, y que **sigan
siendo plantillas** —un repo que dejó de serlo rompe el botón que la guía manda
apretar, y el error que ve la persona no menciona al marco por ningún lado—.

Y un banco que garantiza que ese paso **siga escrito**, con las dos plantillas
nombradas, derivando la lista de la herramienta que las genera.

## Por qué el banco no consulta GitHub

El banco del marco corre **sin red y sin dependencias**, y una compuerta que depende
de un tercero se pone roja por motivos ajenos — es el mismo razonamiento por el que
`docs/13-censo-de-consumidores.md` desconfía de colgar el censo de Dependabot.

Lo que **sí** se puede verificar sin red es que el procedimiento lo mande a
comprobar. La comprobación contra GitHub es un acto del release; el banco garantiza
que ese acto esté escrito y no se pierda.

**El límite, declarado:** esto no impide publicar con las plantillas atrasadas. Lo
que impide es que el paso desaparezca del procedimiento sin que nadie lo note.

## Impacto en los proyectos consumidores

**Ninguno en su pipeline.** Cambia el procedimiento de publicación del marco. Lo que
ganan es que el camino sin instalar deje de entregar versiones viejas. Es MINOR.
