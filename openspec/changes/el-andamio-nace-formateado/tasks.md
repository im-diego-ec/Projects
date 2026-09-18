---
artefacto: tasks
dri: Builder 1
aprueba: revision adversarial (desvio del marco: un solo mantenedor, ver AGENTS.md)
estado: en-ejecucion
---

# Tasks — el-andamio-nace-formateado

Todas las mediciones son del 2026-09-17, en el worktree del lote, con prettier 3.9.6
instalado aparte (`npm install prettier@3.9.6` en un temporal) y pnpm 11.23.0 por
corepack. `$S` es el directorio temporal de la sesión.

## 1. El rojo, antes del arreglo

- [x] 1.1 El andamio no pasa su propio formateador. **Evidencia**:
      ```
      $ cd plantilla && npx --yes prettier@3.9.6 --check .
      [warn] .claude/skills/projects-archive-change/SKILL.md
      [warn] .github/proteccion-main.md
      [warn] .projects-valores.json
      [warn] AGENTS.md
      … (docs/accesos.md, docs/adr/README.md, docs/plantillas/change.md, docs/README.md,
         infra/adaptadores.md, README-del-proyecto.md, README.md, sitio/README.md,
         sitio/wrangler.jsonc, web/src/App.test.tsx, web/src/App.tsx)
      [warn] Code style issues found in 15 files.
      exit=1
      ```
      Con 3.9.7 y 3.9.8, los mismos 15.
- [x] 1.2 Lo que nace con `--sin-arranque` tampoco, en ninguna combinación. **Evidencia**:
      script de medición (instancia forma × plataforma × tipo de cuenta × {nombres del
      ejemplo, nombres largos} con `--sin-herramientas --sin-arranque` y corre
      `prettier --check .` en cada destino): `combinaciones en rojo: 24 de 24`. Con el
      andamio ya formateado y la herramienta sin tocar, **seguían 24 de 24**: los
      rojos restantes eran `.projects-valores.json`, `AGENTS.md`, `README.md`,
      `.github/dependabot.yml`, `.github/proteccion-main.md` (sitio) y, con nombres
      largos, `api/src/app.ts` y `web/src/App.test.tsx`.
- [x] 1.3 Con `--sin-herramientas` se mide lo mismo que con herramientas. **Evidencia**:
      una instanciación con `openspec init` (pin 1.9.0) y el render de la
      constitución dio los mismos tres rojos que sin ellos; `openspec/config.yaml`
      pasa y lo demás que generan está en `.prettierignore`.
- [x] 1.4 La versión del formateador dependía del día. **Evidencia**: con
      `"prettier": "^3.9.6"`, `corepack pnpm install --ignore-scripts` en un destino
      resolvió `prettier 3.9.7` (publicada el 2026-09-16; la 3.9.8, del 2026-09-17,
      todavía no la instala pnpm).
- [x] 1.5 Los bancos nuevos, escritos antes de cada arreglo y corridos contra el árbol
      de `HEAD` (copia con `git archive HEAD`). **Evidencia**, `node --test` de cada uno:
      `pruebas/init/el-andamio-nace-formateado.test.mjs` → `# fail 11`;
      `pruebas/andamio/formato-en-los-dos-carriles.test.mjs` → `# fail 2`;
      `pruebas/andamio/prettier-del-andamio.test.mjs` → `# fail 1`;
      `pruebas/andamio/caminos-sin-paquete.test.mjs` → `# fail 4`;
      `pruebas/andamio/lo-que-trae-el-andamio.test.mjs` → `# fail 2`;
      `pruebas/andamio/markdown-que-sobrevive-a-la-sustitucion.test.mjs` → `# fail 1`;
      `pruebas/ci-del-marco/formato-del-andamio.test.mjs` → `# fail 1` (el paso no existía).
