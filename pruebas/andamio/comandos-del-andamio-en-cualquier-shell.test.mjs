// LOS COMANDOS QUE EL ANDAMIO MANDA CORRER, CORRIDOS.
//
// QUE DEFECTO CIERRA. Dos documentos que viajan a cada proyecto mandaban correr
// comandos que dependian de un shell que nadie declaraba, y un tercero posponia
// reglas sin decir cuando se vuelven a mirar:
//
//   1. `plantilla/AGENTS.md`, «Antes del primer commit», cerraba con
//      `grep -rnE ... --exclude-dir=node_modules --exclude-dir=.git .`: no corre
//      en PowerShell ni en cmd, que son los shells de quien arranca con el doble
//      clic de `arrancar.cmd`. Y la version con `git grep` a secas —la que porto
//      Rigel— tiene su propio hueco: solo mira lo RASTREADO, y esa seccion se
//      llama «antes del primer commit». Medido abajo: sin `--untracked`, un
//      marcador en un archivo sin commitear no aparece, y el comando dice que no
//      queda nada.
//   2. `plantilla/.github/proteccion-main.md` pedia copiar a mano un `<id>` entre
//      tres comandos —en bash eso ni siquiera es un argumento: `<` es una
//      redireccion— y no decia que `--jq '...'` en PowerShell se parte por los
//      espacios (`accepts 1 arg(s), received 3`).
//   3. La tabla de reglas diferidas de ese mismo documento tenia motivo y no
//      condicion: «se enciende cuando haya una segunda persona» no dice como se
//      comprueba, y lo que no se puede comprobar no se vuelve a evaluar nunca.
//      El requirement «Branch protection documentada como paso manual» de
//      gobierno-contribucion ya exigia el disparador concreto; el andamio no lo
//      traia.
//
// ORIGEN: Rigel 1.8.0, commits 0629661 y 7886e79 (primera adopcion, 2026-08-24:
// cuatro de sus siete tropiezos vinieron de dar el shell por sentado).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const AGENTS = path.join(RAIZ, "plantilla", "AGENTS.md");
const PROTECCION = path.join(RAIZ, "plantilla", ".github", "proteccion-main.md");

/** Los bloques cercados de un lenguaje dentro de un tramo de texto. */
function bloques(texto, lenguaje) {
  const out = [];
  const re = new RegExp("^[ \\t]*```" + lenguaje + "[^\\n]*\\n([\\s\\S]*?)^[ \\t]*```", "gm");
  for (const m of texto.matchAll(re)) out.push(m[1].replace(/^[ \t]+/gm, "").trimEnd());
  return out;
}

/** La seccion que empieza en un encabezado y termina en el siguiente del mismo nivel o mayor. */
function seccion(texto, patronDelTitulo) {
  const lineas = texto.split("\n");
  const i = lineas.findIndex((l) => patronDelTitulo.test(l));
  assert.notEqual(i, -1, `no encontre la seccion ${patronDelTitulo}`);
  const nivel = /^(#+)/.exec(lineas[i])[1].length;
  let j = i + 1;
  while (j < lineas.length && !new RegExp(`^#{1,${nivel}} `).test(lineas[j])) j++;
  return lineas.slice(i, j).join("\n");
}

function repoDeJuguete() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "andamio-shell-"));
  const git = (...args) => execFileSync("git", ["-C", dir, ...args], { encoding: "utf8" });
  git("init", "-q", "-b", "main");
  git("config", "user.email", "banco@example.invalid");
  git("config", "user.name", "banco");
  git("config", "commit.gpgsign", "false");
  return { dir, git };
}

/** El comando de verificacion final, leido del documento: `git grep <banderas> "<patron>"`. */
function verificacionFinal() {
  const s = seccion(fs.readFileSync(AGENTS, "utf8"), /Antes del primer commit/);
  const candidatos = bloques(s, "bash").flatMap((b) => b.split("\n")).filter((l) => /grep/.test(l));
  assert.equal(candidatos.length, 1, `esperaba UN comando de verificacion en un bloque cercado de la seccion; hay ${candidatos.length}: ${candidatos.join(" | ")}`);
  const m = /^git grep((?:\s+-[-\w]+)+)\s+"([^"]+)"\s*$/.exec(candidatos[0].trim());
  assert.ok(
    m,
    `la verificacion final no tiene la forma \`git grep <banderas> "<patron>"\`: ${candidatos[0]}. ` +
      "Tiene que ser git grep —viene con git, asi que corre igual en bash, PowerShell y cmd— con el patron " +
      "entre comillas DOBLES, que son las unicas que respetan los tres",
  );
  return { banderas: m[1].trim().split(/\s+/), patron: m[2] };
}

