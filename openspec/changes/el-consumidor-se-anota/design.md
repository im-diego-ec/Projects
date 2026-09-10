---
artefacto: design
dri: Builder 1
aprueba: Builder 2 (builder par)
estado: pendiente-de-revision
---

# Design — el-consumidor-se-anota

## Clasificación de distribución de cada pieza que se toca

| Pieza | Forma | Por qué esa y no otra |
|---|---|---|
| `herramientas/projects-init.mjs` | **canónico** | Corre desde el clon del marco, en la máquina de quien arranca. No viaja al proyecto: el proyecto recibe su salida, no su código |
| `docs/14-consumidores.md` | **canónico** | Documentación del marco sobre sí mismo. Un proyecto no la hereda |
| `pruebas/init/consumidor-se-anota.test.mjs` | **canónico** | Banco del marco |
| `CHANGELOG.md` | **canónico** | Superficie por la que un consumidor se entera |

Ninguna pieza es scaffold ni referenciado: **nada de este change viaja a un
proyecto consumidor**, y por eso el impacto en sus pipelines es cero.

## La decisión central: de dónde sale la versión

Tres alternativas, y por qué gana la tercera.

**(a) Una constante en la herramienta.** Descartada. El pin vive en
`plantilla/.github/workflows/ci.yml` y lo mueve el paso 5 del release. Una
constante aparte sería un segundo lugar donde el mismo hecho está escrito, y
nada la cruzaría: el día que el release mueva uno y no el otro, la herramienta
informaría una versión que ningún repo tiene. Es el patrón de defecto que este
marco ya se cazó a sí mismo —dos copias del mismo dato con lectores distintos— y
no conviene sembrar otro.

**(b) Leerlo de `plantilla/.github/workflows/ci.yml`.** Descartada, y es la más
tentadora. Sería una sola fuente, pero es la fuente **equivocada**: informa lo
que el andamio *iba* a escribir, no lo que el destino *tiene*. Si la sustitución
fallara, o si alguien corriera la herramienta sobre un destino ya tocado, la
línea diría algo que el repo no cumple. La fila del registro existe justamente
para razonar sobre qué versión tiene cada repo: derivarla de la plantilla la
vuelve circular.

**(c) Leerlo del `ci.yml` recién escrito en el destino.** Elegida. Es el único
lugar donde el dato es el hecho y no una promesa. Cuesta una lectura de archivo
que ya está en disco, y hace que la línea sea **imposible de desincronizar**:
si dice `v1.9.6`, es porque el repo dice `v1.9.6`.

## El caso en que no se puede leer

Si el `ci.yml` del destino no está o no tiene el `uses:` del marco, la línea se
imprime igual, diciendo que la versión no se pudo leer.

**Por qué no se omite el pendiente.** Omitirlo convertiría un fallo de lectura en
silencio, y quien arranca no se enteraría de que le falta anotar el repo. **Por
qué no se completa con la constante.** Porque volvería por la ventana la
alternativa (a), y con el agravante de que sólo aparecería en el caso raro —el
menos probado—. Una versión adivinada en el registro es peor que un hueco
declarado: el hueco se ve, la adivinada no.

## Por qué un pendiente y no un escritor automático

`docs/14-consumidores.md` ya declaró el límite: es un paso que alguien tiene que
mergear, y **el PR va contra otro repositorio** —el del marco— desde una máquina
que puede no tener credenciales para escribir ahí. Una herramienta que intentara
abrir ese PR sola necesitaría un token que hoy no pide y no debería tener, y su
modo de fallo sería el peor de todos: fallar silenciosamente y dejar a alguien
creyendo que quedó anotado.

Lo que sí se elimina es la parte que hoy falla por memoria: **que los tres datos
haya que averiguarlos**. Llegan resueltos y en el orden de las columnas.

## Cómo se verifica

El banco corre la herramienta de punta a punta sobre un destino temporal y mide
sobre la **salida real**, no sobre el texto del código:

1. la línea aparece y nombra `14-consumidores.md`;
2. trae la coordenada `ORG/PROYECTO` con la que se instanció;
3. trae una fecha ISO;
4. **la versión que informa es exactamente la que quedó en el `ci.yml` del
   destino** — la guarda anti-divergencia, que es la que de verdad protege la
   decisión de arriba;
5. la medición que `docs/14` dejó escrita (`| grep -i consumidores`) devuelve la
   línea.

El punto 4 es el que hace que este banco no pueda pasar vacuamente: compara dos
lecturas independientes del mismo hecho y exige que coincidan.
