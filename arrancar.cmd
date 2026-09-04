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
REM El 3 es "la persona cancelo", y tiene mensaje propio porque no es ninguno de
REM los otros dos. Antes cancelar salia 0 y este bloque contestaba "Listo el paso
REM 1, lo que elegiste quedo en valores.json": un archivo que la persona acababa
REM de decidir que NO se escribiera.
if "%CODIGO%"=="3" (
  echo   Listo, no se escribio nada. Cuando quieras, volve a abrir este mismo archivo.
  echo.
  pause
  exit /b %CODIGO%
)
if not "%CODIGO%"=="0" (
  echo   Se corto en el paso 1. Arriba dice por que.
  echo.
  pause
  exit /b %CODIGO%
)

REM --- Paso 2: armar el proyecto, ACA MISMO ---------------------------------
REM
REM ESTO NO ESTABA, Y ERA EL AGUJERO MAS GRANDE DEL RECORRIDO. El lanzador
REM terminaba diciendo "el paso que sigue esta impreso arriba", y ese paso era
REM `--destino .` parado en el clon del marco: medido, ese comando dice "el
REM destino ya tiene 16 archivo(s) del andamio" y no arma nada nunca. Lo unico
REM que se ofrecia para destrabarlo era --forzar, que sobre el clon del marco
REM significa pisar el marco con el andamio.
REM
REM El nombre del proyecto no se vuelve a preguntar: se lee del archivo que el
REM asistente acaba de escribir. La carpeta se crea AL LADO del clon.
for /f "usebackq delims=" %%N in (`node -e "try{process.stdout.write(String(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).PROYECTO||''))}catch(e){}" "%~dp0valores.json"`) do set NOMBRE=%%N
if "%NOMBRE%"=="" (
  echo   No pude leer el nombre del proyecto de %~dp0valores.json.
  echo   El archivo esta escrito: podes armar el proyecto a mano con el comando de arriba.
  echo.
  pause
  exit /b 1
)
for %%D in ("%~dp0..") do set PADRE=%%~fD
set DESTINO=%PADRE%\%NOMBRE%

echo.
echo   Paso 2 - armando tu proyecto en %DESTINO%
echo   -------------------------------------------------
echo.
echo   Esto tarda unos minutos y va a escribir mucho en pantalla. Es normal.
echo.

if not exist "%DESTINO%" mkdir "%DESTINO%"
node "%~dp0herramientas\projects-init.mjs" --valores "%~dp0valores.json" --destino "%DESTINO%"
set CODIGO=%errorlevel%

echo.
if "%CODIGO%"=="0" (
  echo   LISTO. Tu proyecto esta en: %DESTINO%
  echo   Arriba dice como verlo andando y que queda por hacer.
) else (
  echo   Se corto en el paso 2. Arriba dice por que, y como se arregla.
  echo   Lo que contestaste quedo guardado: volver a abrir este archivo no te
  echo   va a hacer contestar todo de nuevo.
)
echo.
pause
exit /b %CODIGO%
