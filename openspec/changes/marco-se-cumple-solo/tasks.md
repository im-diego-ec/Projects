---
artefacto: tasks
dri: Builder 1
aprueba: Builder 1
informado: PO / Builder 2
estado: pendiente-de-revision
---

## 1. Los checks

- [ ] 1.1 Verificación de artefactos regenerados en el job de marco: compara la
      versión declarada en cada artefacto generado contra el pin vigente. El
      mensaje de fallo trae el comando exacto de regeneración (design D2).
      Evidencia: corrida en rojo con un artefacto desactualizado a propósito, y
      en verde tras regenerar.
- [ ] 1.2 Validación de las definiciones de pipeline en el job de marco, con
      binario pinado por versión. Corre también en el carril rápido. Evidencia:
      corrida en rojo introduciendo un error de sintaxis a propósito, y el
      archivo y la línea señalados en el log.
- [ ] 1.3 Verificación de marcadores del scaffold en el job de marco. El patrón
      distingue los marcadores del scaffold de las expresiones que el proveedor
      de CI resuelve en cada corrida (design D4). Evidencia: los dos escenarios
      del delta probados — marcador pendiente en rojo, sintaxis parecida en verde.
- [ ] 1.4 Entrada del CHANGELOG en este mismo PR, diciendo qué tiene que hacer un
      consumidor por cada check (nada en dos de ellos; regenerar en uno).

## 2. El propio marco primero

- [ ] 2.1 Los tres checks corren sobre Projects antes de publicarse. Si alguno no
      sirve para este repo, tampoco sirve para los demás — y este repo es el
      primero que los ejercita en cada PR.
- [ ] 2.2 Verificar contra el consumidor real ANTES de mover el tag: apuntar su
      CI al SHA de la rama de este change y confirmar el comportamiento previsto
      en el proposal — dos checks en verde, el de regenerados en rojo. Es el mismo
      patrón con el que se validó la primera versión del marco.

## 3. Cierre

- [ ] 3.1 Coordinar la regeneración en el consumidor dentro de la misma ventana
      del merge, para que el rojo del día uno dure minutos y no una tarde.
- [ ] 3.2 Archivar el change y mover el tag mayor. Los checks llegan solos a todo
      consumidor: no hay nada que copiar ni configurar del otro lado.
- [ ] 3.3 Anotar en la lista de reglas no escritas del marco que la serialización
      de despliegues dejó de ser prosa y pasó a ser contrato, y que su check
      automático llega con el esqueleto de entrega (design, tabla de enforcement).
