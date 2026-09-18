// LA COMPUERTA QUE IMPIDE QUE UNA GUIA Y UNA SKILL DIVERJAN EN UN COMANDO QUE COMPARTEN.
//
// Viene de Rigel 1.14.0 (change 2026-09-01-arranque-ejecutable: commits 4565182, d7e5e63 y
// el fin de linea de 6e9574f). Alla compara la guia del arranque contra la skill que la
// implementa. Aca NO hay skill de arranque —la friccion del arranque la deja la herramienta
// misma, ver el change `el-arranque-deja-su-friccion`—, y la herramienta solo se trae porque
// existe un par REAL: `docs/12-upgrade-openspec.md` dice, con todas las letras, «es el mismo
// comando que usan las skills», y `.claude/skills/projects-adoptar/SKILL.md` lo repite.
//
// Y ESE PAR YA HABIA DIVERGIDO. La guia decia que el comando lo usaban DOS skills; medido el
// 2026-09-18, `projects-archive-change` ya no lo usa: lee el pin con `aplicar-deltas.mjs
// --pin-openspec`. Nadie comparaba, asi que nadie lo vio.
//
// Lo que este banco vigila NO es que el comparador diga «coinciden». Es que PUEDA decir que
// no: las formas de que quede mudo son que le falte un lado, que compare cero elementos, y
// que una marca no tenga bloque. Las tres tienen su caso. Y compara EL PAR REAL, porque un
// comparador que solo ve archivos sinteticos es una herramienta, no una compuerta.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { PARES, bloquesMarcados, compararComandos, veredicto } from "../../herramientas/comandos-compartidos.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const HERRAMIENTA = path.join(RAIZ, "herramientas", "comandos-compartidos.mjs");

const bloque = (id, cuerpo) => `<!-- projects:comando ${id} -->\n\`\`\`bash\n${cuerpo}\n\`\`\`\n`;

/** Corre la herramienta como la correria una persona y devuelve `{ codigo, salida }`. */
function correr(...args) {
  try {
    const salida = execFileSync(process.execPath, [HERRAMIENTA, ...args], { encoding: "utf8", cwd: RAIZ });
    return { codigo: 0, salida };
  } catch (e) {
    return { codigo: e.status ?? 1, salida: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

function enTemporal(archivos) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "projects-comandos-"));
  const rutas = {};
  for (const [nombre, contenido] of Object.entries(archivos)) {
    rutas[nombre] = path.join(dir, nombre);
    fs.writeFileSync(rutas[nombre], contenido);
  }
  return rutas;
}

test("dos bloques identicos coinciden, y uno con un caracter cambiado NO", () => {
  const cuerpo = "awk '/^      version_openspec:/{f=1} f && /default:/{print; exit}' .github/workflows/marco-ci.yml";
  const guia = `# guia\n\n${bloque("pin", cuerpo)}`;
  const igual = compararComandos(guia, `# skill\n\n${bloque("pin", cuerpo)}`);
  assert.equal(igual.comparados, 1);
  assert.deepEqual(igual.difieren, []);
  // UN caracter: un espacio al final. "Casi igual" no es una categoria util en un comando.
  const distinto = compararComandos(guia, `# skill\n\n${bloque("pin", `${cuerpo} `)}`);
  assert.equal(distinto.difieren.length, 1, "un espacio al final tiene que contar como diferencia");
});

test("el fin de linea NO es contenido, y un \\r en medio de la linea SI", () => {
  // `.gitattributes` declara `* text=auto eol=lf`: git mismo dice que el CRLF de un checkout
  // de Windows no es contenido. Un rojo por eso ensena a ignorar los rojos (Rigel lo midio
  // el 2026-09-03: los 6 comandos del par real salian «distintos» con los dos bien escritos).
  const cuerpo = "gh api user --jq .login";
  const enLf = `# guia\n\n${bloque("a", cuerpo)}`;
  assert.deepEqual(compararComandos(enLf, enLf.split("\n").join("\r\n")).difieren, []);
  const conCr = `# skill\n\n${bloque("a", cuerpo.replace(" --jq", "\r --jq"))}`;
  assert.equal(compararComandos(enLf, conCr).difieren.length, 1);
});

test("un bloque marcado en un solo lado NO pasa desapercibido, y cada direccion dice lo suyo", () => {
  const r = compararComandos(`${bloque("a", "echo uno")}${bloque("b", "echo dos")}`, `${bloque("a", "echo uno")}${bloque("c", "echo tres")}`);
  assert.deepEqual(r.soloEnGuia, ["b"]);
  assert.deepEqual(r.soloEnSkill, ["c"]);
  const v = veredicto(r, "guia.md", "skill.md");
  assert.equal(v.ok, false);
  assert.equal(v.mensajes.length, 2);
  assert.ok(v.mensajes.every((m) => m.startsWith("::error::")));
});

