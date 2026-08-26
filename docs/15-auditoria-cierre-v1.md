# Auditoria de cierre de v1 — documento HISTORICO, foto del 2026-08-20

> **NO ES EL ESTADO DE HOY, Y NO SE ACTUALIZA.** Todo lo que sigue está escrito en
> imperativo («no mergear», «no mover `v1`») sobre PRs que estaban abiertos ese día
> y sobre un canal de distribución que ya no existe: **el tag móvil `v1` dejó de ser
> el canal el 2026-08-21**, el día siguiente a esta corrida (`AGENTS.md`, sección
> del tag móvil). Un `git log --oneline docs/15-auditoria-cierre-v1.md` da la fecha de
> la foto; el `CHANGELOG.md` da todo lo que pasó después.
>
> **Para qué sirve entonces:** es el registro de método —veinte afirmaciones puestas
> a prueba con fixtures y código de salida, cada una con su comando y su exit— y la
> lista de hallazgos que se citan por número desde otros documentos. Se lee para
> saber **qué se midió y cómo**, nunca para saber qué hacer ahora. Si un hallazgo de
> acá sigue vivo, lo que manda es la fila que le corresponda en
> [10-reglas-no-escritas.md](10-reglas-no-escritas.md), no este archivo.
>
> Su categoría en el [índice](README.md) es **Histórico**: no se edita para ponerlo
> al día. Corregirlo borraría el dato que lo hace valioso, que es qué se sabía el
> 2026-08-20.

Corrida del 2026-08-20 sobre los cinco PRs abiertos de Projects (12, 14, 15, 16) y el PR 154 del
repo consumidor que sirvio de banco de pruebas. Veinte afirmaciones del
cuerpo de esos PRs y de los comentarios del pipeline se pusieron a prueba con fixtures y
codigo de salida: **trece quedaron refutadas y siete se sostienen**. Lo que sigue esta
ordenado para leerse antes del review, no despues.

Regla de esta auditoria: una afirmacion vale por su codigo de salida, no por lo que imprime.
Cada hallazgo trae el comando y el exit. Donde no se pudo medir, lo dice.

---

## 1. Lo bloqueante

**NO mergear PR 12 tal como esta, y no mover `v1` despues de mergear PR 14 ni PR 15 sin los
arreglos de esta seccion.** El orden de merge propuesto no tiene un solo conflicto de archivo
(lo verifique mergeando de verdad en el object DB); lo que rompe no es ningun merge, es mover
el tag movil.

### B1. PR 12 archivaria un contrato que se contradice a si mismo, y el sistema medido no cumple la mitad fuerte

`openspec/specs/calidad-codigo/spec.md` de `release/calidad-fail-closed-archive` dice las dos
cosas: el parrafo normativo de las lineas 203-207 promete que la integracion FALLA cuando la
cobertura de un paquete queda por debajo del minimo del marco (80), y su propio scenario de
las lineas 237-239 promete lo contrario (falla si ademas esta por debajo del piso vigente del
paquete). El cuerpo del PR se queda con la version fuerte. Medicion sobre el consumidor real:

```
cd <consumidor>/web && node node_modules/vitest/vitest.mjs run --coverage
All files | 80.99 | 89.08 | 70.69 | 80.99
EXIT = 0
```

`functions` al 70,69%, 9,4 puntos debajo del minimo del marco, en verde. Y no hay compuerta
del total en ninguna de las cinco ramas: solo existe `actions/cobertura-diff`, que es el plano
del diff, y el scaffold no emite ningun umbral. Lo que gatea es el piso que cada paquete se
declara a si mismo, y en `web/vite.config.ts` ese piso se fijo en el numero medido
(`functions: 70.6`) con un comentario al lado que afirma "este paquete ya lo supera". Archivar
asi congela como contrato vigente algo que nadie implemento, en el unico lugar donde se lee
"como se comporta esto HOY". Dos salidas, ninguna mecanica: alinear el parrafo con lo
implementado (minimo como objetivo, piso por paquete como compuerta, mas el reporte de cuanto
falta), o mantener el parrafo y construir la compuerta del total subiendo `web.functions` a 80.

### B2. PR 15: el paso "Constitucion del marco al dia" es verde mudo contra el unico esquema que el scaffold emite

Tres refutaciones encadenadas (A01, A02, A03) dejan el paso inerte exactamente en el repo que
viene a proteger.

Un consumidor migrado con el esquema que `plantilla/.projects-valores.json` entrega hoy
(`"superficies": ["claude-code","cursor"]`), sin `.projects/` y sin ningun artefacto, sale
**exit 0 con cero `::error::` y cero `::warning::`**, y tambien con la version ya exigible. La
causa esta en el codigo: `superficies.length === 0` es lo unico que dispara el atraso por
ausencia, y con dos nombres sueltos la longitud es 2, asi que cada string cae en
`notas.push(...); continue` y `hallazgos` queda vacio. El comentario del paso declara lo
contrario ("nunca verde mudo").

Peor: cuando el artefacto SI esta, el paso lo rechaza. El paso exige `sha=[0-9a-f]{64}` del
cuerpo; `actions/constitucion` emite `sello.digest("hex").slice(0, 12)` sobre el canonico
(`constitucion.mjs:255`). Corri la propia action en modo escribir, obtuve `sha=d18f9d9b0c8f`
(12 hex, medido) y el paso respondio `::warning::el sello no tiene la forma que el marco emite.
Arreglo: corre el escritor del marco`, que es literalmente lo que acababa de generarlo. Desde
el 2026-09-16 eso mismo es `::error::` y exit 1 para todo consumidor migrado, por una
diferencia de FORMATO, con un mensaje de arreglo que es un bucle imposible. Y como el
`continue` del sello precede al incremento, `artefactosLeidos` queda en 0 aunque el artefacto
este presente, rastreado y legible.

Consecuencia en cascada: la verificacion de desvios muertos queda apagada. Un
`.projects-desvios.json` que nombra una regla que ya no existe en el canonico da `::error::` mas
exit 1 en la action, con el motivo escrito en el mensaje, pero en el paso de CI da un solo
`::warning::` y exit 0, en cualquier fecha, porque el mensaje entra en `avisos` y no en
`hallazgos`. El aviso remite a "el hallazgo de arriba", que no se emitio. Un desvio muerto
reparte permiso sobre la nada sin enrojecer nada.

Y hay un cuarto agujero en la misma pieza: **un artefacto lleno de marcadores del scaffold sin
resolver sale con exit 0 en los DOS modos de la action**, incluido un mensaje que afirma "esta
al dia en 2 superficie(s)". Copie `plantilla/.projects-valores.json` tal cual (trae
`"PROYECTO": "{{PROYECTO}}"` y 14 entradas identicas) y el artefacto quedo con 27 lineas de
`{{...}}`, entre ellas el titulo. `sustituir()` solo cuenta como faltante `undefined`, `null` o
cadena vacia, asi que un valor que ES el marcador se toma por valido. El rojo llega, pero de
otro check ("Sin marcadores del scaffold sin resolver", exit 1 medido): la propiedad esta
cubierta por casualidad de vecindad, no por el guardrail que la declara.

Recomendacion concreta en la seccion 3: el paso inline se borra y se cablea la action.

### B3. El detector de secretos de PR 14 tiene dos agujeros que salen en VERDE

No es un rojo molesto, es un fail-open silencioso en un check de seguridad, y los dos casos
estan medidos.

