# ADR 003 — Verificación post-deploy dentro del pipeline (read-only en prod)

- **Fecha**: 2026-08-07 (sondas del 2026-08-13; nació en el proyecto piloto
  como ADR 010; registrado en el marco 2026-08-14)
- **Estado**: aceptada
- **Decisores**: builders

## Contexto

Después de cada merge a producción, alguien verificaba a mano: pegar la URL
de health, mirar los logs un rato, hacer grep del bundle servido para
confirmar que era el nuevo. Funcionaba mientras alguien se acordara y
mientras esa persona estuviera disponible. Es decir: no funcionaba, tenía
suerte.

Alternativas evaluadas:

1. **Un job en el pipeline** — verificación inmediata, atada al deploy que
   la causó, con el resultado en el mismo run.
2. **Un canary externo** (sonda periódica desde fuera) — detecta también la
   degradación tardía, pero no distingue "este deploy rompió algo" de
   "algo se rompió"; y es infraestructura nueva que mantener.
3. **Solo alarmas de CloudWatch** — ya existen y cubren el estado
   sostenido, pero llegan tarde para el caso "el deploy dejó producción
   rota" y no confirman que lo desplegado sea lo que se quiso desplegar.

## Decisión

Un job **`verificar-prod`** al final del deploy a producción. El deploy no
está "listo" cuando termina de aplicar: está listo cuando se verifica.

Qué hace, en orden:

1. **Espera la señal MÍNIMA suficiente**: que la primera tarea con la
   configuración nueva esté sirviendo. NO el bake completo del despliegue —
   esperar el 100% del rollout agrega decenas de minutos para responder la
   misma pregunta.
2. **Health públicos ×3** (el del servicio y el de la base). Tres veces,
   porque durante el drenaje conviven tareas viejas y nuevas y una sola
   consulta puede pegarle a cualquiera.
3. **Sondas read-only**, que son la parte que de verdad distingue este job
   de un ping:
   - el `index.html` que se está sirviendo referencia el bundle de **ESTE**
     build (frescura real, no "el CDN respondió 200");
   - un token basura contra un endpoint autenticado devuelve **401 exacto**
     (la cadena de auth está viva y falla como debe).
4. **Ventana de logs de 3 minutos**: 1 fatal, o 3 errores, ponen el job en
   rojo. Se aceptan los dos formatos de log durante la ventana de drenaje.

Fallo → **workflow rojo + aviso a {{CANAL_ALERTAS}}** con los tags de
rollback ya listos para copiar. **Humano en el loop para el rollback:
jamás automático.** Un rollback automático ante un falso positivo es una
segunda caída, y quien decide es quien mira el impacto.

### En producción TODO es read-only

Esta es la restricción que le da forma a todo lo anterior. En producción no
se ejercita ningún flujo de negocio: hasta un login de prueba escribiría un
usuario real en la base a través del sync de identidades. Los flujos de
negocio se verifican en el ambiente de desarrollo — el smoke del API y la
suite E2E de la promoción (ADR 002) — y en producción solo se observa.

## Consecuencias

- El pipeline responde una pregunta que antes contestaba una persona con
  suerte: *¿lo que quedó arriba es lo que quisimos poner y está sano?*
- **La degradación tardía no es territorio de este job.** Lo que se rompe
  diez minutos después lo cazan las alarmas. Confundir los dos roles lleva a
  querer que el job espere "un rato más", que es un pozo sin fondo.
- **La semántica de niveles de log pasa a ser un CONTRATO**: `fatal` mata,
  `error` alerta, lo rutinario (auth fallida, un servicio externo caído) es
  `warn`. Ese contrato lo consumen este job y las alarmas: quien loguea un
  `error` por algo esperable rompe la verificación de todos.
- El rollback también se verifica: vuelve a correr `verificar-prod`,
  omitiendo únicamente la sonda de frescura del bundle cuando no hubo
  deploy de frontend.
- Las sondas envejecen con la aplicación. Cuando cambia la forma del bundle
  o la del error de auth, hay que actualizarlas — es mantenimiento real y
  conocido, no una sorpresa.

## Cómo lo hace cumplir el marco

| Regla | Check que falla solo |
|---|---|
| Ningún deploy a producción queda sin verificar | `verificar-prod` es un job del workflow de deploy, no un paso opcional; su rojo pone el run en rojo |
| El fallo se entera alguien | Aviso a {{CANAL_ALERTAS}} desde el propio job, con los tags de rollback |
| Producción no se escribe desde el pipeline | El job solo hace lecturas: health, `index.html`, un 401 esperado y consulta de logs |
| El contrato de niveles de log no se degrada | La ventana de logs pone en rojo cualquier `fatal` o exceso de `error`: quien abusa del nivel, rompe su propio deploy |

Sigue dependiendo de disciplina: **decidir el rollback** (a propósito) y
mantener las sondas al día cuando cambia lo que observan.
