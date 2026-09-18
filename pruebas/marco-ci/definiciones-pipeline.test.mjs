// Banco del paso "Definiciones de pipeline validas" de marco-ci.yml.
//
// POR QUE EXISTE. Figuraba como deuda declarada —«descarga e invoca actionlint: sin red no
// se puede ejercitar»— y la frase era falsa en su mitad importante. Lo que necesita red es
// DESCARGAR actionlint, no probar el paso: con un `curl` de mentira que sirve un tarball
// armado aca, el paso corre ENTERO —la descarga, la verificacion del sha256, la extraccion
// y la invocacion— y se lo ve fallar por cada uno de sus motivos. Viene de Rigel (1.11.0,
// change `rojo-primero`, commit e3bf131 de alla), que probo sin red los dos primeros rojos;
// aca se prueban tambien el asset corrupto y el workflow invalido.
//
// LO QUE ESTE BANCO NO PRUEBA, dicho antes de que nadie lea de mas: que actionlint de verdad
// detecte lo que detecta. El binario de aca es de mentira y sale 1 o 0 segun el caso. Lo que
// se prueba es que el PASO haga lo correcto con cada resultado: que un sha256 que no
// coincide, una descarga caida o un hallazgo NO terminen en verde.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { scriptDelPaso } from "./extraer.mjs";
import { carpetaTemporal, correrBash, escribir, limpiarTodo, repoDeJuguete, stubCurlQueFalla } from "./util.mjs";
import { porque } from "../porque.mjs";

const PASO = "Definiciones de pipeline validas";
const VERSION = "1.7.12";
const TAR = `actionlint_${VERSION}_linux_amd64.tar.gz`;

test.after(limpiarTodo);

/**
 * Un "release" de actionlint armado en disco: el tarball con un binario de mentira y su
 * archivo de checksums. `resultado` es el codigo con que el binario sale al validar;
 * `corromper` hace que el checksum publicado no sea el del tarball servido.
 */
function release({ resultado = 0, corromper = false } = {}) {
  const dir = carpetaTemporal("release-actionlint-");
  const bin = join(dir, "actionlint");
  writeFileSync(
    bin,
    [
      "#!/bin/sh",
      'if [ "$1" = "--version" ]; then echo "actionlint de mentira"; exit 0; fi',
      `if [ ${resultado} -ne 0 ]; then echo ".github/workflows/ci.yml:3:5: un hallazgo de juguete [syntax-check]"; fi`,
      `exit ${resultado}`,
      "",
    ].join("\n"),
  );
  chmodSync(bin, 0o755);
  execFileSync("tar", ["-czf", join(dir, TAR), "-C", dir, "actionlint"]);
  const hash = createHash("sha256").update(readFileSync(join(dir, TAR))).digest("hex");
  const publicado = corromper ? "0".repeat(64) : hash;
  writeFileSync(join(dir, "checksums.txt"), `${publicado}  ${TAR}\n${"1".repeat(64)}  otro-asset.tar.gz\n`);
  return dir;
}

/** Un `curl` de mentira que sirve los archivos del release segun la URL que le piden. */
function curlQueSirve(dirRelease) {
  const bin = carpetaTemporal("stub-curl-");
  const ruta = join(bin, "curl");
  writeFileSync(
    ruta,
    [
      "#!/bin/sh",
      'DESTINO=""; URL=""',
      'while [ $# -gt 0 ]; do',
      '  case "$1" in',
      '    -o) DESTINO="$2"; shift 2 ;;',
      '    --max-time|--retry) shift 2 ;;',
      '    -*) shift ;;',
      '    *) URL="$1"; shift ;;',
      "  esac",
      "done",
      'case "${URL}" in',
      `  *checksums.txt) cp "${dirRelease}/checksums.txt" "\${DESTINO}" ;;`,
      `  *.tar.gz) cp "${dirRelease}/${TAR}" "\${DESTINO}" ;;`,
      '  *) echo "curl de mentira: no se que servir para ${URL}" >&2; exit 22 ;;',
      "esac",
      "",
    ].join("\n"),
  );
  chmodSync(ruta, 0o755);
  return bin;
}

