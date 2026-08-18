---
artefacto: tasks
dri: Builder 1
aprueba: Builder 1
informado: PO / Builder 2
estado: pendiente-de-revision
---

## 0. Primero el consumidor, después el check

- [ ] 0.1 Regenerar los artefactos de OpenSpec en el consumidor y mergear ESE PR
      **antes** de que el check de regenerados aterrice. El orden no es
      cosmético: la constitución define breaking como «un repo consumidor que no
      modifica una sola línea queda roto», así que regenerar primero es lo que
      evita abrir un major. Evidencia: la versión declarada en los artefactos del
      consumidor coincide con el pin vigente.

## 1. Los checks

- [x] 1.1 Verificación de artefactos regenerados en el job de marco: compara la
      versión declarada en cada artefacto generado contra el pin vigente. El
      mensaje de fallo trae el comando exacto de regeneración (design D2).
      Evidencia: corrida en rojo con un artefacto desactualizado a propósito, y
      en verde tras regenerar.
- [x] 1.2 Validación de las definiciones de pipeline en el job de marco, con
      binario pinado por versión. Corre también en el carril rápido. Evidencia:
      corrida en rojo introduciendo un error de sintaxis a propósito, y el
      archivo y la línea señalados en el log.
- [x] 1.3 Verificación de marcadores del scaffold en el job de marco. El patrón
      distingue los marcadores del scaffold de las expresiones que el proveedor
      de CI resuelve en cada corrida (design D4). Evidencia: los dos escenarios
      del delta probados — marcador pendiente en rojo, sintaxis parecida en verde.
- [x] 1.4 Entrada del CHANGELOG en este mismo PR, diciendo qué tiene que hacer un
      consumidor por cada check (nada en dos de ellos; regenerar en uno).

## 2. El propio marco primero

- [x] 2.1 Los checks corren sobre Projects antes de publicarse. Si uno no sirve
      para este repo, tampoco sirve para los demás — y este repo es el primero
      que los ejercita en cada PR. Con una excepción declarada: el de marcadores
      se omite acá, porque este repo distribuye el scaffold (design D4).
- [x] 2.2 Verificar contra el consumidor real ANTES de mover el tag: apuntar su
      CI al SHA de la rama de este change y confirmar el comportamiento previsto
      en el proposal — dos checks en verde, el de regenerados en rojo. Es el mismo
      patrón con el que se validó la primera versión del marco.

## 3. Cierre

- [ ] 3.1 Confirmar que ningún consumidor quedó rojo por el aterrizaje de los
      checks (la regeneración ya ocurrió en 0.1).
- [ ] 3.2 Archivar el change y mover el tag mayor. Los checks llegan solos a todo
      consumidor: no hay nada que copiar ni configurar del otro lado.
- [x] 3.3 Anotar en la lista de reglas no escritas del marco que la serialización
      de despliegues dejó de ser prosa y pasó a ser contrato, y que su check
      automático llega con el esqueleto de entrega (design, tabla de enforcement).
