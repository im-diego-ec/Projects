## Fronteras de tres niveles

**✅ Siempre (hazlo sin preguntar)**

<!-- projects:regla id=suite-local-antes-del-push -->

- Suite local ANTES de cada push. **CI es la corrida final, no el banco de pruebas.**

<!-- projects:regla id=tests-por-endpoint-y-tdd -->

- Tests para cada endpoint y cada path crítico; TDD con **rojo evidenciado en local**.

<!-- projects:regla id=validar-input-externo -->

- Validar TODO input externo con el validador de schemas del stack (**Zod** salvo que
  la tabla de stack del proyecto diga otra cosa) antes de usarlo.

<!-- projects:regla id=logging-estructurado -->

- Logging por `{{PAQUETE_API}}/src/lib/log.ts` (JSON estructurado; `no-console` es
  error del linter, no advertencia).

<!-- projects:regla id=authz-en-el-backend -->

- Verificar autorización en el backend en cada operación (nunca confiar en el
  cliente).

<!-- projects:regla id=respetar-stack-y-estructura -->

- Respetar el stack y la estructura de carpetas fijados por el proyecto.

<!-- projects:regla id=ejecutores-con-version-exacta -->

- Si un comando corre por un ejecutor que **descarga** (`npx`, `bunx`, `npm exec`,
  `pnpm dlx`, `yarn dlx`), escribirlo con el paquete completo y su **versión exacta**.
  El nombre pelado de un paquete en npm lo puede tener otro: `openspec` a secas es un
  placeholder ajeno, y `npx --yes openspec ...` lo descarga y lo ejecuta sin
  preguntar. Cuando el binario ya lo trae una dependencia declarada del repo, la forma
  correcta es `pnpm exec <comando>`, que lee `node_modules` y falla si no está en vez
  de salir a buscarlo. El CI del marco lo verifica solo (check _Ejecutores de paquetes
  pinados_), incluido el allowlist de `.claude/settings.json`.

**⚠️ Pregunta primero (requiere OK humano)**

<!-- projects:regla id=dependencia-nueva -->

- Agregar una dependencia nueva. Para las EXISTENTES la política es fija: Dependabot
  corre semanal (lunes; npm agrupa minor+patch en un PR, los majors llegan solos).
  **Minor/patch**: los mergea cualquier builder con la promoción en verde — el
  pipeline (suite, smoke, E2E) ES la verificación; sin auto-merge (el humano mira el
  changelog un minuto). **Majors**: nunca sueltos — sesión dedicada con orden de riesgo
  (devDeps → runtime → auth) y verificación real en dev antes de prod. Un major de una
  lib de AUTH o del RUNTIME se trata como change de comportamiento.

<!-- projects:regla id=migracion-de-schema -->

- Cambiar el schema de la base (migración). Las migraciones de datos llevan
  invariantes de **PROPIEDADES**, jamás de cantidades esperadas: un invariante con
  número esperado aborta migraciones sanas por un falso fallo.

<!-- projects:regla id=terraform-y-config-de-despliegue -->

- Tocar Terraform o config de despliegue.

<!-- projects:regla id=contrato-de-api-existente -->

- Cambiar un contrato de API existente.

<!-- projects:regla id=servicio-externo-nuevo -->

- Integrar cualquier servicio externo nuevo.

<!-- projects:regla id=escalar-modelo-exige-ok-previo -->

- **Escalar a un modelo o a un effort más caro exige OK humano PREVIO**, en esa misma
  sesión. El default es el barato (ver _Agentes: modelos y effort_) y la escalada no
  es una decisión del agente: el costo lo paga el área y no aparece en ningún diff, así
  que la única forma de que se note es pedirlo antes. Un agente que ya está corriendo
  y cree que necesita más effort lo **dice y espera**; no se reconfigura solo, y
  tampoco lo autoriza otro agente.

<!-- projects:regla id=config-de-repo-u-organizacion-exige-ok-previo -->

- **Cambiar configuración de un repositorio o de la organización exige OK humano
  PREVIO**: settings, rulesets y protección de `main`, permisos de Actions, visibilidad,
  `vars` y `secrets`, webhooks, apps instaladas, equipos y membresías. Vale igual por
  la interfaz web que por API (`gh api -X PATCH/PUT/POST`, Terraform del provider de
  GitHub): la configuración de un repo es infraestructura, y un cambio ahí no deja
  diff que alguien pueda revisar después.

<!-- projects:regla id=apartarse-de-la-infra-base-exige-preguntar-antes -->

- **Apartarse de la infraestructura base fijada se PREGUNTA ANTES de implementar**, no
  se documenta después. La base es primera opción siempre (ver _Infraestructura_); una
  alternativa se evalúa como decisión, con su alternativa descartada escrita, y recién
  entonces se escribe código. Descubrir en el review que el servicio ya está desplegado
  convierte la decisión en un hecho consumado.

**🛑 Nunca**

<!-- projects:regla id=escribir-en-produccion -->

- **Escribir en producción sin el OK explícito de {{BUILDER_1}} en esa sesión** —
  aplica a `terraform apply`, one-offs, datos y config, aunque parezca inerte.

<!-- projects:regla id=dev-no-contacta-usuarios -->

- **Contactar usuarios reales desde dev**: la instancia dev del proveedor de identidad
  es **separada** (solo usuarios de prueba) y las integraciones salientes (chat,
  correo, SMS) corren en sandbox u off — el modo real exige `APP_ENV=prod` como
  **guard estructural en el código**, no una convención. El 2026-07-28 el scheduler de
  dev notificó a usuarios reales y cuatro empleados "reservaron" en el ambiente de
  pruebas: la separación de ambientes por convención no separa nada.

<!-- projects:regla id=secrets-fuera-de-codigo-y-contexto -->

- **Poner secrets en código, contexto o logs.** Viven en el store de secretos de AWS /
  env del runtime / secrets de Actions; se **verifican donde ya existen**, jamás
  leyéndolos hacia afuera.

<!-- projects:regla id=la-base-guarda-utc -->

- Guardar tiempos con zona horaria en la base: **la base guarda UTC**; la conversión a
  la zona local del negocio es de la capa de aplicación.

<!-- projects:regla id=una-sola-base-de-datos -->

- Crear otra base de datos (una sola base por proyecto).

<!-- projects:regla id=sistemas-de-terceros -->

- Escribir en sistemas de terceros (ERP, nómina, facturación) sin compuerta de
  aprobación explícita.

<!-- projects:regla id=borrado-de-datos-es-logico -->

- Borrar datos sin confirmación humana (las bajas de usuarios son **LÓGICAS**).

<!-- projects:regla id=desplegar-a-mano -->

- Desplegar a mano (solo por el pipeline).

<!-- projects:regla id=inventar-endpoints -->

- Inventar endpoints, tablas o features que no estén en el spec.

<!-- projects:regla id=editar-artefactos-generados -->

- Editar a mano lo que genera una herramienta pinada (skills y comandos del CLI de
  OpenSpec, esta porción del marco): se regenera, y la edición manual se pierde en la
  regeneración siguiente sin dejar rastro.

---
