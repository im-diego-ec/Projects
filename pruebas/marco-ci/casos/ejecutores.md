# Casos del check "Ejecutores de paquetes pinados"

Las invocaciones de prueba viven en un `.md` y no en el `.mjs` del banco por una
razon del propio check: **los `.md` quedan fuera de su universo a proposito**
(limite declarado en `marco-ci.yml`, porque la documentacion del marco cita la
forma incorrecta como contraejemplo). Si estos contraejemplos vivieran en un
archivo de codigo rastreado, el check se pondria rojo sobre su propio banco y la
unica salida seria aflojarlo, que es la salida prohibida.

Cada caso es una linea, el archivo donde se escribe dentro del repo de juguete y
el codigo de salida que el check tiene que devolver. `origen` dice si el caso
nacio de la auditoria del 2026-08-20 (`refutacion`) o si ya se sostenia y esta
aca para que un arreglo no lo rompa (`control`).

```json
[
  {
    "id": "npm-x",
    "origen": "refutacion",
    "archivo": "flujo.yml",
    "linea": "      - run: npm x openspec update",
    "exit": 1,
    "por_que": "npm x es el alias documentado de npm exec y descarga igual; medido exit 0 antes del arreglo"
  },
  {
    "id": "bun-x",
    "origen": "refutacion",
    "archivo": "flujo.yml",
    "linea": "      - run: bun x openspec update",
    "exit": 1,
    "por_que": "bunx es bun x; el alfabeto viejo solo conocia la forma pegada"
  },
  {
    "id": "pnpm-dlx-con-bandera",
    "origen": "refutacion",
    "archivo": "flujo.yml",
    "linea": "      - run: pnpm --silent dlx openspec update",
    "exit": 1,
    "por_que": "el regex exigia pnpm y dlx pegados, asi que cualquier bandera global intermedia lo cegaba"
  },
  {
    "id": "yarn-dlx-con-bandera",
    "origen": "refutacion",
    "archivo": "flujo.yml",
    "linea": "      - run: yarn --silent dlx openspec update",
    "exit": 1,
    "por_que": "misma ceguera que pnpm --silent dlx"
  },
  {
    "id": "npm-exec-con-bandera",
    "origen": "refutacion",
    "archivo": "flujo.yml",
    "linea": "      - run: npm --loglevel=error exec openspec",
    "exit": 1,
    "por_que": "misma ceguera con npm exec"
  },
  {
    "id": "allowlist-comodin",
    "origen": "refutacion",
    "archivo": ".claude/settings.json",
    "linea": "    \"Bash(npx --yes openspec:*)\",",
    "exit": 1,
    "por_que": "la forma en que el problema aparecio DE VERDAD: el comodin del allowlist dejaba el paquete indeterminado y degradaba a ::warning:: con exit 0"
  },
  {
    "id": "allowlist-ilegible",
    "origen": "refutacion",
    "archivo": ".claude/settings.json",
    "linea": "    \"Bash(npx :::)\",",
    "exit": 1,
    "por_que": "en un allowlist una linea que no se puede leer no es un aviso: es un permiso permanente sin revisar"
  },
  {
    "id": "pnpm-dlx-pelado",
    "origen": "control",
    "archivo": "flujo.yml",
    "linea": "      - run: pnpm dlx openspec update",
    "exit": 1,
    "por_que": "la forma que el check ya cazaba"
  },
  {
    "id": "npx-pelado",
    "origen": "control",
    "archivo": "flujo.yml",
    "linea": "      - run: npx openspec update",
    "exit": 1,
    "por_que": "la forma que el check ya cazaba"
  },
  {
    "id": "allowlist-pinado",
    "origen": "control",
    "archivo": ".claude/settings.json",
    "linea": "    \"Bash(npx --yes @fission-ai/openspec@1.9.0 validate *)\",",
    "exit": 0,
    "por_que": "la forma correcta que reparte la plantilla no puede volverse roja"
  },
  {
    "id": "pin-literal",
    "origen": "control",
    "archivo": "flujo.yml",
    "linea": "      - run: npx --yes @fission-ai/openspec@1.9.0 validate --all --strict",
    "exit": 0,
    "por_que": "version exacta literal"
  },
  {
    "id": "pin-por-variable",
    "origen": "control",
    "archivo": "flujo.yml",
    "linea": "      - run: npx --yes @fission-ai/openspec@${PIN} update --force",
    "exit": 0,
    "por_que": "el pin canonico del marco llega por input del workflow"
  },
  {
    "id": "comentario",
    "origen": "control",
    "archivo": "flujo.yml",
    "linea": "      # npx openspec update quedaria sin pinar",
    "exit": 0,
    "por_que": "una linea que arranca en comentario no se ejecuta"
  },
  {
    "id": "sin-instalar",
    "origen": "control",
    "archivo": "flujo.yml",
    "linea": "      - run: npx --no-install openspec update",
    "exit": 0,
    "por_que": "con --no-install el ejecutor ya no puede descargar nada"
  },
  {
    "id": "pnpm-exec",
    "origen": "control",
    "archivo": "flujo.yml",
    "linea": "      - run: pnpm exec openspec validate --strict",
    "exit": 0,
    "por_que": "pnpm exec lee node_modules y falla CERRADO: queda fuera del alfabeto a proposito, y agregar banderas intermedias no lo puede meter"
  },
  {
    "id": "pnpm-exec-con-bandera",
    "origen": "control",
    "archivo": "flujo.yml",
    "linea": "      - run: pnpm --silent exec openspec validate --strict",
    "exit": 0,
    "por_que": "la tolerancia a banderas no puede arrastrar a los ejecutores que fallan cerrado"
  },
  {
    "id": "nombre-parecido",
    "origen": "control",
    "archivo": "flujo.yml",
    "linea": "      - run: ./scripts/mynpx openspec update",
    "exit": 0,
    "por_que": "el limite de palabra por delante descarta mynpx"
  },
  {
    "id": "subcomando-parecido",
    "origen": "control",
    "archivo": "flujo.yml",
    "linea": "      - run: npm xyz openspec",
    "exit": 0,
    "por_que": "npm xyz no es npm x: el alfabeto nuevo no puede volverse un prefijo suelto"
  },
  {
    "id": "indeterminado-fuera-de-allowlist",
    "origen": "control",
    "archivo": "flujo.yml",
    "linea": "      - run: npx :::",
    "exit": 0,
    "por_que": "fuera de un allowlist lo indeterminado sigue siendo ::warning::, que es ruidoso y no bloqueante"
  }
]
```
