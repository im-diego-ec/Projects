// El repositorio de juguete NO depende de la configuracion de quien corre el banco.
//
// DE DONDE VIENE, y tiene fecha. En Rigel, el 2026-09-14, trece de los dieciseis casos de un
// banco que crea tags se pusieron rojos con `fatal: no tag message?` sin que nadie tocara una
// linea de ese banco (commit c38e542 de alla). La causa: `repoDeJuguete` neutralizaba
// `commit.gpgsign` y NO `tag.gpgsign`, asi que en una maquina con firma de tags en la config
// GLOBAL —lo normal en la de quien publica— un `git tag <nombre>` creaba un tag ANOTADO y moria
// pidiendo un mensaje que ningun editor puede dar dentro de un `execFileSync`.
//
// ACA ES LATENTE, Y POR ESO SE CIERRA ANTES DE QUE MUERDA. Hoy ningun banco de Projects llama a
// `git tag` (medido el 2026-09-17 con `grep -rn '"tag"' pruebas actions/*/pruebas`), pero el
// primero que lo haga se pondria rojo SOLO en las maquinas que firman, que son las de quien
// publica, y verde en CI. El mismo commit pasaria o fallaria segun quien lo corriera.
//
// ESTE BANCO NO COMPRUEBA SOLO QUE `git tag` FUNCIONE — eso pasaria igual en una maquina sin la
// config global, que es justo donde el defecto es invisible. Comprueba la PROPIEDAD: que el
// repositorio de juguete declare los apagados en su config LOCAL, mire quien mire. Y despues la
// mitad de comportamiento, forzando la config que dispara el defecto en vez de esperar a
// encontrarla en la maquina.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

import { repoDeJuguete, carpetaTemporal, escribir, git, commit, limpiarTodo } from "./util.mjs";
import { porque } from "../porque.mjs";

test.after(limpiarTodo);

/** El valor LOCAL de una clave, o null si el repo no la declara. */
function local(raiz, clave) {
  try {
    return git(raiz, "config", "--local", "--get", clave).trim();
  } catch {
    // `git config --get` sale 1 cuando la clave no esta: ese es el defecto, no un error del banco.
    return null;
  }
}

test("el repo de juguete apaga la firma de COMMITS en su config local", () => {
  const raiz = repoDeJuguete("aisla-commit-");
  const v = local(raiz, "commit.gpgsign");
  assert.equal(v, "false", porque("el repo de juguete hereda la firma de commits de la maquina", String(v)));
});

test("y la de TAGS, que faltaba", () => {
  const raiz = repoDeJuguete("aisla-tag-");
  const v = local(raiz, "tag.gpgsign");
  assert.equal(v, "false", porque("el repo de juguete hereda la firma de tags de la maquina", String(v)));
});

test("y un tag se crea de verdad aunque la maquina firme los tags", () => {
  // La mitad de comportamiento, con la condicion del defecto FORZADA: GIT_CONFIG_GLOBAL apunta a
  // un archivo con `tag.gpgsign = true`, que es la config de quien publica. Sin el apagado local,
  // `git tag` crea un tag anotado y muere pidiendo mensaje.
  const raiz = repoDeJuguete("aisla-tag-real-");
  escribir(raiz, "a.txt", "x\n");
  commit(raiz, "base");
  const global = escribir(carpetaTemporal("config-global-"), "gitconfig", "[tag]\n\tgpgsign = true\n[commit]\n\tgpgsign = true\n");
  // Por `env` de la llamada y no mutando process.env: el resto del proceso no se entera.
  execFileSync("git", ["-C", raiz, "tag", "v9.9.9"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, GIT_CONFIG_GLOBAL: global },
  });
  const tags = git(raiz, "tag").trim();
  assert.equal(tags, "v9.9.9", porque("el tag no se creo", tags));
});