- [x] 1.6 El paso nuevo del CI, corrido de verdad contra el árbol viejo. **Evidencia**:
      el script extraído del YAML sobre `HEAD` tal cual →
      `::error::el andamio declara prettier como "^3.9.6", que no es una version exacta`,
      exit 1; con el pin exacto y las dos exportaciones que el paso deriva agregadas →
      `::error::el ANDAMIO no pasa el formateador…` y 24 líneas
      `::error::el repo que nace con … no pasa el formateador sin correrlo`, exit 1.

## 2. El andamio formateado y pinado

- [x] 2.1 `plantilla/package.json:25` → `"prettier": "3.9.6"`. **Evidencia**:
      `pruebas/andamio/prettier-del-andamio.test.mjs` en verde.
- [x] 2.2 Los 15 archivos pasados por `prettier@3.9.6 --write` desde `plantilla/`.
      **Evidencia**: `cd plantilla && prettier --check .` → `All matched files use Prettier
      code style!`; también con 3.9.7 y 3.9.8.
- [x] 2.3 `sitio/wrangler.jsonc` ganó comas finales (el formateador las pone en JSONC):
      medido que wrangler lo sigue leyendo. **Evidencia**: en un destino `sitio`,
      `pnpm --filter sitio run build && cd sitio && pnpm exec wrangler deploy --dry-run` →
      `Read 1 file from the assets directory … --dry-run: exiting now.`, exit 0 (wrangler 4.133.0).
- [x] 2.4 `README-del-proyecto.md`: centinelas como comentarios HTML sueltos, una tabla
      por forma en «Estructura» con carpetas literales, y los dominios de «Ambientes» en
      lista. `AGENTS.md:111`: `web/src/auth.ts` literal; `AGENTS.md:153`: línea en blanco
      antes del centinela de cierre. **Evidencia**:
      `pruebas/andamio/markdown-que-sobrevive-a-la-sustitucion.test.mjs` en verde.
- [x] 2.5 Las líneas del esqueleto con el nombre del proyecto: `plantilla/api/src/app.ts:33-39`
      y `plantilla/web/src/App.test.tsx:48-52` abiertos en varias líneas;
      `plantilla/api/src/server.ts:21` y `:129`, el nombre en una constante.
      **Evidencia**: con `PROYECTO` de 60, de 69 y de 70 caracteres: 0 de 24, 0 de 8 y
      2 de 8 combinaciones en rojo (muestra de una de cada tres); el rojo de 70 es `web/src/App.tsx` en las dos
      aplicaciones, que es la línea que fija `LARGO_DE_NOMBRE_MEDIDO`.
- [x] 2.6 `pruebas/andamio/acoples-del-andamio.test.mjs`: el ancla de la mutación del
      contrato apunta al objeto abierto (`estado: "ok",\n      servicio`). Cambio de ancla,
      no de lo que la mutación prueba. **Evidencia**: `# pass 14`.
- [x] 2.7 `pruebas/andamio/tabla-de-valores.test.mjs`: las anclas de las mutaciones
      toleran el relleno de las celdas que pone el formateador. **Evidencia**: `# pass 7`
      (antes del cambio: «la mutacion … no cambio nada: el ancla que usa se movio»).

## 3. La herramienta escribe con la forma del formateador

- [x] 3.1 `jsonComoElFormateador` y `jsonParaElArchivo` en
      `herramientas/projects-init.mjs:1070` y `:1111`, usados por las cinco podas que
      reescriben JSON, por el asistente (valores, respuestas, desvíos) y por
      `herramientas/projects-puerta.mjs:205-206`. **Evidencia**: contraste contra prettier
      3.9.6 real de los siete casos del banco, del `.claude/settings.json` del andamio y
      de un `package.json` con un arreglo (parser `json-stringify`): `diferencias: 0`.
- [x] 3.2 `coserCosturas` en `herramientas/projects-init.mjs:1013`, aplicado solo cuando
      una poda cambió el texto (`:1774`). **Evidencia**: el banco
      `pruebas/init/el-andamio-nace-formateado.test.mjs` («las podas no dejan costuras»)
      en verde sobre cuatro combinaciones que ejercitan las cuatro podas.
