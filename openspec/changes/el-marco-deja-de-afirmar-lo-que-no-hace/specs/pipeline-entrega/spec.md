# pipeline-entrega — Delta

## ADDED Requirements

### Requirement: El carril rápido nombra las definiciones de pipeline que exime

Cuando un cambio entra por el carril rápido —se omiten las etapas que verifican lo
que se sirve— y entre sus archivos hay definiciones del propio pipeline (un
workflow, una action propia del repositorio, un script de CI) y no solo la
configuración suelta o la documentación del proveedor de CI, la corrida SHALL
decirlo con un aviso que nombre esos archivos y el arreglo que el consumidor puede
aplicar en su propio árbol. Un cambio a cómo corre la verificación que viaja por el
carril que no la corre sale verde sin haber ejecutado lo que cambió, y hasta hoy lo
hacía en silencio.

Qué rutas exime el carril por defecto NO cambia con este requirement: cambiarlo le
cambia el comportamiento a un consumidor que no lo pidió, y va con la próxima línea
mayor del marco. Lo que este requirement cierra es que el hueco sea mudo.

#### Scenario: Un cambio que solo toca un workflow

- **WHEN** un cambio toca únicamente una definición de pipeline que el carril rápido exime
- **THEN** el carril rápido actúa como hasta ahora y la corrida emite un aviso que nombra el archivo y cómo sacar esas definiciones del carril en la configuración del consumidor

#### Scenario: Un cambio que solo toca configuración suelta o documentación del proveedor de CI

- **WHEN** un cambio del carril rápido toca solo archivos sueltos del directorio de configuración del proveedor de CI o documentación
- **THEN** la corrida no emite ese aviso: esos archivos no definen la verificación

#### Scenario: Un cambio que ya corre la verificación completa

- **WHEN** un cambio toca una definición de pipeline junto con código que el carril rápido no exime
- **THEN** la corrida no emite el aviso, porque las etapas de verificación corren igual
