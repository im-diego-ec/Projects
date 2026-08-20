---
artefacto: tasks
dri: Builder 1
aprueba: Builder 1
informado: PO / Builder 2
estado: completado
---

## 0. Spike: medir antes de prometer

- [x] 0.1 Agregar el proveedor de cobertura a los dos paquetes del consumidor
      (dependencia nueva, ya aprobada) y emitir el reporte con las rutas
      relativas a la raíz del monorepo — sin esa raíz los dos paquetes emiten
      rutas indistinguibles entre sí e incomparables contra el diff. Evidencia:
      el reporte de ambos paquetes con rutas distinguibles.
- [x] 0.2 Medir la cobertura real de ambos paquetes, con la base de datos
      levantada en CI para el de API. El mínimo del marco es 80% y esa decisión
      ya está tomada; lo que este paso fija es el **piso inicial** de cada
      paquete, que es su valor medido. Un piso inventado por encima de la
      realidad deja el pipeline en rojo desde el día uno; uno por debajo no
      protege nada.
- [x] 0.3 Contrastar el comparador propio contra la herramienta externa como
      oráculo, en local y fuera del pipeline, sobre al menos tres formas de
      cambio: solo agrega, solo borra, y mixto. Evidencia: coinciden, o la
      diferencia está explicada.

**Resultado del bloque 0, que cambió la forma del trabajo:** `api` medía **86,26%**
y nunca estuvo por debajo del mínimo. Toda la deuda estaba en `web` (30,8%). Es
la razón por la que el bloque 4 se concentró entero en el frontend, y por la que
el número de `api` nunca hubo que negociarlo.

## 1. El banco de pruebas primero

- [x] 1.1 Casos sintéticos para la derivación del alcance, corriendo como job
      propio del CI del marco. No es opcional ni es buena práctica: el marco NO
      puede dogfoodear este check —no tiene manifiestos propios— y es la primera
      vez que trae código no trivial. Cubrir al menos: archivo que nadie mira,
      archivo visto solo por el analizador, archivo visto solo por el
      compilador, exclusión válida, exclusión muerta, y listado vacío habiendo
      fuentes.
- [x] 1.2 Casos sintéticos para el comparador de cobertura: cambio que solo
      agrega, cambio que solo borra, renombre puro, cambio sin archivos
      ejecutables, y **ausencia de datos habiendo líneas agregadas** — este
      último es el que decide si el gate falla en verde.

## 2. Las piezas del marco

- [x] 2.1 Detección de enmascaramiento en el job de marco (estática): un script
      de verificación que convierte un fallo en éxito es rojo. Implementa un
      requirement que el contrato ya tenía y nadie ejecutaba. Evidencia: rojo
      con un script enmascarado a propósito, verde sin él.
- [x] 2.2 Verificación de cableado en el job de marco (estática): el repositorio
      que declara la verificación pero no la invoca en ningún flujo es rojo.
      Evidencia: rojo quitando el paso, verde con él.
- [x] 2.3 La derivación del alcance como pieza referenciada, con su script
      viajando adentro —por la razón ya comprobada: el token de un consumidor no
      lee otro repositorio—. Emite el detalle al resumen de la corrida.
- [x] 2.4 El comparador de cobertura como pieza referenciada, con los dos
      planos: el mínimo del marco (80%) sobre las líneas del diff, que bloquea
      desde el día uno porque solo aplica a código nuevo; y el piso por paquete
      sobre el total, que bloquea el retroceso. Bajar un piso exige declaración
      explícita en el diff — visible y revisable, nunca silenciosa.
- [x] 2.5 Corregir el scaffold: hoy reparte tres recorridos de paquetes que
      saltean en silencio, y cada proyecto nuevo los hereda el día uno.
- [x] 2.6 Entrada de CHANGELOG en este mismo PR, diciendo qué tiene que hacer un
      consumidor por cada pieza.

## 3. Primero el consumidor, después el check

El mismo orden que en `marco-se-cumple-solo`, y por la misma razón: la
constitución define breaking como «un repo que no modifica una línea queda
roto». Regenerando el consumidor primero, no hay repo roto ni línea mayor.

- [x] 3.1 Probar las piezas nuevas desde el consumidor apuntando a la **rama**
      del change, no al tag, y revertir ese pin en el mismo PR. Obligatorio: es
      la única corrida real que este código va a tener antes de llegar a todos.
