# Diseño — rojo primero

## Clasificación de distribución de cada pieza

| Pieza | Forma | Por qué esa y no otra |
|---|---|---|
| `pruebas/marco-ci/cobertura-de-los-pasos.test.mjs` (el censo de pasos, extendido) | **no viaja** (banco del marco) | Mira los pasos que el marco escribe —los suyos y los que reparte—. Un consumidor no tiene nada que censar con él: su pipeline es el que el marco le da. |
| `pruebas/marco-ci/extraer.mjs` (`pasosDe`, `superficies`) | **no viaja** | Es el lector que comparten los bancos. Vive con ellos. |
| Bancos nuevos: `compuertas-de-estructura`, `definiciones-pipeline`, `validacion-estricta` (en `pruebas/marco-ci/`) y `compuertas-del-andamio` (en `pruebas/andamio/`) | **no viaja** | Prueban los pasos que viajan, desde el marco: el rojo tiene que aparecer acá, antes de que el paso llegue a un repo ajeno. |
| `pruebas/ci-del-marco/node-en-las-actions.test.mjs` (nombra los pasos que corre) | **no viaja** | Idem. |
| `pruebas/docs/cobertura-de-requirements.test.mjs` (regla de `continue-on-error`) | **no viaja** | Vigila la página del censo, que vive en el marco. |
| Paso «El andamio reparte el umbral del total del marco» de `marco-ci.yml` | **referenciado** | Es un paso del workflow reusable. En un consumidor toma su camino inerte (no reparte el comparador), así que el cambio solo se ejerce en el repo que distribuye el andamio. Contrato: **patch** (corrige lo que el paso mide, dentro de su contrato). |
| `plantilla/.github/PULL_REQUEST_TEMPLATE.md` | **scaffold** | La recibe cada proyecto que nace del andamio y desde ahí es suya. No se propaga a los que ya existen. |
| `.github/PULL_REQUEST_TEMPLATE.md` | **no viaja** (plantilla del marco) | Es la del repo del marco. |
| Los tres requirements de `calidad-codigo` | **canónico** | Son contrato del marco; los proyectos no los copian. |

## D1. Cómo se comprueba que el caso negativo de una compuerta falla

**Decisión: cada compuerta tiene un banco que EXTRAE su script real del YAML
(`scriptDelPaso`) y lo corre contra fixtures, con al menos un caso rojo, y el caso rojo se
vio morder saboteando la compuerta.** No hay copia del código en el banco: una copia se
desincroniza y miente.

Lo que no tenía red para probarse se probó sin red, con dobles en el `PATH`: un `curl` que
sirve un release de actionlint armado en el banco —con su checksum, o con uno que no
coincide—, un `npm` que deja en disco el lockfile y los ejecutables que cada caso necesita,
y un `pnpm` que devuelve la lista de paquetes. Las frases de la deuda
vieja —«sin red no se puede ejercitar»— eran ciertas de la descarga y falsas del paso.

**Alternativa descartada: dejarlo como convención de revisión.** Es lo que había, y la
auditoría de cierre de la v1 midió cuánto sostiene: 13 de 20 afirmaciones falsas.

**Alternativa descartada: pruebas de mutación sobre las compuertas.** Las compuertas son
bash dentro de YAML; mutarlas no da variantes con sentido. En su lugar, los sabotajes a
mano de `tasks.md` (1.2), uno por compuerta, que es la versión barata y dirigida de lo
mismo.

**Límite honesto:** esto detecta la compuerta que no puede fallar; no detecta la que falla
por el motivo equivocado. Los casos rojos afirman además el mensaje (el arreglo escrito
adentro), que es lo más cerca de «el motivo correcto» que un banco llega sin entender el
motivo.

## D2. Un solo censo de requirements, y el de pasos se deriva

**Decisión de builders: el censo de requirements es uno solo,
`openspec/cobertura-de-requirements.md`, y el de pasos es el banco
`cobertura-de-los-pasos.test.mjs`, que se deriva del árbol.** No se portan
`herramientas/censo-compuertas.mjs` ni las marcas `rigel:rojo`, `rigel:sin-rojo` y
`rigel:cubre` de Rigel.