function repoConWorkflows() {
  const raiz = repoDeJuguete("pipeline-");
  escribir(raiz, ".github/workflows/ci.yml", "jobs:\n  a:\n    steps:\n      - run: echo hola\n");
  return raiz;
}

const correr = (raiz, env = {}) => correrBash(scriptDelPaso(PASO), { cwd: raiz, env: { VERSION_ACTIONLINT: VERSION, ...env } });

test("ROJO: un repositorio sin .github/workflows no pasa en silencio", () => {
  // La ausencia leida como exito es el modo de fallo que el change persigue: sin esta rama,
  // un repo sin pipeline pasaria la compuerta que verifica el pipeline.
  const raiz = repoDeJuguete("pipeline-sin-workflows-");
  escribir(raiz, "README.md", "# sin pipeline\n");
  const res = correr(raiz);
  assert.equal(res.exit, 1, porque("sin workflows el paso tiene que ser rojo", res.salida));
  assert.match(res.salida, /::error::el repo no tiene \.github\/workflows/);
});

test("ROJO: si la descarga del validador falla, el paso NO se declara conforme", () => {
  // "No se pudo medir" y "no habia nada que arreglar" se ven identicos en un log vacio. La
  // SENA en disco prueba que el paso llego a intentar la descarga: el rojo es el de la
  // descarga y no uno anterior.
  const senal = join(carpetaTemporal("senal-"), "curl.txt");
  const res = correr(repoConWorkflows(), { PATH: `${stubCurlQueFalla(senal)}:${process.env.PATH}` });
  assert.notEqual(res.exit, 0, porque("con la descarga caida el paso NO puede salir 0", res.salida));
  assert.ok(existsSync(senal), porque("el paso tenia que haber intentado la descarga", res.salida));
});

test("ROJO: un asset cuyo sha256 no es el publicado no se ejecuta", () => {
  const res = correr(repoConWorkflows(), { PATH: `${curlQueSirve(release({ corromper: true }))}:${process.env.PATH}` });
  assert.notEqual(res.exit, 0, porque("un binario que no coincide con su checksum no puede validar nada", res.salida));
  assert.doesNotMatch(res.salida, /actionlint de mentira/);
});

test("ROJO: un hallazgo de actionlint pone el paso rojo y el error dice como reproducirlo", () => {
  const res = correr(repoConWorkflows(), { PATH: `${curlQueSirve(release({ resultado: 1 }))}:${process.env.PATH}` });
  assert.equal(res.exit, 1, porque("un workflow invalido tiene que ser rojo", res.salida));
  assert.match(res.salida, /un hallazgo de juguete/);
  // El change el-arranque-no-supone-el-shell-ni-la-cuenta cambio el como: reproducirlo es
  // correr herramientas/actionlint-local.mjs, que baja esa misma version.
  assert.match(res.salida, /::error::las definiciones de pipeline no pasan la validacion.*misma version \(1\.7\.12\).*actionlint-local\.mjs/);
});

test("VERDE de control: el mismo camino con un validador conforme pasa", () => {
  // Sin este caso los tres de arriba podrian estar rojos por el andamiaje del banco —el
  // curl de mentira, el tarball, el checksum— y no por el paso.
  const res = correr(repoConWorkflows(), { PATH: `${curlQueSirve(release({ resultado: 0 }))}:${process.env.PATH}` });
  assert.equal(res.exit, 0, porque("con un validador conforme el paso tiene que pasar", res.salida));
  assert.match(res.salida, /definiciones de pipeline validas/);
});

test("el paso lee la version del validador de la variable, no la escribe adentro", () => {
  // Si el numero estuviera escrito en el script, subirlo seria editar el workflow y el pin
  // dejaria de ser un input auditable.
  const script = scriptDelPaso(PASO);
  assert.match(script, /\$\{VERSION_ACTIONLINT\}/);
  assert.doesNotMatch(script, /actionlint_\d+\.\d+\.\d+_linux/);
});
