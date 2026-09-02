@echo off
REM ---------------------------------------------------------------------------
REM DOBLE CLIC PARA ARRANCAR, en Windows. El gemelo de arrancar.command.
REM
REM QUE DEFECTO CIERRA: nadie tiene que tipear
REM   node <ruta-al-clon>\herramientas\projects-init.mjs
REM Ese comando tiene un hueco que la persona rellena a mano --la ruta-- y una
REM ruta mal escrita produce un volcado de Node en ingles que ninguna guarda de
REM la herramienta puede atajar, porque la herramienta ni llego a arrancar.
REM
REM %~dp0 es la carpeta de ESTE archivo, con la barra final. Asi no hay ruta que
REM rellenar y no importa desde donde se lo abra.
REM ---------------------------------------------------------------------------
setlocal
cd /d "%~dp0"

echo.
echo   Marco de proyectos
echo   %~dp0
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   PROBLEMA: falta Node, y es lo unico que hace falta para empezar.
  echo.
  echo     Se baja de: https://nodejs.org  ^(elegi la version que dice LTS^)
  echo.
  echo   Cuando lo instales, volve a abrir este mismo archivo.
  echo.
  pause
  exit /b 1
)

echo   Paso 0 - revisando que este todo lo que hace falta
echo   -------------------------------------------------
echo.
node "%~dp0herramientas\projects-doctor.mjs"
if errorlevel 1 (
  echo.
  echo   Arriba dice exactamente que falta y de donde se baja.
  echo   Instala eso y volve a abrir este mismo archivo.
  echo.
  pause
  exit /b 1
)

echo.
echo   Paso 1 - armar tu proyecto
echo   --------------------------
echo.
echo   Te voy a hacer unas preguntas en castellano. Ninguna es de programacion.
echo   Si te arrepentis, cerra esta ventana: no se escribe nada hasta el final.
echo.
pause
echo.

node "%~dp0herramientas\projects-init.mjs" --asistente --solo-valores valores.json
set CODIGO=%errorlevel%

echo.
if not "%CODIGO%"=="0" (
  echo   Se corto en el paso 1. Arriba dice por que.
) else (
  echo   Listo el paso 1. Lo que elegiste quedo en: %~dp0valores.json
  echo   El paso que sigue esta impreso arriba.
)
echo.
pause
exit /b %CODIGO%
