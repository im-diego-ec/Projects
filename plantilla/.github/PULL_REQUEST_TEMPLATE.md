<!-- Plantilla de PR — hace cumplir el flujo OpenSpec descrito en AGENTS.md. -->

## Change de OpenSpec

<!-- Link o ruta al change que respalda este PR, p.ej. openspec/changes/<nombre>.
     Si es un PR directo (bugfix, deps, refactor sin cambio observable, docs),
     escribí "PR directo" y por qué no necesita change. -->
openspec/changes/

## Qué resuelve

<!-- 1-2 frases: el problema o la necesidad de negocio.
     Si cierra un sub-issue: "Closes #N" (se cierra solo al mergear).
     "ref #N" NO enlaza nada — tiene que ser Closes. -->

## Cambios

<!-- Bullets de lo que cambió. Marca **BREAKING** lo que rompa contratos. -->

-

## Evidencia de tests

<!-- Obligatorio. Pega la salida relevante o enlaza la corrida de CI verde.
     Si algo no pudo verificarse localmente, dilo explícitamente y por qué. -->

## Checklist

- [ ] El change de OpenSpec está enlazado arriba (o justificado como PR directo)
- [ ] Los escenarios de la spec se cumplen (confirmación de negocio)
- [ ] Tests verdes en LOCAL antes del push (CI es la corrida final, no el banco de pruebas)
- [ ] **Si corrige un defecto**: incluye el test de regresión que lo REPRODUCE (rojo antes del fix), al nivel más bajo suficiente
- [ ] **Si toca `openspec/`**: `openspec validate <change> --strict` verde + coherencia releída entre secciones (proposal ↔ design ↔ specs ↔ tasks)
- [ ] **Si toca `infra/` o `infra-prod/`**: el `.tf` del PR es EXACTAMENTE lo aplicado (plan limpio) y se respetó la política de infra (dev primero, con horneado, salvo urgencia)
- [ ] **Si escribe en producción**: OK explícito de {{BUILDER_1}} en esta sesión
- [ ] Sin secrets ni credenciales en el diff
- [ ] Revisión cruzada solicitada (la asigna CODEOWNERS sola: el builder que no escribió)
