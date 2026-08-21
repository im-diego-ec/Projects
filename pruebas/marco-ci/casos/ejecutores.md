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
para que un arreglo no lo rompa (`control`), si fija un COSTO conocido del
diseño (`limite`) —un caso que el check resuelve del lado conservador y no del
lado correcto— o si es una linea que el marco DECIDIO no enforzar y solo avisar
(`aviso`, desde el 2026-08-21). Un `limite` y un `aviso` no son casos que
"pasan": son decisiones medidas, escritas con su motivo, para que un cambio de
criterio se vea en el diff en vez de descubrirse cuando alguien lo cobre.

**El campo opcional `anota`** dice QUE anotacion tiene que emitir el paso sobre
esa linea: `error`, `warning` o `nada`. Existe porque el codigo de salida solo
distingue dos estados y desde el modo aviso hacen falta tres: un aviso ruidoso y
un silencio salen los dos exit 0, y son cosas distintas —uno DECLARA el residuo,
el otro ES el residuo—. Donde el campo esta, es lo que sostiene el caso; donde no,
alcanza el exit. En los casos de `aviso` es lo unico que impide que la decision de
no enforzar se convierta, sin que nadie lo note, en no mirar.

**Lo que se decidio NO enforzar el 2026-08-21 (residuo A16)**, y por que: el
alfabeto compara el gestor y su subcomando por IGUALDAD EXACTA contra tokens que
traen la puntuacion del lenguaje anfitrion. Con el comodin del allowlist PEGADO
(`:*`) el recorte lo saca y la entrada se lee; con el comodin SEPARADO por un
espacio no hay nada que recortar, y el token que sigue no es ningun subcomando del
alfabeto, asi que la entrada sale muda. Medido el 2026-08-21 sobre cinco entradas
de la misma familia: las cuatro de un gestor con subcomando dieron **exit 0 con
cero anotaciones** y la del ejecutor directo dio **exit 1**. Misma herramienta,
una ortografia de diferencia. Poner rojo solo la ortografia que este lector
alcanza no es enforzar la clase «un permiso de allowlist que autoriza descargar
sin pinar»: es enforzar una ortografia, y presentarla como compuerta es el falso
verde que este paso existe para no tener. Asi que lo INDETERMINADO —la linea que
trae un ejecutor y de la que no se puede leer que paquete corre— pasa a aviso, y
lo que se verifica completo —un paquete LEGIBLE sin version exacta— sigue siendo
rojo. El caso `allowlist-comodin`, que es la forma en que el problema aparecio de
verdad, esta del lado que sigue rojo.

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
    "anota": "error",
    "por_que": "la forma en que el problema aparecio DE VERDAD: el comodin del allowlist dejaba el paquete indeterminado y degradaba a ::warning:: con exit 0. Aca el paquete se LEE (openspec, sin version), asi que cae del lado que se verifica completo y sigue rojo despues del modo aviso del 2026-08-21"
  },
  {
    "id": "allowlist-ilegible",
    "origen": "aviso",
    "archivo": ".claude/settings.json",
    "linea": "    \"Bash(npx :::)\",",
    "exit": 0,
    "anota": "warning",
    "por_que": "MODO AVISO desde el 2026-08-21 (residuo A16). Era rojo, y el rojo era honesto solo para esta ortografia: 'Bash(npm :::)' —el mismo permiso ilegible sobre un gestor con subcomando— salia exit 0 y CERO anotaciones, porque el token siguiente no es ningun subcomando del alfabeto. Enforzar una ortografia y no la clase es presentar como compuerta lo que no lo es, asi que lo indeterminado avisa con el residuo nombrado. El aviso tiene que estar: si esta linea saliera muda, seria el residuo y no la decision"
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
    "anota": "error",
    "por_que": "la misma ceguera dentro de un allowlist de agente, donde la linea no es una invocacion que alguien revise cuando falle sino un permiso permanente para descargar y ejecutar. El paquete se LEE, asi que sigue siendo rojo despues del modo aviso del 2026-08-21: lo que bajo a aviso es lo indeterminado, no lo legible sin pinar"
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
    "anota": "warning",
    "por_que": "fuera de un allowlist lo indeterminado siempre fue ::warning::, ruidoso y no bloqueante. El caso queda para fijar que el modo aviso no lo volvio MUDO: la diferencia entre avisar y no mirar es todo lo que separa un residuo declarado de un agujero"
  },
  {
    "id": "valor-entrecomillado-doble",
    "origen": "refutacion",
    "archivo": "flujo.yml",
    "linea": "      - run: pnpm -C \"./mi dir\" dlx openspec update",
    "exit": 1,
    "por_que": "medido exit 0 con el mensaje 'no hay nada que pinar': el token de valor era [^-\\s][^ \\t]* en el lector y su equivalente en el prefiltro, asi que un valor entrecomillado CON ESPACIO cegaba a los dos a la vez"
  },
  {
    "id": "valor-entrecomillado-simple",
    "origen": "refutacion",
    "archivo": "flujo.yml",
    "linea": "      - run: pnpm -C './mi dir' dlx openspec update",
    "exit": 1,
    "por_que": "misma ceguera con comilla simple; la mutacion de control de la ronda anterior solo cubria la comilla doble, que es como el eje quedo abierto"
  },
  {
    "id": "allowlist-valor-entrecomillado-doble",
    "origen": "refutacion",
    "archivo": ".claude/settings.json",
    "linea": "      \"Bash(npm --prefix \\\"./mi dir\\\" exec openspec:*)\",",
    "exit": 1,
    "por_que": "medido exit 0: la severidad partida del allowlist no se sostenia contra la clase, porque el valor con espacio cegaba tambien al allowlist. Aca el comando vive DENTRO de un string de JSON, asi que hace falta desenvolver un nivel antes de tokenizar"
  },
  {
    "id": "allowlist-valor-entrecomillado-simple",
    "origen": "refutacion",
    "archivo": ".claude/settings.json",
    "linea": "      \"Bash(npm --prefix './mi dir' exec openspec:*)\",",
    "exit": 1,
    "por_que": "misma ceguera del allowlist con comilla simple adentro del string de JSON"
  },
  {
    "id": "valor-con-espacio-escapado",
    "origen": "refutacion",
    "archivo": "flujo.yml",
    "linea": "      - run: pnpm -C ./mi\\ dir dlx openspec update",
    "exit": 1,
    "por_que": "tercera ortografia del mismo eje: el espacio escapado con barra no lleva comillas y rompia igual el token de valor"
  },
  {
    "id": "yarn-dlx-valor-entrecomillado",
    "origen": "refutacion",
    "archivo": "flujo.yml",
    "linea": "      - run: yarn --cwd \"/tmp/a b\" dlx openspec update",
    "exit": 1,
    "por_que": "el mismo eje en el otro alfabeto de banderas (yarn --cwd sale de la doc, no esta instalado aca)"
  },
  {
    "id": "bun-x-valor-entrecomillado-simple",
    "origen": "refutacion",
    "archivo": "flujo.yml",
    "linea": "      - run: bun --cwd '/tmp/a b' x openspec",
    "exit": 1,
    "por_que": "el mismo eje en bun (bun --cwd sale de la doc, no esta instalado aca)"
  },
  {
    "id": "invocacion-partida-en-dos-lineas",
    "origen": "refutacion",
    "archivo": "flujo.sh",
    "linea": "pnpm \\\n  dlx openspec update",
    "exit": 1,
    "por_que": "era un LIMITE DECLARADO del enfoque anterior ('una invocacion partida en varias lineas con barra no se lee'), y con el prefiltro por archivo el lector ve el archivo entero, asi que el limite se cierra en vez de declararse"
  },
  {
    "id": "ejecutor-invocado-con-ruta",
    "origen": "refutacion",
    "archivo": "flujo.sh",
    "linea": "./node_modules/.bin/npx openspec update",
    "exit": 1,
    "por_que": "descarga igual, y el limite de palabra del regex anterior excluia a proposito todo lo precedido por barra o punto, asi que esta forma salia verde"
  },
  {
    "id": "comando-anidado-en-json",
    "origen": "refutacion",
    "archivo": "tareas.json",
    "linea": "      \"cmd\": \"pnpm -C \\\"./mi dir\\\" dlx openspec update\",",
    "exit": 1,
    "por_que": "el texto que este check lee no es de un solo lenguaje: un comando de shell viaja adentro de un string de JSON, y un tokenizador plano no puede porque el entrecomillado de afuera apaga el de adentro"
  },
  {
    "id": "apostrofo-suelto-no-come-la-linea",
    "origen": "control",
    "archivo": "flujo.sh",
    "linea": "echo don't && npx openspec update",
    "exit": 1,
    "por_que": "riesgo NUEVO del tokenizador: una comilla sin pareja podria abrir un entrecomillado que se coma el resto de la linea y esconda la invocacion. Sin pareja se trata como caracter literal"
  },
  {
    "id": "llaves-no-son-separador",
    "origen": "control",
    "archivo": "flujo.yml",
    "linea": "      - run: npx --yes @fission-ai/openspec@${PIN} update --force",
    "exit": 0,
    "por_que": "riesgo NUEVO del tokenizador: si la llave separara palabras, un pin por variable se leeria partido y el check se pondria rojo sobre la forma correcta. Medido: con llaves entre los separadores, el arbol de Projects se ponia rojo en dos lineas"
  },
  {
    "id": "residuo-subcomando-por-variable",
    "origen": "limite",
    "archivo": "flujo.sh",
    "linea": "pnpm $SUB openspec update",
    "exit": 0,
    "por_que": "RESIDUO IRREDUCIBLE declarado: si el gestor o su subcomando llegan por indireccion, el texto de la linea no contiene la invocacion y ninguna lectura estatica la puede ver. Cerrarlo pide ejecutar, que es lo que este paso no hace"
  },
  {
    "id": "paquete-por-bandera-package",
    "origen": "control",
    "archivo": "flujo.sh",
    "linea": "npx -p openspec cmd",
    "exit": 1,
    "por_que": "-p y --package mueven el paquete de lugar: lo que sigue a la bandera ES el paquete, y sin version sigue sin pinar"
  },
  {
    "id": "paquete-por-bandera-package-pinado",
    "origen": "control",
    "archivo": "flujo.sh",
    "linea": "npx -p openspec@1.9.0 cmd",
    "exit": 0,
    "por_que": "el mismo camino con version exacta no puede ponerse rojo: si lo hiciera, la forma correcta seria inalcanzable"
  },
  {
    "id": "separador-tabulador",
    "origen": "control",
    "archivo": "flujo.sh",
    "linea": "npx\topenspec update",
    "exit": 1,
    "por_que": "el tabulador separa palabras igual que el espacio en la gramatica de shell; un tokenizador que solo mirara el espacio lo perderia"
  },
  {
    "id": "ruta-con-separador-de-windows",
    "origen": "control",
    "archivo": "flujo.sh",
    "linea": ".\\node_modules\\.bin\\npx openspec update",
    "exit": 1,
    "por_que": "la barra invertida es escape para el tokenizador, asi que el nombre del gestor se busca tambien en la forma CRUDA del token; si no, una ruta de Windows lo esconderia"
  },
  {
    "id": "anidado-en-dos-niveles",
    "origen": "control",
    "archivo": "tareas.json",
    "linea": "      \"cmd\": \"sh -c \\\"npx openspec update\\\"\",",
    "exit": 1,
    "por_que": "el desenvuelto anidado tiene que aguantar mas de un nivel: aca el comando esta dentro de un sh -c que a su vez esta dentro de un string de JSON"
  },
  {
    "id": "comodin-pegado-al-ejecutor",
    "origen": "aviso",
    "archivo": ".claude/settings.json",
    "linea": "      \"Bash(npx:*)\",",
    "exit": 0,
    "anota": "warning",
    "por_que": "medido exit 0 con CERO lineas de salida en 61d604c: el alfabeto se comparaba por igualdad exacta y el token llegaba con el comodin del anfitrion pegado. La ronda del 2026-08-20 lo puso rojo; el 2026-08-21 baja a AVISO porque la misma entrada con el comodin SEPARADO sigue muda, y enforzar una ortografia no es enforzar la clase. El permiso sigue siendo el mas ancho posible y el aviso lo dice con el residuo al lado"
  },
  {
    "id": "comodin-pegado-al-subcomando",
    "origen": "aviso",
    "archivo": ".claude/settings.json",
    "linea": "      \"Bash(pnpm dlx:*)\",",
    "exit": 0,
    "anota": "warning",
    "por_que": "misma causa un token mas adentro: el subcomando es el SEGUNDO sitio que compara contra el alfabeto, y limpiar() solo estaba en el tercero (el paquete). Medido exit 0 antes del 2026-08-20 y exit 1 despues; desde el 2026-08-21 es AVISO, por la asimetria del comodin separado"
  },
  {
    "id": "comodin-pegado-al-gestor-sin-subcomando",
    "origen": "aviso",
    "archivo": ".claude/settings.json",
    "linea": "      \"Bash(npm:*)\",",
    "exit": 0,
    "anota": "warning",
    "por_que": "lo encontro el corpus con alfabeto propio, no una lista escrita a mano: autoriza CUALQUIER subcomando de npm, el de ejecutar incluido, asi que es el permiso mas ancho posible para descargar y ejecutar. Desde el 2026-08-21 es AVISO y no rojo: su hermana con el comodin separado —el caso residuo-comodin-separado, aca abajo— es el MISMO permiso y sale muda"
  },
  {
    "id": "residuo-comodin-separado-con-subcomando",
    "origen": "limite",
    "archivo": ".claude/settings.json",
    "linea": "      \"Bash(npm *)\",",
    "exit": 0,
    "anota": "nada",
    "por_que": "RESIDUO A16, medido el 2026-08-21: exit 0 y CERO anotaciones. Es el MISMO permiso que 'Bash(npm:*)' —autoriza cualquier subcomando, el de ejecutar incluido— y el lector no lo ve, porque el comodin separado no es puntuacion que recortar y el token que sigue no es ningun subcomando del alfabeto. Queda fijado como caso: el dia que este check lo anote, esta linea se cae y el residuo se cierra en el diff en vez de descubrirse por casualidad"
  },
  {
    "id": "residuo-comodin-separado-pnpm",
    "origen": "limite",
    "archivo": ".claude/settings.json",
    "linea": "      \"Bash(pnpm *)\",",
    "exit": 0,
    "anota": "nada",
    "por_que": "la misma medicion en el otro gestor con subcomando: exit 0 y cero anotaciones. Estan los dos porque el residuo es de la CLASE (gestor con subcomando + comodin separado) y no de un nombre"
  },
  {
    "id": "aviso-comodin-separado-ejecutor-directo",
    "origen": "aviso",
    "archivo": ".claude/settings.json",
    "linea": "      \"Bash(npx *)\",",
    "exit": 0,
    "anota": "warning",
    "por_que": "LA ASIMETRIA, en una linea: medido exit 1 el 2026-08-21 mientras sus cuatro hermanas de gestor con subcomando daban exit 0 mudo. Un ejecutor DIRECTO no tiene subcomando, asi que el comodin cae en el lugar del paquete y el lector lo lee como indeterminado. Misma herramienta, una ortografia de diferencia: por eso lo indeterminado paso a aviso en vez de dejar rojo el unico caso que este lector alcanza"
  },
  {
    "id": "gestor-con-sufijo-de-ejecutable",
    "origen": "refutacion",
    "archivo": "flujo.yml",
    "linea": "      - run: pnpm.cmd dlx openspec update",
    "exit": 1,
    "por_que": "npm y pnpm dejan el .cmd en el PATH de Windows y descarga igual; el alfabeto comparaba la hoja de la ruta sin sacarle el sufijo. Medido exit 0 antes"
  },
  {
    "id": "comodin-en-otro-token-no-marca-al-gestor",
    "origen": "control",
    "archivo": ".claude/settings.json",
    "linea": "      \"Bash(npm run build:*)\",",
    "exit": 0,
    "por_que": "EL control que hace usable la regla de arriba. Aca el comodin esta pegado a otro token, asi que la entrada no autoriza exec y no se marca. Sin esta angostura habria que marcar todo gestor sin subcomando reconocido, o sea npm ci, npm run y pnpm install: un check que marca eso se apaga en el tercer PR"
  },
  {
    "id": "gestor-con-sufijo-y-pin-exacto",
    "origen": "control",
    "archivo": "flujo.yml",
    "linea": "      - run: npx.cmd --yes @fission-ai/openspec@1.9.0 validate --all",
    "exit": 0,
    "por_que": "la ortografia con sufijo tiene que poder estar BIEN: si la forma correcta tambien saliera roja, cerrar el agujero seria dejar el check sin salida verde"
  }
]
```
