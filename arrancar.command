#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# DOBLE CLIC PARA ARRANCAR, en macOS.
#
# Finder solo abre con doble clic los archivos con extension `.command`, asi que
# este existe para eso y NADA MAS: llama a `arrancar.sh`, que es donde vive la
# logica y el que usa Linux.
#
# NO SE COPIA LA LOGICA ACA. Dos copias divergen, y la que se pudre es la que
# nadie corre. Hay un banco que exige que este archivo siga siendo un llamador.
# ---------------------------------------------------------------------------
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/arrancar.sh" "$@"
