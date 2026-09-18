---
artefacto: proposal
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
informado: PO / Builder 2
estado: en-ejecucion
---

# El aviso de versión dice lo que manda, y su largo se mide en el PR que lo escribe

## Por qué

El aviso de versión (`actions/aviso-version` + `.github/workflows/aviso-version.yml`)
es **la única prosa del marco que viaja directo a los consumidores**. Todo lo demás
lo tienen que ir a buscar; esto les llega. Y medido el 2026-09-17 sobre este mismo
árbol, el aviso del próximo release iba a salir mal de cuatro formas a la vez:

1. **Recortado y sin decir qué hacer.** La sección `[No publicado]` del
   `CHANGELOG.md` tenía **40488 caracteres y ningún `### Para consumidores`**. El
   aviso cae entonces al fail-open —arma el mensaje con el cuerpo entero— y lo
   recorta al límite: **41091 armados, 3451 entregados**, o sea el principio de la
   entrada y un enlace. La 1.9.0 ya se armó así (10547 armados, 3472 entregados) y
   no le llegó a nadie sólo porque el destino nunca se configuró; ninguna entrada de
   la 1.9.x trae la sección. El `::warning::` de la action que lo
   dice sale en la corrida del `release`, **después** de mandar el mensaje.
2. **Con su único BREAKING cortado a mitad de frase.** `lineasBreaking()` filtraba
   líneas físicas; la viñeta BREAKING de `[No publicado]` viene envuelta en cuatro
   líneas y el aviso publicaba solo «…—hoy, nadie—: `produccion`».
3. **Con el consejo al revés.** Corrido con `AVISO_VERSION=1.9.0`, el emisor decía a
   la vez «el aviso sale igual con el cuerpo completo» y «se recortó… Arreglo:
   acortar la sección "Para consumidores"» — sobre una entrada que no la tiene.
4. **Con dos números para el mismo límite.** `LIMITE_POR_DEFECTO = 3500` en el
   script y `default: "3500"` en `action.yml`. Hoy coinciden; el día que alguien
   mueva uno, lo que se mide y lo que se envía se separan en silencio.

Y dos defectos más del mismo circuito: el preámbulo nombra el tag `v1` **escrito a
mano** —el anuncio de la primera versión de una línea mayor nueva nombraría el
puntero de la anterior— sin un solo caso de banco; y el simulacro del workflow sale
**verde con un `::notice::`** sin haber enviado nada.

**Origen en Rigel** —el marco del que Projects se bifurcó el 2026-08-24—, donde cada
uno de estos defectos ya se pagó. No hubo change archivado: fueron commits directos.

| Defecto | Incidente en Rigel | Commits |
|---|---|---|
| Largo medido después de mandar | 1.16.0: 4347 caracteres contra 3500, el equipo recibió el principio y un enlace | `e0bed6a` (2026-09-02) |
| La compuerta no miraba el PR de release | 1.17.2 (2026-09-03): la compuerta dijo 478, el mensaje enviado tenía 2177 | `a53e9b4`, `507eddf` (1.17.3) |
| BREAKING envuelto, cortado | 2.0.0 (2026-09-06), leído antes de mandarlo | `0363a05` |
| Puntero `v1` en el anuncio de la línea 2 | 2.0.0 (2026-09-06) | `c677ede` |
| Preámbulo con el canal viejo, sin banco | 2.3.0, encontrado leyendo Slack | `0120ec4` |
| Dos números para el límite | 2.4.0 (2026-09-09): verde midiendo 3550, llegó recortado | `f0ad36b`, `caa6925` |
| Consejo al revés; ausencia de la sección en verde | issue #369, cuatro rondas de compresión | `3e4d114`, `caa6925`, `99b16d1` |
| El placeholder del release nacía rojo | corte de la 2.3.0 | `caa6925` |
| Simulacro verde en silencio | 2.5.0 (2026-09-12), corrida 34673029256 | `a2bac69` |

**Y hay una razón de gobierno, no solo de mensajes.** La política D1 del PO
(2026-09-17) exige cada compuerta nueva en rojo el día que sale. Eso sólo es justo
si el arreglo le llega escrito al consumidor, y el lugar donde llega escrito es la
sección «Para consumidores» del aviso. Esta compuerta es la que garantiza que esa
sección exista en cada versión.