**Alternativa descartada: portar el censo de Rigel.** Tendría este marco dos respuestas a
«¿qué requirement tiene compuerta?» —la página y la tabla generada—, y en una doble
contabilidad la declaración siempre pierde contra el código. Es la misma razón por la que
el requirement nuevo pide una sola superficie.

**Alternativa descartada: marcas en los YAML (`# projects:rojo <banco>`).** La dirección
«qué banco corre este paso» se puede DERIVAR —el banco nombra el paso que extrae—, y lo
que se puede derivar no se declara a mano: una marca se desincroniza del banco igual que
una tabla. Lo único que se declara es lo que no se puede derivar: por qué un paso no tiene
banco.

**Lo que queda para el lote siguiente (`el-censo-no-miente`):** los tres estados de
ausencia de la página (pendiente con destino, no verificable, sin declarar), la cobertura
por mitades y el alcance de cada compuerta (nacidos contra adoptados). Rigel los agregó al
mismo requirement en `censo-honesto` y `el-numero-del-censo`; acá su mecanismo es la página
y su banco, que es lo que ese lote toca. Este delta lleva solo lo que el mecanismo de este
change hace cumplir.

## D3. Los estados del censo de pasos, y cómo se decide que un banco corre un paso

**Cinco estados, excluyentes:** con banco, deuda, sin rojo propio, action del marco,
action de terceros. **Deuda** y **sin rojo** se separan porque no son lo mismo: la deuda es
trabajo pendiente y sale por `::warning::` en cada corrida; «sin rojo» es un paso al que no
hay banco que escribirle. Mezclarlos hace que «falta un banco» y «no hay banco que
escribir» se lean igual. «Sin rojo» lleva un tipo cerrado —`plomeria`, `rojo-ajeno`,
`aviso`— para que la excusa tenga que caer en una categoría con nombre.

**Criterio para separarlos:** un paso con lógica propia de decisión —ramas que deciden rojo
o verde— es deuda si no tiene banco, aunque además corra otra cosa. Por eso los pasos que
corren los bancos del marco quedaron como deuda y no como «rojo ajeno»: tienen guardas
propias («no encontré bancos», el modo de la matriz) que nadie vio fallar.

**Las actions ajenas se declaran una vez cada una**, no una por paso: un checkout es un
checkout en los veinte lugares donde aparece. **Las actions del marco** no se declaran: su
rojo lo declaran ellas, y sus pasos están en el mismo censo. Un job que llama un workflow reusable
(`jobs.<id>.uses:`) no tiene pasos y no entra al censo: su rojo es el del reusable, cuyos
pasos sí están.

**Cómo se decide que un banco corre un paso (proxy declarado):**

1. Si el banco llama `scriptDelPaso(<nombre>, <archivo>)` con literales o constantes del
   mismo banco, la llamada dice qué paso de qué archivo corre, y manda.
2. Si no, el nombre tiene que aparecer como **cadena literal** completa (sola o como
   `- name: <nombre>`), y si el nombre se repite en otra superficie, el banco tiene que
   nombrar el archivo.

**Alternativa descartada: la cita por substring que había.** Se medía que un comentario
suelto daba un paso por pagado, y al abrir varias superficies daba por corridos a los
homónimos (el Terraform de `marco-ci.yml`, el veredicto del andamio). **Alternativa
descartada: instrumentar `scriptDelPaso` y juntar lo que se extrajo al correr la suite.**
Sería exacto, pero haría depender este banco de correr después de todos los demás, y el
runner de pruebas no ordena archivos. El resolver estático cubre los casos reales; el
camino (2) es grueso y está declarado como límite en el propio banco.

## D4. Un paso que no puede fallar no es compuerta — `continue-on-error` como proxy

**Decisión (de Rigel, `el-numero-del-censo`, D2 de allá): se lee el modificador, en el
paso o en su job; no se juzga el motivo.** Un `continue-on-error` distinto de `false` —una
expresión cuenta, porque puede valer true— obliga a declarar el paso como «sin rojo» en el
censo de pasos, y pone rojo el banco de la página si la página lo cita como compuerta.

