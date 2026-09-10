---
artefacto: tasks
dri: Builder 1
aprueba: Builder 2 (builder par)
estado: pendiente-de-revision
---

# Tasks — el-comando-que-se-pega-funciona

## 1. Las comillas

- [x] 1.1 Función que entrecomilla una ruta cuando lo necesita, exportada para
      el banco. Evidencia: `pruebas/init/comando-pegable.test.mjs`.
- [x] 1.2 Los cinco sitios de `projects-init.mjs` que emiten rutas dentro de un
      comando la usan. **Tres** los mide el banco (los de `lineasDelPasoQueSigue`);
      los **dos de `main()`** —el comando `--ejemplo` y el de `projects-versiones`—
      no tienen compuerta y quedan declarados abajo.
- [x] 1.3 `lineasDelPasoQueSigue` deriva la ruta a la herramienta de `raizMarco` y
      no de `import.meta.url`. Sin eso el caso era **imposible de probar** contra un
      clon con espacios: la ruta salía de la máquina de quien corre el banco, así
      que en CI —donde el checkout no tiene espacios— no ejercitaba nada.

## 2. Los bancos que la ruta con espacio rompía

- [x] 2.1 `el-doble-clic-llega.test.mjs` extrae el comando aceptando argumentos
      entrecomillados. Evidencia: el caso de punta a punta pasa con el clon en
      una ruta con espacio.
- [x] 2.2 `guardrail-deltas.test.mjs` usa `fileURLToPath` en vez de `.pathname`.
      Evidencia: el caso «compara mas de cero» pasa.

## 3. Verificación

- [x] 3.1 Los dos casos que estaban en rojo pasan.
- [x] 3.2 El banco completo sin regresión.
- [x] 3.3 MUERDE: quitar las comillas vuelve a poner rojo el caso de punta a punta.

## 3-bis. Lo que la revisión adversarial encontró, y estaba mal

- [x] 3bis.1 **El detector estaba INVERTIDO.** Cruzaba una regex contra la línea
      entera: daba **rojo sobre una línea correcta sin espacios** —la de CI— y
      **verde sobre el defecto real** —una ruta de Windows con espacio y sin
      comillas—. Pasaba sólo porque el clon de esta máquina vive en «No Coders».
      Habría puesto en rojo las tres patas del CI el día del push.
- [x] 3bis.2 La comprobación pasa a ser de **ida y vuelta**: cada ruta que entró
      tiene que volver como **un solo** argumento. Es la única formulación que caza
      el defecto, porque una ruta con espacio sin comillas **no produce un token con
      espacio: produce dos tokens**, indistinguibles de dos argumentos.
- [x] 3bis.3 El caso `MUERDE` medía `mkdir -p`, que **sale 0 sin comillas** (crea dos
      carpetas). Ahora ejecuta el `node … --valores … --destino …`, que es el único
      de la lista que de verdad falla.
- [x] 3bis.4 El `MUERDE` cableaba `/bin/sh`, que en Windows no existe. Ahora invoca
      `process.execPath` directo, sin shell.
- [x] 3bis.5 Los temporales del banco del doble clic pasan a llevar espacio en el
      nombre: sin eso, ese caso tampoco ejercitaba el defecto en CI.
- [x] 3bis.6 Verificado desde un clon en ruta **sin** espacios: 15/15 en verde. Y con
      `citarRuta` neutralizada: 6 de 7 en rojo.

## 4. Alcance declarado, que NO entra acá

- **El guardrail de deltas sale VERDE ante un directorio que no existe** — es un
  fail-open que `AGENTS.md` prohíbe. **Destino:** change propio, porque toca una
  action publicada y endurecerla puede enrojecer a un consumidor que hoy pasa:
  se estrena en modo aviso y endurece en la mayor siguiente.