- [x] 3.2 En el consumidor: cablear el paso, declarar las exclusiones con su
      motivo escrito, y arreglar los **tres agujeros reales** — acotar la
      exclusión de componentes generados para que deje de tragarse código de
      dominio escrito a mano y su test; meter los scripts de la API en un
      programa de tipos; y cablear el typecheck de la suite E2E, que nunca lo
      tuvo. Evidencia: la derivación en verde sin exclusiones de conveniencia.
- [x] 3.3 En el consumidor: cero tolerancia a warnings en los scripts de lint de
      cada paquete, no solo en el de la raíz. Hoy el que corre el agente es
      justamente el que no la tiene — es la puerta por la que vuelven las
      warnings que ya se eliminaron una vez.
- [x] 3.4 En el consumidor: encender el gate de formato. El reformateo y las
      exclusiones de generados ya están; falta el paso.

## 4. La puesta al día hasta el 80%

El mínimo es 80% por paquete (decisión del DRI). El consumidor arranca en 31,44%
en web y sin medir en API, así que llegar es trabajo de escribir pruebas, no de
configuración. Se hace subiendo el piso por tandas: cada tanda sube el piso, y el
piso impide que la ganancia se pierda.

- [x] 4.1 Priorizar las tandas por RIESGO, no por tamaño de archivo: primero el
      flujo del colaborador y las reglas de negocio de asignaciones y cesiones,
      que es donde un defecto se paga caro. Las 17 unidades sin ejecutar una
      línea están enumeradas en el recon.
- [x] 4.2 Cada tanda escribe sus pruebas **contra los scenarios de los specs
      vivos**, que ya dicen qué tiene que pasar. No es una preferencia de
      estilo: es lo que impide que el 80% se alcance ejecutando líneas sin
      verificar nada, que es la tentación conocida de todo objetivo numérico.
- [x] 4.3 Cada tanda sube el piso del paquete en el mismo PR que agrega sus
      pruebas. Sin eso la ganancia queda sin proteger.
- [x] 4.4 El piso de un paquete es `max(mínimo del marco, valor medido)`.
      **Corrección de esta tarea:** estaba escrita como «al llegar a 80% el piso
      pasa a ser el mínimo del marco», y aplicarla al pie de la letra bajaría el
      piso de un paquete que ya supera el mínimo —de 80,9 a 80— perdiendo
      justo la protección que el bloque agrega. El mínimo es el suelo del
      contrato; el piso es la ganancia acumulada, y nunca es menor.
      **Segunda corrección (2026-08-20):** la fórmula así escrita solo describe
      al paquete que YA llegó. Mientras un paquete no llega, su piso es el total
      medido y nada más, y esa era la puerta que el spec dejaba abierta. La
      fórmula completa quedó en el spec: el piso es el total conseguido, y desde
      el día en que el paquete alcanza el mínimo pasa a ser el mayor entre el
      mínimo y ese total.

**Resultado medido del bloque 4, y lo que quedó abierto (2026-08-20).** El bloque
llevó a `web` de 30,8% a 80,99% en líneas y sentencias, y `api` quedó en 86,26%.
Pero la puesta al día NO llegó al 80 en todas las métricas del paquete web: la
auditoría de cierre de v1 midió `functions` en **70,69%** con `EXIT = 0`, 9,4
puntos por debajo del mínimo, porque el umbral del paquete se fijó en el número
medido (`functions: 70.6`) y el spec permitía que eso pasara. El contrato ya no lo
permite: un paquete por debajo del mínimo sin fecha declarada es rojo (design
D5c). Lo que falta, y vive en un PR del consumidor y no acá, es subir `functions`
a 80 con pruebas contra scenarios de los specs vivos —jamás aflojando el umbral ni
excluyendo archivos para llegar— o declarar la deuda con su motivo y su fecha.