Los dos bancos usan **el mismo lector** (`pasosDe` del extractor): dos lectores de la misma
propiedad terminan discrepando, y entonces un paso sería compuerta para uno y no para el
otro.

**Alternativa descartada: un vocabulario nuevo** (`sin-rojo-ajeno` contra `nunca-rojo`).
El proxy sale gratis y no le pide a nadie aprender una marca. **Límite declarado:** un paso
que no puede fallar por otra vía —un `exit 0` incondicional, un `|| true` al final— no lo
caza. Hoy ningún workflow ni action del marco usa `continue-on-error`: la regla nace verde y
se vio morder poniéndole el modificador a «Definiciones de pipeline validas» (tasks 5.3).

## D5. La afirmación por código de salida no tiene compuerta automática

**Decisión (la 4.2 de Rigel, commit ac628ab de allá): queda como regla sin compuerta,
declarada.** El sujeto de la regla es prosa —el cuerpo de un PR, un informe— y decidir si
una oración afirma algo verificable es comprensión de lectura.

**Alternativa descartada: un patrón que exija `exit N` en el cuerpo del PR.** Medido en
Rigel sobre sus doce PRs más recientes: acierta en diez y falla en los dos de
documentación, que no afirman nada verificable (falso rojo); y no distingue un `exit 0`
corrido de uno pegado (falso verde). Una compuerta que exige la cadena entrena a escribirla.
**Alternativa descartada: exigir que la sección no esté vacía.** El olvido no es el modo de
fallo medido: las 13 afirmaciones falsas de la auditoría tenían la sección llena.

Lo que sí se hace: las dos plantillas de PR piden el comando, el exit y un campo «No
medido». Al archivar, la fila de este requirement en la página de cobertura dice
`**ninguno**` con este motivo.

## D6. El umbral del andamio: el alcance, y solo en código

`all: true` dejó de existir en vitest 4 y el andamio lo sacó; el paso lo seguía exigiendo y
lo encontraba en el comentario que explica el retiro. **Decisión: exigir `include:` —lo que
hoy fija el alcance— y buscar las cinco cláusulas solo en las líneas que no son comentario
de línea.** Se filtra con `sed` y no con `grep -v`: un archivo que fuera todo comentario
haría salir 1 a grep, y el `set -e` mataría el paso sin decir por qué.

**Límite declarado:** un bloque `/* ... */` que nombre una cláusula todavía la cumple. La
configuración del andamio no los usa para eso, y el caso se puede agregar si aparece.

**Contrato:** patch. En un consumidor el paso sale por su camino inerte antes de llegar a
esta línea, así que ningún veredicto cambia.

## D7. Cómo se estrena, y qué lo hace cumplir solo

Todo lo nuevo son bancos del propio marco: corren en el job de pruebas de `ci.yml` y
enrojecen el `ci-ok` del marco, no el de un consumidor. No hay estreno en modo aviso que
hacer. Los checks que hacen cumplir el change sin que nadie se acuerde:

| Qué | Lo hace cumplir |
|---|---|
| Un paso nuevo, en cualquier superficie, sin banco ni declaración | `cobertura-de-los-pasos.test.mjs` · «ningun paso queda sin estado» |
| Una deuda pagada o una declaración que ya no apunta a nada | idem · «la deuda declarada esta al dia» |
| Un paso que no puede fallar tratado como compuerta | idem · «un paso que no puede fallar…», y `cobertura-de-requirements.test.mjs` · «ningun paso que la pagina publica como compuerta lleva continue-on-error» |
| Una action ajena nueva sin declarar | idem · «todo uses: a una action ajena esta declarado…» |
| Un paso con guard de node renombrado o nuevo | `node-en-las-actions.test.mjs` · «el banco nombra cada paso con guard…» |
| Un requirement nuevo sin su fila en la página | `cobertura-de-requirements.test.mjs` (ya existía) |
| La afirmación por exit code en el cuerpo del PR | **ninguno** — D5, declarado |