test("una marca SIN bloque, o con un id repetido, revienta en vez de comparar vacio contra vacio", () => {
  assert.throws(() => bloquesMarcados("<!-- projects:comando huerfano -->\n\ntexto suelto\n"), /no esta seguida de un bloque/);
  assert.throws(() => bloquesMarcados(`${bloque("mismo", "echo a")}${bloque("mismo", "echo b")}`), /repetidos/);
  assert.throws(() => bloquesMarcados("<!-- projects:comando abierto -->\n```bash\necho sin cerrar\n"), /no cierra/);
});

test("con la skill AUSENTE avisa fuerte y no dice que todo coincide", () => {
  const r = enTemporal({ "guia.md": bloque("a", "echo uno") });
  const x = correr(r["guia.md"], path.join(path.dirname(r["guia.md"]), "no-existe.md"));
  assert.equal(x.codigo, 1, "un lado que falta en un par DECLARADO es rojo: el par dejo de existir sin que nadie lo decida");
  assert.match(x.salida, /no existe/);
  assert.doesNotMatch(x.salida, /comandos comparados/);
});

test("ROJO: con los dos archivos presentes y cero bloques marcados", () => {
  // El fail-open propio de este check: sin marcas, «todos coinciden» es cierto por vacuidad.
  const r = enTemporal({ "guia.md": "# guia\n\n```bash\necho hola\n```\n", "skill.md": "# skill\n\n```bash\necho hola\n```\n" });
  const x = correr(r["guia.md"], r["skill.md"]);
  assert.equal(x.codigo, 1, "cero comparados con los dos archivos presentes tiene que ser ROJO");
  assert.match(x.salida, /marcad/i);
});

test("el codigo de salida distingue coincidencia de diferencia, corriendo la herramienta", () => {
  const r = enTemporal({ "guia.md": bloque("x", "pnpm install --frozen-lockfile"), "skill.md": bloque("x", "pnpm install --frozen-lockfile") });
  assert.equal(correr(r["guia.md"], r["skill.md"]).codigo, 0);
  fs.writeFileSync(r["skill.md"], bloque("x", "pnpm install --frozen-lockfile --offline"));
  const rojo = correr(r["guia.md"], r["skill.md"]);
  assert.equal(rojo.codigo, 1);
  assert.match(rojo.salida, /DIFIERE/);
});

test("EL PAR REAL: la guia del pin de OpenSpec y la skill de adopcion no divergen", () => {
  // El caso que convierte la herramienta en compuerta. Sin argumentos, la herramienta
  // compara todos los pares declarados en PARES, que es como la corre una persona.
  assert.ok(PARES.length >= 1, "no hay ningun par declarado: la herramienta no guarda nada");
  for (const { guia, skill } of PARES) {
    assert.ok(fs.existsSync(path.join(RAIZ, guia)), `el par declara ${guia} y no existe`);
    assert.ok(fs.existsSync(path.join(RAIZ, skill)), `el par declara ${skill} y no existe`);
  }
  const { codigo, salida } = correr();
  assert.equal(codigo, 0, `un par real diverge en un comando marcado:\n${salida}`);

  // Y que no sea verde por vacuidad: si alguien desmarca el bloque, esto lo dice.
  for (const { guia, minimo } of PARES) {
    const marcados = bloquesMarcados(fs.readFileSync(path.join(RAIZ, guia), "utf8"));
    assert.ok(marcados instanceof Map);
    assert.ok(marcados.size >= minimo, `${guia} tiene ${marcados.size} bloques marcados y declara ${minimo}`);
  }
});

test("MUERDE sobre el par real: un byte cambiado en la guia se nombra, con los dos archivos", () => {
  // La mutacion se hace sobre una COPIA: el arbol real no se toca.
  const { guia, skill } = PARES[0];
  const texto = fs.readFileSync(path.join(RAIZ, guia), "utf8");
  const [id, cuerpo] = [...bloquesMarcados(texto)][0];
  const r = enTemporal({ "guia.md": texto.replace(cuerpo, `${cuerpo} # cambiado`) });
  const x = correr(r["guia.md"], path.join(RAIZ, skill));
  assert.equal(x.codigo, 1, "un comando cambiado solo en la guia salio verde");
  assert.match(x.salida, new RegExp(`"${id}" DIFIERE`));
  assert.match(x.salida, /SKILL\.md/);
});

test("la guia ya no afirma que el comando lo usa una skill que no lo usa", () => {
  // La divergencia que este par tenia el dia que se trajo la herramienta: docs/12 decia
  // «las skills projects-adoptar y projects-archive-change», y la segunda lee el pin con
  // aplicar-deltas.mjs --pin-openspec.
  const guia = fs.readFileSync(path.join(RAIZ, "docs/12-upgrade-openspec.md"), "utf8");
  assert.doesNotMatch(guia, /mismo comando que usan las skills `projects-adoptar` y\s+`projects-archive-change`/);
  const archive = fs.readFileSync(path.join(RAIZ, ".claude/skills/projects-archive-change/SKILL.md"), "utf8");
  assert.match(archive, /--pin-openspec/, "si archive-change volvio al awk, esta afirmacion hay que revisarla");
});
