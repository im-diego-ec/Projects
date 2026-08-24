import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

import {
  REQUERIDOS,
  CON_LIMPIEZA_MANUAL,
  MARCADOR,
  NO_SE_COPIA,
  NODE_MINIMO,
  NODE_RECOMENDADO,
  compararVersiones,
  revisarNodo,
  seExcluyeDelCopiado,
  derivar,
  validarValores,
  archivosDelAndamio,
  archivosDelAndamioAMano,
  faltantesDeCopia,
  paquetesDelAndamio,
  problemasDePaquetes,
  pinValido,
  sustituir,
  instanciar,
  marcadoresQueSobreviven,
  pinOpenspecDe,
} from "../../herramientas/projects-init.mjs";

// ---------------------------------------------------------------------------
// EL BANCO DE `projects init`.
//
// La herramienta reemplaza ~30 actos manuales, asi que su modo de falla peligroso
// no es "explota": es "escribe un repo a medias y dice que salio bien". Cada caso
// de aca prueba una forma de FALLAR CERRADO, y el caso feliz se verifica con un
// escaneo INDEPENDIENTE del arbol escrito, no con lo que la herramienta afirma de
// si misma.
// ---------------------------------------------------------------------------

const RAIZ = path.resolve(import.meta.dirname, "..", "..");
const ANDAMIO = path.join(RAIZ, "plantilla");

const VALORES_OK = {
  PROYECTO: "people-agenda",
  ORG: "Ejemplo-Org",
  PAQUETE_API: "api",
  PAQUETE_WEB: "web",
  PAQUETE_E2E: "e2e",
  GENERAR_CLIENTE_DATOS: "prisma generate",
  EQUIPO_BUILDERS: "builders",
  EQUIPO_PO: "po",
  BUILDER_1: "builder-uno",
  BUILDER_2: "builder-dos",
  PO: "el-po",
  CUENTA_DEV: "111111111111",
  CUENTA_PROD: "222222222222",
  REGION: "us-east-1",
  PERFIL_DEV: "perfil-dev",
  PERFIL_PROD: "perfil-prod",
  PREFIJO_RECURSOS: "agenda",
  DOMINIO_DEV: "agenda-dev.ejemplo.com",
  DOMINIO_PROD: "agenda.ejemplo.com",
  CANAL_ALERTAS: "#alertas-prod",
  ID_MCP_SLACK: "id-de-slack",
};

const HERRAMIENTA = path.join(RAIZ, "herramientas/projects-init.mjs");

function tmp(nombre) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `projects-init-${nombre}-`));
  return d;
}

/** Corre la CLI de verdad y devuelve codigo + salida junta. Un exit 0 tambien
 *  pasa por aca: el banco tiene que poder afirmar el camino feliz, no solo los
 *  rojos. */
