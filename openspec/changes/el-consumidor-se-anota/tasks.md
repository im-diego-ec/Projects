---
artefacto: tasks
dri: Builder 1
aprueba: Builder 2 (builder par)
estado: pendiente-de-revision
---

# Tasks — el-consumidor-se-anota

## 1. La lectura del pin

- [x] 1.1 Función que lee el `uses:` del marco del `ci.yml` escrito en el
      destino y devuelve el `vX.Y.Z`, o `null` si no lo encuentra.
      Evidencia: `pruebas/init/consumidor-se-anota.test.mjs`, caso «la versión
      que informa sale del ci.yml del destino» y caso «un destino sin ci.yml».

## 2. El pendiente en la salida

- [x] 2.1 Item nuevo en la lista numerada de actos humanos, con los tres datos
      resueltos y el enlace al registro.
      Evidencia: caso «la línea aparece y nombra el registro».
- [x] 2.2 Camino sin lectura: la línea se imprime igual, declarando que la
      versión no se pudo leer.
      Evidencia: caso «un destino sin ci.yml».

## 3. El documento

- [x] 3.1 `docs/14-consumidores.md` deja de declarar pendiente la mitad
      automática, porque su propia medición ya devuelve la línea.
      Evidencia: la medición del propio documento, corrida en 4.1.

## 4. Verificación

- [x] 4.1 La medición que el documento dejó escrita devuelve la línea y sale 0.
      Evidencia: `node herramientas/projects-init.mjs --valores <v> --destino <d>
      --sin-herramientas 2>&1 | grep -i consumidores` → EXIT 0 con la línea.
- [x] 4.2 El banco completo del marco sigue verde.
      Evidencia: `node --test` sobre los 94 archivos del banco.
- [x] 4.3 `openspec validate --strict` en verde.

## 5. Alcance declarado, que NO bloquea este change

- La reposición de consumidores anteriores al registro (recomendación B2 del
  censo) queda fuera: necesita una credencial de organización y por eso no entra
  por un PR. **Destino:** `docs/13-censo-de-consumidores.md`, que ya la describe.
- Que la skill `projects-adoptar` nombre el mismo registro para el camino de
  migración de un repo existente. **Destino:** change propio, porque toca el
  contrato de una skill y no la herramienta de arranque.