- [x] 3.3 La página de protección de un sitio sin la línea en blanco de más
      (`herramientas/projects-init.mjs:3153`). **Evidencia**: el mismo banco revisa
      `.github/proteccion-main.md` en las combinaciones `sitio`.
- [x] 3.4 `LARGO_DE_NOMBRE_MEDIDO = 60` (`herramientas/projects-init.mjs:2070`), el motivo
      del paso `formateado` reescrito (`:2111-2114`) y el aviso de `--sin-arranque` sin
      «sin formatear» y con el caso del nombre largo (`:4158`). **Evidencia**: la medición
      de la 2.5.
- [x] 3.5 `TIPOS_DE_CUENTA` exportado (`herramientas/projects-init.mjs:1329`) para que el
      paso del CI derive las combinaciones. **Evidencia**: el banco del paso lo usa.
- [x] 3.6 `pruebas/init/el-andamio-nace-formateado.test.mjs` (13 casos) en verde; corre en
      la matriz de `pruebas-init` (tres sistemas operativos y los Node mínimos).

## 4. El CI del marco mide el andamio y cada destino

- [x] 4.1 Paso «El andamio y lo que el init escribe pasan el formateador» en
      `.github/workflows/ci.yml:741`, job `higiene`: versión derivada y exacta,
      instalación fuera del árbol con el registro explícito, `plantilla/` y los destinos
      de cada combinación con nombres cortos y largos. **Evidencia**: el script extraído
      del YAML, corrido de verdad desde el worktree →
      `24 destino(s) nacen formateados sin correr el formateador, con los nombres del
      ejemplo y con nombres de 60 caracteres`, exit 0, 22 s.
- [x] 4.2 Banco del paso con `npm` y `prettier` falsos:
      `pruebas/ci-del-marco/formato-del-andamio.test.mjs` (10 casos: verde, rango, sin
      prettier, versión instalada distinta, andamio sucio, destino largo sucio, init que
      falla, versión escrita a mano). **Evidencia**: `# pass 10`.
- [ ] 4.3 Ver el paso en verde en el CI real de GitHub. **Motivo**: esta sesión no
      empuja ramas; queda para el PR de integración del porte.

## 5. El formato en los dos carriles del andamio

- [x] 5.1 Job `formato` en `plantilla/.github/workflows/ci.yml:147`, sin `if:` ni
      `needs:`, `--frozen-lockfile --ignore-scripts`; `format:check` fuera de
      `build_test`; `ci-ok` con `formato` en `needs` (`:640`) y exigido `success` (`:665`).
      **Evidencia**: `pruebas/andamio/formato-en-los-dos-carriles.test.mjs` `# pass 2`, con
      cuatro mutaciones que muerden.
- [x] 5.2 Que el formato no necesita los scripts de instalación y el lint sí.
      **Evidencia**: en un destino, `pnpm install --frozen-lockfile --ignore-scripts` → 0;
      `pnpm format:check` → 0; `pnpm lint` → 1 (8 errores de tipos sin el cliente de datos).
- [ ] 5.3 El job `formato` en un repo nacido por `personalizar.yml`. **Motivo**: ese camino
      hoy no deja lockfile y `--frozen-lockfile` falla ahí igual que en `build_test`; lo
      cierra el lote 23 del porte (`el-andamio-nace-instalable`), que depende de este.

## 6. Los caminos sin frontend y sin E2E, y la guía del andamio

- [x] 6.1 `// [/FRONT]` después de cada bloque en `plantilla/eslint.config.mjs:140`,
      `:154`, `:172` y `:342` (el de TanStack cierra después del objeto que usa el
      plugin). **Evidencia**: `pruebas/andamio/caminos-sin-paquete.test.mjs` borra los
      bloques mecánicamente, exige que el resultado parsee (`node --check`) y que no nombre
      ningún plugin del front.
- [x] 6.2 Camino «sin frontend» recorrido hasta verde en un temporal: seis lugares
      (`plantilla/README.md:146`). **Evidencia**: destino instanciado, `pnpm install` y
      `pnpm verificar` → 0; con los seis pasos aplicados y `pnpm install` → `pnpm verificar`
      → 0, y `format:check` → 0 sin correr el formateador.
