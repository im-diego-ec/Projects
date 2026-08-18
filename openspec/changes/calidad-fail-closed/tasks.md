---
artefacto: tasks
dri: Builder 1
aprueba: Builder 1
informado: PO / Builder 2
estado: pendiente-de-revision
---

## 0. Spike: medir antes de prometer

- [ ] 0.1 Agregar el proveedor de cobertura a los dos paquetes del consumidor
      (dependencia nueva, ya aprobada) y emitir el reporte con las rutas
      relativas a la raíz del monorepo — sin esa raíz los dos paquetes emiten
      rutas indistinguibles entre sí e incomparables contra el diff. Evidencia:
      el reporte de ambos paquetes con rutas distinguibles.
- [ ] 0.2 Obtener el número real de cobertura del paquete de API, que hoy nadie
      conoce, con la base de datos levantada en CI. **Ningún número entra a un
      spec antes de este paso**: escribirlo sin el dato es inventar el contrato.
- [ ] 0.3 Contrastar el comparador propio contra la herramienta externa como
      oráculo, en local y fuera del pipeline, sobre al menos tres formas de
      cambio: solo agrega, solo borra, y mixto. Evidencia: coinciden, o la
      diferencia está explicada.

## 1. El banco de pruebas primero

- [ ] 1.1 Casos sintéticos para la derivación del alcance, corriendo como job
      propio del CI del marco. No es opcional ni es buena práctica: el marco NO
      puede dogfoodear este check —no tiene manifiestos propios— y es la primera
      vez que trae código no trivial. Cubrir al menos: archivo que nadie mira,
      archivo visto solo por el analizador, archivo visto solo por el
      compilador, exclusión válida, exclusión muerta, y listado vacío habiendo
      fuentes.
- [ ] 1.2 Casos sintéticos para el comparador de cobertura: cambio que solo
      agrega, cambio que solo borra, renombre puro, cambio sin archivos
      ejecutables, y **ausencia de datos habiendo líneas agregadas** — este
      último es el que decide si el gate falla en verde.

## 2. Las piezas del marco

- [ ] 2.1 Detección de enmascaramiento en el job de marco (estática): un script
      de verificación que convierte un fallo en éxito es rojo. Implementa un
      requirement que el contrato ya tenía y nadie ejecutaba. Evidencia: rojo
      con un script enmascarado a propósito, verde sin él.
- [ ] 2.2 Verificación de cableado en el job de marco (estática): el repositorio
      que declara la verificación pero no la invoca en ningún flujo es rojo.
      Evidencia: rojo quitando el paso, verde con él.
- [ ] 2.3 La derivación del alcance como pieza referenciada, con su script
      viajando adentro —por la razón ya comprobada: el token de un consumidor no
      lee otro repositorio—. Emite el detalle al resumen de la corrida.
- [ ] 2.4 El comparador de cobertura del diff como pieza referenciada, naciendo
      **sin bloquear** (mínimo en cero). Que cada proyecto suba su mínimo es
      decisión del proyecto; subir el default del marco sería línea mayor.
- [ ] 2.5 Corregir el scaffold: hoy reparte tres recorridos de paquetes que
      saltean en silencio, y cada proyecto nuevo los hereda el día uno.
- [ ] 2.6 Entrada de CHANGELOG en este mismo PR, diciendo qué tiene que hacer un
      consumidor por cada pieza.

## 3. Primero el consumidor, después el check

El mismo orden que en `marco-se-cumple-solo`, y por la misma razón: la
constitución define breaking como «un repo que no modifica una línea queda
roto». Regenerando el consumidor primero, no hay repo roto ni línea mayor.

- [ ] 3.1 Probar las piezas nuevas desde el consumidor apuntando a la **rama**
      del change, no al tag, y revertir ese pin en el mismo PR. Obligatorio: es
      la única corrida real que este código va a tener antes de llegar a todos.
- [ ] 3.2 En el consumidor: cablear el paso, declarar las exclusiones con su
      motivo escrito, y arreglar los **tres agujeros reales** — acotar la
      exclusión de componentes generados para que deje de tragarse código de
      dominio escrito a mano y su test; meter los scripts de la API en un
      programa de tipos; y cablear el typecheck de la suite E2E, que nunca lo
      tuvo. Evidencia: la derivación en verde sin exclusiones de conveniencia.
- [ ] 3.3 En el consumidor: cero tolerancia a warnings en los scripts de lint de
      cada paquete, no solo en el de la raíz. Hoy el que corre el agente es
      justamente el que no la tiene — es la puerta por la que vuelven las
      warnings que ya se eliminaron una vez.
- [ ] 3.4 En el consumidor: encender el gate de formato. El reformateo y las
      exclusiones de generados ya están; falta el paso.

## 4. Cierre

- [ ] 4.1 Confirmar que ningún consumidor quedó rojo por el aterrizaje.
- [ ] 4.2 Archivar el change y mover el tag mayor.
- [ ] 4.3 Anotar en la lista de reglas no escritas del marco qué filas cierra
      esto y cuáles quedan abiertas —con el punto de entrada único de
      verificación declarado como deuda, no como olvido: hoy no existe ningún
      comando local que reproduzca lo que hace el pipeline, y la regla de correr
      la suite antes del push depende de que cada quien lo recuerde.
