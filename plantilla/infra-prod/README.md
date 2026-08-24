# `infra-prod/` — ambiente de producción de {{PROYECTO}}

Terraform del ambiente **producción**, cuenta `{{CUENTA_PROD}}`, región `{{REGION}}`.

> 🛑 **Todo `apply` en esta raíz exige el OK explícito de @{{BUILDER_1}} en la
> misma sesión**, y aplica aunque el cambio parezca inerte: un `plan` que se ve
> vacío puede reemplazar un recurso al aplicarse.

```bash
AWS_PROFILE={{PERFIL_PROD}} terraform init
AWS_PROFILE={{PERFIL_PROD}} terraform plan
```

`init` falla hasta que resuelvas el pendiente 1. Es a propósito: el marcador está
dentro del nombre del bucket, así que no se puede escribir el state de producción
en el bucket de dev — que es el modo de falla peligroso.

## Qué llegó resuelto y qué no

**Resuelto, porque se deriva** (`main.tf`): la `key` del state, la región, el
proveedor con sus etiquetas, la referencia a la base compartida y la referencia a
la red.

**Sin resolver, en `pendientes.tf`**: siete. Uno más que dev, y es el de
**alarmas**. Cada pendiente dice qué falta, **con qué criterio se decide** y qué
garantía del marco queda sin cumplir.

⚠️ **Todavía no hay compuerta**: el pipeline **no** se pone rojo por estos
pendientes, y la compuerta llega con el change del despliegue. Hasta entonces se
revisa a mano: `grep -rn PENDIENTE-INFRA infra infra-prod`.

## Lo que el CI **sí** mira desde el primer PR

El aviso de arriba es sobre los **pendientes**, no sobre el resto del archivo. El
job `build-test` de `.github/workflows/ci.yml` corre en cada PR que toque código:

```bash
terraform fmt -check -recursive infra infra-prod
# y, en cada raíz:
terraform init -backend=false && terraform validate
```

Las dos son **inertes**: `fmt` sólo lee texto, y `-backend=false` es lo que evita
tocar el bucket del state — que es justamente el pendiente 1. No hacen falta
cuenta, credenciales ni que este repositorio se despliegue, y por eso son
exigibles desde el día uno aunque la compuerta de los pendientes todavía espere al
change del despliegue.

Estrenan en **modo aviso hasta el 2026-09-30** y después se ponen rojas solas, sin
que nadie toque el workflow: hasta hoy nada miraba estos archivos, así que la
primera corrida es también la primera medición, y la ventana es el plazo para
arreglar lo que reporte. Los mismos dos comandos corren en tu máquina sin
credenciales.

## El pendiente de alarmas no se puede copiar de nadie, y por eso está acá

El marco exige que las alarmas **existan y avisen** al canal `{{CANAL_ALERTAS}}`.
**No exige cuáles ni cuántas.** Un proyecto con tres alarmas bien elegidas cumple;
uno con seis copiadas de otro negocio, no.

La vara son dos preguntas, y la segunda es la que importa:

1. **¿Qué se rompe que alguien tenga que ir a arreglar?** Eso es una alarma. Lo
   que se degrada y se recupera solo, no.
2. **¿De qué se enteraría el negocio antes que nosotros?** Esa es la alarma que
   falta — y significa que hoy el cliente es el monitoreo.

La segunda la contesta quien conoce el negocio, no quien escribe el Terraform.

## Cero recursos, y es la frontera de este andamio

No hay una declaración de recurso en este directorio. El andamio no reparte
infraestructura sin verificar: `plan` contra una cuenta nueva no es barato y
`apply` en producción exige OK, así que repartir Terraform no ensayado haría que
cada proyecto nuevo herede los errores de la última vez que alguien lo escribió.

## dev y producción no son simétricos

dev **no** tiene pendiente de alarmas, y es decisión declarada: una alarma que
suena por un deploy de prueba entrena a ignorarla, y entonces también se ignora la
de producción. El detalle está en el README de `../infra/`.

Lo que sí es igual en los dos: los logs estructurados y el contrato de niveles
—`error` alerta, lo rutinario es `warn`—, porque de eso depende que la
verificación post-deploy entienda lo que lee.