Cruce por plano (`marco-ci.yml:1465`, `absorbidos = Math.max(d.arbol, d.historia)`): un archivo
con 2 falsos positivos declarados (`hallazgos: 2`) absorbe una coincidencia NUEVA de la MISMA
regla que entra y se borra dentro del PR. Resultado: exit 0, "3 hallazgo(s): 0 sin declarar".
El control sin el archivo de declaraciones da exit 1 con tres `::error::`, asi que la culpable
es la declaracion y no el detector. Un archivo con falsos positivos declarados se vuelve punto
ciego para su propia regla.

Merges: el plano de la historia usa `gitleaks git --log-opts`, o sea `git log -p`, que suprime
los diffs de merge por defecto. Un secreto introducido en la RESOLUCION de un merge de main en
la rama de trabajo, y borrado en el commit siguiente, sale **exit 0, 0 hallazgos, imprimiendo
"(arbol + historia del cambio)"**, o sea afirmando una cobertura que no tuvo.
`git log -p A..H | grep -c` da 0; con `-m` da 2. Traer main a la rama de trabajo es el flujo
diario de este marco (la historia de un consumidor real ya tiene
"Merge branch 'main' into feat/consumir-projects"). Arreglo: `--diff-merges=first-parent` en el
`--log-opts`, o cruzar por plano con `esperados_arbol` y `esperados_historia` en vez de `max()`.

Aparte, dos de los tres canales propios de gitleaks siguen abiertos por la via NO RASTREADA: un
`.gitleaks.toml` con `useDefault = false` sin rastrear ciega el plano de la historia (exit 1 sin
el archivo, exit 0 con el), y un `.gitleaksignore` sin rastrear con la huella del hallazgo
tambien lo ciega, pese a `--gitleaks-ignore-path` apuntando a un directorio vacio, que el
comentario del workflow llama "cinturon": medido, en gitleaks 8.30.1 no neutraliza nada. El
rojo por presencia se decide con `git ls-files`, y deberia decidirse con `test -e`.

### B4. Mover `v1` pone rojo al consumidor real por dos checks sin modo aviso

`Ejecutores de paquetes pinados` corrido tal cual contra el arbol de un consumidor real:
**exit 1, 5 `::error::` en `.claude/settings.json:4-8`**. El detector de secretos declara 3
hallazgos en ese mismo arbol (numero de los propios autores; no lo pude medir porque no baje el
binario en ese carril, pero mi conteo independiente de 385 archivos rastreados corrobora que
hablan de este arbol). Ninguno de los dos tiene modo aviso ni ventana: sus unicas salidas son
exit 1 y `process.exit(1)`. Ese consumidor llama al workflow por `@v1` (`ci.yml:55`), asi que lo
recibe sin tocar una linea. Eso viola la regla del propio `AGENTS.md:143-145` de Projects
(endurecer se estrena en modo aviso). Agravante: la forma pinada correcta llega en
`plantilla/.claude/settings.json`, que es PR 15 y solo alcanza repos nuevos; ningun paso migra
el allowlist de un consumidor existente.

### B5. La cadena de la constitucion no llega a ningun consumidor, y la propiedad se cae por el eslabon que nadie mira

En `main` de ese consumidor el eslabon no existe: `git ls-files | grep -i projects` -> exit 1,
`test -f .projects/AGENTS-marco.md` -> exit 1, `grep -n projects AGENTS.md CLAUDE.md` -> exit 1. El
archivo vive solo en `feat/constitucion-del-marco` (PR 154, bloqueado hasta que v1 mueva). O
sea: el agente que trabaja hoy en el repo piloto corre sin la mitad de las reglas, que es
textualmente el modo de falla que el propio `AGENTS.md` describe.

Y hay un agujero autodeclarado que hoy es aviso y deberia ser rojo: subir a mano la version de
la cabecera a una que la copia del marco no conoce deja el cuerpo SIN comparar. Lo reproduje
por codigo de salida: ampute 51 de las 76 reglas de los dos artefactos, puse `version=9.9.9`, y
la action salio **exit 0** con dos `::warning::artefacto-adelantado`. El cierre propuesto
(`GITHUB_ACTION_REF`) no esta implementado: dos apariciones en todo el arbol, ambas en
comentarios, y con `GITHUB_ACTION_REF=v1` sigue exit 0.

### B6. Una regla del canonico describe como hueco abierto algo que el marco ya cerro

`actions/constitucion/canonico/10-openspec.md`, regla `openspec-validar-tras-editar`, dice que
"el guardrail de deltas tiene un hueco conocido: si el titulo de un requirement del delta no
existe en el spec vivo, no avisa". Medido: **avisa y sale 1**, con las dos salidas legitimas
escritas en el mensaje (moverlo a ADDED o declarar el retitulado en RENAMED). El arreglo ya
viaja por `@v1`: `git show main:actions/guardrail-deltas/check-openspec-deltas.mjs` contiene el
bloque "HUECO DEL SCRIPT ORIGINAL, ARREGLADO ACA". Ese texto va en el artefacto que TODOS los
consumidores cargan en CADA sesion, y ya esta vivo en el `.projects/AGENTS-marco.md` de
un consumidor. Cuesta doble: manda a revisar a mano algo que el CI caza, y ensena que las
advertencias del canonico pueden estar viejas, que es el credito que este change existe para
construir.

### B7. El carril scaffold no tiene enforcement, y es donde vive la invocacion de todo lo demas

`plantilla/.github/workflows/ci.yml` es el archivo que llama a `marco-ci.yml@v1` (linea 44), el
que cablea `censo-fuentes` (282) y `cobertura-diff` (292). Un consumidor que borre esa linea
apaga el marco entero y nada lo nota, porque el unico que podria notarlo es el workflow que
dejo de correr. El propio `AGENTS.md` lo admite y lo deja sin cerrar. En el consumidor real esas
lineas son 55, 130 y 160 de su `ci.yml`.

### B8. De los 39 requirements vivos, unos 6 tienen un check que falla solo

Cinco capabilities completas son prosa sin una sola linea de enforcement: `despliegue-ci` (4
requirements), `verificacion-desplegada` (5), `observabilidad` (5), `operacion-infra` (5) y
`gestion-secretos` (2, con media cobertura). El marco no distribuye ningun artefacto para ellas:
`plantilla/.github/workflows/` tiene `actualizar-marco.yml`, `ci.yml` y `claude.yml`, y ningun
deploy. Casos con nombre: "La trust policy OIDC valida el claim que el proveedor de CI realmente
emite" (3 scenarios) y "Los despliegues a un ambiente compartido se serializan" (el incidente
del 2026-08-13) no tienen donde vivir. Aviso honesto: este conteo es grep mas lectura sobre las
2461 lineas de `marco-ci.yml`, no una medicion por codigo de salida; los ceros son solidos como
ausencia de la palabra, el mapeo requirement a check es juicio.

### B9. `intranet` es un tercer consumidor que bloquea el cierre de v1 y no esta en el roadmap

Segun las tareas 6.3 a 6.5 de `reglas-al-dia`, su `AGENTS.md` dice que "dev usa la instancia
real de Clerk pero con datos de prueba", o sea la regla INVERTIDA respecto del incidente del
2026-07-28, y su copia de la constitucion perdio 114 lineas y cinco reglas. La tarea 7.2 hace
del merge de los DOS PRs de migracion condicion para mover v1. **Es el hallazgo mas grave con
la evidencia mas debil de esta corrida**: todo sale de esas tareas, no clone el repo ni vi su
`AGENTS.md`. Hay que verificarlo contra el repo antes de actuar; si las tareas estan
desactualizadas, el hallazgo se cae.

---

## 2. Las afirmaciones refutadas

