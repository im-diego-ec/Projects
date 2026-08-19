# despliegue-ci

## Purpose

Estrategia de ramas y ambientes del despliegue (trunk-based, `main` como única
rama permanente): `main` despliega a producción tras CI en verde, y el
ambiente de desarrollo se despliega por dos vías: el disparo manual
(`workflow_dispatch`) desde una rama de trabajo, y el tramo de dev de la
promoción de un merge a `main` (secuencia en `verificacion-desplegada`). El
Environment que resguarda los secrets de producción restringe su uso a `main`,
y la trust policy OIDC de cada rol de nube valida el claim `sub` en el formato
que el proveedor de CI realmente emite. La compuerta CI→deploy (el deploy solo
corre con CI en verde) se especifica en la capability `pipeline-entrega`.

## Requirements

### Requirement: La rama determina el ambiente de destino

El repositorio usa una sola rama permanente (`main`, trunk-based); las ramas de
trabajo salen de `main` y vuelven vía pull request. El pipeline SHALL desplegar
a producción únicamente desde `main` (tras CI en verde, vía la compuerta de
`pipeline-entrega`), y al ambiente de desarrollo por dos vías: el disparo
manual sobre una rama de trabajo, y el tramo de dev de la promoción de un merge
de código a `main`, cuya secuencia especifica `verificacion-desplegada`. Ningún
push SHALL disparar un deploy a dev de forma directa: el tramo de dev de la
promoción cuelga del éxito de CI sobre `main`, no del push.

#### Scenario: CI en verde sobre la rama de integración
- **WHEN** el workflow de CI concluye con éxito sobre `main` para un merge que toca alguna ruta fuera de la lista de `verificacion-desplegada`
- **THEN** corren los jobs de despliegue a dev como tramo de dev de la promoción y, solo con dev en verde, los jobs de despliegue a producción; el tramo de dev queda `skipped` únicamente si ese mismo tree ya fue verificado en dev dentro de la ventana de reuso

#### Scenario: Disparo manual sobre una rama de trabajo
- **WHEN** una persona dispara manualmente el workflow de deploy eligiendo una rama distinta de `main`
- **THEN** corren los jobs de dev con el código de esa rama, sin esperar a CI, y los jobs de producción quedan `skipped`

#### Scenario: Push a una rama de trabajo
- **WHEN** se hace push a una rama de trabajo
- **THEN** el workflow de deploy no se dispara (CI corre vía pull request, pero ningún ambiente se despliega)

### Requirement: El Environment de producción solo acepta deployments desde la rama de integración

El Environment del proveedor de CI que resguarda los secrets y credenciales de
producción SHALL tener una política de ramas que restrinja a únicamente `main`
qué ramas pueden resolverlos. El nombre de ese Environment lo fija cada
proyecto; la propiedad —producción es inalcanzable desde cualquier otra
rama— la fija esta capability.

#### Scenario: Un job de producción intenta correr desde otra rama
- **WHEN** un job configurado con el Environment de producción corre en el contexto de una rama distinta de `main`
- **THEN** el proveedor de CI bloquea la resolución de los secrets de ese Environment y el job no puede desplegar

### Requirement: La trust policy OIDC valida el claim que el proveedor de CI realmente emite

El rol de nube que asume el pipeline SHALL validar el claim `sub` del token
OIDC según el uso real del job, no según una suposición. Para producción (jobs
con Environment) el claim identifica al Environment
(`repo:<org>/<repo>:environment:<environment>`). Para el ambiente de desarrollo
(jobs sin Environment) el claim trae la rama del contexto del run
(`repo:<org>/<repo>:ref:refs/heads/<rama>`) — y como el disparo manual a dev
puede correr desde cualquier rama de trabajo, el rol de dev SHALL aceptar el
patrón de ramas correspondiente.

#### Scenario: Job de producción con Environment
- **WHEN** un job de despliegue a producción, configurado con el Environment de producción, solicita credenciales temporales por OIDC
- **THEN** el claim `sub` del token tiene la forma `repo:<org>/<repo>:environment:<environment>` y la trust policy del rol de producción lo acepta

#### Scenario: Disparo de dev desde una rama de trabajo
- **WHEN** un job de despliegue a dev corre por disparo manual sobre una rama de trabajo y solicita credenciales temporales por OIDC
- **THEN** el claim `sub` tiene la forma `repo:<org>/<repo>:ref:refs/heads/<rama>` y la trust policy del rol de dev lo acepta por su patrón de ramas

#### Scenario: Condición de rama mal configurada
- **WHEN** la trust policy espera un claim con forma de rama pero el job corre bajo un Environment (o viceversa)
- **THEN** el proveedor de nube rechaza la obtención de credenciales y el pipeline falla sin desplegar nada

### Requirement: Los despliegues a un ambiente compartido se serializan

Cuando dos o más corridas de despliegue apuntan al mismo ambiente compartido,
SHALL ejecutarse de a una: la corrida que llega mientras otra está en vuelo
SHALL hacer cola, y NO SHALL cancelar ni ser cancelada por la que está en curso.

La distinción que gobierna esta regla es si la interrupción deja estado a medias.
Una corrida de verificación interrumpida no deja nada: cancelar la que un cambio
posterior ya volvió obsoleta es correcto y ahorra recursos. Una corrida de
despliegue interrumpida sí deja estado: el ambiente queda en una combinación que
ninguna de las dos corridas describe, y ambas pueden reportar éxito.

Ese desenlace —dos corridas en verde y el ambiente corrupto— es el que motiva el
requirement: "salió verde" y "fue correcto" dejan de ser lo mismo en cuanto dos
despliegues se solapan.

#### Scenario: Un despliegue llega mientras otro está en curso
- **WHEN** una corrida de despliegue sobre un ambiente compartido comienza mientras otra sigue en vuelo
- **THEN** la nueva espera a que la anterior termine, y ninguna de las dos se cancela

#### Scenario: Ambientes distintos
- **WHEN** dos corridas de despliegue apuntan a ambientes que no comparten estado
- **THEN** pueden ejecutarse en paralelo