## Qué cambia

1. **La compuerta** `herramientas/aviso-entra-en-el-mensaje.mjs`, en el job
   `changelog-en-el-pr` del `ci.yml` del marco, en rojo: mide `[No publicado]` y la
   versión más alta con las funciones de la propia action, y falla si falta el
   resumen para consumidores, si el texto de fábrica del release quedó encima de
   cambios reales, o si el mensaje no entra. Cada `::error::` trae su arreglo, y el de
   la sección ausente dice **cuánto llega** de verdad. Se porta en su forma corregida
   (Rigel 1.17.3 + 2.4.0), no en la original.
2. **El emisor** (`aviso-version.mjs`): la viñeta BREAKING llega entera; el puntero se
   deriva de la versión; el consejo de recorte bifurca según la rama y dice a cuánto
   recortó; el aviso de sección ausente deja de afirmar «cuerpo completo» cuando
   recorta; los enlaces se arman en una sola función que la compuerta reusa.
3. **El límite en un solo lugar**: `action.yml` deja de declarar `default` para
   `limite`. El valor efectivo sigue siendo **3500**, vía la constante.
4. **El paso 1 de la skill de release** escribe `[No publicado]` con su
   `### Para consumidores` de fábrica, con banco que lo extrae y lo mide.
5. **El simulacro avisa**: `::warning::` y `run-name`, con el default intacto.
6. **Bancos**: casos nuevos en `actions/aviso-version/pruebas/aviso-version.test.mjs`
   y tres archivos nuevos en `pruebas/ci-del-marco/`.
7. **La normalización del `CHANGELOG.md`** —`[No publicado]` y las 1.9.x sin
   `### Para consumidores`— **queda preparada como parche** y no aplicada: ver la
   decisión 8 del design.

## Qué NO cambia, a propósito

- **El límite no sube a 7000.** Rigel lo subió midiendo su destino (Slack, campo
  `text`). El de Projects no está medido: el secret `AVISO_VERSION_DESTINO` no existe
  y el campo es configurable.
- **El canal sigue siendo Dependabot** (decisión D2 del PO). El preámbulo no se copia
  de Rigel, que nombra un `actualizar-marco.yml` que acá no es el canal; lo que se
  trae es el banco que lo ata a la configuración real.
- **Un solo dialecto.** El aviso de Projects manda Markdown tal cual; la elección de
  dialecto es el lote 36, que deberá hacer que la compuerta mida los dos.

## Impacto en los proyectos consumidores

Hay **tres consumidores reales, todos en `@v1.9.6`** (`custodia-bingo`,
`plantilla-sitio`, `plantilla-aplicacion`), medidos para el porte el 2026-09-17. Consumen
`marco-ci`, `constitucion`, `censo-fuentes`, `cobertura-diff` y el `desplegar.yml` del
andamio — **ninguno invoca `actions/aviso-version`**. Aun así, la action es
referenciable y su contrato se trata como tal:

- **`limite` pierde su `default` literal.** Quien no pasa el input sigue con el mismo
  número (la constante vale 3500 y el banco lo verifica comparando lo que la action
  escribe); quien lo pasa, sigue con el suyo. No cambia ningún comportamiento
  observable, así que se clasifica **patch**. Si el PO considera que quitar el
  `default` de un input publicado es contrato aunque el valor efectivo no cambie, este
  punto pasa por su OK antes del release.
- **El texto de dos `::warning::` y del preámbulo cambia**: es diagnóstico, no
  contrato. Ningún `output` cambia.
- **La compuerta, el simulacro y la skill no viajan**: viven en el CI propio, el
  workflow propio y el procedimiento de release de este repo.

Lo que **sí** reciben los tres, sin hacer nada, es un aviso mejor: el día que
Projects configure su destino, el mensaje les dirá qué hacer en vez de mandarles el
principio de una entrada de 40000 caracteres.

**Contrato: patch. Distribución:** referenciado (la action) y canónico (compuerta,
bancos, workflow propio, skill). Detalle en el design.