Trece de veinte. Cada una con el comando y el exit que la tumba. Las siete que se sostienen
estan al final de la seccion, resumidas, porque tambien son informacion: son las que se pueden
citar sin volver a medir.

### A01. "El paso nunca sale verde mudo: sin artefacto es amarillo hasta la fecha y rojo despues"

REFUTADA. Exit 0 mudo.

```
cd fx-a01 && CALENDARIO='[{"version":"1.3.0","publicada":"2026-08-19","exigible_desde":"2026-09-16","urgente":false}]' \
  RUTA_VALORES=.projects-valores.json RUTA_DESVIOS=.projects-desvios.json RUNNER_TEMP=... \
  bash paso-constitucion.sh
-> exit 0, cero ::error::, cero ::warning::
# variante con la version YA exigible (exigible_desde 2026-02-01):
-> exit 0, grep -c '::error::' = 0
```

Repo git fabricado con solo dos archivos rastreados (`.projects-valores.json` y `CLAUDE.md`), sin
`.projects/`, sin `plantilla/`, o sea sin activar el skip por propiedad. El `.projects-valores.json`
declara el esquema exacto del scaffold. Salida completa: dos `::notice::` de "nombre suelto" y
"2 superficie(s) declarada(s), 0 artefacto(s) sellado(s) leido(s), 0 desvio(s) vigente(s), 0
hallazgo(s) de atraso". Control: el mismo script extraido SI devuelve 1 en otros fixtures (A02,
A03), asi que el exit 0 no es un artefacto de la extraccion. Limite declarado: corri el bloque
`run:` en bash local, no el workflow en Actions.

### A02. "El sello que valida el paso es el que emite `actions/constitucion`"

REFUTADA. El artefacto correcto se reporta como atrasado.

```
CONSTITUCION_MODO=escribir ... node constitucion.mjs   -> exit 0, sha d18f9d9b0c8f (12 hex)
bash paso-constitucion.sh (CALENDARIO con exigible_desde 2026-09-16)
   -> exit 0 con ::warning:: "el sello no tiene la forma que el marco emite"
bash paso-constitucion.sh (exigible_desde 2026-08-19, vencida)
   -> exit 1 con ::error:: sobre el artefacto CORRECTO
control positivo, sello de 64 hex del cuerpo
   -> exit 0, "1 artefacto(s) sellado(s) leido(s), 0 hallazgo(s)"
```

El camino feliz del paso funciona, asi que la falla es precisamente 12 vs 64 hex. Detalle
extra: por el orden del `continue`, el artefacto valido no incrementa `artefactosLeidos`.

### A03. "Un desvio que nombra una regla inexistente da rojo con su motivo"

REFUTADA, resultado partido. Se sostiene en la action, se cae en el carril que corre en el CI
de todos los consumidores.

```
(a) CONSTITUCION_MODO=verificar ... node constitucion.mjs
    -> exit 1, ::error:: "desvio muerto ... El motivo que tenia escrito era: ..."
(b) mismo fixture, bash paso-constitucion.sh   -> exit 0, 1 ::warning::, 0 ::error::
    con exigible_desde 2026-02-01 (ya vencida)  -> exit 0, errores=0, avisos=1
(c) fixture con el artefacto REAL de la action, rastreado
    -> el desvio muerto SIGUE en ::warning::
control, artefacto con sello de 64 hex valido  -> exit 1 con ::error:: de desvio muerto
```

La fecha no lo salva porque el mensaje entra en `avisos` y no en `hallazgos`. El camino rojo
existe y funciona, pero es inalcanzable con el sello que la action emite.

### A04. "Un placeholder sin valor es rojo: el artefacto nunca sale con dobles llaves"

REFUTADA. Exit 0 y 27 lineas de marcadores en el artefacto emitido.

```
CONSTITUCION_MODO=escribir ... node constitucion.mjs         -> exit 0
grep -qE '\{\{[A-Z0-9_]+\}\}' .projects/AGENTS-marco.md         -> exit 0 (27 lineas)
CONSTITUCION_MODO=verificar ... node constitucion.mjs        -> exit 0, "esta al dia en 2 superficie(s)"
bash paso-marcadores.sh                                      -> exit 1 (la red de seguridad, que es OTRO check)
```

`tasks.md` 2.3 pide `grep -cE ... -> 0` como evidencia: con el propio archivo del scaffold da
27. Arreglo de una linea: `sustituir()` tiene que tratar un valor cuyo texto sea el propio
marcador como faltante.

### A05. "Artefactos sin cabecera de version salen `::warning::` con exit 0"

REFUTADA, pero en la direccion ruidosa y no en la permisiva. El paso NO puede salir amarillo
nunca: la rama del aviso es codigo muerto.

```
cd fixture && PIN="1.9.0" bash paso.sh
  -> ::error::no se pudieron inspeccionar los artefactos generados (grep rc=123)
  -> EXIT = 1
echo '...SKILL.md' | xargs -r grep -n 'generatedBy:'; echo $?   -> 123
control, artefacto CON generatedBy                              -> exit 0
control, consumidor real (12 artefactos, los 12 declaran)       -> exit 0
```

`xargs` propaga 123 cuando el hijo sale entre 1 y 125, y la guarda es `RC > 1`: el "no encontro
nada" cae en la rama del "no pudo mirar". Correccion honesta a la hipotesis de refutacion: el
segundo argumento, que `${DIRS[*]}` bajo `set -u` abortaria, NO se sostiene; en bash 5.3.15 el
aviso imprime la interpolacion vacia y sale 0, o sea saldria mutilado, no abortaria. No deja
pasar nada malo, pero el rojo miente sobre la causa y ofrece el arreglo equivocado, y muerde
justo a la clase de repo que el check dice proteger: el mas atrasado. Dos arreglos de una linea:
guarda `[ "${RC}" -gt 1 ] && [ "${RC}" -ne 123 ]`, y reemplazar `${DIRS[*]}` por
`${ARTEFACTOS}`. Es el unico de los pasos medidos que no tiene banco.

### A06. "El guardrail de deltas no avisa si el titulo del MODIFIED no existe en el spec vivo"

REFUTADA. Avisa y sale 1. Ver B6 para la consecuencia, que es la importante.

```
node actions/guardrail-deltas/check-openspec-deltas.mjs        -> exit 1
  "el MODIFIED de \"La cobertura jamas retrocede nunca\" no existe en el spec vigente"
mismo delta con RENAMED FROM/TO declarado                      -> exit 0
git show main:.../check-openspec-deltas.mjs | grep 'HUECO DEL SCRIPT ORIGINAL\|huerfanos'  -> exit 0
grep -n 'guardrail-deltas' .github/workflows/marco-ci.yml      -> 307: .../guardrail-deltas@v1
```

### A07. "La cobertura de cada paquete alcanza el minimo y la integracion falla si no"

REFUTADA. Ver B1: `web` al 70,69% de funciones, exit 0.

No medible y lo declaro: el fixture sintetico (paquete al 60% con piso 60) murio con
`MODULE_NOT_FOUND` porque vitest no se resuelve desde una raiz sin `node_modules`. La medicion
sobre `web` es el mismo experimento con datos reales, asi que no reintente instalarlo.

### A08. "La ventana de gracia de 28 dias se verifica sola en cada corrida de cada repo"

REFUTADA. Hay DOS calendarios y solo uno esta guardado.

