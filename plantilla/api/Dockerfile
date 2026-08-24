# Imagen del API. SE CONSTRUYE DESDE LA RAIZ DEL MONOREPO, no desde api/:
#
#   docker build -f api/Dockerfile -t {{PROYECTO}}-api .
#
# Por que la raiz: en un workspace de pnpm el UNICO lockfile valido es el de la
# raiz (uno dentro de un paquete hace que local y CI resuelvan distinto, y el
# .gitignore lo prohibe). Con contexto api/ no habria lockfile que copiar y el
# install dejaria de ser reproducible. La version anterior de este archivo
# copiaba un pnpm-workspace.yaml SUELTO dentro de api/ para tapar eso; el
# workspace se declara una sola vez, arriba, y ese archivo ya no existe.
#
# LA ARQUITECTURA SE DECLARA, no se hereda de quien construye. Sin --platform,
# la imagen sale con la arquitectura de la maquina del build, y el comando de
# arriba lo corre una persona en su maquina: en un Mac con Apple Silicon eso es
# linux/arm64. Corre perfecto en local y el dia del primer despliegue la tarea
# muere al arrancar con "exec format error" — un mensaje que no nombra la
# arquitectura y que se termina buscando en el codigo, no aca.
#
# ESTE VALOR Y EL DE LA DEFINICION DE TAREA SON UNO SOLO: si el dimensionamiento
# del computo (PENDIENTE-INFRA 4, en infra/pendientes.tf) declara un
# runtime_platform ARM64, esta linea pasa a linux/arm64 EN EL MISMO COMMIT.
FROM --platform=linux/amd64 node:22-slim
WORKDIR /app

# openssl: el motor de consultas de Prisma lo usa para detectar libssl; sin el
# paquete cae a un default con warning. ca-certificates: trust store del
# sistema, necesario para verificar el certificado TLS de la base.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Defensa en profundidad: el control real del bypass de auth es el fail-closed
# del codigo (ver src/middleware/auth.ts). ALLOW_DEV_AUTH se deja SIN setear a
# proposito, para que en produccion el bypass no exista.
ENV NODE_ENV=production

# COREPACK_HOME explicito, y FUERA de $HOME a proposito. Corepack baja el pnpm
# que fija "packageManager" del package.json de la raiz la primera vez que se lo
# invoca —o sea en el install de mas abajo, que corre como root— y lo cachea en
# $HOME/.cache/node/corepack. El proceso NO corre como root (ver el USER del
# final): con el default, el cache quedaria en /root/.cache, el arranque no lo
# veria y corepack intentaria bajar pnpm otra vez, desde una tarea que no tiene
# salida al registry. Un directorio comun, chowneado junto con /app, deja el
# pnpm ya resuelto para el usuario que arranca.
ENV COREPACK_HOME=/opt/corepack
RUN corepack enable

# Se copia el arbol entero y despues se instala SOLO este paquete. La version
# "copiar manifiestos primero para cachear dependencias" es mas rapida, pero
# necesita que TODOS los manifiestos del workspace esten presentes o el install
# con lockfile congelado se queja de estar fuera de sincronia — y ese arreglo
# obligaria a este Dockerfile a nombrar paquetes que no son suyos.
#
# DEPENDE DE UN .dockerignore EN LA RAIZ que excluya node_modules, coverage,
# dist y .git. Sin el, este COPY se trae los node_modules de la maquina que
# construye: la imagen engorda cientos de megas y, peor, los binarios nativos
# resueltos para otra plataforma le ganan a los que instala el paso siguiente.
COPY . .
# --prod=false: NODE_ENV=production haria saltear las devDependencies, y el
# arranque las necesita (tsx) igual que la generacion del cliente (prisma).
RUN pnpm install --frozen-lockfile --prod=false --filter {{PAQUETE_API}}...

WORKDIR /app/api
# DATABASE_URL de relleno: prisma.config.ts exige la variable para resolver la
# config, pero "generate" no se conecta a ninguna base. La URL real la inyecta
# la definicion de tarea en tiempo de ejecucion.
RUN DATABASE_URL="postgresql://relleno:relleno@localhost:5432/relleno" \
  pnpm exec prisma generate

# NO ROOT. La imagen base trae el usuario `node` (uid 1000) sin usar, y hasta
# aca todo corrio como uid 0: sin estas dos lineas el proceso que atiende HTTP
# en produccion tambien lo hace, y en ese mismo contexto viven el CLI de Prisma
# —que sabe migrar la base— y el compilador de TypeScript. El resto del andamio
# es cuidadoso justo con esto (el .dockerignore documenta que un .env dentro de
# una imagen es un secreto publicado; auth.ts es fail-closed de verdad), asi que
# la ausencia se leia como olvido y no como criterio.
#
# El chown va DESPUES del install y del generate porque los dos escriben en
# /app como root; /opt/corepack entra por lo explicado arriba. El puerto es
# 3000, arriba de 1024, asi que no hace falta ningun privilegio para escucharlo.
#
# Sacar el toolchain de la imagen es otro cambio y mas caro —exige que el API
# compile de verdad; hoy `build` es "{{GENERAR_CLIENTE_DATOS}} && tsc --noEmit"—
# y no bloquea a este.
RUN chown -R node:node /app /opt/corepack
USER node

EXPOSE 3000
CMD ["pnpm", "start"]

# COMO SE COMPRUEBA, Y POR QUE NO ESTA COMPROBADO TODAVIA. El cambio que escribio
# el --platform, el COREPACK_HOME y el USER de este archivo no tenia docker ni
# salida a red en la maquina: NINGUNO DE LOS TRES SE VIO CORRER. Queda el
# comando exacto que los cierra, desde la RAIZ del repo, con lo que cada uno
# tiene que contestar:
#
#   docker build -f api/Dockerfile -t {{PROYECTO}}-api .
#   docker run --rm {{PROYECTO}}-api id -un                        # node
#   docker run --rm {{PROYECTO}}-api pnpm --version                # 9.15.0
#   docker image inspect {{PROYECTO}}-api | grep '"Architecture"'  # amd64
#
# Si el segundo tarda o falla por red, el que quedo mal es COREPACK_HOME: el
# pnpm que cacheo el build quedo en un $HOME que el usuario `node` no lee.
