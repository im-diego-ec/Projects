---
artefacto: design
dri: Builder 1
aprueba: Builder 2 (builder par)
estado: pendiente-de-revision
---

# Design — una-sola-lista-de-plataformas

## Clasificación de distribución

| Pieza | Forma | Por qué |
|---|---|---|
| `herramientas/projects-init.mjs` | canónico | corre desde el clon; no viaja |
| `pruebas/andamio/una-sola-lista-de-plataformas.test.mjs` | canónico | banco del marco |

**`plantilla/AGENTS.md` y el canónico NO se tocan**, y esa es la decisión de
diseño principal.

## Hacia qué lado se corrige

Tres declaraciones decían cinco y una decía tres. La tentación es alinear por
mayoría o por comodidad; ninguna de las dos es el criterio correcto. El criterio
es **cuál de las dos es la verdad del diseño**:

- `plantilla/infra/adaptadores.md` describe los adaptadores de `cloudflare` y
  `gcp` como el camino previsto, con sus pendientes anotados.
- El canónico está **versionado**: recortarlo mueve un artefacto que los
  consumidores regeneran.
- Ninguna de esas tres describe algo que no vaya a existir; describen algo que
  **todavía** no existe.

Entonces la herramienta es la atrasada. Recortar la constitución habría hecho
desaparecer el síntoma y con él dos plataformas que el diseño sí contempla — y
habría convertido un hueco de implementación en una decisión de producto que
nadie tomó.

## `PLATAFORMAS_DECLARADAS` se deriva

Podría escribirse la lista de cinco a mano y comparar contra ella. Sería una
**tercera** lista, o sea el mismo defecto una vez más, en el mismo archivo donde
ya había un comentario advirtiéndolo. Se deriva: `[...PLATAFORMAS,
...PLATAFORMAS_PENDIENTES]`.

El primer caso del banco fija justamente eso — que siga siendo una derivación y
no una copia.

## La guarda que no es obvia

`una pendiente NO es una implementada`. Sin ella, una divergencia futura se
podría «arreglar» metiendo la plataforma en `PLATAFORMAS` sin que exista el
adaptador: las cuatro copias volverían a coincidir, el banco pasaría en verde, y
un proyecto nacería con archivos que no usan la plataforma que pidió. El banco
quedaría midiendo la coincidencia de cuatro textos en vez de la verdad que
protege.

## Lo que el mensaje compra

Un no-coder que lee la constitución, elige `cloudflare` y recibe «no es una
opción» no tiene salida: los dos documentos que el marco le dio se contradicen y
ninguno le dice cuál manda. Con el mensaje nuevo sabe tres cosas: que no se
equivocó, por qué no se puede todavía, y dónde mirar.
