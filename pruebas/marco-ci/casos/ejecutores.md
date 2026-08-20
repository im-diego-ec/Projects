# Casos del check "Ejecutores de paquetes pinados"

Las invocaciones de prueba viven en un `.md` y no en el `.mjs` del banco por una
razon del propio check: **los `.md` quedan fuera de su universo a proposito**
(limite declarado en `marco-ci.yml`, porque la documentacion del marco cita la
forma incorrecta como contraejemplo). Si estos contraejemplos vivieran en un
archivo de codigo rastreado, el check se pondria rojo sobre su propio banco y la
unica salida seria aflojarlo, que es la salida prohibida.

Cada caso es una linea, el archivo donde se escribe dentro del repo de juguete y
el codigo de salida que el check tiene que devolver. `origen` dice si el caso
nacio de la auditoria del 2026-08-20 (`refutacion`), si ya se sostenia y esta aca
para que un arreglo no lo rompa (`control`), o si fija un COSTO conocido del
diseño (`limite`): un caso que el check resuelve del lado conservador y no del
lado correcto. Un `limite` no es un caso que "pasa": es una decision medida,
escrita con su motivo, para que un cambio de criterio se vea en el diff en vez de
descubrirse cuando alguien lo cobre.

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
    "id": "pnpm-dlx-bandera-con-valor",
    "origen": "refutacion",
    "archivo": "flujo.yml",
    "linea": "      - run: pnpm -C . dlx openspec update",
    "exit": 1,
    "por_que": "-C toma el directorio como argumento SIGUIENTE (verificado con 'pnpm -C . dlx --help', exit 0) y la tolerancia anterior solo aceptaba banderas sin valor separado; medido exit 0 antes de este arreglo"
  },
  {
    "id": "npm-exec-bandera-con-valor",
    "origen": "refutacion",
    "archivo": "flujo.yml",
    "linea": "      - run: npm --prefix ./x exec openspec",
    "exit": 1,
    "por_que": "npm --prefix toma la ruta como argumento siguiente (verificado con 'npm --prefix . exec --help', exit 0); medido exit 0 antes de este arreglo"
  },
  {
    "id": "yarn-dlx-bandera-con-valor",
    "origen": "refutacion",
    "archivo": "flujo.yml",
    "linea": "      - run: yarn --cwd . dlx openspec update",
    "exit": 1,
    "por_que": "--cwd es la opcion de nivel superior que documenta yarn y toma la ruta como argumento siguiente; medido exit 0 antes de este arreglo"
  },
  {
    "id": "npm-x-loglevel-con-valor",
    "origen": "refutacion",
    "archivo": "flujo.yml",
    "linea": "      - run: npm --loglevel error x openspec",
    "exit": 1,
    "por_que": "npm resuelve CUALQUIER clave de config como --clave <valor> (verificado con 'npm --loglevel error --registry https://registry.npmjs.org x --help', exit 0): por eso el alfabeto se escribe general y no como lista cerrada"
  },
  {
    "id": "npm-exec-workspace-corta",
    "origen": "refutacion",
    "archivo": "flujo.yml",
    "linea": "      - run: npm -w web exec openspec",
    "exit": 1,
    "por_que": "-w/--workspace es una bandera CORTA con valor separado (verificado con 'npm -C . -w foo exec --help', exit 0): las cortas tienen que entrar igual que las largas"
  },
  {
    "id": "pnpm-dlx-filter-con-valor",
    "origen": "refutacion",
    "archivo": "flujo.yml",
    "linea": "      - run: pnpm --filter web dlx openspec update",
    "exit": 1,
    "por_que": "--filter toma el patron como argumento siguiente (verificado con 'pnpm --filter x dlx --help', exit 0)"
  },
  {
    "id": "pnpm-dlx-dos-banderas-con-valor",
    "origen": "refutacion",
    "archivo": "flujo.yml",
    "linea": "      - run: pnpm --loglevel error --reporter default dlx openspec update",
    "exit": 1,
    "por_que": "dos banderas con valor seguidas: la tolerancia tiene que REPETIR y no aceptar una sola (verificado con 'pnpm --loglevel error dlx --help' y 'pnpm --reporter default dlx --help', exit 0 las dos)"
  },
  {
    "id": "pnpm-dlx-store-dir-con-valor",
    "origen": "refutacion",
    "archivo": "flujo.yml",
    "linea": "      - run: pnpm --store-dir ./s dlx openspec update",
    "exit": 1,
    "por_que": "una cuarta global de pnpm con valor separado que la auditoria no nombro (verificado con 'pnpm --store-dir . dlx --help', exit 0): esta aca para probar que el arreglo es de CLASE y no de los tres casos citados"
  },
  {
    "id": "bun-x-cwd-con-valor",
    "origen": "refutacion",
    "archivo": "flujo.yml",
    "linea": "      - run: bun --cwd ./app x openspec",
    "exit": 1,
    "por_que": "--cwd y -c/--config son las globales con valor que documenta bun; el binario NO esta en esta maquina, asi que la forma viene de la doc y lo que se mide aca es el check, no bun"
  },
  {
    "id": "allowlist-bandera-con-valor",
    "origen": "refutacion",
    "archivo": ".claude/settings.json",
    "linea": "    \"Bash(npm --prefix ./x exec openspec:*)\",",
    "exit": 1,
    "por_que": "la misma ceguera dentro de un allowlist de agente, donde la linea no es una invocacion que alguien revise cuando falle sino un permiso permanente para descargar y ejecutar"
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
    "id": "pnpm-exec-bandera-con-valor",
    "origen": "control",
    "archivo": "flujo.yml",
    "linea": "      - run: pnpm -C . exec openspec validate --strict",
    "exit": 0,
    "por_que": "la tolerancia a banderas con VALOR tampoco puede arrastrar a los ejecutores que fallan cerrado: pnpm exec lee node_modules"
  },
  {
    "id": "pin-con-bandera-con-valor",
    "origen": "control",
    "archivo": "flujo.yml",
    "linea": "      - run: pnpm -C . dlx @fission-ai/openspec@1.9.0 update",
    "exit": 0,
    "por_que": "la forma nueva que el check ahora SI ve tiene que quedar verde cuando esta pinada: si no, el arreglo solo agrega rojos"
  },
  {
    "id": "bandera-con-valor-y-subcomando-parecido",
    "origen": "control",
    "archivo": "flujo.yml",
    "linea": "      - run: npm --prefix ./x xyz openspec",
    "exit": 0,
    "por_que": "tolerar el valor separado no puede convertir el subcomando en un prefijo suelto: npm xyz sigue sin ser npm x"
  },
  {
    "id": "script-tras-bandera-booleana",
    "origen": "control",
    "archivo": "flujo.yml",
    "linea": "      - run: npm --silent run build",
    "exit": 0,
    "por_que": "el caso mas frecuente de gestor + bandera + palabra: no hay ejecutor y no puede haber rojo"
  },
  {
    "id": "limite-booleana-mas-script-llamado-x",
    "origen": "limite",
    "archivo": "flujo.yml",
    "linea": "      - run: npm --silent run x paquete-sin-version",
    "exit": 1,
    "por_que": "COSTO MEDIDO de la forma general: sin lista cerrada de banderas no hay como saber que --silent es booleana, asi que 'run' se lee como su valor y la linea cae del lado del ejecutor. Es rojo del lado conservador en un check de seguridad —falso rojo legible, no falso verde mudo— y queda fijado aca para que un cambio de criterio se vea"
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
