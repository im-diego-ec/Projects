# `infra/` — ambiente de desarrollo de {{PROYECTO}}

> ## Antes de leer esto: ¿este proyecto usa AWS?
>
> **El marco ya no fija la nube.** Este directorio es el **adaptador `aws`** y llega
> desarrollado porque es el que estaba escrito, no porque sea la primera opción. Lo que el
> marco exige son cuatro capacidades —dónde corre la API, dónde vive la base, cómo se
> resuelven los secretos en el arranque de cada tarea, y cómo se despliega y se verifica lo
> desplegado—; con qué plataforma se cumplen lo decide el proyecto en
> [`adaptadores.md`](adaptadores.md), que trae las cinco opciones admitidas con su plan
> gratuito medido.
>
> **Si la plataforma de este proyecto no es `aws` —o todavía es `ninguna`—, este directorio
> y `../infra-prod/` se borran enteros.** No hay nada que desactivar: el job de Terraform
> del CI mira si las raíces existen y, cuando no, lo dice con un `::notice::` y sale verde.
> Lo único de este directorio que sobrevive es `adaptadores.md`, que se mueve a la raíz.
>
> Y si el objetivo es **coste cero**, leé el adaptador antes de quedarte con éste: el plan
> gratuito de AWS es una promoción con fecha de vencimiento, no un escalón permanente.

Terraform del ambiente **dev**, cuenta `{{CUENTA_DEV}}`, región `{{REGION}}`.

```bash
AWS_PROFILE={{PERFIL_DEV}} terraform init
AWS_PROFILE={{PERFIL_DEV}} terraform plan
```

`init` va a fallar hasta que resuelvas el pendiente 1, y eso es a propósito: el
marcador está dentro del nombre del bucket para que no se pueda crear un state en
un lugar equivocado.

## Qué llegó resuelto y qué no

**Resuelto, porque se deriva de los valores del proyecto** (`main.tf`): la `key`
del state, la región, el proveedor con sus etiquetas por defecto, la referencia a
la base compartida y la referencia a la red. No hay que tocar nada de eso.

**Sin resolver, en `pendientes.tf`**: seis. Cada uno dice qué falta, **con qué
criterio se decide** y qué garantía del marco queda sin cumplir si no se hace.

⚠️ **Todavía no hay compuerta** —una comprobación que bloquea el merge—: el pipeline
**no** se pone rojo por estos
pendientes. Es a propósito —un token que cuenta desde el día uno pondría rojo a un
repositorio recién nacido por decisiones que todavía no puede tomar— y la
compuerta llega con el change —la propuesta escrita— del despliegue. Hasta entonces se
revisa a mano:
`grep -rn PENDIENTE-INFRA infra infra-prod`.

Dos de los seis —el bucket del state y el identificador del cluster— se parecen
más a un **dato del área** que a una decisión de este proyecto. Están como
pendiente porque el andamio hoy no los sustituye. Si te toca resolverlos a mano,
anotalo: el arreglo de fondo es que pasen a ser valores y estos dos pendientes
desaparezcan.

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

**Tres cosas se ponen rojas, no dos.** El binario de `terraform` sale hoy de la
imagen del runner —al paso todavía le falta un `hashicorp/setup-terraform` pinado
por SHA—, así que _no encontrarlo_ es el tercer fallo y corre con **la misma
ventana**: avisa hasta el 2026-09-30 y después detiene el CI. Es a propósito: si
la ausencia del binario avisara para siempre, este paso pasaría en verde sin
haber verificado nada el día que la imagen del runner dejara de traerlo, y «no
pude verificar» se leería como «verifiqué y está bien». Mientras tanto, un
`::warning::` en el resumen de la corrida dice cuál de los tres pasó.

## Cero recursos, y es la frontera de este andamio

No hay una sola declaración de recurso en este directorio. Lo que hay es la
infraestructura que **ya existe** referenciada, y los pendientes que describen lo
que falta crear. El andamio no reparte infraestructura sin verificar: hacerlo
significaría que cada proyecto nuevo hereda los errores de la última vez que
alguien la escribió.

## Por qué dev NO tiene pendiente de alarmas

**Es decisión tomada, no un hueco.** Las alarmas que importan son las de
producción, y dev es un ambiente compartido donde los despliegues de prueba son
constantes: una alarma que suena por un deploy de prueba entrena a ignorarla, y
entonces también se ignora la de producción.

Lo que dev **sí** tiene es la misma exigencia de logs estructurados y el mismo
contrato de niveles que producción, porque de eso depende que la verificación
post-deploy entienda lo que lee.

El pendiente de alarmas vive en `../infra-prod/pendientes.tf`.