- [x] 4.5 **Construir la compuerta del total (2026-08-20, design D5d).** La
      corrección anterior arregló la prosa del spec y no construyó nada, así que
      la auditoría midió lo mismo otra vez: un paquete sintético al 33,3% sin
      motivo ni fecha declarados salía `EXIT 0`; con la fecha vencida en
      1999-01-01, `EXIT 0`; con los umbrales del consumidor bajados a 40,
      `EXIT 0`; y el deber de reporte por corrida no salía en el resumen. El
      requirement había pasado de una promesa sin implementar a cuatro. Hecho: el
      plano del total dentro de `cobertura-diff`, con cada caso cerrado y su rojo
      demostrado en las dos direcciones. Evidencia: 33 pruebas nuevas en
      `actions/cobertura-diff/pruebas/cobertura-total.test.mjs`; los 9 casos de
      comportamiento corridos contra el código ANTERIOR (`EXIT 0` en todos) y
      contra el nuevo (`EXIT 1`, o verde con la deuda reportada en el resumen); y
      17 mutaciones del código nuevo, todas muertas por el banco.
- [x] 4.5b **El estreno lleva ventana con fecha, y la ventana se cierra sola
      (2026-08-20).** Verificado contra un espejo del consumidor real: en `main`,
      con sus reportes `lcov` del día, el plano del total lo enrojece —`web` en
      70,70% de funciones, 9,30 puntos por debajo, sin declaración—. Su arreglo
      existe medido pero vive en `feat/cobertura-web-funciones-80`, sin mergear, y
      `v1` es un tag móvil: la compuerta llegaría antes que el arreglo. Hecho:
      `VENTANA_DE_GRACIA_HASTA = "2026-09-30"` afloja **solo** la falta de
      declaración, avisando el día en que será rojo, y no perdona deuda vencida,
      retroceso ni declaración inválida. Evidencia: el espejo del consumidor pasa
      hoy con el aviso (`EXIT 0`, 41 días), y el mismo repositorio sintético da
      `EXIT 1` con la ventana cerrada.
- [ ] 4.5c **Pendiente del consumidor, con fecha:** mergear
      `feat/cobertura-web-funciones-80` (o declarar la deuda de `web` con su
      motivo y su fecha) **antes del 2026-09-30**. Pasada esa fecha el marco lo
      enrojece sin que nadie toque una línea, que es exactamente el punto.
- [ ] 4.5d **Limpieza posterior:** borrar `VENTANA_DE_GRACIA_HASTA` y su rama en
      `veredictoDePaquete` cuando la fecha haya pasado. Es un PR de limpieza que
      NO cambia comportamiento: la ventana ya está cerrada por fecha para
      entonces.
- [x] 4.6 **El marco reparte el umbral del total (2026-08-20).** El andamio no
      repartía ninguno, así que cada proyecto inventaba el número, y el que se
      inventa es el que la medición dio ese día: así llegó `functions: 70.6`.
      Hecho: `plantilla/vitest.config.base.mjs` con las cuatro métricas en el
      mínimo del marco, `all: true` y el `projectRoot` del reporter en la raíz
      del monorepo, más un check del `marco-ci` que compara ese número contra la
      constante del comparador. Evidencia: el check en verde y sus tres rojos
      demostrados (archivo ausente, números divergentes, `all: true` sacado).
- [ ] 4.7 **Pendiente, con su motivo escrito: nada verifica que el delta de un
      change y el spec vivo coincidan mientras ese change se archiva.** Las tres
      ediciones de este requirement mantuvieron los dos archivos iguales a mano
      —esta última con un solo script para los dos y comprobación por md5 de la
      sección completa—, pero eso es disciplina de cada sesión y no una propiedad
      del repositorio. **Ojo con la forma del check**, porque escrito mal se
      implementa mal: NO es una comparación permanente entre `changes/archive/`
      y `openspec/specs/`. El archive es historia inmutable y el spec vivo
      evoluciona, así que un change posterior sobre el mismo requirement los hace
      divergir con razón, y un check así daría rojo para siempre enseñando a
      arreglarlo reescribiendo la historia. El alcance correcto es: mientras el PR
      que archiva un change está abierto, su delta y el spec vivo son dos caras
      del mismo cambio y tienen que coincidir en los requirements que toca. No se
      hizo acá para no agrandar el arreglo, y queda como change de Projects.

## 5. Cierre

- [x] 5.1 Confirmar que ningún consumidor quedó rojo por el aterrizaje.
- [x] 5.2 Archivar el change y mover el tag mayor.
- [x] 5.3 Anotar en la lista de reglas no escritas del marco qué filas cierra
      esto y cuáles quedan abiertas —con el punto de entrada único de
      verificación declarado como deuda, no como olvido: hoy no existe ningún
      comando local que reproduzca lo que hace el pipeline, y la regla de correr
      la suite antes del push depende de que cada quien lo recuerde.
