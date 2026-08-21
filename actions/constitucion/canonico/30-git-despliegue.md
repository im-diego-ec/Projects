## Git y despliegue

<!-- projects:regla id=git-trunk-based -->

- **Trunk-based, una sola rama permanente: `main`.** Las ramas de trabajo (`feat/*`,
  `chore/*`, `docs/*`) salen SIEMPRE de main actualizado
  (`checkout main && pull --ff-only && checkout -b`, atómico) y vuelven por PR
  obligatorio con review. Verificar los commits del PR antes de abrirlo. Se borran al
  mergear.

<!-- projects:regla id=git-commits-firmados -->

- **Commits firmados** (GPG). CI corre lint (`--max-warnings=0`), typecheck, suites y
  build; los merges de solo docs van por el carril rápido.

<!-- projects:regla id=git-check-requerido-es-el-veredicto-agregado -->

- **El check requerido del ruleset es el veredicto agregado `ci-ok`**, nunca un job
  intermedio. Un check que solo reporta en un carril —`build-test`, que en un PR de
  solo docs queda `skipped` y nunca reporta— bloquea el otro carril para siempre
  esperando una señal que no llega. Es el error más caro de la migración al marco y ya
  se cometió una vez: un ruleset vivió una semana pidiendo el check equivocado.

<!-- projects:regla id=promocion-por-ambientes -->

- **Promoción por ambientes**: merge de código → deploy a DEV → smoke API → E2E →
  deploy a PROD → verificar-prod. Producción no recibe nada que dev no haya
  verificado; las únicas vías que saltan dev son el rollback por `image_tag` y el
  dispatch manual de emergencia sobre main.

<!-- projects:regla id=dev-es-staging-compartido -->

- **dev es staging compartido** y los Deploy se serializan (**cola, nunca
  cancelación**). El 2026-08-13 dos deploys corrieron a la vez sobre dev: las dos
  corridas salieron **verdes** y aun así dejaron la configuración del ambiente
  corrupta. Cancelar la corrida en curso deja el ambiente a mitad de camino, que es
  exactamente el estado que produjo el incidente. Para probar una rama: dispatch
  manual eligiendo la rama.

<!-- projects:regla id=definicion-de-done -->

- **Done** = spec cumplido · tests verdes · PR revisado · sin secrets · desplegado por
  la promoción y verificado.

**Ambientes**

|            | dev (staging)               | producción                   |
| ---------- | --------------------------- | ---------------------------- |
| Frontend   | https://{{DOMINIO_DEV}}     | https://{{DOMINIO_PROD}}     |
| API        | https://api.{{DOMINIO_DEV}} | https://api.{{DOMINIO_PROD}} |
| Cuenta AWS | {{CUENTA_DEV}}              | {{CUENTA_PROD}}              |
| Perfil CLI | `{{PERFIL_DEV}}`            | `{{PERFIL_PROD}}`            |
| Región     | {{REGION}}                  | {{REGION}}                   |

<!-- projects:regla id=urls-canonicas-por-cors -->

- Usar siempre las URLs canónicas de la tabla: el CORS del API solo permite esos
  orígenes.

---