test("la verificacion final del bootstrap es `git grep`, y ve lo que todavia no se commiteo", () => {
  const { banderas, patron } = verificacionFinal();
  const { dir, git } = repoDeJuguete();
  try {
    fs.writeFileSync(path.join(dir, "README.md"), "nada pendiente\n");
    git("add", "README.md");
    git("commit", "-q", "-m", "base");
    // Sin commitear, que es el estado de la seccion «antes del primer commit».
    fs.writeFileSync(path.join(dir, "CODEOWNERS"), "* @{{BUILDER_1}}\n");
    // La sintaxis de GitHub Actions no es un marcador.
    fs.mkdirSync(path.join(dir, ".github", "workflows"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".github", "workflows", "ci.yml"), "x: ${{ github.sha }}\n");
    // Lo ignorado no se mira: node_modules trae dobles llaves de terceros.
    fs.writeFileSync(path.join(dir, ".gitignore"), "node_modules/\n");
    fs.mkdirSync(path.join(dir, "node_modules", "x"), { recursive: true });
    fs.writeFileSync(path.join(dir, "node_modules", "x", "a.md"), "{{AJENO}}\n");

    const r = spawnSync("git", ["-C", dir, "grep", ...banderas, patron], { encoding: "utf8" });
    assert.equal(r.status, 0, `no encontro el marcador sin commitear (salio ${r.status}): el comando dice que no queda nada y queda uno.\n${r.stderr}`);
    assert.match(r.stdout, /CODEOWNERS/);
    assert.doesNotMatch(r.stdout, /ci\.yml/, "confundio `${{ ... }}` de Actions con un marcador");
    assert.doesNotMatch(r.stdout, /node_modules/, "miro lo que .gitignore excluye");

    // POR QUE LLEVA `--untracked`, medido: sin la bandera, el mismo patron sobre
    // el mismo repositorio no ve el archivo sin commitear y sale 1 —que se lee
    // como «no queda nada»—. Si git cambiara eso, este control lo dice.
    const sinBandera = spawnSync("git", ["-C", dir, "grep", ...banderas.filter((b) => b !== "--untracked"), patron], { encoding: "utf8" });
    assert.equal(sinBandera.status, 1, "sin --untracked git grep YA ve lo no rastreado: la bandera sobra y este comentario miente");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("la tabla de reglas diferidas trae la condicion comprobable que reactiva cada una", () => {
  const texto = fs.readFileSync(PROTECCION, "utf8");
  const lineas = texto.split("\n");
  const cabecera = lineas.findIndex((l) => /^\|\s*Regla\s*\|/.test(l) && /Por qué no todavía/.test(l));
  assert.notEqual(cabecera, -1, "no encontre la tabla de reglas diferidas");
  const columnas = lineas[cabecera].split("|").slice(1, -1).map((c) => c.trim());
  const iCondicion = columnas.findIndex((c) => /Condición que la reactiva/.test(c));
  assert.notEqual(
    iCondicion,
    -1,
    "la tabla de diferidas no tiene la columna «Condición que la reactiva». Una postergación con motivo y sin " +
      "condición comprobable no se vuelve a evaluar nunca; el requirement «Branch protection documentada como " +
      "paso manual» exige el disparador concreto",
  );
  let filas = 0;
  for (let i = cabecera + 2; i < lineas.length && lineas[i].startsWith("|"); i++) {
    const celdas = lineas[i].split("|").slice(1, -1).map((c) => c.trim());
    filas++;
    assert.ok(celdas[iCondicion], `la regla diferida «${celdas[0]}» no dice qué condición la reactiva`);
  }
  assert.ok(filas >= 1, "la tabla de diferidas quedo sin filas: este control dejo de mirar lo que cree que mira");
  // Y dice cual se enciende primero, que es la que desactiva en silencio el gate del PO.
  assert.match(texto, /1 aprobación requerida\*\*[^|]*primera/);
});

test("los comandos de contraste encadenan el id solos, y el documento declara el shell", () => {
  const s = seccion(fs.readFileSync(PROTECCION, "utf8"), /^## Contrastar lo escrito/);
  assert.doesNotMatch(s, /<id>/, "sigue pidiendo copiar un `<id>` a mano; en bash `<id>` ni siquiera es un argumento");
  assert.match(s, /shell POSIX/, "no declara que los comandos suponen un shell POSIX");
  assert.match(s, /accepts 1 arg\(s\), received 3/, "no le dice a quien usa PowerShell que error va a ver");

  const [bloque] = bloques(s, "bash");
  assert.ok(bloque, "la seccion de contraste no tiene su bloque bash");
  if (process.platform === "win32") return; // el bloque se declara POSIX: se corre donde hay sh

  // Corrido de verdad con un `gh` de mentira que registra lo que recibe y
  // contesta 4242 a la consulta que busca el ruleset por nombre.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "contraste-"));
  try {
    const bin = path.join(dir, "bin");
    fs.mkdirSync(bin);
    const log = path.join(dir, "gh.log");
    fs.writeFileSync(
      path.join(bin, "gh"),
      ["#!/bin/sh", 'printf "%s\\n" "$*" >> "$LOG"', 'case "$*" in', "  *main-protegida*) echo 4242 ;;", "esac", ""].join("\n"),
      { mode: 0o755 },
    );
    const script = bloque.replaceAll("{{ORG}}", "una-org").replaceAll("{{PROYECTO}}", "un-repo");
    const r = spawnSync("bash", ["-c", script], { encoding: "utf8", env: { ...process.env, LOG: log, PATH: `${bin}${path.delimiter}${process.env.PATH}` } });
    assert.equal(r.status, 0, `el bloque de contraste no corre en bash:\n${r.stderr}`);
    const llamadas = fs.readFileSync(log, "utf8");
    assert.match(llamadas, /repos\/una-org\/un-repo\/rulesets\/4242 --jq \.rules\[\]\.type/, `el id no llego al segundo comando:\n${llamadas}`);
    assert.match(llamadas, /repos\/una-org\/un-repo\/rulesets\/4242 --jq \.bypass_actors/, `el id no llego al tercer comando:\n${llamadas}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