```
# (a) manifiesto.json, validado por validarManifiesto: LA GARANTIA SE SOSTIENE
sed -i 's/2026-09-16/2026-08-24/' canonico/manifiesto.json   # 5 dias de gracia
node constitucion.mjs   -> exit 1 "la version 1.3.0 deja 5 dias de gracia y el minimo es 28"

# (b) el CALENDARIO embebido en marco-ci.yml:1632: NO HAY VERIFICACION
grep -n 'DIAS_DE_GRACIA\|28 dias\|gracia' paso-constitucion.sh  -> solo 2 comentarios en prosa
RUN A, 28 dias, exigible en el futuro   -> exit 0 (::warning:: "pasa a fallo el 2026-09-16")
RUN B, CERO dias de gracia, urgente:false, publicada = exigible = HOY
   -> exit 1, aceptado sin una queja y rojo el mismo dia
grep -rn 'manifiesto.json' .github/workflows/   -> exit 1, cero hits
```

El comentario de la linea 1626 ("Regla del schema, verificada por el CI de Projects:
exigible_desde >= publicada + 28 dias") es falso para este calendario. Tres arreglos en orden
de valor: que el paso lea el calendario del manifiesto; si la copia tiene que existir, agregar
la comprobacion de 28 dias al bucle de 1764-1772 mas un check que compare las dos copias byte a
byte; y mientras no exista ninguna de las dos, borrar el comentario, porque una garantia
afirmada y no verificada es peor que una ausencia declarada.

Nota aparte: la ventana declarada es de 28 dias JUSTOS (publicada 2026-08-19, exigible
2026-09-16) y se mide desde el campo `publicada`, no desde el dia en que v1 se mueve. Si v1 se
mueve hoy son 27 dias; si se mueve el 27-ago son 20. `validarManifiesto` compara dos campos
declarados, no la fecha real del release, y sigue en verde mientras la ventana se encoge.

### A09. "El paso de permisos consume la salida `piso_permisos` del canonico"

REFUTADA. Cero derivacion, y las dos contabilidades ya divergieron en las dos direcciones.

```
node constitucion.mjs (GITHUB_OUTPUT)   -> exit 0, publica piso_permisos con 5 items
allowlist == ese piso exacto, node paso-permisos.cjs  -> exit 0, "1 item(s) del piso sin cubrir"
allowlist con openspec y SIN pnpm build              -> exit 0, "0 item(s) sin cubrir"
canonico MUTADO a piso_permisos=["Bash(echo piso-mutado)"], allowlist que lo satisface al 100%
   -> exit 0, "5 item(s) del piso recomendado sin cubrir"   # sigue midiendo su propio arreglo
grep -rn 'piso_permisos' .github/   -> exit 1 (sin coincidencias)
```

El consumidor que la afirmacion cita (`marco-ci.yml:2411-2427`) es literalmente un
`const PISO = [...]` hardcodeado. El piso que el marco DECLARA (con `pnpm build`) no es el que
VERIFICA (con `openspec` y sin build). Arreglo minimo honesto: o el paso consume la salida, o se
borra el campo y su comentario, porque hoy el comentario afirma un cableado que no existe.

### A10. "Una declaracion de falso positivo cubre una cantidad EXACTA de hallazgos"

REFUTADA. Ver B3. Exit 0 en verde con la coincidencia nueva absorbida.

```
control arbol, declaracion sin campo hallazgos (default 1) sobre 2 reales  -> exit 1
mismo con hallazgos: 2                                                    -> exit 0
REFUTACION: GITHUB_EVENT_NAME=pull_request BASE_PR=30602eaf HEAD_PR=c7a6a... bash correr.sh
   -> exit 0, "3 hallazgo(s): 0 sin declarar, 1 declarado(s) con motivo"
control, mismo rango SIN el archivo de declaraciones                      -> exit 1, 3 ::error::
```

Paso reconstruido literal de `marco-ci.yml:1184-1563`, con la unica sustitucion del bloque de
descarga por el binario gitleaks 8.30.1 local, verificado antes con
`sha256sum --check --ignore-missing checksums.txt` -> exit 0.

### A11. "El plano de la historia ve un secreto introducido y borrado despues"

REFUTADA por el caso del merge. Ver B3.

```
lineal: A agrega .env, B lo borra, evento pull_request  -> exit 1, "entro en el commit d395cda8edeb"
sin rango (workflow_dispatch)                           -> exit 0 con ::warning:: "(SOLO arbol)"
base ausente del clon                                   -> exit 0 con ::warning:: de objetos faltantes
evento push con ANTES                                   -> exit 1
REFUTACION: el .env entra en la RESOLUCION de un merge de main y se borra despues
   -> exit 0, VERDE, 0 hallazgos, imprimiendo "(arbol + historia del cambio)"
git log -p A..H | grep -c '^+.*AKIA...'   -> 0
git log -p -m A..H | grep -c ...          -> 2
```

Las tres ramas de fail-open honestas son ruidosas de verdad. La del merge no: dice que el plano
corrio. Es el fail-open silencioso del incidente del 2026-08-05 que la regla dice no repetir.

### A12. "Los canales propios de gitleaks estan cerrados"

REFUTADA para lo NO RASTREADO. Los cuatro experimentos que la afirmacion enumera pasan uno por
uno: `.gitleaks.toml` versionado da exit 1 y sin banner de version, o sea el rojo salta antes de
tocar el binario; `.gitleaksignore` versionado da exit 1; `# gitleaks:allow` da exit 1 contra un
control que prueba que sin el flag la herramienta lo traga; y `GITLEAKS_CONFIG` hostil heredada
del entorno da exit 1. Pero la propiedad que esos casos establecen es falsa:

```
.gitleaks.toml SIN RASTREAR con useDefault = false
   -> git ls-files --error-unmatch -> exit 1 (el rojo del paso no lo ve)
   -> linea base exit 1, con el archivo exit 0, VERDE, "(arbol + historia del cambio)"
.gitleaksignore SIN RASTREAR con la huella del hallazgo   -> exit 0
verificacion directa con los flags exactos del paso:
   gitleaks git . --log-opts="A..H" --ignore-gitleaks-allow --gitleaks-ignore-path <dir-vacio> ...
   -> exit 0 ("no leaks found") con el archivo, exit 2 sin el archivo
contra-control: secreto en el arbol + .gitleaks.toml sin rastrear  -> exit 1
```

El plano del arbol resiste porque corre sobre `git archive HEAD`. El comentario de
`marco-ci.yml:1246-1248` llama "cinturon" al directorio vacio: medido, en 8.30.1 no neutraliza
el `.gitleaksignore` del directorio de trabajo. Importa porque el consumidor elige el runner, y
en un runner propio `actions/checkout` no limpia lo no rastreado. Arreglos: pasar `--config`
explicito, que hoy el paso no pasa y por eso `<destino>/.gitleaks.toml` queda como ultimo
eslabon de la precedencia, y hacer el rojo por presencia en disco.

### A17. "Ningun archivo rastreado no-.md invoca un ejecutor que descarga sin version exacta, y el check lo verifica solo"

REFUTADA. Tres ejecutores que descargan y el check no ve, ninguno entre sus limites declarados.

```
printf '      - run: npm x openspec update\n'             -> exit 0 ("no hay nada que pinar")
printf '      - run: bun x openspec update\n'             -> exit 0
printf '      - run: pnpm --silent dlx openspec update\n' -> exit 0
printf '      - run: pnpm dlx openspec update\n'          -> exit 1   (control)
npm x --help -> exit 0 ; npm exec --help -> exit 0 ; npm zzzz --help -> exit 1
'Bash(npx --yes openspec:*)' en un allowlist              -> exit 0, solo ::warning::
'Bash(npx --yes openspec validate:*)'                     -> exit 1
```

`npm x` es el alias documentado de `npm exec`, probado por codigo de salida en esta maquina, y
`bunx` es `bun x`. El regex exige `pnpm[ \t]+dlx` pegados, asi que cualquier bandera global
intermedia lo ciega. Y la forma en que el problema aparecio DE VERDAD, el allowlist
`Bash(npx --yes openspec:*)` citada literal en el riesgo, degrada a `::warning::` con exit 0, y
un warning no pone rojo ningun job. Lo que se sostiene: las cinco formas conocidas, el pin por
variable, las tres formas de comentario al arranque, y el estado de los arboles (exit 0 en
pr12/pr14/pr15/pr16 y en HEAD; exit 1 en el consumidor real). Lo falso no es el estado del
arbol, es "el check lo verifica solo". Arreglo chico: sumar `npm[ \t]+x`, `bun[ \t]+x` y tolerar
banderas antes de `dlx`, y decidir si "no pude determinar el paquete" debe ser rojo en archivos
de allowlist.

### Las siete que se sostienen

Se pueden citar sin volver a medir, con el matiz anotado:

- **A13** (superficies vacia es rojo, ausente cae al default sin rojo): se sostiene en la
  action, exit 1 y exit 0 respectivamente. Pero el contraste se confirmo: en el paso de CI los
  dos casos dan salida IDENTICA hoy y exit 1 los dos desde el 2026-09-16, porque
  `Array.isArray(declaradas) ? declaradas : []` colapsa `undefined` y `[]`. Hueco adyacente
  medido: `null`, `"cursor"`, `{}` y `0` caen SILENCIOSAMENTE al default, exit 0 y
  `superficies=claude-code,cursor` en los cuatro, sin un aviso. Un typo plausible (string en vez
  de array) cree declarar una superficie y recibe dos.
- **A14** (subir la version de la cabecera deja el cuerpo sin comparar, y eso es aviso): se
  sostiene y es peor de lo que suena. Ver B5.
- **A15** (recomputar el sello no tapa una edicion del cuerpo): se sostiene EN LA ACTION, exit 1
  con las dos variantes de sello. En el paso de CI la misma maniobra pasa en VERDE, con su
  control al lado (cuerpo editado sin resellar da exit 1, o sea la comprobacion estaba viva).
  Refuerza la recomendacion de la seccion 3: la pieza que sobrevive es la action.
- **A16** (CRLF y espacios no cuentan como divergencia, el reflujo del formateador si): se
  sostiene, y verificado por igualdad de hallazgos y no solo por exit code. Hallazgo colateral
  caro: el artefacto TAL COMO LO EMITE EL MARCO no esta prettier-clean (`prettier --check` da
  exit 1), porque el canonico paltea la tabla de ambientes para el ancho de los placeholders y
  despues del render las columnas quedan desalineadas. El `.prettierignore` pasa de mitigacion a
  requisito de adopcion.
- **A18** (el aviso de version falla cerrado en lo que no puede degradar): se sostiene, y la
  guarda es load-bearing (mutando `esVersionSemver` a `return true` su banco pasa de 27/27 a
  exit 1 con 2 fallas). Abierto y de segundo orden: `AVISO_LIMITE=10` da un mensaje de 111
  caracteres que es solo la cola de recorte, `AVISO_LIMITE=abc` imprime "supero los NaN
  caracteres", una entrada de CHANGELOG con cuerpo vacio arma un aviso vacuo, y la guarda no
  verifica que el tag exista (la corrida de 2.0.0 armo un aviso perfecto con enlace a un tag
  inexistente).
- **A19** (el script de archive revienta si no aplico ni una operacion): se sostiene, cuatro
  deltas rotos, cuatro exit 1, cero escrituras. Limite medido: cuenta operaciones DECLARADAS, no
  cambios efectivos. Un MODIFIED con el requirement vacio sale exit 0 diciendo "1 operacion(es)
  aplicadas" y deja el spec vivo con 0 scenarios; un MODIFIED identico sale exit 0 con el archivo
  byte a byte igual.
- **A20** (137 pruebas verdes, 76 reglas con id unico, `actions/constitucion` no existe en v1):
  las tres se sostienen. 137/137 con 0 skipped y 0 todo; 52+27+24+34 por banco, cuatro veces
  exit 0; 76 marcas y 76 ids unicos; `git ls-tree -r --name-only v1 | grep -c
  '^actions/constitucion/'` da 0, y el `ci.yml` del PR 154 la pide en la linea 222, o sea el rojo
  a proposito esta confirmado. Dos matices para el cuerpo del PR 15: "todo por codigo de salida"
  conviene escribirlo como "cada banco assertea el codigo de salida en sus corridas end-to-end";
  e "id estable" no tiene evidencia posible todavia (una sola version en el ledger), asi que hoy
  es intencion de diseno. Los dos pendientes ya no son pendientes: `openspec validate --all
  --strict` exit 0 en las cuatro ramas, guardrail exit 0 en las cuatro, actionlint 1.7.12 exit 0
  en las cuatro y tambien sobre `plantilla/.github/workflows`, que la invocacion de CI no
  alcanza. La unica compuerta que no corrio en ninguna rama es shellcheck sobre los 26 bloques
  `run:`.

---

## 3. Los dos esquemas de `superficies`: recomendacion con evidencia

**Queda el esquema B (nombres sueltos, con la cadena de carga en el catalogo del marco:
`SUPERFICIES` y `SUPERFICIES_POR_DEFECTO` en `actions/constitucion/constitucion.mjs`) y muere el
esquema A junto con el paso inline "Constitucion del marco al dia" de `marco-ci.yml`.** Cuatro
argumentos, en orden de peso.

1. **El que renderiza manda.** La action es la unica que compara el artefacto contra el
   RE-RENDER del canonico. El paso inline compara bytes contra el sello que trae el propio
   artefacto, y su propio resumen lo confiesa: "caza la edicion a mano, NO prueba que el texto
   sea el que el marco publica". A15 lo midio: en la action, editar el cuerpo y recomputar el
   sello da exit 1 con las dos variantes; en el paso, exit 0 con una regla borrada, y con su
   control al lado probando que la comprobacion estaba activa. Verificar contra la fuente es
   estrictamente mas fuerte que verificar contra el sello.
2. **El esquema A duplica en N repos un dato que el marco ya tiene.** Pedirle a cada consumidor
   que declare `["CLAUDE.md","AGENTS.md",".projects/AGENTS-marco.md"]` es la doble contabilidad que
   `reglas-al-dia` existe para matar, y una superficie nueva seria un cambio en N repos en vez de
   uno en el catalogo. A09 muestra que ese modo de falla ya se materializo en el piso de permisos.
3. **El esquema B es el unico con banco y el unico que la plantilla emite.**
   `actions/constitucion/pruebas/constitucion.test.mjs` (829 lineas, 52 tests, exit 0) corre por
   `node --test` en el `ci.yml` de Projects, y `plantilla/.projects-valores.json` ya trae
   `["claude-code","cursor"]`. El esquema A no tiene banco propio.
4. **Medido: el paso inline es verde permanente para la unica forma que la plantilla emite.**
   Exit 0 con cero artefactos y la fecha de exigibilidad ya pasada (A01). No aporta senal, solo
   una segunda verdad, y las dos verdades ya discrepan en severidad: "este repo no declara
   ninguna superficie" es clase atraso con ventana de gracia en el paso, y error de nivel fijo
   sin ventana en la action.

**NO BORRAR EL PASO SIN CABLEAR ANTES EL REEMPLAZO, y esto es lo que hoy falta y no lo cubre
nadie: la action NO se invoca en ningun carril de verificacion del consumidor.** Su unica
invocacion en todo el arbol de PR 15 es `plantilla/.github/workflows/actualizar-marco.yml:138`,
en modo escribir, y el encabezado de ese archivo declara "Este workflow no verifica: solo propone
el arreglo" y delega la verificacion "al job de marco del ci.yml", que es justamente el paso
inline apagado. `plantilla/.github/workflows/ci.yml` no la llama en ningun modo. Circularidad
completa: marco-ci delega en la action, la action delega en marco-ci, y nadie verifica.

Lo que hay que hacer, en este orden:

1. Agregar a `plantilla/.github/workflows/ci.yml` un job que corra `actions/constitucion@v1` en
   modo verificar (con `setup-node` antes y `permissions: contents: read`) y colgarlo de `ci-ok`.
2. Arreglar `sustituir()` para que un valor cuyo texto sea el propio marcador cuente como
   faltante (A04), porque si no ese job bendice artefactos a medias.
3. Resolver la adopcion del repo que ya existe: hoy `constitucion.mjs` aborta con "falta
   `.projects-valores.json`" antes de ramificar por modo, asi que el writer que deberia depositar el
   artefacto por primera vez tambien falla.
4. Recien entonces borrar el paso inline. Eso resuelve gratis la duplicacion del calendario
   (A08): al morir el paso queda solo el del manifiesto, que es el que tiene la regla de los 28
   dias.
5. Sumar al canonico la exclusion de `.projects/` y `.cursor/rules/00-marco.mdc` en el
   `.prettierignore` del consumidor, y arreglar la causa (que el canonico paltee la tabla para el
   ancho de los placeholders) para que el artefacto salga prettier-clean y el ignore sea cinturon
   y no unico sosten (A16).
6. Decidir la severidad de un `superficies` presente pero no-array: hoy `null`, `"cursor"`, `{}`
   y `0` caen al default sin un aviso (A13).

Sobre la redundancia: si, el paso quedo redundante con la composite action, pero hoy no es una
redundancia benigna sino dos verdades que ya discrepan en esquema y en severidad, y la
redundancia real (el job que verifica) es la que no existe.

---

## 4. El orden de merge

**El orden propuesto no tiene ningun conflicto de archivo.** Lo verifique mergeando de verdad en
el object DB, sin tocar el arbol compartido: `git merge-tree --write-tree` mas `git commit-tree`
en cadena, no checkout ni merge en worktree. Los cuatro pasos dan exit 0: main+PR12 -> `5ea47d5`;
+PR14 -> `b15d5d8`; +PR15 -> `9edfc75`; +PR16 -> `1e0170c`. El arbol de trabajo quedo intacto
antes y despues.

Los "choques de archivo" que sugiere `git diff --name-only` son un artefacto de la topologia, no
colisiones: PR 15 y PR 16 estan APILADAS sobre PR 14 (las tres contienen los mismos 8 commits
`6fab1cb..f186e57`), asi que los 17 archivos de PR 14 aparecen en las tres listas por herencia.
PR 12 es totalmente disjunta. El unico solapamiento que valia verificar a mano, que PR 15 y PR 16
llevan los dos un delta sobre la MISMA capability `gobierno-contribucion`, esta limpio: los dos
son `## ADDED Requirements` con titulos de requirement distintos, asi que no hay MODIFIED y no
corre el riesgo de que el archive borre escenarios en silencio.

**El paso que rompe no es un merge: es mover `v1`.** Orden recomendado:

1. **PR 12**, con B1 resuelto antes. Sin eso el archive congela un contrato que se contradice.
2. **PR 14**, con B3 resuelto antes: el `max()` del cruce por plano, los merges del plano de la
   historia, y el rojo por presencia en disco en vez de por `git ls-files`. Son bugs que salen en
   verde en un check de seguridad; mergearlos asi entrega una garantia que no existe.
3. **PR 15**, con el plan de la seccion 3 aplicado: cablear la action, arreglar `sustituir()`,
   borrar el paso inline.
4. **Un PR en el repo consumidor, mergeado y verde**, que pine las 5 entradas
   `npx --yes openspec` del allowlist a `@fission-ai/openspec@1.9.0` (la forma que ya trae
   `plantilla/.claude/settings.json`), agregue `.projects/` y `.cursor/rules/00-marco.mdc` al
   `.prettierignore`, y limpie o declare los 3 hallazgos de secretos.
5. **Mover `v1`**, refrescando `publicada` y `exigible_desde` EN EL MISMO PR y en los DOS lugares
   que llevan el calendario mientras los dos existan, porque la ventana declarada es de 28 dias
   justos y desde hoy ya son 27.
6. **PR 16** al final.

Si mover `v1` no puede esperar al PR del consumidor, la alternativa es estrenar los dos checks de
PR 14 en modo aviso con su propia fecha de exigibilidad, que es literalmente lo que
`AGENTS.md:143-145` exige y lo que el mecanismo de los 28 dias ya sabe hacer.

Correccion menor al orden: PR 16 aterriza en un main que tiene los dos checks nuevos de PR 15 sin
haber pasado nunca por ellos. Esta apilada sobre PR 14, y el `ci.yml` de Projects invoca su
`marco-ci` por ruta local (`uses: ./.github/workflows/marco-ci.yml`), asi que se verifica con el
`marco-ci` de PR 14. El merge es limpio; el primer PR posterior es el que descubriria cualquier
interaccion.

---

## 5. Huecos de completitud, por gravedad

### Bloqueantes

1. La cadena de la constitucion no llega a ningun consumidor (B5). Mover v1 es la tarea 7.2,
   pendiente de OK humano, detras de dos PRs de migracion sin mergear.
2. El carril scaffold no tiene enforcement y es donde vive la invocacion de todo lo demas (B7).
3. Unos 6 de 39 requirements vivos tienen un check que falla solo (B8).
4. `intranet` bloquea el cierre de v1, con una regla invertida respecto del incidente del
   2026-07-28, y no esta en el roadmap de siete items (B9; evidencia debil, verificar primero).
5. De las cuatro formas de distribucion quedan DOS sin enforcement. Referenciado se actualiza
   solo (v1 movil) y regenerado ahora tiene dos checks duros. Sin enforcement: **canonico**
   (`openspec/specs/` se valida en su FORMA con `validate --strict` y el guardrail, y nada
   verifica que un consumidor cumpla su CONTENIDO, que es el hueco de los ~33 requirements) y
   **scaffold**, que es el peor por razon estructural y no de grado. Agravante de nombre:
   "canonico" designa dos cosas distintas, `openspec/specs/` en el mapa del README y
   `actions/constitucion/canonico/` en el change de PR 15, y la segunda es en realidad una fuente
   del carril regenerado.

### Serios

6. `calidad-codigo` quedo ASIMETRICO dentro del mismo spec. "Ningun archivo fuente fuera del
   alcance" tiene scenario de cableado Y check duro (`censo-fuentes`, 2 hits en marco-ci). Su
   hermano de cobertura no tiene ni scenario de cableado ni check: `grep -cE cobertura-diff` da 0,
   `grep -cE 'format:check'` da 0. Un consumidor que nunca pegue `uses: .../cobertura-diff@v1` no
   tiene cobertura exigida y marco-ci queda verde. Los dos requirements y las dos actions salieron
   del MISMO change, que es el que PR 12 archiva.
7. Tres requirements tienen como unico portador un archivo copiado que nada verifica:
   `plantilla/eslint.config.mjs`. "Prohibir `any` sin justificacion", "Prohibir promesas
   flotantes" y el `no-console` como error del linter existen ahi y en ningun check
   (`grep -ci no-explicit-any` da 0, `floating-promises` 0, `no-console` 0). Un consumidor que
   afloje su eslint.config queda verde en los dos carriles.
8. De los cuatro items que quedaban del roadmap, el codigo implementado en el marco es CERO.
   `stack-estandar` 2 de 24 tareas, y las dos son "escribir los artefactos de este change"; su
   capability `base-tecnologica` no existe en `openspec/specs/`. `capa-descubrimiento` 0 de 41.
   `entrega-referenciada` 0 de 22. Auditoria de cierre: cero artefacto de cualquier tipo. Los tres
   proposals estan en `estado: pendiente-de-revision`, o sea que ni el gate de aprobacion paso.
9. Confirmo el "4 o 5 changes con debut pinado cada uno, o sea semanas" de `entrega-referenciada`,
   y el `tasks.md` lo subestima: no son changes paralelos sino una cadena de cinco eslabones
   SECUENCIALES. El bloque 0 de `entrega-referenciada` esta bloqueado por `stack-estandar`; el
   bloque 0 de `stack-estandar` esta bloqueado por que `reglas-al-dia` este EN MAIN. Su propio
   texto nombra el riesgo: "El estado intermedio, mitad extraido mitad copiado, es peor que
   cualquiera de los dos extremos". Las sondas de produccion quedan fuera de la serie, como un
   sexto change.
10. Exencion NO declarada de Projects sobre si mismo, la numero 1 de su propio backlog: la
    constitucion exige `permissions` explicitos por job ("Leccion repetida 3 veces: es el conteo
    lo que hace creible la regla") y los dos workflows principales de Projects declaran permisos solo
    a nivel de workflow. Siete jobs heredando (`ci.yml` 30/46/120, `marco-ci.yml`
    179/270/326/2442). Los dos que si lo hacen son los nuevos, y uno lleva el comentario "lo que
    un check de permisos por job va a leer": el check que sigue sin existir.
11. Exencion NO declarada: Projects usa actions de terceros pinadas por TAG MOVIL dentro del workflow
    reusable que heredan todos los consumidores (`actions/checkout@v7` 3 veces,
    `actions/setup-node@v7` 6 veces), contra su propia frontera que exige SHA. Y no hay Dependabot
    en Projects que las suba: `git cat-file -e <rama>:.github/dependabot.yml` falla en las 6 ramas
    revisadas, mientras el scaffold reparte uno con ecosistema `github-actions` semanal y
    `docs/10-reglas-no-escritas.md` cuenta "Dependabot semanal" entre lo que YA es automatico. La
    asimetria es visible: `anthropics/claude-code-action` si esta pinada por SHA, `actions/*` no,
    sin motivo escrito. Tampoco hay check de pines de `uses:`.
12. `aviso-version` esta construido y no puede entregar nada: `gh secret list` y
    `gh variable list` en Projects devuelven vacio (exit 0), o sea que el secret
    `AVISO_VERSION_DESTINO` no existe. Con la configuracion de hoy cada release se publica sin
    avisarle a ningun consumidor, y el aviso de eso es un `::warning::` dentro del resumen de una
    corrida que nadie abre, mientras la constitucion que reciben los proyectos dice que estar en
    el canal de avisos es requisito del proyecto.
13. `docs/10-reglas-no-escritas.md` esta desactualizado en las dos direcciones a la vez. La fila 10
    ("Cobertura por diff") sigue en rojo aunque `actions/cobertura-diff/action.yml` esta en main
    (`git cat-file -e main:...` da exit 0), y PR 12, que es el PR que archiva el change que la
    construyo, EDITA ese archivo para agregar la fila 14 sin cerrar la 10. En el otro sentido, la
    fila 14 que PR 12 agrega en rojo ya esta implementada por PR 14, que no la conoce. El que
    mergee segundo deja el documento mintiendo.
14. Lo que ya deberia estar promovido a check y se resolvio con un ritual: la fila 6 ("Lint de
    workflows: toda degradacion emite `::warning::`", la regla de fail-open ruidoso, dos
    incidentes) sigue en amarillo, y lo que PR 14 entrego en su lugar es un subagente,
    `.claude/agents/cazador-fail-open.md`, 375 lineas. Un agente que alguien tiene que invocar es
    exactamente lo que la premisa del documento descalifica en su primer parrafo.
15. Hay una SEXTA rama con trabajo empujado a origin y sin PR, fuera de las cinco auditadas:
    `docs/bmad-listo-para-piloto`, que es donde esta el arbol de trabajo y donde vive este informe.
    Adelanta a PR 16 con 8 archivos y 1142 inserciones (pre-registro del piloto, convencion de
    procedencia, bitacora, `horas.csv` y un arnes de 324 lineas de `.mjs`) y modifica el `tasks.md`
    de `capa-descubrimiento`. Nada de eso paso por review. El arnes no tiene banco, no lo invoca
    ningun workflow, y queda fuera incluso del aviso "actions sin banco" del `ci.yml`, que solo
    recorre `actions/*/`.
16. El piloto de `capa-descubrimiento` arranca el lunes 2026-08-24, en 4 dias, con las cuatro
    compuertas humanas del bloque 1 abiertas: OK para la dependencia de terceros, decision sobre
    donde viven transcripciones CON DATOS DE PERSONAS, OK para consumir tiempo del PO y de dos
    builders, y confirmacion de la cadena de herramientas. Esa ultima tiene un dato duro medido:
    en esta maquina `python --version` y `python3 --version` salen 49 y `py --version` sale 127,
    mientras `node` (v26.5.0), `pnpm` (11.18.0) y `uv` (0.12.0) salen 0. Si algun modulo de la
    herramienta pide Python de verdad, el brazo B se cae el lunes a la manana. Y el change se
    declara `experimental: true` con `veredicto_antes_de: 2026-09-21`, mientras el check que haria
    caducar ese estado es la tarea 4.1 DEL PROPIO CHANGE: nada lo va a poner en rojo si la fecha
    pasa.
17. PR 14 mete unas 728 lineas de checks NUEVOS y duros al workflow reusable que heredan todos los
    consumidores (el escaner de secretos, los permisos del agente, los ejecutores pinados, el
    aviso de version) sin change de OpenSpec y sin delta de spec. Ningun spec vivo nombra ninguna
    de esas cuatro propiedades: `git grep -niE 'allowlist|ejecutor|dlx|npx|secretos en el
    repo|aviso de version' -- openspec/specs` no devuelve coincidencias. Contra la regla de oro
    del propio marco. Consecuencia practica: esos cuatro comportamientos no se pueden auditar
    contra nada, porque no hay contra que.
18. La unica mitigacion declarada del hueco del scaffold no existe como objeto. `AGENTS.md`
    prescribe una revision TRIMESTRAL con cuatro items y `entrega-referenciada` le cuelga dos
    contadores que "no fallan solos". Projects tiene 1 solo issue abierto y no es ese (es sobre
    comprar GitHub Secret Protection): la revision no tiene issue, ni fecha, ni dueno.
19. Fail-open silencioso en el paso de permisos del agente (PR 15), que reporta un conteo falso
    como hecho. `PERFIL_PROD` sale de `.projects-valores.json`; si el archivo no existe queda `""` y
    `const prod = PERFIL_PROD !== "" && ...` es siempre falso, sin aviso, porque el `::warning::`
    solo cubre "existe y no parsea". Medido, mismo allowlist y mismo dia: sin el archivo,
    "20 entrada(s), 0 corre(n) con el perfil de produccion", exit 0, sobre un allowlist que
    contiene a la vista `Bash(AWS_PROFILE=la organización-prod terraform plan *)`; con
    `{"PERFIL_PROD":"la organización-prod"}`, "1 corre(n)" mas el `::notice::` que la nombra. Y el archivo
    del que depende solo pasa a ser exigible el 2026-09-16 segun el paso vecino, asi que entre el
    merge y esa fecha la deteccion esta apagada en todo consumidor.
20. La adopcion tiene el huevo antes que la gallina para un repo que ya existe. `constitucion.mjs`
    aborta con "falta `.projects-valores.json`" ANTES de ramificar por modo, asi que tambien falla en
    modo escribir, que es la pieza que deberia depositar el artefacto por primera vez. Medido
    contra un espejo del arbol de un consumidor existente: sin el archivo, exit 1; con el
    `.projects-valores.json` de la plantilla tal cual, exit 1 por placeholders. La plantilla solo
    resuelve el caso del repo nuevo.
21. El artefacto generado queda DENTRO del formateador en el consumidor existente.
    `grep -n projects .prettierignore` en ese consumidor da exit 1, y
    `prettier --file-info .projects/AGENTS-marco.md` responde `{"ignored": false}` mientras su
    `ci.yml:107` corre `pnpm format:check`. El dia que el PR semanal deposite el artefacto,
    `format:check` se pone rojo; y si alguien corre `pnpm format` para apagarlo, prettier lo
    reescribe y la comparacion de bytes de la constitucion dice "alguien lo edito a mano". Es el
    rojo permanente sobre archivos que nadie escribio que la propia porcion del marco manda
    evitar, y ningun paso de PR 15 migra el `.prettierignore` de un consumidor existente.

### Menores

22. Projects construyo el canal de desvios legible por maquina y no lo usa para sus propias
    exenciones. Las tres que se concede (marcadores del scaffold, censo de fuentes, constitucion
    del marco) viven como comentarios en `marco-ci.yml` (496-498, 833-840, 1658-1660) y como
    `::notice::` en tiempo de corrida, no en un `.projects-desvios.json`, que existe solo en
    `plantilla/`. Nada las inventaria y nada las hace caducar, que es justamente la propiedad que
    el mecanismo de desvios aporta.
23. Los dos checks que verifican la misma condicion discrepan en severidad (ver seccion 3). Hoy no
    muerde porque la action no esta cableada en ningun carril del consumidor; se activa el dia que
    se cablee.

---

## 6. Lo que esta auditoria NO cubrio

Obligatorio y no dice "nada". Diez huecos, con el mas grande primero.

1. **La corrida del banco de PR 15 no se hizo desde el arbol compartido.** El arbol esta en
   `docs/bmad-listo-para-piloto`, que no contiene `actions/constitucion/`. Los 137 tests (los 52
   de `constitucion.test.mjs` incluidos) salieron exit 0 sobre un worktree separado de
   `feat/reglas-al-dia`; desde el arbol compartido solo corren 3 bancos (85 tests). Los dos
   numeros aparecen en esta corrida y no son el mismo experimento.
2. **El inventario de "requirements sin check" es grep mas lectura, no medicion.** Volque
   `marco-ci.yml` (2461 lineas) y busque por palabra clave. Los ceros son solidos como AUSENCIA
   de la palabra; el mapeo requirement a check y el credito parcial (por ejemplo cuanto de
   `gestion-secretos` cubre el escaner de secretos) es juicio. Un check podria implementar un
   requirement sin usar ninguna de mis palabras y yo lo contaria como hueco. El "~6 de 39" es una
   estimacion, no un resultado.
3. **No corri ningun check del marco como lo corre el CI.** Todo lo de `marco-ci.yml` corre sobre
   un runner de Actions con el repo consumidor ya checkouteado; lo que hice fue extraer bloques
   `run:` y correrlos en bash local contra fixtures. Eso alcanza para probar que un camino existe
   o no existe, y no alcanza para probar el comportamiento end-to-end en Actions.
4. **shellcheck no esta instalado en esta maquina y gitleaks tampoco.** Los 26 bloques `run:`
   siguen sin lintear en ninguna rama (actionlint corrio con `-shellcheck=`), y las mediciones del
   detector de secretos se hicieron con un binario 8.30.1 local verificado por checksum, no con el
   bloque de descarga del paso: el estreno en rojo del consumidor por ese check quedo sin medir y
   se reporta con el numero de sus autores.
5. **No mire el estado de CI de los cinco PRs.** No corri `gh pr checks` en ninguno. La premisa
   "5 PRs verdes" no la verifique; podria ser falsa hoy.
6. **No auditoria de contenido de los tres changes que quedan.** Lei sus `tasks.md` y frontmatter
   para contar avance y dependencias, no revise si sus proposals, designs y deltas son coherentes
   entre si ni si sus escenarios son correctos. Un change puede estar 100% planificado y tener el
   diseno equivocado; esta corrida no lo dice.
7. **`intranet` es un punto ciego total.** Ver B9. Es el hallazgo mas grave con la evidencia mas
   debil, y hay que verificarlo contra el repo antes de actuar.
8. **No revise cuanto DIVERGIO ya el scaffold en los consumidores reales.** Comparar `plantilla/`
   contra el arbol de un consumidor real archivo por archivo es el item 1 de la revision
   trimestral y es donde probablemente esten los huecos que este informe no nombra.
9. **Cero verificacion de infraestructura y de AWS.** Las cinco capabilities sin enforcement las
   evalue solo por ausencia de check en el marco. No corri `terraform plan`, no consulte ninguna
   cuenta, no verifique la trust policy OIDC, ni el backend remoto, ni el budget, ni la retencion
   de logs, ni `deletion_protection`. Un requirement sin check puede estar perfectamente cumplido
   en la realidad, o no; esta auditoria no distingue esos dos casos, y para esas cinco
   capabilities esa distincion es todo.
10. **Configuracion de repo y de organizacion: fuera de alcance por regla dura.** Solo dos
    lecturas (`gh secret list`, `gh variable list`, ambas vacias, exit 0) y ningun PATCH, PUT o
    POST. No verifique el ruleset de main de ninguno de los dos repos, ni los permisos de
    escritura de los equipos `builders` y `po`, que es el requisito silencioso que el propio
    CODEOWNERS advierte ("un equipo sin permiso de escritura NO puede ser code owner: GitHub lo
    ignora sin avisar"), ni si el check requerido es `ci-ok`. La mitad del enforcement de
    `gobierno-contribucion` vive ahi y no lo mire.

Tambien, para que quede escrito: cero valores de secretos leidos, cero escrituras en produccion,
cero merges, cero PRs abiertos o cerrados, cero cambios de configuracion, cero `push --force`. Lo
unico que esta corrida escribio en el arbol de Projects es este archivo.

### Sobre las buenas noticias

Hay dos que aguantan y conviene decirlas con el mismo rigor que los rojos. Los numeros
cuantitativos del cuerpo de PR 15 se sostienen (137/137, 76 ids unicos, `actions/constitucion`
ausente de v1), asi que el resto de sus cuentas se puede creer sin volver a medir. Y la
normalizacion de `actions/constitucion` esta bien calibrada en las dos direcciones: no hay falso
positivo por CRLF ni por espacios o saltos de sobra (verificado por igualdad de hallazgos, no solo
por exit code) y no normaliza tanto como para dejar pasar el reflujo de un formateador. El resto
de esta corrida es lo que se rompio al empujarlo.
