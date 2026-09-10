---
artefacto: proposal
dri: Builder 1
aprueba: PO  # qué plataformas ofrece el marco es decisión de producto
informado: PO / Builder 2
estado: pendiente-de-revision
---

# La constitución le admitía al proyecto una plataforma que la herramienta rechazaba

## Por qué

La lista de plataformas vive en **cuatro** lugares. Tres decían **cinco**; la
única que decide de verdad qué archivos viajan decía **tres**.

| Dónde | Decía |
|---|---|
| `plantilla/AGENTS.md:125` — la constitución que **viaja a cada proyecto** | cinco |
| `actions/constitucion/canonico/60-infra-plataforma-secretos.md:14` — **canónico y versionado** | cinco |
| `pruebas/andamio/terraform-en-ci.test.mjs:347` — una cuarta copia, en un banco | cinco |
| `herramientas/projects-init.mjs:724` — `PLATAFORMAS` | **tres** |

**Lo que le pasaba a una persona.** Nace su proyecto. Abre su `AGENTS.md` —la
constitución que el marco le acaba de entregar— y lee que los valores admitidos
son `supabase`, `cloudflare`, `gcp`, `aws` y `ninguna`. Elige `cloudflare`. La
herramienta le contesta, **medido**:

```
plataforma = "cloudflare" no es una opcion. Las que hay: aws, supabase, ninguna
```

`EXIT 1`. Le echa la culpa por haber leído la constitución y haberle hecho caso.
Para un no-coder ese mensaje no tiene salida: el documento que el propio marco le
dio dice una cosa y la herramienta del propio marco dice otra.

**La ironía está escrita en el archivo.** El comentario encima de `PLATAFORMAS`
advierte: *«una segunda lista al lado de la primera es como empiezan las
divergencias, y este archivo ya pagó esa cuenta»*. La divergencia existía igual,
**cruzando el borde del archivo** — que es donde ese comentario no miraba.

## Qué cambia

1. **`PLATAFORMAS_PENDIENTES = ["cloudflare", "gcp"]`**: el hueco se declara, con
   su razón y su destino (`openspec/changes/promocion-por-ambientes`).
2. **`PLATAFORMAS_DECLARADAS` se deriva** de implementadas + pendientes. No es una
   tercera lista: es la suma de las dos, porque escribirla aparte sería repetir
   exactamente el defecto que se está cerrando.
3. **El mensaje distingue los dos casos.** Elegir `cloudflare` ya no es «no es una
   opción»: es *«la constitución la admite pero todavía no está implementada: no
   hay adaptador que la entregue, así que armarte el proyecto sería darte archivos
   que no la usan»*, con el enlace a dónde vive ese trabajo.
4. **Una compuerta cruza las cuatro copias** y se pone roja si alguna se mueve.

## Por qué NO se recortó la constitución a tres

Era el atajo, y es el lado equivocado. **La herramienta es la que está atrasada,
no el documento:** `plantilla/infra/adaptadores.md` describe los adaptadores de
`cloudflare` y `gcp` como el camino previsto, y el canónico está **versionado** —
recortarlo mueve un artefacto que los consumidores regeneran, por un hueco de
implementación.

Editar el documento habría hecho desaparecer el síntoma sin tocar el problema, y
habría borrado del mapa dos plataformas que el diseño sí contempla. El hueco es
real: lo que faltaba era que **se viera y tuviera dueño**.

## Lo que este change NO hace

**No implementa `cloudflare` ni `gcp`.** Eso es el adaptador, y vive en
`promocion-por-ambientes` junto con las tres preguntas que ese change tiene
abiertas. Acá el hueco pasa de contradicción silenciosa a pendiente declarado.

## Impacto en los proyectos consumidores

**Ninguno en su pipeline.** Cambia la herramienta de arranque y un banco. La
constitución y el canónico **no se tocan** — son ellos los que estaban bien. Es
MINOR.
