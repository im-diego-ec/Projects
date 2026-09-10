---
artefacto: tasks
dri: Builder 1
aprueba: Builder 2 (builder par)
estado: pendiente-de-revision
---

# Tasks — la-evidencia-del-ensayo-viaja

## 1. La terna cambia de superficie

- [x] 1.1 `projects-validar-consumidor` manda la terna al `CHANGELOG.md` y
      descarta explícitamente el comentario del PR. Evidencia: caso «la terna
      viaja al CHANGELOG».

## 2. El paso 6 la exige

- [x] 2.1 Verificación por forma (id de corrida + SHA de 40), no por largo.
      Evidencia: caso «exige un id de corrida y un SHA».
- [x] 2.2 El texto dice que sin evidencia el release NO está cerrado.
      Evidencia: caso «dice que el release NO esta cerrado».

## 3. Anti-regresión

- [x] 3.1 Las dos skills coinciden en dónde vive la evidencia.
- [x] 3.2 El `--delete-branch` sigue existiendo: el hueco no se cerró abriendo otro.

## 4. Verificación

- [x] 4.1 Banco nuevo en verde (5/5).
- [x] 4.2 Banco completo sin regresión.

## 4-bis. La circularidad de arranque, que este mismo change destapó

- [x] 4bis.1 El paso 6 distingue **cero consumidores** de **consumidores sin
      probar**. Sin esta rama, exigir la terna convertía una violación silenciosa de
      la frontera 🛑 en un **bloqueo permanente**: el registro está vacío y el primer
      consumidor no puede existir hasta que el marco publique una versión que
      consumir. Evidencia: `pruebas/docs/evidencia-del-ensayo.test.mjs`.
- [x] 4bis.2 La salida **caduca sola**: el día que el registro tenga una fila, vuelve
      la exigencia de la terna sin que nadie apague nada.
- [x] 4bis.3 No se finge la evidencia: la declaración nombra lo que **no** se hizo y
      lo que sí se corrió en su lugar.

## 5. Alcance declarado, que NO entra acá

- **Ninguna compuerta de CI verifica que las entradas publicadas del CHANGELOG
  traigan la terna.** Las 19 versiones ya publicadas no la tienen, así que un
  check pondría rojo el archivo entero de entrada. **Destino:** change propio, en
  modo aviso y acotado a las entradas nuevas por fecha de versión.
