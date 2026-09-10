---
artefacto: design
dri: Builder 1
aprueba: Builder 2 (builder par)
estado: pendiente-de-revision
---

# Design — la-puerta-declara-lo-que-el-asistente

## Clasificación de distribución

| Pieza | Forma | Por qué |
|---|---|---|
| `herramientas/projects-puerta.mjs` | canónico | corre en el runner del repo plantilla |
| `herramientas/plantilla-repos/personalizar.yml` | **scaffold del molde** | vive en los dos repos plantilla y se regenera desde acá |
| `pruebas/init/puerta.test.mjs` | canónico | banco del marco |

## Derivar y no preguntar

Tres opciones:

**(a) Una quinta pregunta.** Descartada por la doctrina que el propio archivo ya
tenía escrita para el tipo de cuenta: preguntar algo que el entorno ya sabe es
pedirle a la persona que averigüe sobre su propio repositorio. Además cada pregunta
alarga el camino no-coder, que es el que este marco existe para acortar.

**(b) Derivarlo dentro de la herramienta, consultando la API.** Descartada: la
puerta correría una llamada de red para un dato que el evento **ya trae**, y con eso
ganaría un modo de falla nuevo.

**(c) Pasarlo por `env` desde el workflow**, como ya se hace con
`TIPO_DE_DUENIO`. Elegida. Una línea en el YAML, cero preguntas nuevas, cero red.

## El default asimétrico

`visibilidadDelRepo({})` devuelve `"privado"`.

Es deliberado y va contra la intuición de «default al caso más común». Los dos
errores posibles no cuestan lo mismo:

- **Declarar de más**: aparece un desvío que no correspondía. Alguien lo lee, ve que
  el repo es público, lo borra. Costo: un minuto.
- **Declarar de menos**: el proyecto queda sin la declaración de que no hay
  protección de rama. Nadie lo nota **hasta que alguien empuja a `main`** y descubre
  que nada lo detuvo. Costo: el incidente.

## Por qué el banco cruza el YAML

`visibilidadDelRepo` puede estar perfecta y el valor no llegar nunca. Un caso que
sólo probara la función mediría la mitad del camino y quedaría verde con la puerta
rota. El banco cruza contra `personalizar.yml` que la variable se pase de verdad.
