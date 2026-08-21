## Seguridad y observabilidad

<!-- projects:regla id=auth-token-verificado-offline -->

- **Auth**: el proveedor fijado en el stack. El front usa sus componentes; el API
  verifica el token **offline** con claims firmados (email/nombre del token, jamás del
  body; sin claim → **fail-closed**).

<!-- projects:regla id=authz-el-backend-es-la-autoridad -->

- **Authz**: cada request valida permiso sobre el recurso (ownership / rol). El backend
  es la autoridad; cero lógica de seguridad en el cliente.

<!-- projects:regla id=semantica-de-niveles-de-log -->

- **Logs**: JSON por línea con `requestId` automático (trace del balanceador). Un
  `[fatal]` mata el proceso; `error` alerta; lo rutinario (auth fallida, integración
  caída) es `warn`. **La semántica de niveles es un contrato** de verificar-prod y de
  las alarmas: subir un rutinario a `error` no es prolijidad, es ruido que apaga la
  alarma real.

<!-- projects:regla id=alertar-con-origen-preciso -->

- **Alertar cuando debe y con el origen preciso** (requestId, versión, línea real vía
  sourcemaps): equipo chico = diagnóstico en minutos. Las alarmas de producción
  notifican a {{CANAL_ALERTAS}}.

<!-- projects:regla id=fail-open-ruidoso -->

- **Todo fail-open es ruidoso.** Si una detección falla y el proceso sigue por el
  camino conservador, tiene que **decirlo** (`::warning::` como mínimo). El 2026-08-05
  un token sin `pull-requests: read` daba 403, el fail-open lo tapaba en silencio y una
  función del pipeline no actuó durante una semana: un fail-open silencioso es
  indistinguible de que la función no exista.

<!-- projects:regla id=auditar-permisos-de-job-nuevo -->

- **Un job nuevo del pipeline se audita acción por acción** contra los permisos de su
  token/role ANTES del estreno, y declara `permissions` explícitos con el mínimo
  necesario. Lección repetida **3 veces**: es el conteo lo que hace creíble la regla.

---
