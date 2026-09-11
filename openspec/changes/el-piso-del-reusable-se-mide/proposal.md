---
artefacto: proposal
dri: Builder 1
aprueba: Builder 2 (builder par)  # change técnico de `calidad-codigo`
informado: PO / Builder 2
estado: pendiente-de-revision
---

# El piso de permisos se documenta en tres lugares y nada lo ata al reusable

## Por qué

Un workflow reusable **nunca recibe más permisos que los que le concede quien lo
llama**. Por eso el marco documenta en **tres** archivos qué hay que concederle:

- `.github/workflows/marco-ci.yml:56` (el ejemplo que el reusable lleva escrito)
- `plantilla/.github/workflows/ci.yml:26` — **éste viaja a cada proyecto nuevo**
- `.github/workflows/ci.yml:32`

Los tres dicen `contents: read` + `pull-requests: read`, y hoy **están bien**: es
exactamente lo que los jobs del reusable declaran.

**El problema es que nada los ata.** Ese texto se escribió cuando el reusable
pedía esos dos. El día que un job gane un permiso nuevo, los tres quedan
declarando un piso que ya no alcanza, y el consumidor que los copie se queda
corto — sin que nada lo note.

**Y no es hipotético.** Rigel —el marco del que Projects se bifurcó— agregó
`issues: read` y `actions: read` en su línea mayor 2, y su nota de migración
advierte que el PR automático **no** puede arreglarlo: hay que editar el `ci.yml`
a mano. Projects va a pasar por lo mismo.

`pruebas/andamio/permisos-por-job.test.mjs` ya verifica que **cada job declare**
su bloque `permissions`, pero nunca lee estos tres comentarios. La prosa y el
mecanismo podían divergir sin testigo.

## Qué cambia

Una compuerta que lee los `permissions:` que los jobs del reusable declaran de
verdad y exige que los tres archivos concedan **al menos** eso. Si el reusable
gana un permiso y los bloques no lo reflejan, sale rojo — en el repo del marco,
antes de que el andamio salga a repartir un piso corto.

## Lo que este change NO resuelve, y hay que decirlo

**La consecuencia que esos bloques describen no está verificada.** Los tres dicen
que sin `pull-requests: read` la detección «cae al fail-open y el carril rápido no
actúa nunca». Desde que el job `cambios` declara su propio bloque `permissions`,
esa descripción **puede** haber quedado vieja: un reusable que pide más de lo
concedido podría hacer fallar la corrida al arrancar en vez de degradarse.

**No se corrige acá porque no se pudo medir.** Averiguarlo exige una corrida real
de CI con el permiso recortado, y afirmarlo sin esa medición sería reemplazar una
descripción posiblemente vieja por otra posiblemente falsa — que es exactamente
el defecto («un motivo falso sosteniendo una regla correcta»), sólo que más nuevo.

**Destino:** change propio, con la corrida de CI como evidencia. Es barato: un PR
en un repo de juguete con `pull-requests:` recortado y mirar qué pasa.

## Impacto en los proyectos consumidores

**Ninguno hoy.** La compuerta corre en el CI del marco. Lo que compra es que el
piso que reparte el andamio no envejezca en silencio. Es MINOR.
