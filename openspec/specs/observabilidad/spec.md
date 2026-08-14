# observabilidad

## Purpose

Qué registra el sistema y cómo: el formato JSON del log del servicio (niveles
con semántica de alerta, contexto por campo, identificador de request
propagado), el reporte de errores del navegador de los usuarios, la
correlación entre capas, y el contrato de que un fallo en cualquier parte deja
evidencia consultable en el agregador de logs y AVISA por push al canal de
alertas en vez de esperar a que alguien lea logs. Para un equipo chico, el
objetivo es uno: del aviso a la causa exacta en minutos.

## Requirements

### Requirement: El servicio registra en JSON estructurado

Todo log del servicio SHALL emitirse a stdout como UNA línea de JSON válido
con al menos los campos `nivel` (`info` | `warn` | `error` | `fatal`) y `msg`.
El contexto relevante (método, ruta, status, identificadores) SHALL viajar como
campos propios del JSON —no interpolado dentro del mensaje— para que el
agregador de logs pueda consultarlo por campo. El detalle interno (stack
traces, errores del ORM o del driver) SHALL quedar solo en el log: la respuesta
al cliente no cambia.

#### Scenario: Error no anticipado en una request
- **WHEN** una request lanza un error que llega al manejador central
- **THEN** se emite una línea JSON con `nivel: "error"`, el método, la ruta y el detalle del error — y el cliente sigue recibiendo el mensaje genérico de siempre

#### Scenario: Los niveles conservan la semántica de alerta
- **WHEN** el proceso muere por una condición fatal (arranque inseguro, excepción no capturada)
- **THEN** la línea llevó `nivel: "fatal"` — y `fatal` SHALL reservarse para condiciones que matan el proceso, porque la verificación post-deploy trata una sola ocurrencia de `fatal` como rojo

### Requirement: La verificación post-deploy entiende el formato del log

El filtro de logs de la verificación post-deploy SHALL detectar los niveles de
alerta (`error` y `fatal`) leyendo el CAMPO del JSON, sin falsos positivos por
subcadenas: un mensaje que MENCIONE la palabra "error" no cuenta como error.
Cuando un deploy cambia el formato del log, durante la ventana de transición
—versión saliente drenando junto a la entrante— el filtro SHALL reconocer
ambos formatos.

#### Scenario: Deploy con formato mixto en la ventana de transición
- **WHEN** la verificación observa su ventana y una instancia de la versión saliente emite el formato viejo mientras una de la entrante emite el nuevo
- **THEN** ambas líneas cuentan para el umbral — el cambio de formato no crea un punto ciego

#### Scenario: Mensaje que menciona la palabra error
- **WHEN** una línea de nivel `info` contiene la palabra "error" dentro del mensaje
- **THEN** la verificación no la cuenta como error — el filtro discrimina por campo, no por subcadena

### Requirement: Los errores del navegador dejan evidencia en nuestros logs

Cuando el frontend captura un error global (error de ventana o promesa
rechazada sin capturar), SHALL reportarlo a un endpoint propio del servicio y
el servicio SHALL escribirlo al log JSON con `nivel: "error"` y el campo que
marca su origen como cliente. El reporte SHALL ser fire-and-forget: si el
reporte mismo falla, SHALL NOT romper ni bloquear la app. El payload SHALL
llevar la versión del build y, si hay sesión, el identificador interno del
usuario afectado —en una app interna, saber a QUIÉN le pasó es parte del
soporte— pero SHALL NOT llevar datos personales como correo o nombre: el id se
resuelve internamente. El endpoint SHALL aceptar reportes sin sesión, porque un
error puede ocurrir antes del login.

#### Scenario: Error de JavaScript en el navegador de un usuario
- **WHEN** a una persona se le rompe la app con un error no capturado
- **THEN** además del aviso que ya ve, el error (mensaje, stack, URL, versión del build, id del usuario si había sesión) queda como línea JSON en el agregador de logs — la evidencia ya no vive solo en SU consola

#### Scenario: Reporte sin sesión iniciada
- **WHEN** el error ocurre antes de que la persona inicie sesión
- **THEN** el reporte se acepta igual, sin identificador de usuario y sin exigir autenticación

### Requirement: Los errores son correlacionables entre capas

Cada request al servicio SHALL quedar identificada por el trace id que la capa
de entrada ya adjunta: el servicio SHALL incluirlo en toda línea de log de esa
request y SHALL devolverlo al navegador como cabecera de respuesta. Un fallo de
API capturado por el frontend SHALL conservar ese identificador, y un reporte
de error de cliente causado por ese fallo SHALL incluirlo — de modo que desde
el reporte se llegue a la línea exacta del log del servicio con una sola
consulta.

#### Scenario: Error de cliente causado por un fallo del servicio
- **WHEN** una llamada al servicio falla y desemboca en un error global reportado
- **THEN** el reporte lleva el request id del fallo, y buscarlo en el agregador de logs devuelve la línea de ESA request — dos capas, una historia

#### Scenario: Error de servidor investigado desde el log
- **WHEN** el equipo encuentra una línea de nivel `error` del servicio
- **THEN** la línea trae el request id, método y ruta — el contexto para reproducir no hay que adivinarlo

#### Scenario: El reporte no puede tumbar nada
- **WHEN** el envío del reporte falla (servicio caído, sin red)
- **THEN** la app no lo nota: ni error nuevo, ni bloqueo, ni bucle de reportes

#### Scenario: Abuso del endpoint
- **WHEN** un cliente envía reportes en exceso o un payload sobredimensionado
- **THEN** el servicio los limita (rate limit y tope de tamaño) y responde sin procesarlos — el endpoint no es un vector para llenar los logs

### Requirement: Un aumento de errores del cliente avisa, no espera lectura

Un exceso de errores de cliente en producción SHALL disparar un aviso al canal
de alertas del equipo mediante una alarma sobre la métrica correspondiente. Los
logs que nadie lee SHALL NOT ser el único mecanismo de detección.

#### Scenario: Se rompe el frontend en producción para varios usuarios
- **WHEN** los reportes de error de cliente superan el umbral en la ventana de la alarma
- **THEN** llega un aviso al canal de alertas identificando la alarma — el equipo se entera por push, no porque alguien abrió la consola de logs
