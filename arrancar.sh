#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# DOBLE CLIC PARA ARRANCAR. Este archivo existe para que nadie tenga que tipear
# `node <ruta-al-clon>/herramientas/projects-init.mjs`.
#
# QUE DEFECTO CIERRA, medido: ese comando tiene un HUECO que la persona rellena
# a mano --la ruta al clon-- y una ruta mal escrita produce el peor error de
# todo el recorrido: un volcado de Node de cinco lineas, en ingles, que ninguna
# guarda de la herramienta puede atajar porque la herramienta ni siquiera llego a
# arrancar.
#
# TRES SISTEMAS, DOS ARCHIVOS DE SHELL Y UNO DE CMD, y una sola logica.
#
#   arrancar.sh       Linux, y el que tiene la logica. Doble clic en cualquier
#                     gestor de archivos que respete el bit de ejecucion.
#   arrancar.command  macOS. Es la MISMA logica: Finder solo abre `.command` con
#                     doble clic, asi que ese archivo llama a este. Dos lineas.
#   arrancar.cmd      Windows, que no habla bash y necesita su propio archivo.
#
# La logica NO se duplica entre .sh y .command: un dia divergen y la que se pudre
# es la que nadie corre. Hay un banco que exige que el .command siga siendo un
# llamador y no una copia.
#
# NO HACE MAGIA: corre el comprobador de requisitos y despues el asistente, los
# dos que ya existen. Lo unico que agrega es saber donde esta parado.
# ---------------------------------------------------------------------------
set -uo pipefail

# La raiz del clon es donde vive ESTE archivo. Asi no hay ruta que rellenar y no
# importa desde donde se lo abra: Finder abre la terminal en el HOME, no aca.
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$AQUI"

printf '\n'
printf '  Marco de proyectos\n'
printf '  %s\n\n' "$AQUI"

# --- Node primero, porque sin el no corre ni el comprobador ------------------
if ! command -v node >/dev/null 2>&1; then
  printf '  PROBLEMA: falta Node, y es lo unico que hace falta para empezar.\n\n'
  printf '    Se baja de: https://nodejs.org  (elegi la version que dice LTS)\n\n'
  printf '  Cuando lo instales, volve a abrir este mismo archivo.\n\n'
  printf '  (Esta ventana queda abierta para que puedas leer esto.)\n'
  read -r -p '  Apreta Enter para cerrar. ' _ || true
  exit 1
fi

# --- Paso 0: que este todo -------------------------------------------------
printf '  Paso 0 — revisando que este todo lo que hace falta\n'
printf '  ─────────────────────────────────────────────────\n\n'
if ! node "$AQUI/herramientas/projects-doctor.mjs"; then
  printf '\n  Arriba dice exactamente que falta y de donde se baja.\n'
  printf '  Instala eso y volve a abrir este mismo archivo.\n\n'
  read -r -p '  Apreta Enter para cerrar. ' _ || true
  exit 1
fi

# --- Paso 1: elegir como se arma el proyecto --------------------------------
printf '\n'
printf '  Paso 1 — armar tu proyecto\n'
printf '  ──────────────────────────\n\n'
printf '  Te voy a hacer unas preguntas en castellano. Ninguna es de programacion.\n'
printf '  Si te arrepentis, cerra esta ventana: no se escribe nada hasta el final.\n\n'
read -r -p '  Apreta Enter para empezar (o cerra la ventana para salir). ' _ || true
printf '\n'

node "$AQUI/herramientas/projects-init.mjs" --asistente --solo-valores valores.json
CODIGO=$?

printf '\n'
# EL 3 ES "LA PERSONA CANCELO", y tiene mensaje propio porque no es ninguno de los
# otros dos. Antes cancelar salia 0 y este bloque contestaba "Listo el paso 1, lo
# que elegiste quedo en valores.json": un archivo que la persona acababa de decidir
# que NO se escribiera. Decirle "listo" a alguien que acaba de decir "no" es la
# forma mas directa de que deje de creerle a la herramienta.
if [ "$CODIGO" -eq 3 ]; then
  printf '  Listo, no se escribio nada. Cuando quieras, volve a abrir este mismo archivo.\n'
elif [ "$CODIGO" -ne 0 ]; then
  printf '  Se corto en el paso 1. Arriba dice por que.\n'
else
  printf '  Listo el paso 1. Lo que elegiste quedo en: %s/valores.json\n' "$AQUI"
  printf '  El paso que sigue esta impreso arriba.\n'
fi
printf '\n'
read -r -p '  Apreta Enter para cerrar. ' _ || true
exit "$CODIGO"
