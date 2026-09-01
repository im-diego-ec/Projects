# ADR 002 — Trunk-based single-main con promoción por ambientes

- **Fecha**: 2026-08-12/13 (nació en el proyecto piloto como ADR 007;
  registrado en el marco 2026-08-14)
- **Estado**: aceptada
- **Decisores**: builders

## Contexto

Dos problemas distintos que se resolvieron juntos porque comparten la misma
pregunta: *¿qué garantiza que lo que entra a producción ya se probó?*

**Uno: las ramas permanentes no pagaban su costo.** Una rama `develop`
creada por error demostró que el modelo de dos ramas permanentes no aportaba
nada en un equipo de tres — solo agregaba merges de sincronización, dudas
sobre desde dónde ramificar y una segunda historia que envejece.

**Dos: producción podía estrenar cosas.** Hasta el 2026-08-12, "lo estándar"
corría en CI (lint, typecheck, tests unitarios y de integración contra un
Postgres del runner) pero **"lo duro" podía debutar en producción**: la base
real, el proveedor de auth real, las migraciones reales, el arranque real
del contenedor. Nada en el pipeline obligaba a que un commit pisara el
ambiente de desarrollo antes que el de producción. Que no hubiera explotado
todavía era suerte, no diseño.

## Decisión

### Una sola rama permanente: `main`

Las ramas de trabajo (`feat/*`, `chore/*`, `docs/*`) salen **siempre de
`main` actualizado**, en una sola operación atómica
(`checkout main && pull --ff-only && checkout -b`), y vuelven por PR
obligatorio con review cruzado. Se borran al mergear. No existe `develop`,
no existe `release/*`, no existe una rama por ambiente.

### El merge de código no despliega: **promueve**

```
merge a main → deploy a DEV → smoke del API → E2E contra DEV
             → deploy a PROD → verificar-prod
```

Producción **no recibe nada que el ambiente de desarrollo no haya
verificado antes**, en el mismo pipeline y con la misma imagen.

Cuatro matices que hacen que esto funcione en la práctica:

- **Carril rápido de docs.** Un merge que solo toca specs, markdown, docs,
  configuración de CI o infraestructura declarativa — nada que se sirva en
  runtime — **no despliega nada en ningún ambiente**. La detección es por
  los archivos del PR y es **fail-open**: ante cualquier duda o error al
  listarlos, se despliega todo. Jamás omitir un deploy de código en
  silencio (ver [reglas no escritas](../11-reglas-no-escritas.md), regla 3).
- **Reuso de verificación por TREE HASH, no por SHA.** El flujo cuidadoso
  —desplegar la rama a dev por dispatch, verificarla, recién ahí mergear—
  hacía pagar la promoción dos veces por el mismo contenido. La identidad
  no puede ser el SHA: el merge commit siempre tiene otro. Es el **tree
  hash**: si el árbol del merge es idéntico al del head que ya pasó dev, el
  contenido es byte a byte el mismo (equivale a decir que `main` no se movió
  entre el dispatch y el merge). Con ventana de 24h, exigiendo que esa
  corrida haya pasado smoke **y** E2E, y con **fail-open a promoción
  completa ante cualquier duda**.
- **Deploys SERIALIZADOS, jamás cancelados.** Un solo Deploy a la vez, con
  cola (`concurrency` sin `cancel-in-progress`): el ambiente de desarrollo
  es UNO y compartido, y dos corridas concurrentes se pisan. No es
  hipotético: un dispatch redesplegó dev en plena promoción de un merge, las
  dos suites E2E corrieron simultáneas y la configuración compartida quedó
  corrupta — la segunda corrida leyó como "valor original" un estado que la
  primera todavía no había restaurado. Cancelar la corrida en vuelo tampoco
  sirve: mataría una promoción a mitad de camino.
- **Solo dos vías saltan dev**, deliberadas y visibles: el **rollback por
  `image_tag`** (vuelve a una imagen que YA estuvo en producción y que en su
  día se verificó) y el **dispatch manual sobre `main`** para emergencias.
  Ambas quedan registradas como corrida manual con autor.

### Probar una rama sin tocar a nadie

Dispatch manual eligiendo la rama: despliega a dev y corre el smoke.
Producción ni se entera.

## Consecuencias

- Producción no recibe nada sin verificar. El costo es de ~10 a 12 minutos
  extra por merge de código — o **~0 cuando el reuso por tree aplica**.
- **El ambiente de desarrollo ES staging.** Un merge puede pisar una prueba
  manual en curso; eso se coordina por {{CANAL_ALERTAS}} o el canal de
  equipo. La alternativa (un tercer ambiente) cuesta más de lo que ahorra a
  esta escala.
- La cola de deploys hace visible la contención: si dos personas empujan a
  la vez, la segunda espera y lo ve. Es el comportamiento correcto, pero
  hay que saberlo para no creer que el pipeline se colgó.
- El reuso por tree hash es la pieza más sutil del pipeline. Su modo de
  fallo es degradar a promoción completa (lento pero correcto), nunca
  saltarse una verificación. Cualquier cambio ahí se revisa contra esa
  propiedad.

## Cómo lo hace cumplir el marco

| Regla | Check que falla solo |
|---|---|
| Producción solo por promoción | El job de deploy a producción depende de smoke **y** E2E de dev en verde; sin eso no arranca |
| Nunca dos deploys sobre el mismo ambiente | `concurrency` con cola en el workflow de deploy, `cancel-in-progress: false` |
| `main` solo avanza por PR revisado | Ruleset de rama protegida más CODEOWNERS |
| El carril rápido no puede saltarse verificación | El check requerido reporta en AMBOS carriles; la detección es fail-open y ruidosa |
| Deploy manual a producción rastreable | Es un `workflow_dispatch`: queda run, autor, inputs y logs |

Sigue dependiendo de disciplina: **ramificar siempre desde `main`
actualizado** (regla 8 de [reglas no escritas](../11-reglas-no-escritas.md)) y
coordinar el uso manual del ambiente compartido.
