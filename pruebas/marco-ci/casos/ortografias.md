# Las ortografias de los ejecutores que descargan

Este archivo es el ALFABETO DEL BANCO del check "Ejecutores de paquetes pinados", y
existe para que el corpus generado deje de salir del alfabeto que el propio paso
declara.

## Por que no puede salir del paso

Hasta la ronda del 2026-08-20 `generar.mjs` leia el `const ALFABETO` del YAML. El
corpus asi construido es enorme (2191 entradas) y no puede, por construccion,
encontrar un miembro nuevo de la clase: pregunta por lo que el paso ya sabe que
existe. Es la misma tautologia que la ronda anterior tenia con la lista de casos
escrita a mano, un nivel mas arriba y por lo tanto mas dificil de ver. El corpus
encontro cosas —`--registry <url>` cayendo por el carril del `::warning`, y despues
el corte de salida de los 64 KiB— pero ninguna de ellas era un gestor ni una
ortografia: eran defectos de los OTROS ejes, los que si estaban escritos aparte.

Desde esta ronda el alfabeto del banco sale de **la documentacion de cada gestor** y
del **lenguaje anfitrion** donde la linea vive de verdad (entrada de allowlist de
Claude Code, YAML de Actions, string de JSON, shell). El paso y el banco quedan con
dos alfabetos INDEPENDIENTES, y el banco afirma la relacion entre los dos: todo par
que el paso declara tiene que estar aca —si no, el banco no lo puede juzgar y eso es
rojo—, y el corpus puede traer formas que el paso todavia no conoce, que es
exactamente lo que un banco tiene que poder hacer.

## Por que vive en un `.md` y no en `generar.mjs`

El check se aplica a si mismo sobre todo archivo rastreado, con el pathspec `:!*.md`
como unica exclusion. Un nombre de gestor escrito literal en `generar.mjs` —que es
codigo rastreado y no es `.md`— pondria el arbol de Projects en rojo sobre su propio
banco. Aca los nombres pueden estar literales porque el paso nunca lee este archivo,
y `generar.mjs` los recibe en tiempo de corrida.

## El alfabeto

`ortografias` son las formas con las que el binario aparece en el PATH. La primera es
la canonica; las demas son las que instala la propia herramienta y que descargan
igual. `sub` vacio quiere decir ejecutor directo (sin subcomando).

```json
{
  "gestores": [
    {
      "gestor": "npx",
      "sub": "",
      "ortografias": ["npx", "npx.cmd", "./node_modules/.bin/npx"],
      "fuente": "npx viene con npm. En Windows el instalador deja npx.cmd y npx.ps1 al lado del shim sin extension, y cuando el binario lo trae una dependencia del repo la ruta ./node_modules/.bin/npx es la forma habitual de invocarlo."
    },
    {
      "gestor": "npm",
      "sub": "exec",
      "ortografias": ["npm", "npm.cmd"],
      "fuente": "npm exec es el ejecutor documentado de npm: corre un binario del paquete y lo DESCARGA si no esta instalado."
    },
    {
      "gestor": "npm",
      "sub": "x",
      "ortografias": ["npm", "npm.cmd"],
      "fuente": "x es el alias documentado de npm exec, y por lo tanto descarga igual."
    },
    {
      "gestor": "pnpm",
      "sub": "dlx",
      "ortografias": ["pnpm", "pnpm.cmd"],
      "fuente": "pnpm dlx trae el paquete a un almacen temporal y lo ejecuta; es el equivalente de pnpm a npx. pnpm exec NO esta aca a proposito: falla cerrado y es la salida recomendada por el marco."
    },
    {
      "gestor": "yarn",
      "sub": "dlx",
      "ortografias": ["yarn", "yarn.cmd"],
      "fuente": "yarn dlx (Yarn moderno) descarga el paquete en un entorno temporal y lo corre. yarn exec, igual que pnpm exec, no descarga y por eso no esta."
    },
    {
      "gestor": "bun",
      "sub": "x",
      "ortografias": ["bun", "bun.exe"],
      "fuente": "bun x es la forma con subcomando del ejecutor de bun. En Windows el binario es bun.exe."
    },
    {
      "gestor": "bunx",
      "sub": "",
      "ortografias": ["bunx", "bunx.exe"],
      "fuente": "bunx es el ejecutor directo que bun instala al lado de su binario, equivalente a bun x."
    }
  ],
  "fuera_del_alcance": [
    {
      "forma": "npm init <paquete> / npm create / pnpm create / yarn create / bun create",
      "motivo": "La familia de scaffolding descarga igual (npm init <pkg> resuelve create-<pkg>), y sigue siendo el residuo 2 declarado en el commit de la ronda anterior. No entra al corpus porque cerrarla pide una distincion nueva que el paso todavia no tiene: para exec/x/dlx un ejecutor sin argumento es indeterminado, pero para init/create sin argumento significa que NO descarga, y sin esa distincion 'npm init -y' saldria rojo dentro de un allowlist. Meterla al corpus antes de tener la distincion no mide un agujero: fabrica un falso rojo. Va en su propio change, con su propio spec."
    },
    {
      "forma": "pnpx",
      "motivo": "Existio como atajo de pnpm dlx y hay versiones donde ya no esta. NO SE PUDO VERIFICAR contra la documentacion de pnpm desde esta maquina, asi que no se agrega: un alfabeto de banco con una forma inventada produce un rojo que nadie puede arreglar. Queda anotado porque si se confirma no alcanza con sumarlo aca — el prefiltro del paso es 'np[mx]|yarn|bun' y la cadena 'pnpx' no contiene ninguna de esas, asi que pediria tambien tocar el prefiltro."
    },
    {
      "forma": "deno run npm:<paquete>",
      "motivo": "Descarga de npm y no lo ve nadie, pero es otro runtime: no esta en el stack fijado del area, el prefiltro no lo nombra y meterlo seria decidir un alcance nuevo en un PR de arreglo. Se anota para que la proxima ronda no lo redescubra como hallazgo."
    }
  ]
}
```

## Los ejes del lenguaje anfitrion

Los ejes de entrecomillado, banderas, paquete y envoltorio viven en `generar.mjs`
porque son formas de la gramatica (POSIX shell 2.2 cruzada con la puntuacion de JSON
y de YAML), no una lista de casos. El eje que esta ronda AGREGO es el del comodin de
Claude Code: en un allowlist la entrada se escribe `Bash(<comando>:*)`, y ese `:*`
puede quedar pegado al paquete, al subcomando **o al ejecutor**. Las tres posiciones
son la misma sintaxis del anfitrion; el corpus anterior solo generaba la primera,
porque siempre ponia un paquete al final. Las otras dos salian mudas en el paso, con
exit 0 y cero lineas de salida.