function correr(...args) {
  try {
    const salida = execFileSync(process.execPath, [HERRAMIENTA, ...args], { encoding: "utf8", stdio: "pipe" });
    return { codigo: 0, salida };
  } catch (e) {
    return { codigo: e.status ?? -1, salida: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

/** El archivo de valores va FUERA del destino: adentro contaria como contenido
 *  previo y ensuciaria las aserciones sobre "el destino quedo intacto". */
function valoresEn(destino, valores = VALORES_OK) {
  const ruta = path.join(destino, "..", `vals-${path.basename(destino)}.json`);
  fs.writeFileSync(ruta, JSON.stringify(valores), "utf8");
  return ruta;
}

/** Un andamio de mentira, para ejercer los recorridos sin depender de plantilla/.
 *  Las claves son rutas con "/" y se traducen al separador del SO al escribirlas:
 *  el banco corre en los tres. */
function andamioFalso(nombre, archivos) {
  const raiz = tmp(nombre);
  for (const [rel, contenido] of Object.entries(archivos)) {
    const abs = path.join(raiz, ...rel.split("/"));
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, contenido);
  }
  return raiz;
}

// ══════════════════ El caso feliz, verificado por afuera ══════════════════

test("instancia el andamio y NINGUN marcador sobrevive (escaneo independiente)", () => {
  const destino = tmp("feliz");
  const r = instanciar({ raizAndamio: ANDAMIO, destino, valores: derivar(VALORES_OK) });

  assert.equal(r.faltantes.length, 0, `el andamio usa marcadores no declarados: ${r.faltantes.join(", ")}`);
  assert.ok(r.total > 50, `solo ${r.total} sustituciones: el andamio tiene bastante mas`);

  // El escaneo NO usa el resultado de la herramienta: relee el arbol escrito.
  const propios = marcadoresQueSobreviven(destino);
  assert.deepEqual(
    propios.map((s) => `${s.archivo}:${s.linea} ${s.marcador}`),
    [],
    "quedaron marcadores en el repo nuevo: el CI del marco lo pondria en rojo en el primer PR",
  );
});

test("el README del andamio NO se copia: es la guia del bootstrap, no el README del proyecto", () => {
  const destino = tmp("readme");
  instanciar({ raizAndamio: ANDAMIO, destino, valores: derivar(VALORES_OK) });
  assert.equal(fs.existsSync(path.join(destino, "README.md")), false);
  // Y es el unico excluido: si manana se excluye otro sin pensarlo, esto lo dice.
  assert.deepEqual([...NO_SE_COPIA], ["README.md"]);
});

test("viajan los dotfiles, que es donde falla el copiado a mano", () => {
  const destino = tmp("dotfiles");
  instanciar({ raizAndamio: ANDAMIO, destino, valores: derivar(VALORES_OK) });
  // El `cp -r` sin el `/.` final y el robocopy sin `/E` los dejan atras: son
  // exactamente los archivos que hacen que el marco se cumpla solo.
  for (const r of [
    ".claude/settings.json",
    ".github/workflows/ci.yml",
    ".github/dependabot.yml",
    ".github/CODEOWNERS",
    ".gitignore",
    ".prettierrc",
    ".projects-valores.json",
    ".projects-desvios.json",
  ]) {
    assert.ok(fs.existsSync(path.join(destino, r)), `falta ${r}`);
  }
});

test("los valores llegan al archivo que la constitucion lee", () => {
  const destino = tmp("valores");
  instanciar({ raizAndamio: ANDAMIO, destino, valores: derivar(VALORES_OK) });
  const v = JSON.parse(fs.readFileSync(path.join(destino, ".projects-valores.json"), "utf8"));
  assert.equal(v.PROYECTO, "people-agenda");
  assert.equal(v.ORG, "Ejemplo-Org");
  assert.equal(v.BUILDER_1, "builder-uno");
});

// ══════════════════ El control de que este banco no es un no-op ══════════════════

test("el andamio tiene marcadores: si no, todo lo de arriba pasa vacuamente", () => {
  // El regex se INSTANCIA por archivo. `MARCADOR` se exporta con la bandera /g y
  // `RegExp.prototype.test` sobre un /g avanza `lastIndex` y lo conserva entre
  // llamadas: una de cada dos lecturas arrancaba desde el medio del archivo
  // anterior. Medido lado a lado sobre el mismo listado: 31 archivos con el
  // regex compartido, 37 con uno nuevo por archivo. El unico control cuyo
  // trabajo es que este banco no afirme `true == true` se estaba salteando 6, y
  // el umbral de 10 lo absorbia sin que se viera. El resto de la herramienta no
  // tiene el defecto porque usa .replace() y .matchAll(), que no dejan estado.
  const conMarcadores = archivosDelAndamio(ANDAMIO).filter((rel) =>
    new RegExp(MARCADOR.source, "g").test(fs.readFileSync(path.join(ANDAMIO, rel), "utf8")),
  );
  assert.ok(
    conMarcadores.length >= 30,
    `solo ${conMarcadores.length} archivo(s) del andamio tienen marcadores (medido: 37). Si el andamio dejo de usarlos, este banco no prueba nada`,
  );
});

// ══════════════════ Fallar cerrado ══════════════════

test("un valor que falta es error, con el nombre, y no se escribe nada", () => {
  const sinPO = { ...VALORES_OK };
  delete sinPO.PO;
  const { problemas, valores } = validarValores(sinPO);
  assert.equal(valores, null);
  assert.ok(problemas.some((p) => p.includes("falta PO")), problemas.join(" | "));
});

test("un valor que sigue siendo un marcador es error: el archivo del andamio nace asi", () => {
  const { problemas, valores } = validarValores({ ...VALORES_OK, PROYECTO: "{{PROYECTO}}" });
  assert.equal(valores, null);
  assert.ok(problemas.some((p) => p.includes("PROYECTO sigue siendo un marcador")), problemas.join(" | "));
});

test("una cuenta de AWS que no son 12 digitos es error", () => {
  const { problemas } = validarValores({ ...VALORES_OK, CUENTA_PROD: "22222" });
  assert.ok(problemas.some((p) => p.includes("CUENTA_PROD no son 12 digitos")), problemas.join(" | "));
});

test("un em dash en un nombre que viaja a AWS es error (regla del area)", () => {
  const { problemas } = validarValores({ ...VALORES_OK, PREFIJO_RECURSOS: "agenda—prod" });
  assert.ok(problemas.some((p) => p.includes("em dash")), problemas.join(" | "));
});

test("un valor vacio NO cuenta como declarado", () => {
  const { problemas } = validarValores({ ...VALORES_OK, CANAL_ALERTAS: "" });
  assert.ok(problemas.some((p) => p.includes("falta CANAL_ALERTAS")), problemas.join(" | "));
});

test("cero sustituciones es ERROR y no un arbol limpio", () => {
  // Un andamio sin marcadores: si la herramienta lo declarara exito, un patron
  // que deja de matchear pasaria en verde y el repo nuevo nace lleno de llaves.
  const falso = tmp("sin-marcadores");
  fs.writeFileSync(path.join(falso, "a.md"), "sin marcadores acá\n", "utf8");
  const destino = tmp("sin-marcadores-destino");
  const r = instanciar({ raizAndamio: falso, destino, valores: derivar(VALORES_OK) });
  assert.equal(r.total, 0, "el fixture no deberia tener marcadores");
  // La decision de que 0 es error vive en main(); acá se fija el hecho del que
  // depende, para que un refactor que lo cambie tenga que pasar por esta linea.
});

test("un marcador del andamio que REQUERIDOS no declara sale por nombre", () => {
  const falso = tmp("marcador-nuevo");
  fs.writeFileSync(path.join(falso, "a.md"), "esto usa {{MARCADOR_INVENTADO}}\n", "utf8");
  const destino = tmp("marcador-nuevo-destino");
  const r = instanciar({ raizAndamio: falso, destino, valores: derivar(VALORES_OK) });
  assert.deepEqual(r.faltantes, ["MARCADOR_INVENTADO"]);
});

// ══════════════════ Lo derivado y lo declarado ══════════════════

test("PAQUETES se DERIVA de los tres paquetes, no se pide aparte", () => {
  assert.equal(REQUERIDOS.includes("PAQUETES"), false, "PAQUETES no se pide: se deriva");
  assert.equal(derivar(VALORES_OK).PAQUETES, "web, api, e2e");
});

test("un PAQUETES explicito manda sobre el derivado", () => {
  assert.equal(derivar({ ...VALORES_OK, PAQUETES: "solo-api" }).PAQUETES, "solo-api");
});

test("REQUERIDOS cubre TODOS los marcadores que el andamio usa de verdad", () => {
  const usados = new Set();
  for (const rel of archivosDelAndamio(ANDAMIO)) {
    const t = fs.readFileSync(path.join(ANDAMIO, rel), "utf8");
    for (const m of t.matchAll(MARCADOR)) usados.add(m[1]);
  }
  const declarados = new Set([...REQUERIDOS, "PAQUETES"]);
  const sinDeclarar = [...usados].filter((u) => !declarados.has(u)).sort();
  assert.deepEqual(
    sinDeclarar,
    [],
    "el andamio usa marcadores que la herramienta no pide. Se agregan a REQUERIDOS y a la tabla de plantilla/README.md en el MISMO cambio",
  );
});

test("los tres marcadores con limpieza manual siguen nombrados en la salida", () => {
  // Si alguien automatiza uno de estos borrados, tiene que sacarlo de acá; y si
  // aparece un cuarto camino "si no existe", esta lista es donde se declara.
  assert.deepEqual(Object.keys(CON_LIMPIEZA_MANUAL).sort(), [
    "GENERAR_CLIENTE_DATOS",
    "PAQUETE_E2E",
    "PAQUETE_WEB",
  ]);
});

// ══════════════════ El pin de OpenSpec: una sola declaracion ══════════════════

test("el pin de OpenSpec se LEE del default del reusable, no se repite", () => {
  const marcoCi = fs.readFileSync(path.join(RAIZ, ".github/workflows/marco-ci.yml"), "utf8");
  const pin = pinOpenspecDe(marcoCi);
  assert.match(pin ?? "", /^\d+\.\d+\.\d+$/, "no pude leer el pin del default de version_openspec");
  // Y es el mismo que el andamio documenta: dos declaraciones que divergen es el
  // defecto que este marco ya cazo dos veces.
  const readmeAndamio = fs.readFileSync(path.join(ANDAMIO, "README.md"), "utf8");
  assert.ok(
    readmeAndamio.includes(`openspec@${pin}`),
    `el andamio documenta otro pin que el reusable: reusable=${pin}`,
  );
});

// ══════════════════ El piso de Node ══════════════════
//
// Esta herramienta es la unica pieza del marco que corre en la maquina de una
// persona, y ahi nadie pina la version de Node. Correr la CLI NO prueba el
// guard: el banco corre en un Node que ya pasa. Por eso el chequeo esta separado
// y se ejerce con versiones simuladas.

test("un Node por debajo del piso es ERROR, y el mensaje nombra las DOS versiones", () => {
  for (const vieja of ["16.20.2", "18.16.1", "14.0.0"]) {
    const r = revisarNodo(vieja);
    assert.equal(r.ok, false, `${vieja} tendria que quedar por debajo del piso`);
    assert.ok(r.error.includes(vieja), `el mensaje no dice que version hay: ${r.error}`);
    assert.ok(r.error.includes(NODE_MINIMO), `el mensaje no dice que version hace falta: ${r.error}`);
    assert.match(r.error, /^::error::/);
  }
});

test("en el piso exacto la corrida SIGUE: el guard no se pasa de estricto", () => {
  const r = revisarNodo(NODE_MINIMO);
  assert.equal(r.ok, true, `${NODE_MINIMO} es el piso: tiene que pasar`);
});

test("el piso recomendado es AVISO, no rojo: un rojo nuevo no se le estrena a nadie", () => {
  // 18.17 anda de verdad porque las dos llamadas conservan el `?? e.path`. Subir
  // el bloqueo a 20.12 seria estrenarle un rojo a alguien a quien hoy le
  // funciona; el marco lo hace al reves: primero avisa.
  const enElMedio = revisarNodo("18.20.4");
  assert.equal(enElMedio.ok, true);
  assert.match(enElMedio.aviso ?? "", /^::warning::/);
  assert.ok(enElMedio.aviso.includes(NODE_RECOMENDADO), enElMedio.aviso);

  const arriba = revisarNodo("22.19.0");
  assert.equal(arriba.ok, true);
  assert.equal(arriba.aviso, null, "por encima del recomendado no se avisa nada");
});

test("el Node que corre este banco pasa su propio piso", () => {
  const r = revisarNodo();
  assert.equal(r.ok, true, r.error ?? "");
});

test("compararVersiones ordena por numero, no por texto", () => {
  // "9" > "10" si se comparan como cadenas: es el error clasico de un piso de
  // version escrito a las apuradas.
  assert.equal(compararVersiones("20.12.0", "9.99.99"), 1);
  assert.equal(compararVersiones("18.9.0", "18.17.0"), -1);
  assert.equal(compararVersiones("18.17.0", "18.17.0"), 0);
  assert.equal(compararVersiones("22.0.0-nightly20240101", "22.0.0"), 0, "lo que sigue al parche no decide nada");
  assert.equal(compararVersiones("20", "20.0.0"), 0);
});

// ══════════════════ La copia esta COMPLETA, medida dos veces ══════════════════

test("las dos mediciones del andamio coinciden archivo por archivo", () => {
  // Si algun dia coinciden porque las dos usan la MISMA llamada, la defensa
  // contra la copia parcial deja de existir: archivosDelAndamio recorre con
  // `readdirSync(recursive)` y archivosDelAndamioAMano con una pila propia.
  const conApi = archivosDelAndamio(ANDAMIO);
  const aMano = archivosDelAndamioAMano(ANDAMIO);
  assert.deepEqual(aMano, conApi);
  assert.ok(conApi.length > 50, `solo ${conApi.length} archivos: el andamio tiene mas`);
});

test("el recorrido a mano baja mas de un nivel (si no, mediria otra cosa)", () => {
  const raiz = andamioFalso("hondo", {
    "raiz.txt": "x",
    "a/b/c/hondo.txt": "y",
    "a/otro.txt": "z",
  });
  assert.deepEqual(archivosDelAndamioAMano(raiz), ["a/b/c/hondo.txt", "a/otro.txt", "raiz.txt"]);
});

test("faltantesDeCopia nombra lo que no llego al destino", () => {
  assert.deepEqual(faltantesDeCopia(["a.md"], ["a.md", "api/package.json"]), ["api/package.json"]);
  assert.deepEqual(faltantesDeCopia(["a.md", "api/package.json"], ["a.md", "api/package.json"]), []);
  // Una copia parcial como la que deja un Node por debajo del piso: 2 de 4.
  const escritos = ["a.md", "b.md"];
  const esperados = ["a.md", "b.md", ".github/workflows/ci.yml", ".github/CODEOWNERS"];
  assert.deepEqual(faltantesDeCopia(escritos, esperados), [".github/workflows/ci.yml", ".github/CODEOWNERS"]);
});

// ══════════════════ El pin de OpenSpec, que entra a un proceso hijo ══════════════════

test("el pin de OpenSpec solo acepta una version EXACTA", () => {
  for (const bueno of ["0.9.4", "1.0.0", "10.20.30"]) {
    assert.equal(pinValido(bueno), true, `${bueno} tendria que valer`);
  }
  for (const malo of [
    "1.0.0 & echo INYECTADO", // el vector medido: en Windows esa invocacion va por cmd.exe
    "1.0.0; id",
    "1.0.0 | id",
    "$(id)",
    "^1.0.0",
    "latest",
    "1.0",
    "1.0.0\n",
    "",
    undefined,
    null,
    123,
  ]) {
    assert.equal(pinValido(malo), false, `${JSON.stringify(malo)} NO tendria que valer`);
  }
});

test("el pin que se lee del reusable pasa la misma regla que el de la bandera", () => {
  const marcoCi = fs.readFileSync(path.join(RAIZ, ".github/workflows/marco-ci.yml"), "utf8");
  assert.equal(pinValido(pinOpenspecDe(marcoCi)), true, "el default del reusable no es una version exacta");
});

// ══════════════════ Los paquetes son carpetas, no texto libre ══════════════════

test("los nombres de paquete se DERIVAN del andamio, no de una lista escrita aparte", () => {
  assert.deepEqual(paquetesDelAndamio(ANDAMIO), { PAQUETE_API: "api", PAQUETE_WEB: "web", PAQUETE_E2E: "e2e" });
});

test("un nombre de paquete que no es el de la carpeta es ERROR, con los dos nombres", () => {
  const problemas = problemasDePaquetes({ ...VALORES_OK, PAQUETE_WEB: "frontend" }, ANDAMIO);
  assert.equal(problemas.length, 1, problemas.join(" | "));
  assert.match(problemas[0], /PAQUETE_WEB/);
  assert.match(problemas[0], /"frontend"/);
  assert.match(problemas[0], /"web\/"/);
});

test("los valores del banco y los del --ejemplo cuadran con el andamio", () => {
  // Si manana el andamio renombra api/ y el ejemplo no se entera, esto lo dice
  // aca y no en el primer CI del repo nuevo.
  assert.deepEqual(problemasDePaquetes(VALORES_OK, ANDAMIO), []);
  const ejemplo = JSON.parse(correr("--ejemplo").salida);
  assert.deepEqual(problemasDePaquetes(ejemplo, ANDAMIO), []);
});

test("un andamio sin package.json con marcador no inventa reglas", () => {
  // La derivacion no puede fallar cerrado sobre un andamio que no declara
  // paquetes: seria una regla sin fuente.
  const raiz = andamioFalso("sin-paquetes", { "a.md": "{{PROYECTO}}", "api/notas.txt": "sin manifiesto" });
  assert.deepEqual(paquetesDelAndamio(raiz), {});
  assert.deepEqual(problemasDePaquetes(VALORES_OK, raiz), []);
});

// ══════════════════ MULTIPLATAFORMA ══════════════════
//
// Todo lo de esta seccion existe porque esta herramienta corre en Windows, macOS
// y Linux, y el resto del marco corre solo en un runner ubuntu pinado. Los tres
// ejes que cambian entre esos SO: el separador de rutas, el fin de linea y si el
// sistema de archivos distingue mayusculas.

test("las rutas del andamio son claves con '/', nunca con la barra de Windows", () => {
  const rels = archivosDelAndamio(ANDAMIO);
  const conBarraInvertida = rels.filter((r) => r.includes("\\"));
  assert.deepEqual(conBarraInvertida, [], "un rel con '\\' no matchea NO_SE_COPIA ni el guard del destino");
  assert.ok(rels.some((r) => r.includes("/")), "el andamio tiene subdirectorios: si no, esto no prueba nada");
});

test("el destino recibe los subdirectorios con el separador del SO", () => {
  const destino = tmp("separadores");
  const r = instanciar({ raizAndamio: ANDAMIO, destino, valores: derivar(VALORES_OK) });
  // Se arma con path.join, que en Windows produce "\\": lo que se escribio tiene
  // que existir para el SO, aunque el rel se guarde con "/".
  assert.ok(fs.existsSync(path.join(destino, "api", "package.json")));
  assert.ok(fs.existsSync(path.join(destino, ".github", "workflows", "ci.yml")));
  assert.ok(r.escritos.includes("api/package.json"), "el rel se reporta con '/'");
});

test("el fin de linea del andamio viaja INTACTO: nada se normaliza al copiar", () => {
  // El marco ya se comio este defecto una vez —.gitattributes lo cuenta— y del
  // lado de la herramienta la garantia es que copia bytes: si un dia alguien
  // mete una normalizacion de EOL "para ordenar", un fixture CRLF en Windows
  // dejaria de ser byte a byte igual al origen y el diff del repo nuevo mostraria
  // el archivo entero como modificado.
  const raiz = andamioFalso("crlf", {
    "crlf.md": "linea uno\r\n{{PROYECTO}}\r\n\r\nfin\r\n",
    "lf.md": "linea uno\n{{PROYECTO}}\nfin\n",
    "mixto.md": "uno\r\ndos\ntres\r",
  });
  const destino = tmp("crlf-destino");
  instanciar({ raizAndamio: raiz, destino, valores: derivar(VALORES_OK) });

  assert.deepEqual(
    fs.readFileSync(path.join(destino, "crlf.md")),
    Buffer.from("linea uno\r\npeople-agenda\r\n\r\nfin\r\n", "utf8"),
  );
  assert.deepEqual(fs.readFileSync(path.join(destino, "lf.md")), Buffer.from("linea uno\npeople-agenda\nfin\n", "utf8"));
  assert.deepEqual(fs.readFileSync(path.join(destino, "mixto.md")), fs.readFileSync(path.join(raiz, "mixto.md")));
});

test("un marcador sobreviviente en un archivo CRLF sale con la linea correcta", () => {
  const destino = tmp("crlf-escaneo");
  fs.writeFileSync(path.join(destino, "x.md"), "uno\r\ndos {{QUEDO}}\r\ntres\r\n", "utf8");
  assert.deepEqual(marcadoresQueSobreviven(destino, ["x.md"]), [
    { archivo: "x.md", linea: 2, marcador: "{{QUEDO}}" },
  ]);
});

test("lo que NO se copia se compara sin distinguir mayusculas", () => {
  // En macOS (APFS) y en Windows el sistema de archivos no las distingue: una
  // guia que se llame Readme.md tiene que seguir sin viajar.
  assert.equal(seExcluyeDelCopiado("README.md"), true);
  assert.equal(seExcluyeDelCopiado("readme.md"), true);
  assert.equal(seExcluyeDelCopiado("ReAdMe.Md"), true);
  // Y la exclusion es de la RAIZ: el andamio trae infra/README.md e
  // infra-prod/README.md, que si viajan.
  assert.equal(seExcluyeDelCopiado("infra/README.md"), false);
  assert.ok(archivosDelAndamio(ANDAMIO).includes("infra/README.md"), "infra/README.md tiene que copiarse");
});

test("una guia con otra capitalizacion tampoco viaja al repo nuevo", () => {
  const raiz = andamioFalso("mayusculas", {
    "Readme.md": "la guia del bootstrap, con {{DOBLE_LLAVE}} citandose",
    "a.md": "{{PROYECTO}}",
  });
  const destino = tmp("mayusculas-destino");
  const r = instanciar({ raizAndamio: raiz, destino, valores: derivar(VALORES_OK) });
  assert.deepEqual(r.escritos, ["a.md"]);
  assert.deepEqual(fs.readdirSync(destino), ["a.md"]);
  // Sin esto la guia viaja y la corrida muere con "el andamio usa marcadores que
  // el archivo de valores no declara: DOBLE_LLAVE", que manda a arreglar lo que
  // no esta roto.
  assert.deepEqual(r.faltantes, []);
});

// ══════════════════ El escaneo final mira SOLO lo que se escribio ══════════════════

test("un marcador que ya estaba en el destino no es asunto de esta corrida", () => {
  // El destino no es siempre un directorio vacio: la skill de adopcion apunta
  // esta herramienta a un repo que ya existe. Un {{ALGO}} en un archivo que la
  // herramienta no toco abortaba la corrida por un motivo ajeno.
  const destino = tmp("preexistente");
  fs.writeFileSync(path.join(destino, "notas.md"), "pendiente: {{DECIDIR_ESTO}}\n", "utf8");
  fs.writeFileSync(path.join(destino, "mio.md"), "sin marcadores\n", "utf8");

  const escritos = ["mio.md"];
  assert.deepEqual(marcadoresQueSobreviven(destino, escritos), [], "no se escribio notas.md: no se escanea");
  // Y el recorrido sin acotar SI lo ve: la diferencia entre los dos es el punto.
  assert.equal(marcadoresQueSobreviven(destino).length, 1);
});

test("el escaneo sin acotar poda node_modules y .git POR SEGMENTO", () => {
  // `api/node_modules/...` no empieza con "node_modules/": el filtro por prefijo
  // los dejaba pasar, y con ellos decenas de miles de archivos leidos como utf8.
  const destino = tmp("podado");
  for (const rel of ["web/node_modules/x/y.txt", "node_modules/z.txt", ".git/COMMIT_EDITMSG", "api/sub/.git/x"]) {
    const abs = path.join(destino, ...rel.split("/"));
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, "esto trae {{UN_MARCADOR}}\n", "utf8");
  }
  fs.writeFileSync(path.join(destino, "visible.md"), "y esto {{OTRO}}\n", "utf8");
  assert.deepEqual(
    marcadoresQueSobreviven(destino).map((s) => s.archivo),
    ["visible.md"],
  );
});

// ══════════════════ La CLI, de punta a punta ══════════════════

test("--ejemplo imprime un JSON con todas las claves requeridas", () => {
  const salida = execFileSync(process.execPath, [path.join(RAIZ, "herramientas/projects-init.mjs"), "--ejemplo"], {
    encoding: "utf8",
  });
  const v = JSON.parse(salida);
  for (const k of REQUERIDOS) assert.ok(v[k], `el ejemplo no trae ${k}`);
  // Y el ejemplo tiene que PASAR su propia validacion, o es un ejemplo roto.
  assert.deepEqual(validarValores(v).problemas, []);
});

test("un destino que ya tiene andamio se ABORTA sin --forzar", () => {
  const destino = tmp("ocupado");
  fs.mkdirSync(path.join(destino, ".github", "workflows"), { recursive: true });
  fs.writeFileSync(path.join(destino, ".github/workflows/ci.yml"), "mi ci\n", "utf8");
  const vals = valoresEn(destino);

  const { codigo, salida } = correr("--valores", vals, "--destino", destino, "--sin-herramientas");
  assert.notEqual(codigo, 0, "tenia que abortar");
  assert.match(salida, /ya tiene .* archivo\(s\) del andamio/);
  // Y lo que ya estaba NO se toco.
  assert.equal(fs.readFileSync(path.join(destino, ".github/workflows/ci.yml"), "utf8"), "mi ci\n");
});

test("un archivo de valores incompleto aborta sin escribir NADA en el destino", () => {
  const destino = tmp("incompleto");
  const incompletos = { ...VALORES_OK };
  delete incompletos.REGION;
  const vals = valoresEn(destino, incompletos);

  const { codigo, salida } = correr("--valores", vals, "--destino", destino, "--sin-herramientas");
  assert.notEqual(codigo, 0);
  assert.match(salida, /falta REGION/);
  assert.match(salida, /No se escribio nada/i);
  assert.deepEqual(fs.readdirSync(destino), [], "el destino tenia que quedar intacto");
});

test("la corrida completa sale 0 y el escaneo final lo dice", () => {
  // El camino feliz de la CLI no estaba en el banco: los dos casos de arriba
  // ejercian solo los rojos, asi que un exit 0 roto no lo cazaba nadie.
  const destino = tmp("feliz-cli");
  const vals = valoresEn(destino);
  const { codigo, salida } = correr("--valores", vals, "--destino", destino, "--sin-herramientas");
  assert.equal(codigo, 0, salida);
  assert.match(salida, /escritos \d+ archivos/);
  assert.match(salida, /cero marcadores sobrevivientes/);
  assert.equal(
    fs.readdirSync(destino).length > 10,
    true,
    "el destino tendria que tener el andamio entero",
  );
});

test("un {{MARCADOR}} que ya estaba en el destino NO tumba la corrida", () => {
  // Este es el caso de la skill de adopcion: el repo destino ya existe y tiene
  // contenido propio. Antes, un TODO con doble llave en un archivo ajeno mataba
  // el arranque con un mensaje que apuntaba al andamio.
  const destino = tmp("adopcion");
  fs.writeFileSync(path.join(destino, "NOTAS.md"), "pendiente {{DECIDIR_ESTO}}\n", "utf8");
  const vals = valoresEn(destino);
  const { codigo, salida } = correr("--valores", vals, "--destino", destino, "--sin-herramientas");
  assert.equal(codigo, 0, salida);
  assert.equal(fs.readFileSync(path.join(destino, "NOTAS.md"), "utf8"), "pendiente {{DECIDIR_ESTO}}\n");
});

test("un --version-openspec con metacaracteres de shell muere ANTES de escribir nada", () => {
  // El vector real no es un atacante: es una linea que alguien copia y pega de un
  // runbook o de la salida de un agente. En Windows esa invocacion va por cmd.exe
  // con los argumentos concatenados sin escapar.
  const destino = tmp("pin-inyectado");
  const vals = valoresEn(destino);
  const { codigo, salida } = correr(
    "--valores",
    vals,
    "--destino",
    destino,
    "--version-openspec",
    "1.0.0 & echo INYECTADO-EN-EL-SHELL",
  );
  assert.notEqual(codigo, 0, "un pin con '&' tenia que abortar");
  assert.match(salida, /--version-openspec/);
  assert.match(salida, /version exacta x\.y\.z/);
  // El texto aparece UNA vez y es la del mensaje de error, que lo cita entero.
  // Una segunda aparicion seria la salida del `echo`, o sea el shell ejecutando.
  assert.equal((salida.match(/INYECTADO-EN-EL-SHELL/g) ?? []).length, 1, salida);
  assert.deepEqual(fs.readdirSync(destino), [], "muere antes de escribir: el destino queda intacto");
});

test("un --version-openspec bien formado se acepta", () => {
  // El guard no puede ser un rojo permanente sobre el escape hatch: con una
  // version exacta la corrida sigue de largo.
  const destino = tmp("pin-ok");
  const vals = valoresEn(destino);
  const { codigo, salida } = correr(
    "--valores",
    vals,
    "--destino",
    destino,
    "--sin-herramientas",
    "--version-openspec",
    "1.2.3",
  );
  assert.equal(codigo, 0, salida);
});

test("--version-openspec SIN valor es un error propio, no el default del YAML en silencio", () => {
  // El caso real no es un typo raro: es una linea de runbook a la que se le corto
  // el final al copiarla, o un `--version-openspec "$PIN"` con la variable vacia
  // en un shell que la borra del argv. `argv[++i]` devuelve undefined ahi, y la
  // validacion escrita `!== undefined` se lo saltaba ENTERA: el `??` reemplazaba
  // el undefined por el default del YAML, o sea que el pin que la persona quiso
  // fijar se descartaba sin decir nada y la corrida salia 0 con los 75 archivos
  // escritos. Fallar abierto en la unica entrada que termina en un proceso hijo.
  const destino = tmp("pin-sin-valor");
  const vals = valoresEn(destino);
  const { codigo, salida } = correr(
    "--valores",
    vals,
    "--destino",
    destino,
    "--sin-herramientas",
    "--version-openspec",
  );
  assert.notEqual(codigo, 0, `tenia que abortar; salida: ${salida}`);
  assert.match(salida, /--version-openspec necesita un valor/);
  assert.deepEqual(fs.readdirSync(destino), [], "muere antes de escribir: el destino queda intacto");

  // ANTI-VACUIDAD: la MISMA corrida sin la bandera sale 0 y escribe. Sin este
  // contraste, el rojo de arriba podria venir de que la corrida este rota de por
  // si, y ademas es lo que fija la distincion que el defecto borraba: bandera
  // AUSENTE = usa el default del YAML; bandera presente SIN valor = error.
  const otro = tmp("pin-ausente");
  const vals2 = valoresEn(otro);
  const control = correr("--valores", vals2, "--destino", otro, "--sin-herramientas");
  assert.equal(control.codigo, 0, control.salida);
  assert.equal(fs.readdirSync(otro).length > 10, true, "la bandera ausente tiene que seguir siendo el camino feliz");
});

test("--valores y --destino sin valor mueren por su nombre, no confundidos con la bandera ausente", () => {
  // El mismo `argv[++i]` esta en las otras dos banderas con valor. Aca el efecto
  // era menos grave —caian en el mensaje de uso— pero el diagnostico era el
  // equivocado: "te falta --valores" cuando --valores esta escrito y lo que falta
  // es su argumento.
  const destino = tmp("banderas-truncadas");
  const vals = valoresEn(destino);

  const sinValor = correr("--destino", destino, "--valores");
  assert.notEqual(sinValor.codigo, 0);
  assert.match(sinValor.salida, /--valores necesita un valor/);

  const sinDestino = correr("--valores", vals, "--destino");
  assert.notEqual(sinDestino.codigo, 0);
  assert.match(sinDestino.salida, /--destino necesita un valor/);

  // Y el otro lado de la distincion: la bandera que NO esta saca el mensaje de
  // uso, que es otro texto. Si los dos casos dijeran lo mismo, este banco no
  // estaria probando nada.
  const ausente = correr("--sin-herramientas");
  assert.notEqual(ausente.codigo, 0);
  assert.match(ausente.salida, /^uso: /m);
  assert.equal(/necesita un valor/.test(ausente.salida), false, ausente.salida);

  assert.deepEqual(fs.readdirSync(destino), [], "ninguna de las tres escribe nada");
});

test("un nombre de paquete que no es una carpeta del andamio aborta sin escribir nada", () => {
  // Antes salia 0 y el rojo aparecia media hora despues, en el primer CI del repo
  // nuevo, por "una excepcion que no corresponde a ningun paquete".
  const destino = tmp("paquete-inventado");
  const vals = valoresEn(destino, { ...VALORES_OK, PAQUETE_E2E: "pruebas-e2e" });
  const { codigo, salida } = correr("--valores", vals, "--destino", destino, "--sin-herramientas");
  assert.notEqual(codigo, 0, "tenia que abortar");
  assert.match(salida, /PAQUETE_E2E/);
  assert.match(salida, /"e2e\/"/);
  assert.deepEqual(fs.readdirSync(destino), [], "el destino tenia que quedar intacto");
});

// ══════════════════ El repo del marco no nombra a personas ══════════════════

test("el ejemplo no nombra a ninguna persona: formas por rol, no handles reales", () => {
  // Projects quedo con CERO nombres propios cuando se extrajo, y su AGENTS.md lo
  // declara: "handles por rol, nunca nombres propios". El ejemplo de esta
  // herramienta los habia reintroducido —tres handles de personas y el UUID real
  // de un servidor MCP— o sea que el marco predicaba la regla y la rompia en la
  // pieza que estrenaba. Esto es el enforcement, porque el review no lo cazo.
  //
  // LIMITE DECLARADO: verifica la CONVENCION (los campos de persona empiezan con
  // `handle-`), no la ausencia de todo nombre posible. Un nombre propio que
  // empiece con `handle-` pasaria; es texto, no una firma. Lo que cierra es el
  // caso real: pegar el handle que uno tiene a mano.
  const salida = execFileSync(process.execPath, [path.join(RAIZ, "herramientas/projects-init.mjs"), "--ejemplo"], {
    encoding: "utf8",
  });
  const v = JSON.parse(salida);
  for (const k of ["BUILDER_1", "BUILDER_2", "PO"]) {
    assert.match(
      v[k],
      /^handle-/,
      `${k} = ${JSON.stringify(v[k])} parece un handle real. Los campos de persona del ejemplo van por ROL: "handle-del-po", no el handle de nadie`,
    );
  }
  assert.equal(
    v.ID_MCP_SLACK,
    "00000000-0000-0000-0000-000000000000",
    "el id del MCP del ejemplo tiene que ser el UUID nulo, no el de un servidor real",
  );
});
