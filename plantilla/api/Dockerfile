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
FROM node:22-slim
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

EXPOSE 3000
CMD ["pnpm", "start"]