- [x] 6.3 Camino «sin E2E» recorrido hasta verde: seis lugares (`plantilla/README.md:165`).
      **Evidencia**: el paso «Todo paquete declara los scripts de verificacion» extraído
      del `ci.yml` del destino → exit 1 con las `EXCEPCIONES` sin borrar («estas excepciones
      no corresponden a ningun paquete del workspace: e2e:test, e2e:build»), exit 0
      borradas; `pnpm verificar` → 1 en `format:check` sin el `pnpm format` (el arreglo de
      globs de eslint queda corto y el formateador lo junta), 0 con él.
- [x] 6.4 `CON_LIMPIEZA_MANUAL` (`herramientas/projects-init.mjs:1427`) nombra los mismos
      lugares que la guía y remite a ella; el de `PAQUETE_SITIO` deja de mandar a borrar
      una carpeta que ya no viaja. **Evidencia**: `caminos-sin-paquete.test.mjs` compara
      lugar por lugar y la cantidad escrita; `pruebas/init/projects-init.test.mjs` `# pass 90`.
- [x] 6.5 La tabla de valores de la guía: `{{PAQUETES}}` dice que se deriva y no se llena,
      la fila de `{{ORG_MARCO}}` deja de tener una cuarta celda suelta, `{{PROYECTO}}`
      declara el largo medido. **Evidencia**: `tabla-de-valores.test.mjs` en verde.
- [x] 6.6 La sección 4 de la guía reescrita contra el árbol (`plantilla/README.md:450`),
      sin el snippet de `package.json` con versiones viejas ni la afirmación falsa de que
      la raíz no trae agregadores. **Evidencia**:
      `pruebas/andamio/lo-que-trae-el-andamio.test.mjs` `# pass 2`, con tres mutaciones.
- [x] 6.7 `docs/04-arrancar-acompanado.md`: la fila «Paso 8, si algo quedó sin
      formatear» dice la causa que queda. **Evidencia**: `pruebas/docs/*.test.mjs` `# pass 182`.

## 7. Contrato, coherencia y cierre

- [x] 7.1 Delta de `calidad-codigo`: un ADDED y un MODIFIED. Verificado a mano: el título
      del ADDED no existe en `openspec/specs/calidad-codigo/spec.md` ni en otro change
      (`grep -c` → 0); el del MODIFIED existe una sola vez y ningún otro change lo toca;
      el MODIFIED reproduce **los dos** escenarios vigentes palabra por palabra y agrega dos.
      **Evidencia**: `openspec validate el-andamio-nace-formateado --strict` →
      `Change 'el-andamio-nace-formateado' is valid`.
- [x] 7.2 `openspec/cobertura-de-requirements.md`: la fila de «El formato acordado…»
      apunta al job `formato` y al paso nuevo, y las anclas de
      `plantilla/eslint.config.mjs` y `plantilla/.github/workflows/ci.yml` que el cambio
      corrió se reapuntan. **Evidencia**: `pruebas/docs/cobertura-de-requirements.test.mjs`
      `# pass 13`.
- [x] 7.3 Las anclas de `openspec/changes/el-doble-clic-deja-un-repo/tasks.md` a
      `projects-init.mjs` reapuntadas (el archivo creció arriba de ellas).
- [ ] 7.4 Al archivar: agregar la fila del requirement ADDED a
      `openspec/cobertura-de-requirements.md` (sección `calidad-codigo`), con las compuertas
      de la tabla «Cómo se cumple solo» del design. **Motivo**: la página cuenta los
      requirements vivos; el ADDED lo es recién con el archive, que va en la pasada final
      después de la revisión adversarial.
- [ ] 7.5 Revisión adversarial con lentes independientes, registrada en este change
      (desvío D8 del PO: un solo mantenedor). **Motivo**: va en la pasada final del porte.
- [x] 7.6 Fragmento de CHANGELOG en `.porte/changelog/22-el-andamio-nace-formateado.md`.
