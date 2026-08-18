---
artefacto: proposal
dri: Builder 1
aprueba: Builder 1                 # change técnico del estándar de trabajo; el gate
                              # del PO en este repo está acotado a gobierno
informado: PO / Builder 2
estado: pendiente-de-revision
---

# calidad-fail-closed — Proposal

## Why

El marco declara desde su primera versión que **ningún paquete queda fuera del
alcance del lint**, y que **agregar uno nuevo sin su configuración es un fallo,
no un punto ciego silencioso**. Nada lo implementa. Es una promesa escrita en el
contrato vigente que ningún check sostiene.

No es un riesgo teórico. Buscando el hueco en el único consumidor aparecieron
tres agujeros reales, y **dos de ellos son invisibles para cualquier
verificación por paquete**, porque están DENTRO de paquetes que sí tienen lint y
sí tienen configuración de compilación:

- Un componente de dominio escrito a mano —y su test— quedaron tragados por una
  exclusión pensada para componentes generados de la librería de UI. Lo importan
  cinco archivos del producto. Nadie lo lintea.
- El script de humo que **decide la promoción a producción** nunca pasa por el
  compilador: importa cuatro módulos del código de la API, y un cambio de firma
  lo rompe sin que aparezca una sola señal en el pull request.
- La suite E2E nunca tuvo configuración de compilación. Su lint corre sin las
  reglas que dependen de tipos, así que la clase de defecto que la vuelve
  inestable —una operación asíncrona sin esperar— no la detecta nadie.

El tercero es el que se suele contar, y es el menos grave: al menos se sabía. Los
dos primeros nadie los conocía, y ninguna verificación que pregunte «¿este
paquete tiene lint?» los habría encontrado jamás.

Hay además una promesa gemela que el marco ya declara y tampoco verifica: que
los scripts de verificación **no enmascaran su fallo**. Hoy nada impide que un
script convierta un rojo en verde con un sufijo, y que CI lo celebre.

Y hay un hueco de otra naturaleza, sin promesa previa: **no se mide cobertura en
ningún lado**. Un cambio puede llegar sin una sola línea de test y el pipeline no
tiene nada que decir al respecto.

## What Changes

**El alcance de la verificación se deriva, no se enumera.** En vez de preguntar
qué paquetes están configurados, se pregunta a las herramientas del repositorio
qué archivos miran de verdad, y se resta contra los archivos versionados. Lo que
sobra —lo que nadie mira— es rojo. Incorporar un paquete, un directorio o un
archivo nuevo queda cubierto sin que nadie agregue nada a ninguna lista, que es
justamente la condición para que la promesa se sostenga sola.

Un archivo puede quedar legítimamente fuera, y para eso hay una salida: el
paquete que lo contiene **declara la exclusión con su motivo escrito**. Eso no
convierte la evasión en imposible; la convierte en **visible**. Deja de ser una
ausencia —que no aparece en ningún diff ni en ninguna corrida— y pasa a ser una
afirmación firmada en un manifiesto, dentro de un diff, bajo review cruzado.

**Los scripts que enmascaran su fallo pasan a ser rojo**, implementando por fin
un requirement que el contrato ya tenía.

**La cobertura se mide sobre el diff, no sobre el total.** Esta es la decisión
de fondo y merece decirse por qué: cualquier mecanismo basado en un umbral
guarda un número, y un número guardado es un número que alguien va a tener que
bajar a mano el día que borre código bien cubierto —por el mismo camino por el
que pasa un cambio normal—. La propiedad que hay que hacer cumplir no es «el
número sube», es **«no existe un número que alguien tenga que bajar a mano»**.
Solo medir el diff no guarda ninguno. Nace sin bloquear a nadie: primero mide.

## Capabilities

### Modified Capabilities

- `calidad-codigo`: el alcance de la verificación deja de enunciarse por paquete
  y pasa a enunciarse por archivo; se agrega la detección del enmascaramiento en
  integración; se agregan el formato y la cobertura del diff como verificaciones
  de cada integración.

## Impact

**Frontera nueva, y hay que declararla en vez de colarla como detalle.** Hasta
hoy el marco solo hacía verificaciones estáticas: leía archivos del consumidor.
La derivación del alcance **ejecuta el toolchain del consumidor** para
preguntarle qué ve. Está atenuado —corre en el job del propio consumidor,
después de que ya instaló sus dependencias; no compila, no linteo, no instala
nada— pero es una frontera que no existía. Su consecuencia: un cambio mayor del
analizador o del compilador puede mover la API de introspección y afectar a
todos los consumidores a la vez.

**El consumidor actual da rojo el día del estreno**, con hallazgos reales de los
cuales una parte se cierra con exclusiones declaradas y otra parte son defectos
que hay que arreglar de verdad. Por eso el orden es parte del change y no una
coordinación informal, igual que en `marco-se-cumple-solo`: **el consumidor se
pone al día primero, el check aterriza después**. Hecho en ese orden, ningún
repositorio que no modifique una línea queda roto —que es la definición de
ruptura de este marco— y no hay que abrir línea mayor. Es precedente, no
improvisación: se hizo así hace un día y funcionó.

**La cobertura del diff nace sin bloquear.** Se estrena midiendo y reportando,
con el mínimo en cero. Que cada proyecto suba su propio mínimo es decisión del
proyecto; subir el default del marco endurecería un check y sería línea mayor.

**Para el consumidor, en concreto**: cablear un paso en el job que ya corre lint
y typecheck, declarar sus exclusiones con motivo, y arreglar los tres agujeros
reales. Nada de eso es opcional: sin el cableado, un archivo que nadie mira no
produce ningún rojo en ningún lado.
