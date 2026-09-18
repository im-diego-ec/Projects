<!-- Plantilla de PR — hace cumplir el flujo OpenSpec descrito en AGENTS.md. -->

## Change de OpenSpec

<!-- Un "change" es la carpeta donde queda escrito, ANTES de programar, qué se va a
     cambiar y por qué. Pegá acá su ruta, p.ej. openspec/changes/<nombre>.
     Si es un PR directo (arreglo de un error, subir dependencias, reordenar código
     sin que cambie nada visible, documentación), escribí "PR directo" y por qué no
     necesita uno. -->

openspec/changes/

## Qué resuelve

<!-- 1-2 frases: el problema o la necesidad de negocio.
     Si cierra un sub-issue: "Closes #N" (se cierra solo al mergear).
     "ref #N" NO enlaza nada — tiene que ser Closes. -->

## Cambios

<!-- Bullets de lo que cambió. Marca **BREAKING** lo que rompa contratos. -->

-

## Evidencia de tests

<!-- Obligatorio. Lo que este PR afirma que funciona se demuestra con el COMANDO que lo
     comprueba y el CÓDIGO DE SALIDA que devolvió (0 es que pasó; cualquier otro número es
     que falló). Por ejemplo:

         pnpm test   → exit 0, 128 pass / 0 fail

     Pegar un pedazo de la salida o decir «se ve bien» no demuestra nada: una herramienta
     que no llegó a arrancar muestra lo mismo que una que no encontró ningún problema.
     Un enlace a la corrida de CI en verde también sirve, porque ahí el código de salida
     queda escrito.

     Y si algo NO se pudo comprobar, va en «No medido», con el motivo, en vez de darlo por
     bueno. -->

**Comandos y su exit code:**

**No medido** (lo que este PR afirma y no pudo comprobar, con el motivo):

## Checklist

- [ ] El change de OpenSpec está enlazado arriba (o justificado como PR directo)
- [ ] Se cumplen los escenarios de la **spec** —el documento que dice cómo tiene que
      comportarse esto, escrito en ejemplos concretos— y alguien de negocio lo confirmó
- [ ] Tests verdes en LOCAL antes del push (CI es la corrida final, no el banco de pruebas)
- [ ] **Todo lo que este PR afirma que funciona trae su comando y su exit code**, y lo que no se pudo comprobar está en «No medido»
- [ ] **Si corrige un defecto**: incluye el test de regresión que lo REPRODUCE (rojo antes del fix), al nivel más bajo suficiente
- [ ] **Si toca `openspec/`**: `openspec validate <change> --strict` en verde, y releídas entre sí las cuatro partes del change para que no se contradigan: **proposal** (por qué y qué cambia) ↔ **design** (cómo) ↔ **specs** (cómo se comporta) ↔ **tasks** (los pasos)
- [ ] **Si toca `infra/` o `infra-prod/`**: el `.tf` del PR es EXACTAMENTE lo aplicado (plan limpio) y se respetó la política de infra (dev primero, con horneado, salvo urgencia)
- [ ] **Si escribe en producción**: OK explícito de {{BUILDER_1}} en esta sesión
- [ ] Sin secrets ni credenciales en el diff
- [ ] Revisión cruzada pedida. No hace falta elegir a nadie: la asigna sola
      `.github/CODEOWNERS`, el archivo que dice quién aprueba qué, y le toca a quien no
      escribió el código
