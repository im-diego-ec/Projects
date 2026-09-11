---
artefacto: tasks
dri: Builder 1
aprueba: Builder 2 (builder par)
estado: pendiente-de-revision
---

# Tasks — las-plantillas-no-quedan-atras

## 1. El paso del release

- [x] 1.1 Paso 5-bis: comprobar el pin de las dos plantillas contra la versión
      recién publicada, con el comando escrito.
- [x] 1.2 Comprobar también `is_template`, y decir por qué importa.
- [x] 1.3 Si están atrasadas, el paso dice cómo regenerarlas.

## 2. El banco

- [x] 2.1 Verifica que el paso siga escrito, con la comprobación del pin.
- [x] 2.2 La lista de plantillas se **deriva** de `PLANTILLAS`, no se escribe a mano.
- [x] 2.3 Cruza contra `docs/04`: la guía manda a las mismas que la herramienta genera.
- [x] 2.4 MUERDE: si el release deja de nombrar una plantilla, se caza.

## 3. Verificación

- [x] 3.1 Banco nuevo en verde (4/4).
- [x] 3.2 Banco completo sin regresión.
- [x] 3.3 Medido contra GitHub al escribir esto: las dos pinan `v1.9.6` y las dos
      tienen `is_template: true`.

## 4. Alcance declarado

- **Esto no impide publicar con las plantillas atrasadas**, sólo que el paso
  desaparezca del procedimiento. Un enforcement real exigiría que el CI del release
  consulte GitHub, y eso ata el banco a un tercero. **Destino:** si alguna vez el
  release corre en CI con credenciales, ahí es donde va.
