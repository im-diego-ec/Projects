import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

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
  TODAS,
  archivosDelAndamioAMano,
  faltantesDeCopia,
  paquetesDelAndamio,
  problemasDePaquetes,
  pinValido,
  sustituir,
  instanciar,
  revertir,
  marcadoresQueSobreviven,
  pinOpenspecDe,
  FORMATOS,
  marcadoresSinFormato,
  REGISTRO_DE_VALORES,
  avisosDelRegistroDeValores,
  RENOMBRES,
  destinoDe,
  PASOS_DEL_ARRANQUE,
  ejecutorDeScripts,
  entornoDelArranque,
  correrPaso,
  necesitaShimDePnpm,
  materializarShimDePnpm,
  lineasDelResumen,
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

// `fileURLToPath(import.meta.url)` y no `import.meta.dirname`: el mismo motivo
// que en la herramienta —esa propiedad no existe en toda la franja de Node que
// NODE_MINIMO declara soportada—, y un banco que no puede ni arrancar en el piso
// que verifica no verifica nada.
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ANDAMIO = path.join(RAIZ, "plantilla");

const VALORES_OK = {
  PROYECTO: "people-agenda",
  ORG: "Ejemplo-Org",
  PAQUETE_API: "api",
  PAQUETE_WEB: "web",
  PAQUETE_E2E: "e2e",
  PAQUETE_SITIO: "sitio",
  ORG_MARCO: "im-diego-ec",
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

/** LA BANDERA QUE LLEVAN TODAS LAS INVOCACIONES DE ESTE BANCO, y por que va en
 *  los helpers y no suelta en cada llamada.
 *
 *  Desde que `projects init` ARRANCA el proyecto por su cuenta —instala,
 *  formatea y verifica—, cualquier corrida que llegue al final del camino feliz
 *  lanza un `pnpm install` de verdad sobre el destino: red, store y minutos. Los
 *  casos de este banco deciden otra cosa (la copia, los marcadores, el rollback,
 *  los dos procesos hijos), asi que lo apagan. Medido sin la bandera: el banco
 *  paso de ~3 segundos a mas de 126 y hubo que matarlo.
 *
 *  El arranque tiene sus propios casos, mas abajo, con un gestor de paquetes de
 *  mentira delante del PATH: es la unica forma de ver ROJO un paso del arranque
 *  sin depender de que la maquina del banco tenga red.
 *
 *  Va en los helpers y no en cada llamada para que un caso NUEVO nazca rapido:
 *  la version que dependiera de acordarse de escribirla estaria a un olvido de
 *  volver a tardar dos minutos por caso. */
const SIN_ARRANQUE = "--sin-arranque";

/** Corre la CLI de verdad y devuelve codigo + salida junta. Un exit 0 tambien
 *  pasa por aca: el banco tiene que poder afirmar el camino feliz, no solo los
 *  rojos. */
function correr(...args) {
  try {
    const salida = execFileSync(process.execPath, [HERRAMIENTA, SIN_ARRANQUE, ...args], { encoding: "utf8", stdio: "pipe" });
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

test("el README del andamio NO se copia, y el del PROYECTO llega en su lugar", () => {
  // Los dos hechos son UNO: en la raiz del andamio conviven dos documentos que en
  // el repo nuevo se llamarian igual —la guia del bootstrap y el README del
  // proyecto—, asi que la guia no viaja y el otro viaja RENOMBRADO. Medir solo
  // "el destino no tiene README.md" era cierto mientras el segundo no existia, y
  // hoy seria exigir que el repo nuevo nazca sin portada.
  const destino = tmp("readme");
  instanciar({ raizAndamio: ANDAMIO, destino, valores: derivar(VALORES_OK) });

  const enDestino = fs.readFileSync(path.join(destino, "README.md"), "utf8");
  const guia = fs.readFileSync(path.join(ANDAMIO, "README.md"), "utf8");
  assert.notEqual(enDestino, guia, "lo que aterrizo como README.md es la guia del bootstrap, no el del proyecto");
  assert.ok(
    enDestino.includes("RELLENAR"),
    "el README que llego no es el del proyecto: el del proyecto trae los huecos RELLENAR que hay que llenar antes del primer push",
  );
  // Y no queda el archivo con su nombre del andamio: si quedara, el repo nuevo
  // tendria los dos y nadie sabria cual es el bueno.
  assert.equal(fs.existsSync(path.join(destino, "README-del-proyecto.md")), false);

  // Los dos mecanismos, cada uno con su unica declaracion: si manana se excluye
  // o se renombra otro archivo sin pensarlo, esto lo dice.
  assert.deepEqual([...NO_SE_COPIA], ["README.md"]);
  assert.deepEqual([...RENOMBRES], [["README-del-proyecto.md", "README.md"]]);
  assert.equal(destinoDe("README-del-proyecto.md"), "README.md");
  assert.equal(destinoDe("api/package.json"), "api/package.json", "un archivo que no se renombra tiene que pasar tal cual");
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
  assert.ok(
    problemas.some((p) => p.includes("CUENTA_PROD") && p.includes("12 digitos")),
    problemas.join(" | "),
  );
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
  // Y la DECISION de que 0 es rojo, que vive en main(), se ejerce abajo por la
  // CLI: hasta este cambio esta linea era el limite del caso —declarado en su
  // propio comentario— y `if (r.total === 0)` se podia cambiar por `if (false)`
  // con el banco entero en verde.
});

test("cero sustituciones sale ROJO por la CLI, no LISTO sobre un arbol lleno de llaves", () => {
  // El guard que el encabezado de la herramienta llama «la ultima importa mas de
  // lo que parece» era el unico control de main() que ninguna prueba podia ver
  // actuar. Se estrena con el mismo montaje que los casos del marco falso: un
  // clon minimo cuyo `plantilla/` no tiene un solo marcador, que es lo que
  // pasaria el dia que el patron dejara de matchear.
  const marco = marcoConAndamio("total-cero", {
    "a.md": "un andamio sin un solo marcador\n",
    "sub/b.txt": "tampoco aca\n",
  });
  const destino = tmp("total-cero-destino");
  const vals = valoresEn(destino);

  const { codigo, salida } = correrEnMarcoPelado(marco, "--valores", vals, "--destino", destino, "--sin-herramientas");
  assert.notEqual(codigo, 0, `tenia que ser rojo; salida: ${salida}`);
  assert.match(salida, /^::error::cero sustituciones sobre un andamio que tiene marcadores/m);
  assert.equal(/LISTO\./.test(salida), false, "no se declara LISTO sobre un repo que nace lleno de marcadores");
  // ANTI-VACUIDAD: el rojo es POR el conteo, no porque la copia fallara. Los dos
  // archivos estan escritos en el destino.
  assert.ok(fs.existsSync(path.join(destino, "a.md")));
  assert.ok(fs.existsSync(path.join(destino, "sub", "b.txt")));
  assert.match(salida, /escritos 2 archivos, 0 ocurrencias sustituidas/);
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
  assert.equal(derivar(VALORES_OK).PAQUETES, "web, api, e2e, sitio");
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

test("los marcadores con limpieza manual siguen nombrados en la salida", () => {
  // Si alguien automatiza uno de estos borrados, tiene que sacarlo de acá; y si
  // aparece un cuarto camino "si no existe", esta lista es donde se declara.
  assert.deepEqual(Object.keys(CON_LIMPIEZA_MANUAL).sort(), ["GENERAR_CLIENTE_DATOS", "PAQUETE_E2E", "PAQUETE_SITIO", "PAQUETE_WEB"]);
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
  assert.deepEqual(paquetesDelAndamio(ANDAMIO), { PAQUETE_API: "api", PAQUETE_WEB: "web", PAQUETE_E2E: "e2e", PAQUETE_SITIO: "sitio" });
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

// EL DIAGNOSTICO DE LA PROTECCION DE MAIN, de punta a punta.
//
// Este caso corre la sonda DE VERDAD contra la maquina donde se ejecuta el
// banco, asi que no puede afirmar QUE estado sale: en un runner sin GH_TOKEN
// sale "sin-auth", en una maquina sin `gh` sale "sin-gh", con `gh` autenticado y
// un repo que no existe sale "sin-repo". Lo que SI afirma —y es lo que importa—
// es que el documento del proyecto nuevo deja de ser una plantilla que declara
// un estado que nadie comprobo: cualquiera sea la rama, queda con una medicion
// fechada, sin el recuadro que manda aplicar cuatro reglas que pueden no existir
// y sin la frase que las da por funcionando. Las siete ramas, una por una y con
// su texto, se afirman en pruebas/init/proteccion.test.mjs.
test("el documento de proteccion de main queda MEDIDO, no copiado", () => {
  const destino = tmp("proteccion-medida");
  const vals = valoresEn(destino);
  const { codigo, salida } = correr("--valores", vals, "--destino", destino, "--sin-herramientas");
  assert.equal(codigo, 0, salida);

  const doc = fs.readFileSync(path.join(destino, ".github/proteccion-main.md"), "utf8");
  assert.equal(doc.includes("🕳️"), false, "quedo el recuadro que manda aplicar las cuatro reglas sin haberlas medido");
  assert.equal(doc.includes("Se encienden ahora."), false, "quedo la frase que afirma cuatro reglas funcionando");
  assert.match(doc, /Esta sección la escribió `projects init` \*\*midiendo\*\*/);
  assert.match(doc, new RegExp(`gh api repos/${VALORES_OK.ORG}/${VALORES_OK.PROYECTO}/rulesets`));
  // Una de las tres formas de encabezar, y exactamente una.
  const veredictos = [/sí puede\*\* tener protección de rama/, /no puede\*\* tener protección de rama hoy/, /No se pudo medir:/]
    .filter((p) => p.test(doc));
  assert.equal(veredictos.length, 1, `el documento quedo con ${veredictos.length} veredictos`);
  // Y la herramienta lo dijo tambien por pantalla: nadie deberia tener que abrir
  // el documento para enterarse de si el repo tiene compuerta.
  assert.match(salida, /Proteccion de main:/);
  // El agregado del final, que cierra el hueco del paso a paso.
  assert.match(doc, /Y si esa sonda contesta 403/);
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

test("el ORG del ejemplo es una ORG de GitHub, no el slug de un equipo de adentro", () => {
  // Una pasada automatica de anonimizado convirtio ORG en el slug del equipo del
  // PO, y el ejemplo quedo apuntando a un repo que no existe: {{ORG}} se
  // interpola como duenio de un repositorio (`{{ORG}}/{{PROYECTO}}`), mientras
  // que los slugs de equipo viven detras de `orgs/<org>/teams/<slug>`. Nada del
  // banco miraba ORG, asi que paso verde.
  const v = JSON.parse(correr("--ejemplo").salida);

  // ANTI-VACUIDAD, y SU ANCLA SE MUDO cuando se arreglo el defecto de al lado.
  //
  // Este control se escribio cuando `{{ORG}}` significaba dos cosas a la vez: la
  // cuenta del proyecto Y la cuenta donde vive el marco, esta ultima adentro de
  // lineas `uses:`. Buscar `{{ORG}}` en un `uses:` hoy no encuentra nada —el
  // marco se mudo a `{{ORG_MARCO}}`— y dejar el aserto como estaba habria puesto
  // ROJO justamente al arreglo. Lo que afirma no cambio: ORG es una cuenta de
  // GitHub. Cambio donde se lo mira: donde ORG se interpola HOY.
  const lineas = archivosDelAndamio(ANDAMIO, "aws", TODAS)
    .flatMap((rel) => fs.readFileSync(path.join(ANDAMIO, ...rel.split("/")), "utf8").split("\n").map((l) => [rel, l]));
  const comoDuenio = lineas.filter(([, l]) => /\{\{ORG\}\}\/(\{\{PROYECTO\}\}|<)/.test(l));
  assert.ok(
    comoDuenio.length >= 1,
    "ningun archivo del andamio interpola {{ORG}} como duenio de un repositorio: si eso cambio, este control dejo " +
      "de mirar lo que cree que mira",
  );

  // Y LA OTRA MITAD DE LA SEPARACION, que es la que costo un dia uno en rojo: el
  // `uses:` del pipeline resuelve contra la cuenta del MARCO, no contra la del
  // proyecto. Mientras las dos eran `{{ORG}}`, quien creaba su proyecto en su
  // propia cuenta terminaba con `uses: su-cuenta/Projects/...`, un repositorio
  // que no existe, y su CI nacia rojo sin que el mensaje hablara de eso.
  const enUses = lineas.filter(([, l]) => /uses:\s*"?\{\{ORG_MARCO\}\}\//.test(l));
  assert.ok(
    enUses.length >= 1,
    "ningun `uses:` del andamio resuelve contra {{ORG_MARCO}}: o volvieron a ser el mismo marcador, o el pipeline " +
      "del proyecto dejo de referirse al marco",
  );
  assert.deepEqual(
    enUses.filter(([, l]) => /\{\{ORG\}\}/.test(l)),
    [],
    "un `uses:` no puede resolver contra la cuenta del PROYECTO: ahi no vive el marco",
  );

  assert.match(v.ORG, FORMATOS.ORG.patron, `ORG = ${JSON.stringify(v.ORG)} no tiene la forma de un handle de org`);
  assert.match(v.ORG_MARCO, FORMATOS.ORG_MARCO.patron, `ORG_MARCO = ${JSON.stringify(v.ORG_MARCO)}`);
  for (const equipo of ["EQUIPO_BUILDERS", "EQUIPO_PO"]) {
    assert.notEqual(
      v.ORG,
      v[equipo],
      `ORG y ${equipo} valen lo mismo (${JSON.stringify(v.ORG)}). ORG es el duenio del repositorio del proyecto y ` +
        `${equipo} es un slug de equipo DENTRO de esa org: si coinciden, el CODEOWNERS del ejemplo asigna a un ` +
        `equipo que no existe. Es el residuo tipico de una pasada automatica sobre los nombres.`,
    );
  }
});

// ══════════════════ LA FORMA DE LOS VALORES REQUERIDOS ══════════════════
//
// Hasta este lote la validacion miraba 2 de todos ellos: los doce digitos de las dos
// cuentas de AWS y el em dash de PREFIJO_RECURSOS y PROYECTO. Lo medido en vivo
// antes de arreglarlo: con EQUIPO_BUILDERS = "builders\n      - run: echo
// INYECTADO", la herramienta salia 0 y la linea aterrizaba en .github/CODEOWNERS
// justo debajo de la regla `*  @<org>/<equipo>`. GitHub no rechaza un CODEOWNERS
// malformado: ignora la linea y no asigna a nadie, que es el primero de los tres
// modos de falla que la propia salida de la herramienta advierte en su punto 4.

test("todos los valores requeridos tienen una forma declarada", () => {
  // Sin esto, agregar una clave a REQUERIDOS y olvidar su fila en FORMATOS la
  // devuelve al regimen viejo —no-vacio y nada mas— sin que nada lo diga.
  assert.deepEqual(marcadoresSinFormato(), []);
  // Y al reves: una forma declarada para algo que ya nadie pide es una regla sin
  // fuente, que es como empiezan las divergencias.
  const sobrantes = Object.keys(FORMATOS).filter((k) => !REQUERIDOS.includes(k));
  assert.deepEqual(sobrantes, []);
});

test("un salto de linea en CUALQUIERA de los requeridos es error, y el mensaje dice cual", () => {
  // Se recorren TODOS y no una muestra: el defecto era exactamente que la
  // cobertura fuera parcial, asi que probarlo con dos claves lo repetiria.
  const carga = "\n      - run: echo INYECTADO-EN-EL-WORKFLOW";
  for (const k of REQUERIDOS) {
    const { problemas, valores } = validarValores({ ...VALORES_OK, [k]: `${VALORES_OK[k]}${carga}` });
    assert.equal(valores, null, `${k} con un salto de linea no tendria que validar`);
    assert.ok(
      problemas.some((p) => p.startsWith(`${k} trae un caracter de control`)),
      `${k}: ${problemas.join(" | ")}`,
    );
    // Y el diagnostico no reimprime el salto: nombrarlo como texto es lo que lo
    // hace visible en una terminal, que es donde se lee.
    assert.equal(
      problemas.some((p) => p.includes("\n")),
      false,
      "un mensaje que contiene el salto de linea esconde el defecto que denuncia",
    );
  }
});

test("los otros caracteres de control tampoco pasan", () => {
  const casos = [
    ["tabulacion", "\t"],
    ["retorno de carro", "\r"],
    ["nulo", String.fromCharCode(0)],
    ["escape", String.fromCharCode(27)],
  ];
  for (const [nombre, c] of casos) {
    const { problemas } = validarValores({ ...VALORES_OK, PROYECTO: `people${c}agenda` });
    assert.ok(
      problemas.some((p) => p.startsWith("PROYECTO trae un caracter de control")),
      `${nombre}: ${problemas.join(" | ")}`,
    );
  }
});

test("cada familia rechaza lo que no es de su familia, con el nombre y la forma esperada", () => {
  const malos = [
    ["PROYECTO", "People Agenda", "un nombre de repo"],
    ["ORG", "-arranca-con-guion", "un handle"],
    ["BUILDER_1", "@con-arroba", "un handle"],
    ["PO", "con espacio", "un handle"],
    ["EQUIPO_BUILDERS", "Builders", "el slug del equipo"],
    ["EQUIPO_PO", "po/sub", "el slug del equipo"],
    ["PAQUETE_API", "src/api", "un nombre de carpeta"],
    ["CUENTA_DEV", "1234", "un id de cuenta AWS"],
    ["REGION", "useast1", "una region de AWS"],
    ["PERFIL_DEV", "perfil con espacios", "un nombre de perfil"],
    ["PERFIL_PROD", "perfil|raro", "un nombre de perfil"],
    ["PREFIJO_RECURSOS", "Agenda_Prod", "un prefijo de recursos AWS"],
    ["DOMINIO_DEV", "https://agenda-dev.ejemplo.com/", "un host sin esquema"],
    ["DOMINIO_PROD", "agenda.ejemplo.com:443", "un host sin esquema"],
    ["CANAL_ALERTAS", "alertas-prod", "un canal con su almohadilla"],
    ["ID_MCP_SLACK", "id_con_guion_bajo", "el id del servidor MCP"],
  ];
  for (const [k, valor, fragmento] of malos) {
    const { problemas, valores } = validarValores({ ...VALORES_OK, [k]: valor });
    assert.equal(valores, null, `${k} = ${JSON.stringify(valor)} no tendria que validar`);
    const mio = problemas.filter((p) => p.startsWith(`${k} = `));
    assert.equal(mio.length, 1, `${k}: ${problemas.join(" | ")}`);
    assert.ok(mio[0].includes(fragmento), `${k}: el mensaje no ensena que se espera — ${mio[0]}`);
    assert.ok(mio[0].includes(JSON.stringify(valor)), `${k}: el mensaje no cita el valor — ${mio[0]}`);
  }
});

test("y acepta lo que SI es de su familia: el guard no es un rojo permanente", () => {
  // La otra mitad, y la que evita que este banco premie a un validador que
  // rechaza todo. Cada caso es una forma legitima que se vio o se puede ver.
  const buenos = [
    ["PROYECTO", "people-agenda"],
    ["PROYECTO", "api.v2"],
    // Un handle de org de DOS letras es legitimo y el patron tiene que aceptarlo.
    // El valor de antes aca era `po`, que es el slug de un EQUIPO y es tambien el
    // residuo que la pasada de anonimizado dejo en el ejemplo: tenerlo en la lista
    // de «formas legitimas de ORG» invitaba a devolverlo ahi.
    ["ORG", "ab"],
    ["ORG", "Ejemplo-Org"],
    ["BUILDER_1", "a"],
    ["EQUIPO_BUILDERS", "builders-core"],
    ["REGION", "us-east-1"],
    ["REGION", "ap-southeast-2"],
    ["REGION", "us-gov-west-1"],
    ["PERFIL_DEV", "ejemplo-dev"],
    ["PERFIL_PROD", "ejemplo.prod_2"],
    ["PREFIJO_RECURSOS", "agenda-prod"],
    ["DOMINIO_DEV", "a.co"],
    ["DOMINIO_PROD", "agenda.sub.ejemplo.com"],
    ["CANAL_ALERTAS", "#alertas_prod-2"],
    ["ID_MCP_SLACK", "00000000-0000-0000-0000-000000000000"],
    // Texto libre a proposito: es un COMANDO, y un comando lleva espacios y
    // banderas. Declararle un patron seria inventarle una forma que no tiene.
    ["GENERAR_CLIENTE_DATOS", "prisma generate --schema ./db/schema.prisma"],
    ["GENERAR_CLIENTE_DATOS", "pnpm run db:generate"],
  ];
  for (const [k, valor] of buenos) {
    const { problemas } = validarValores({ ...VALORES_OK, [k]: valor });
    assert.deepEqual(problemas, [], `${k} = ${JSON.stringify(valor)} tendria que valer`);
  }
});

test("un valor con espacios al borde es error: en CODEOWNERS eso no asigna a nadie", () => {
  const { problemas } = validarValores({ ...VALORES_OK, PO: " el-po" });
  assert.ok(problemas.some((p) => p.startsWith("PO = ") && p.includes("espacios")), problemas.join(" | "));
});

test("la inyeccion por salto de linea NO llega al CODEOWNERS del repo nuevo", () => {
  // El caso de punta a punta, con la carga exacta que se midio aterrizando en
  // `.github/CODEOWNERS:19` antes de este arreglo.
  const destino = tmp("inyeccion-codeowners");
  const vals = valoresEn(destino, {
    ...VALORES_OK,
    EQUIPO_BUILDERS: "builders\n      - run: echo INYECTADO-EN-EL-WORKFLOW",
  });
  const { codigo, salida } = correr("--valores", vals, "--destino", destino, "--sin-herramientas");
  assert.notEqual(codigo, 0, "tenia que abortar");
  assert.match(salida, /EQUIPO_BUILDERS trae un caracter de control/);
  assert.match(salida, /No se escribio nada/i);
  assert.deepEqual(fs.readdirSync(destino), [], "el destino tenia que quedar intacto");
});

// ══════════════════ LO QUE LLEGA A UN PROCESO HIJO ══════════════════

const FUENTE = fs.readFileSync(HERRAMIENTA, "utf8");

/** Las lineas de CODIGO del archivo: sin las de comentario. El encabezado y los
 *  docblocks CITAN la invocacion de npx para explicarla, y un control que
 *  contara esas citas estaria midiendo la prosa en vez del programa. */
const LINEAS_DE_CODIGO = FUENTE.split("\n").filter((l) => {
  const t = l.trim();
  return t !== "" && !t.startsWith("//") && !t.startsWith("*") && !t.startsWith("/*");
});

test("la unica entrada que puede llegar a un shell es el pin, y esta acotada", () => {
  // Este control existe porque la defensa no es una funcion sino una PROPIEDAD
  // del archivo: `pinValido` acota el unico argumento variable de la unica
  // invocacion que en Windows pasa por cmd.exe. Agregar manana un segundo
  // argumento interpolado ahi no romperia ninguna prueba de comportamiento, y el
  // repo tiene medido que ese es el modo de falla que solo ve quien no lo puede
  // depurar: el escapado es asimetrico por sistema operativo.
  //
  // ESTE CONTROL CAMBIO DE FORMA, y el motivo es que la version anterior no
  // sobrevivia a que la herramienta lanzara un segundo proceso. Contaba las
  // lineas con `shell:` y exigia que hubiera UNA. Desde que existe el arranque
  // hay tres invocaciones —el sondeo del gestor de paquetes, el ejecutor de
  // OpenSpec y cada paso del arranque— y las tres necesitan el shell en Windows
  // por el mismo motivo (los ejecutables son .cmd, y spawnear un .cmd sin shell
  // falla con EINVAL desde la correccion de CVE-2024-27980). Contarlas obligaba
  // a subir el numero a mano en cada cambio, que es un control que se relaja
  // solo. Lo que hay que sostener no es CUANTAS son sino QUE LES ENTRA: por eso
  // ahora se audita el vector de argumentos de TODAS —lleven shell o no— contra
  // una lista de residuos DECLARADOS, cada uno con por que es seguro.
  //
  // `shell: false` CUENTA COMO ACOTADO, y no es una excepcion que afloje este
  // control: es mas estricto que lo que pide. No dice "shell solo en Windows",
  // dice "shell en ningun lado". Lo usa la sonda de la proteccion de main, cuyo
  // ejecutable (`gh`) se instala como .exe tambien en Windows y por lo tanto no
  // necesita la excepcion de los .cmd que obliga a las otras tres invocaciones.
  // Sin esta rama, la unica forma de pasar el control seria RELAJAR esa
  // invocacion a `shell: true` en Windows — o sea, empeorarla para satisfacer a
  // un guard que existe para endurecerlas.
  const conShell = LINEAS_DE_CODIGO.filter((l) => l.includes("shell:"));
  assert.ok(conShell.length >= 1, "no quedo ninguna invocacion con shell: este control dejo de mirar lo que cree que mira");
  for (const linea of conShell) {
    assert.match(
      linea.trim(),
      /shell: (process\.platform === "win32"|false)/,
      `un shell que no esta acotado ni a Windows ni a nada: ${linea.trim()}`,
    );
  }
  assert.ok(
    conShell.some((l) => /shell: process\.platform === "win32"/.test(l)),
    "no quedo ninguna invocacion con el shell acotado a Windows: si desaparecieron todas, este control y su motivo hay que releerlos antes de darlo por bueno",
  );

  // Y ninguna forma de lanzar un proceso que reciba la linea de comandos entera
  // como un solo string, que es donde el escapado deja de existir.
  const codigo = LINEAS_DE_CODIGO.join("\n");
  for (const [nombre, patron] of [
    ["execSync", /\bexecSync\(/],
    ["exec", /(?<![.\w])exec\(/],
    ["spawn", /(?<![.\w])spawn\(/],
    ["spawnSync", /\bspawnSync\(/],
  ]) {
    assert.equal(
      patron.test(codigo),
      false,
      `${nombre}() recibe una linea de comandos entera: no entra en esta herramienta`,
    );
  }

  // El vector de argumentos de npx: TODO literal menos uno, y ese uno es el pin.
  //
  // Mirar solo `${...}` no alcanzaba, y la mitad que se escapaba es la que
  // cualquiera escribiria primero: un argumento variable puesto como
  // identificador pelado (`"--tools", o.destino`) no trae interpolacion de
  // plantilla y pasaba invisible — con el banco entero en verde y ese valor
  // viajando concatenado por cmd.exe sin escapar. Por eso el control es al
  // reves: se borran los literales de cadena y lo que sobra tiene que ser
  // EXACTAMENTE el template del pin. Cualquier otra forma de argumento variable
  // —identificador, propiedad, llamada, otra interpolacion— queda en el resto.
  // Sobre `codigo` y no sobre FUENTE: el docblock de pinValido CITA esta misma
  // invocacion con un `...` en el medio para explicarla, y una prosa no es un
  // argumento que viaje a cmd.exe.
  //
  // LOS RESIDUOS PERMITIDOS, uno por uno y con su motivo. Cualquier otro es
  // rojo: agregar manana un argumento variable a cualquiera de estas
  // invocaciones obliga a venir aca y escribir por que es seguro, que es
  // exactamente la friccion que este control existe para poner.
  const RESIDUOS = new Map([
    ["", "el vector es 100% literal de este archivo: no hay nada de la persona adentro"],
    [
      "`@fission-ai/openspec@${pin}`",
      "el pin de OpenSpec, que pinValido acota a x.y.z antes de llegar aca (dos veces: la bandera y el valor resuelto)",
    ],
    [
      "...ejecutor.prefijo...paso.args",
      "los dos salen de constantes de este archivo (ejecutorDeScripts y PASOS_DEL_ARRANQUE) y no de ninguna entrada; " +
        "los casos de mas abajo lo comprueban sobre los VALORES, que es lo que de verdad viaja",
    ],
    [
      "`users/${cuenta}`",
      "el nombre de la cuenta de GitHub, que preguntarTipoDeCuenta valida contra el patron de un handle " +
        "--alfanumerico con guiones simples, hasta 39-- ANTES de interpolarlo, y devuelve null sin invocar nada " +
        "si no calza. Un `;` o un backtick no llegan al shell",
    ],
    [
      "path.join(raizMarco)",
      "la ruta del script de la constitucion dentro del clon del marco; ademas esa invocacion no lleva shell",
    ],
    [
      "`repos/${org}/${proyecto}/rulesets`",
      "la ruta del repositorio en la sonda de proteccion de main. sondarProteccion valida las dos piezas " +
        "inmediatamente antes contra FORMATOS.ORG.patron y FORMA_DE_REPO_EN_GITHUB, que no admiten ni un " +
        "metacaracter de shell; y esa invocacion va con shell: false, asi que no pasa por cmd.exe en ningun " +
        "sistema operativo. El caso de mas abajo lo comprueba sobre los VALORES",
    ],
  ]);
  const invocaciones = [...codigo.matchAll(/execFileSync\(([^,]+),\s*\[([^\]]*)\]/g)];
  assert.ok(
    invocaciones.length >= 3,
    `solo ${invocaciones.length} invocacion(es) de execFileSync: si cambiaron de forma, este control dejo de mirar lo que cree que mira`,
  );
  const conPin = invocaciones.filter((inv) => inv[2].includes("openspec@")).length;
  assert.equal(conPin, 1, "no encontre la invocacion del ejecutor de paquetes con el pin: era la que este control nacio para acotar");
  for (const inv of invocaciones) {
    const sinLiterales = inv[2].replace(/"(?:[^"\\]|\\.)*"/g, "").replace(/[\s,]/g, "");
    assert.ok(
      RESIDUOS.has(sinLiterales),
      `en Windows estos argumentos van concatenados sin escapar. Este vector deja un residuo variable no ` +
        `declarado: ${sinLiterales || "(nada)"} — en execFileSync(${inv[1]}, [${inv[2]}]). Si es seguro, ` +
        `agregalo a RESIDUOS con el motivo; si no, sacalo de ahi.`,
    );
  }
});

test("lo que el arranque le pasa al shell son literales, medido sobre los VALORES", () => {
  // ANTI-VACUIDAD del residuo `...ejecutor.prefijo...paso.args` de arriba: ese
  // caso mira la FORMA del codigo y por si solo no dice nada sobre lo que corre.
  // Esto mira los valores, que es lo unico que de verdad viaja a cmd.exe.
  const conCorepack = ejecutorDeScripts(() => true);
  assert.deepEqual(conCorepack, { comando: "corepack", prefijo: ["pnpm"], nombre: "corepack pnpm" });
  const soloPnpm = ejecutorDeScripts((cmd) => cmd === "pnpm");
  assert.deepEqual(soloPnpm, { comando: "pnpm", prefijo: [], nombre: "pnpm" });
  assert.equal(ejecutorDeScripts(() => false), null, "sin gestor de paquetes tiene que devolver null, no un ejecutor inventado");

  // Ni un metacaracter de shell en nada de lo que se concatena. La lista es la
  // de cmd.exe y la del shell de POSIX juntas, porque la herramienta corre en
  // los tres sistemas operativos.
  const peligrosos = /[&|<>^"'`$;()\s]/;
  for (const pieza of [conCorepack.comando, ...conCorepack.prefijo, soloPnpm.comando, ...soloPnpm.prefijo]) {
    assert.equal(peligrosos.test(pieza), false, `"${pieza}" trae un caracter que en un shell no es texto`);
  }
  assert.ok(PASOS_DEL_ARRANQUE.length >= 1, "sin pasos, este caso no mide nada");
  for (const paso of PASOS_DEL_ARRANQUE) {
    assert.ok(Array.isArray(paso.args) && paso.args.length >= 1, `el paso ${paso.clave} no declara argumentos`);
    for (const arg of paso.args) {
      assert.equal(typeof arg, "string", `el paso ${paso.clave} declara un argumento que no es texto`);
      assert.equal(peligrosos.test(arg), false, `el paso ${paso.clave} declara el argumento "${arg}", que en un shell no es texto`);
    }
  }
});

// ══════════════════ LOS DOS ULTIMOS PASOS, RELEIDOS DEL ARBOL ══════════════════
//
// El bloque `if (o.herramientas)` —los dos procesos hijos— NO se ejecutaba en
// ninguna prueba: las dos invocaciones de la CLI que pasaban --destino usaban
// --sin-herramientas. Lo que sigue lo ejerce entero, y lo hace con un MARCO
// FALSO: una copia del andamio, del marco-ci.yml del que sale el pin, de esta
// herramienta, y un `constitucion.mjs` de mentira cuyo comportamiento decide
// cada caso. Sin eso no hay forma de ver ROJO un "salio 0 y no escribio nada",
// que es exactamente el modo de falla que este repo tiene MEDIDO para el CLI de
// OpenSpec en Windows (plantilla/.claude/skills/projects-archive-change/SKILL.md:
// "en Windows el CLI MIENTE ... imprime `Specs updated successfully` y hace
// rollback").

/** Un clon minimo del marco, para que la herramienta copiada resuelva su propia
 *  raiz ahi adentro y los dos procesos hijos sean los que este banco decida. */
function marcoFalso(nombre, constitucion) {
  const raiz = tmp(nombre);
  fs.mkdirSync(path.join(raiz, "herramientas"));
  fs.copyFileSync(HERRAMIENTA, path.join(raiz, "herramientas", "projects-init.mjs"));
  fs.cpSync(ANDAMIO, path.join(raiz, "plantilla"), { recursive: true });
  fs.mkdirSync(path.join(raiz, ".github", "workflows"), { recursive: true });
  fs.copyFileSync(
    path.join(RAIZ, ".github/workflows/marco-ci.yml"),
    path.join(raiz, ".github", "workflows", "marco-ci.yml"),
  );
  fs.mkdirSync(path.join(raiz, "actions", "constitucion"), { recursive: true });
  fs.writeFileSync(path.join(raiz, "actions", "constitucion", "constitucion.mjs"), constitucion, "utf8");
  return raiz;
}

/** Un clon minimo del marco con un andamio DE MENTIRA. `marcoFalso` copia el
 *  andamio real, que es lo que quieren los casos de los dos procesos hijos; este
 *  sirve para los casos donde lo que se decide es una propiedad DEL ANDAMIO —por
 *  ejemplo que no tenga ningun marcador—, que sobre `plantilla/` no se puede
 *  montar sin romperlo. No trae marco-ci.yml ni actions/: los casos que lo usan
 *  corren con --sin-herramientas. */
function marcoConAndamio(nombre, archivos) {
  const raiz = tmp(nombre);
  fs.mkdirSync(path.join(raiz, "herramientas"));
  fs.copyFileSync(HERRAMIENTA, path.join(raiz, "herramientas", "projects-init.mjs"));
  for (const [rel, contenido] of Object.entries(archivos)) {
    const abs = path.join(raiz, "plantilla", ...rel.split("/"));
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, contenido, "utf8");
  }
  return raiz;
}

/** La CLI del marco falso SIN tocar el PATH: para los casos que no llegan a
 *  lanzar ningun proceso hijo. `spawnSync` por el mismo motivo que
 *  `correrEnMarco`: hacen falta los dos flujos. */
function correrEnMarcoPelado(marco, ...args) {
  const r = spawnSync(process.execPath, [path.join(marco, "herramientas", "projects-init.mjs"), SIN_ARRANQUE, ...args], {
    encoding: "utf8",
  });
  return { codigo: r.status ?? -1, salida: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

/** Un ejecutor de paquetes de mentira delante del PATH. Se escriben las dos formas porque este
 *  banco corre en los tres sistemas operativos: en Windows la herramienta lanza
 *  la invocacion por cmd.exe, que resuelve `npx.cmd`. */
// El nombre del ejecutor vive en una constante y no suelto en cada llamada, y no es
// estilo: el guardrail de ejecutores del propio marco lee este archivo y una linea como
// `path.join(bin, "npx"), sh` la interpreta como una invocacion de npx al paquete `sh`,
// sin version exacta, y pone el arbol en ROJO. Con la constante, el literal aparece una
// sola vez y sin nada que parezca un paquete detras.
const EJECUTOR = "npx";

function npxFalso(nombre, sh, cmd) {
  const bin = tmp(nombre);
  fs.writeFileSync(path.join(bin, EJECUTOR), sh, "utf8");
  fs.chmodSync(path.join(bin, EJECUTOR), 0o755);
  fs.writeFileSync(path.join(bin, `${EJECUTOR}.cmd`), cmd, "utf8");
  return bin;
}

/** El `constitucion.mjs` de mentira del camino feliz. Hace las DOS cosas que
 *  hace el modo escribir de la action real: escribe la porcion del marco y la
 *  DECLARA en su output `artefactos` (actions/constitucion/action.yml). Ese
 *  output es lo que la herramienta lee para saber que rutas comprobar en disco.
 *  Y es IDEMPOTENTE —reescribe siempre la misma ruta, como el real—, que es la
 *  propiedad que el caso de la segunda corrida necesita. */
const CONSTITUCION_QUE_ESCRIBE = [
  "import fs from 'node:fs';",
  "fs.mkdirSync('.projects', { recursive: true });",
  "fs.writeFileSync('.projects/AGENTS-marco.md', 'porcion del marco\\n');",
  "fs.appendFileSync(process.env.GITHUB_OUTPUT, 'artefactos=.projects/AGENTS-marco.md\\n');",
].join("\n");

const NPX_QUE_MIENTE = ["#!/bin/sh\nexit 0\n", "@echo off\r\nexit /b 0\r\n"];
const NPX_QUE_ESCRIBE = [
  "#!/bin/sh\nmkdir -p openspec && printf 'x\\n' > openspec/project.md\nexit 0\n",
  "@echo off\r\nmkdir openspec\r\necho x> openspec\\project.md\r\nexit /b 0\r\n",
];

/** Corre la CLI del marco falso con ese PATH por delante.
 *
 *  `spawnSync` y no `execFileSync`: los `::warning::` salen por stderr, y
 *  execFileSync en una corrida que sale 0 devuelve SOLO stdout. Con el, un aviso
 *  emitido en el camino feliz —que es justo donde vive el de openspec/— era
 *  invisible para este banco. */
function correrEnMarco(marco, bin, ...args) {
  const r = spawnSync(process.execPath, [path.join(marco, "herramientas", "projects-init.mjs"), SIN_ARRANQUE, ...args], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` },
  });
  return { codigo: r.status ?? -1, salida: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

test("openspec init que sale 0 sin crear openspec/ es ROJO, no LISTO", () => {
  // El sintoma que se evita: la herramienta imprime LISTO y las seis tareas
  // humanas, el builder hace el push fundacional, y el primer CI muere en el
  // paso que exige openspec/ — con la herramienta ya cerrada y el diagnostico
  // apuntando al pipeline en vez de al arranque.
  const marco = marcoFalso("openspec-miente", "process.exit(0);\n");
  const bin = npxFalso("bin-miente", ...NPX_QUE_MIENTE);
  const destino = tmp("openspec-miente-destino");
  const vals = valoresEn(destino);

  const { codigo, salida } = correrEnMarco(marco, bin, "--valores", vals, "--destino", destino);
  assert.notEqual(codigo, 0, `tenia que ser rojo; salida: ${salida}`);
  assert.match(salida, /openspec init salio 0 pero no dejo un openspec\/ con contenido/);
  // Y el mensaje trae el arreglo, que es la regla del marco para cada error.
  assert.match(
    salida,
    new RegExp(`${EJECUTOR} --yes @fission-ai/openspec@\\d+\\.\\d+\\.\\d+ init --tools claude`),
  );
  assert.equal(/LISTO\./.test(salida), false, "no se declara LISTO sobre un arranque a medias");
});

test("openspec/ que YA tenia contenido y un CLI que miente: la corrida avisa, no pasa en silencio", () => {
  // El fail-open que faltaba cerrar. El control preguntaba "hay algo en
  // openspec/?" sin haber fotografiado antes, asi que en el unico escenario en
  // que el destino NO nace vacio —un reintento con --forzar, o la skill de
  // adopcion apuntada a un repo que ya usaba OpenSpec— el contenido que la
  // pregunta encontraba ya estaba ahi antes de correr el CLI, y el CLI que
  // miente en Windows pasaba entero sin ruido.
  const marco = marcoFalso("openspec-preexistente", CONSTITUCION_QUE_ESCRIBE);
  const bin = npxFalso("bin-preexistente", ...NPX_QUE_MIENTE);
  const destino = tmp("openspec-preexistente-destino");
  fs.mkdirSync(path.join(destino, "openspec"));
  fs.writeFileSync(path.join(destino, "openspec", "viejo.md"), "de otro proyecto\n", "utf8");
  const vals = valoresEn(destino);

  const { codigo, salida } = correrEnMarco(marco, bin, "--valores", vals, "--destino", destino);
  // AVISO y no rojo, y la razon esta en la herramienta: desde aca no se
  // distingue "el CLI mintio" de "el CLI no tenia nada que hacer sobre un
  // openspec/ ya inicializado", y romper el reintento con --forzar es romper el
  // camino de recuperacion que esta misma herramienta recomienda. Lo que no
  // puede seguir siendo es silencio.
  assert.equal(codigo, 0, salida);
  assert.match(salida, /::warning::openspec init salio 0 y openspec\/ quedo con los mismos 1 archivo\(s\)/);
  assert.deepEqual(fs.readdirSync(path.join(destino, "openspec")), ["viejo.md"], "el CLI de mentira no escribio nada");
});

test("un render de la constitucion que sale 0 sin escribir nada es ROJO", () => {
  const marco = marcoFalso("constitucion-muda", "process.exit(0);\n");
  const bin = npxFalso("bin-escribe", ...NPX_QUE_ESCRIBE);
  const destino = tmp("constitucion-muda-destino");
  const vals = valoresEn(destino);

  const { codigo, salida } = correrEnMarco(marco, bin, "--valores", vals, "--destino", destino);
  assert.notEqual(codigo, 0, `tenia que ser rojo; salida: ${salida}`);
  assert.match(salida, /el render de la constitucion salio 0 y no declaro un solo artefacto escrito/);
  assert.equal(/LISTO\./.test(salida), false);
});

test("un render que DECLARA un artefacto y no lo deja escrito es ROJO", () => {
  // La otra mitad del control: el output `artefactos` dice DONDE mirar, no
  // reemplaza el mirar. Un render que imprime exito y revierte lo que escribio
  // —el modo de falla que este repo tiene medido para los CLI en Windows—
  // declara la ruta igual, y sin releer el disco eso pasaba por camino feliz.
  const marco = marcoFalso(
    "constitucion-mentirosa",
    "import fs from 'node:fs';\n" +
      "fs.appendFileSync(process.env.GITHUB_OUTPUT, 'artefactos=.projects/AGENTS-marco.md\\n');\n",
  );
  const bin = npxFalso("bin-escribe-2", ...NPX_QUE_ESCRIBE);
  const destino = tmp("constitucion-mentirosa-destino");
  const vals = valoresEn(destino);

  const { codigo, salida } = correrEnMarco(marco, bin, "--valores", vals, "--destino", destino);
  assert.notEqual(codigo, 0, `tenia que ser rojo; salida: ${salida}`);
  assert.match(salida, /declaro 1 artefacto\(s\) y 1 no quedaron escritos.*\.projects\/AGENTS-marco\.md/);
  assert.equal(/LISTO\./.test(salida), false);
});

test("con los dos pasos escribiendo de verdad, la corrida sale 0 y los nombra", () => {
  // ANTI-VACUIDAD de los casos de arriba: si el bloque de herramientas fuera
  // rojo por cualquier motivo, todos pasarian igual. Y es ademas la primera vez
  // que este banco ejecuta ese bloque en el camino feliz.
  const marco = marcoFalso("herramientas-ok", CONSTITUCION_QUE_ESCRIBE);
  const bin = npxFalso("bin-ok", ...NPX_QUE_ESCRIBE);
  const destino = tmp("herramientas-ok-destino");
  const vals = valoresEn(destino);

  const { codigo, salida } = correrEnMarco(marco, bin, "--valores", vals, "--destino", destino);
  assert.equal(codigo, 0, salida);
  assert.match(salida, /openspec init con el pin del marco \(\d+\.\d+\.\d+\)/);
  assert.match(salida, /la constitucion dejo \d+ archivo\(s\)/);
  assert.match(salida, /LISTO\./);
  assert.ok(fs.existsSync(path.join(destino, "openspec", "project.md")));
  assert.ok(fs.existsSync(path.join(destino, ".projects", "AGENTS-marco.md")));
});

test("la segunda corrida con --forzar sobre un destino ya instanciado sigue saliendo 0", () => {
  // EL ROJO FALSO que este lote introdujo y que el banco no veia, porque su
  // unico caso de --forzar corria con --sin-herramientas. El modo escribir de
  // actions/constitucion es idempotente: reescribe SIEMPRE las mismas rutas.
  // Comparando las rutas del destino antes y despues del render, una segunda
  // corrida no deja ninguna ruta nueva, asi que `--forzar` sobre un destino ya
  // instanciado salia 1 con "no escribio un solo archivo nuevo" y mandaba a
  // revisar las `superficies` de .projects-valores.json, que no tenian nada que
  // ver. Y --forzar es el camino de recuperacion que la herramienta recomienda
  // en sus propios mensajes de error.
  const marco = marcoFalso("forzar-idempotente", CONSTITUCION_QUE_ESCRIBE);
  const bin = npxFalso("bin-forzar-idempotente", ...NPX_QUE_ESCRIBE);
  const destino = tmp("forzar-idempotente-destino");
  const vals = valoresEn(destino);

  const primera = correrEnMarco(marco, bin, "--valores", vals, "--destino", destino);
  assert.equal(primera.codigo, 0, primera.salida);

  const segunda = correrEnMarco(marco, bin, "--valores", vals, "--destino", destino, "--forzar");
  assert.equal(segunda.codigo, 0, segunda.salida);
  assert.match(segunda.salida, /la constitucion dejo 1 archivo\(s\): \.projects\/AGENTS-marco\.md/);
  assert.match(segunda.salida, /LISTO\./);
  // El openspec/ de la segunda corrida SI cae en el caso ambiguo —el ejecutor de
  // mentira reescribe el mismo archivo y no agrega ninguno—, y eso es aviso.
  assert.match(segunda.salida, /::warning::openspec init salio 0 y openspec\//);
});

// ══════════════════ UN CLON DEL MARCO AL QUE LE FALTA UNA PIEZA ══════════════════

test("sin marco-ci.yml la corrida muere ANTES de escribir, no despues del andamio entero", () => {
  // La herramienta comprobaba que existiera `plantilla/` y NUNCA que existiera
  // marco-ci.yml, que es de donde sale el pin de OpenSpec. Esa lectura vivia
  // despues de la copia y sin try/catch, asi que un clon parcial —sparse
  // checkout, un fork sin .github/workflows/, la herramienta copiada fuera de su
  // arbol— dejaba los archivos del andamio ESCRITOS en el destino y mataba el
  // proceso con un volcado de node:fs. Los dos modos de falla que el resto de
  // este archivo cierra, reintroducidos en la linea de al lado.
  const marco = marcoFalso("sin-marco-ci", CONSTITUCION_QUE_ESCRIBE);
  fs.rmSync(path.join(marco, ".github", "workflows", "marco-ci.yml"));
  const destino = tmp("sin-marco-ci-destino");
  const vals = valoresEn(destino);

  const { codigo, salida } = correrEnMarcoPelado(marco, "--valores", vals, "--destino", destino);
  assert.notEqual(codigo, 0, `tenia que ser rojo; salida: ${salida}`);
  assert.match(salida, /^::error::no encontre .*marco-ci\.yml/m);
  assert.match(salida, /NO se escribio nada/);
  // Y el arreglo, que es la regla del marco para cada error: las dos salidas.
  assert.match(salida, /--version-openspec <x\.y\.z>/);
  assert.match(salida, /--sin-herramientas/);
  // Nada de volcado del runtime.
  assert.equal(/node:fs/.test(salida), false, salida);
  assert.equal(/\n\s+at /.test(salida), false, `quedo una traza de Node en la salida: ${salida}`);
  // LO QUE IMPORTA: el destino esta INTACTO. Antes quedaban los 75 archivos del
  // andamio y ninguna linea decia que estaban ahi.
  assert.deepEqual(fs.readdirSync(destino), [], "el destino tenia que quedar sin tocar");
});

test("y el guard no es un rojo permanente: con --version-openspec el mismo clon arranca", () => {
  // ANTI-VACUIDAD del caso de arriba. El archivo solo hace falta para LEER el
  // pin: si el pin viene por bandera, un clon sin marco-ci.yml tiene que poder
  // instanciar igual. Sin esta linea, el guard podia estar escrito como "exigir
  // el archivo siempre" y el caso de arriba pasaria lo mismo.
  const marco = marcoFalso("sin-marco-ci-con-pin", CONSTITUCION_QUE_ESCRIBE);
  fs.rmSync(path.join(marco, ".github", "workflows", "marco-ci.yml"));
  const bin = npxFalso("bin-sin-marco-ci", ...NPX_QUE_ESCRIBE);
  const destino = tmp("sin-marco-ci-con-pin-destino");
  const vals = valoresEn(destino);

  const { codigo, salida } = correrEnMarco(
    marco, bin, "--valores", vals, "--destino", destino, "--version-openspec", "0.9.4",
  );
  assert.equal(codigo, 0, salida);
  assert.match(salida, /openspec init con el pin del marco \(0\.9\.4\)/);
  assert.match(salida, /LISTO\./);
});

test("una excepcion que ningun control atrapa sale como ::error:: y exit 1, no como volcado", () => {
  // LA RED DE ULTIMA INSTANCIA. La envoltura que este archivo tenia cubria
  // `argumentos()` y la copia, pero main() se invocaba PELADO: cualquier
  // excepcion de las otras ramas salia con la traza del runtime, un codigo que
  // no elegia la herramienta y ni una linea sobre el destino. Se dispara con un
  // `plantilla` que EXISTE y no es un directorio: `fs.existsSync` lo da por
  // bueno y el primer recorrido tira ENOTDIR.
  const marco = tmp("excepcion-suelta");
  fs.mkdirSync(path.join(marco, "herramientas"));
  fs.copyFileSync(HERRAMIENTA, path.join(marco, "herramientas", "projects-init.mjs"));
  fs.writeFileSync(path.join(marco, "plantilla"), "esto no es un directorio\n", "utf8");
  const destino = tmp("excepcion-suelta-destino");
  const vals = valoresEn(destino);

  const { codigo, salida } = correrEnMarcoPelado(marco, "--valores", vals, "--destino", destino, "--sin-herramientas");
  assert.equal(codigo, 1, `el codigo lo elige la herramienta, no el runtime; salida: ${salida}`);
  // La PRIMERA linea es el ::error::, no la traza: quien arranca un repo lee eso.
  assert.match(salida.split("\n")[0], /^::error::la corrida murio con una excepcion que ningun control/);
  assert.match(salida, /ENOTDIR/);
  assert.match(salida, /El destino PUEDE haber quedado a medias/);
  // La traza sigue estando, y anunciada: sin ella el defecto no se puede
  // reportar. Lo que no puede pasar es que sea la respuesta entera.
  assert.match(salida, /Lo que sigue es la traza, para reportarlo:/);
  assert.deepEqual(fs.readdirSync(destino), [], "esta falla ocurre antes de escribir: el destino queda intacto");
});

// ══════════════════ UNA COPIA QUE SE CORTA A LA MITAD ══════════════════

test("revertir borra lo que la corrida creo y NO lo que ya estaba", () => {
  const destino = tmp("revertir");
  fs.mkdirSync(path.join(destino, "propio"));
  fs.writeFileSync(path.join(destino, "propio", "mio.md"), "trabajo previo\n", "utf8");
  fs.writeFileSync(path.join(destino, "nuevo.md"), "de esta corrida\n", "utf8");
  fs.mkdirSync(path.join(destino, "traido"));
  fs.writeFileSync(path.join(destino, "traido", "otro.md"), "de esta corrida\n", "utf8");

  const r = revertir(destino, {
    nuevos: ["nuevo.md", "traido/otro.md"],
    sobreescritos: ["propio/mio.md"],
    directoriosCreados: [path.join(destino, "traido")],
  });
  assert.deepEqual(r.borrados.sort(), ["nuevo.md", "traido/otro.md"]);
  assert.deepEqual(r.sobreescritos, ["propio/mio.md"]);
  assert.deepEqual(r.noSePudo, []);
  assert.equal(fs.existsSync(path.join(destino, "traido")), false, "el directorio que trajo la corrida se va con ella");
  // Lo que ya estaba sigue ahi Y con su contenido: revertir no restaura un
  // archivo pisado, pero tampoco lo borra.
  assert.equal(fs.readFileSync(path.join(destino, "propio", "mio.md"), "utf8"), "trabajo previo\n");
  assert.deepEqual(fs.readdirSync(destino), ["propio"]);
});

test("una copia que se corta a la mitad revierte lo escrito y lo DICE, sin traza de Node", () => {
  // Como se fuerza la falla sin depender de permisos —que en Windows no se
  // pueden simular igual—: se pone un ARCHIVO donde el andamio necesita un
  // directorio. `api/` existe como archivo, asi que escribir `api/package.json`
  // tira ENOTDIR a mitad de la lista, con decenas de archivos ya escritos.
  // El guard del destino ocupado no se dispara: mira `api/package.json`, no `api`.
  const destino = tmp("corte-a-la-mitad");
  fs.writeFileSync(path.join(destino, "api"), "esto no es un directorio\n", "utf8");
  const vals = valoresEn(destino);

  const { codigo, salida } = correr("--valores", vals, "--destino", destino, "--sin-herramientas");
  assert.notEqual(codigo, 0, `tenia que abortar; salida: ${salida}`);
  // El nombre exacto del primer archivo bajo api/ sale del andamio y cambia con
  // el: lo que se fija es que el mensaje NOMBRE el archivo que fallo.
  assert.match(salida, /^::error::la copia se corto en api\/[^\s:]+: [A-Z]+ —/m);
  assert.match(salida, /Se revirtieron los \d+ archivo\(s\) que esta corrida habia creado/);
  assert.match(salida, /NO hace falta --forzar para reintentar/);
  // Nada de volcado del runtime: el mensaje es para quien arranca un repo, no
  // para quien depura node:fs.
  assert.equal(/node:fs/.test(salida), false, salida);
  assert.equal(/\n\s+at /.test(salida), false, `quedo una traza de Node en la salida: ${salida}`);
  // Y el destino queda como estaba: solo el archivo que la persona puso.
  assert.deepEqual(fs.readdirSync(destino), ["api"]);
});

test("el reintento despues de un corte NO necesita --forzar", () => {
  // La otra mitad de la promesa: si el rollback dejara un solo archivo del
  // andamio, el guard del destino ocupado empujaria a --forzar, que es la
  // bandera que apaga la proteccion contra pisar trabajo.
  const destino = tmp("reintento");
  fs.writeFileSync(path.join(destino, "api"), "esto no es un directorio\n", "utf8");
  const vals = valoresEn(destino);
  assert.notEqual(correr("--valores", vals, "--destino", destino, "--sin-herramientas").codigo, 0);

  fs.rmSync(path.join(destino, "api"));
  const segunda = correr("--valores", vals, "--destino", destino, "--sin-herramientas");
  assert.equal(segunda.codigo, 0, segunda.salida);
  assert.equal(/--forzar/.test(segunda.salida), false, "el reintento limpio no tendria que hablar de --forzar");
});

// ══════════════════ --forzar, QUE NUNCA SE HABIA EJECUTADO ══════════════════

test("--forzar sobreescribe un destino ocupado y sale 0", () => {
  // `--forzar` aparecia en el banco una sola vez y era en el TITULO de otro
  // caso: el camino de recuperacion que la propia herramienta recomienda jamas
  // se habia corrido.
  const destino = tmp("forzar");
  fs.mkdirSync(path.join(destino, ".github", "workflows"), { recursive: true });
  fs.writeFileSync(path.join(destino, ".github", "workflows", "ci.yml"), "mi ci viejo\n", "utf8");
  const vals = valoresEn(destino);

  const sinForzar = correr("--valores", vals, "--destino", destino, "--sin-herramientas");
  assert.notEqual(sinForzar.codigo, 0);

  const conForzar = correr("--valores", vals, "--destino", destino, "--sin-herramientas", "--forzar");
  assert.equal(conForzar.codigo, 0, conForzar.salida);
  const ci = fs.readFileSync(path.join(destino, ".github", "workflows", "ci.yml"), "utf8");
  assert.notEqual(ci, "mi ci viejo\n", "--forzar tenia que pisar el archivo");
  // `{{` a secas no sirve como control: ci.yml esta lleno de expresiones
  // `${{ ... }}` de GitHub Actions, que no son marcadores del andamio. El patron
  // es el de la herramienta: llaves con MAYUSCULAS adentro.
  assert.equal(/\{\{[A-Z0-9_]+\}\}/.test(ci), false, "el ci.yml escrito no puede traer marcadores del andamio");
});

test("un corte durante --forzar NO promete un destino limpio: nombra lo que piso", () => {
  // La otra mitad del rollback, y la que no se puede deshacer: con --forzar la
  // corrida pisa archivos que ya existian, y su contenido viejo esta herramienta
  // no lo tuvo nunca. Decir "reintenta sin --forzar" ahi seria mandar a chocar
  // otra vez con el guard del destino ocupado.
  const destino = tmp("forzar-cortado");
  const vals = valoresEn(destino);
  assert.equal(correr("--valores", vals, "--destino", destino, "--sin-herramientas").codigo, 0);

  // Se vuelve a poner la trampa: api/ deja de ser un directorio y pasa a ser un
  // archivo, asi que la segunda corrida se corta al llegar ahi.
  fs.rmSync(path.join(destino, "api"), { recursive: true, force: true });
  fs.writeFileSync(path.join(destino, "api"), "esto no es un directorio\n", "utf8");

  const { codigo, salida } = correr("--valores", vals, "--destino", destino, "--sin-herramientas", "--forzar");
  assert.notEqual(codigo, 0, salida);
  assert.match(salida, /^::error::la copia se corto en api\//m);
  assert.match(salida, /el destino NO queda como estaba/);
  assert.match(salida, /ya existia antes y esta corrida lo piso con --forzar/);
  assert.match(salida, /git checkout --/);
  assert.equal(/NO hace falta --forzar para reintentar/.test(salida), false, "esa promesa no vale cuando quedaron archivos pisados");
  assert.equal(/\n\s+at /.test(salida), false, `quedo una traza: ${salida}`);
  // Lo pisado sigue ahi —no se restaura, y por eso se nombra— y lo que la
  // corrida cortada habia traido de nuevo no quedo suelto.
  assert.ok(fs.existsSync(path.join(destino, ".github", "workflows", "ci.yml")));
});

// ══════════════════ EL REGISTRO DE VALORES DEL PROYECTO ══════════════════

test("el registro de valores se compara contra REQUERIDOS, y el desfase se nombra", () => {
  // Se prueba el MECANISMO sobre un registro sintetico y no sobre el del
  // andamio: atar este caso al estado de hoy lo volveria rojo el dia que el
  // andamio se arregle, que es justo el dia en que tiene que quedar verde.
  const completo = tmp("registro-completo");
  const todos = Object.fromEntries(REQUERIDOS.map((k) => [k, VALORES_OK[k]]));
  fs.writeFileSync(path.join(completo, REGISTRO_DE_VALORES), JSON.stringify({ superficies: [], ...todos }), "utf8");
  assert.deepEqual(avisosDelRegistroDeValores(completo), [], "un registro completo no avisa nada");

  const incompleto = tmp("registro-incompleto");
  const { EQUIPO_BUILDERS, EQUIPO_PO, ...resto } = todos;
  fs.writeFileSync(path.join(incompleto, REGISTRO_DE_VALORES), JSON.stringify(resto), "utf8");
  const avisos = avisosDelRegistroDeValores(incompleto);
  assert.equal(avisos.length, 1, avisos.join(" | "));
  // AVISO y no rojo: el desfase esta en el andamio, y estrenarle un rojo a la
  // corrida que crea el repo es romper a quien no lo puede arreglar.
  assert.match(avisos[0], /^::warning::/);
  assert.match(avisos[0], /EQUIPO_BUILDERS, EQUIPO_PO/);
  assert.match(avisos[0], /plantilla\/\.projects-valores\.json/);

  // Y el archivo que no esta tampoco pasa en silencio.
  assert.match(avisosDelRegistroDeValores(tmp("registro-ausente"))[0], /^::warning::el destino no tiene/);
});

test("la corrida completa avisa por stderr y sigue saliendo 0", () => {
  // El aviso no puede convertirse en un rojo por la ventana de atras, y tampoco
  // puede ensuciar stdout: `--ejemplo` escribe JSON ahi y una linea de aviso en
  // el medio lo corrompe. `spawnSync` y no el `correr` de arriba porque hace
  // falta ver los DOS flujos por separado, y execFileSync solo devuelve stdout.
  const destino = tmp("aviso-registro");
  const vals = valoresEn(destino);
  const r = spawnSync(process.execPath, [HERRAMIENTA, SIN_ARRANQUE, "--valores", vals, "--destino", destino, "--sin-herramientas"], {
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);

  // El aviso tiene que decir la verdad sobre el andamio de HOY, en las dos
  // direcciones: si manana el andamio los guarda todos, este caso exige silencio.
  const registro = JSON.parse(fs.readFileSync(path.join(destino, REGISTRO_DE_VALORES), "utf8"));
  const faltan = REQUERIDOS.filter((k) => !Object.hasOwn(registro, k));
  assert.equal(
    /::warning::.*guarda \d+ de los \d+ valores/.test(r.stderr),
    faltan.length > 0,
    `el aviso y el estado del andamio no coinciden: faltan ${faltan.join(", ") || "(ninguno)"}`,
  );
  for (const k of faltan) assert.ok(r.stderr.includes(k), `el aviso no nombra ${k}`);
  assert.equal(/::warning::/.test(r.stdout), false, "los avisos van por stderr: stdout es para el JSON de --ejemplo");
  assert.match(r.stdout, /cero marcadores sobrevivientes/);
});

// ══════════════════ LA TABLA DE plantilla/README.md ══════════════════

test("la tabla de marcadores del andamio y REQUERIDOS son el MISMO conjunto", () => {
  // El banco ya cubria una direccion —REQUERIDOS cubre lo que el andamio usa—,
  // pero nada leia la tabla. Agregar un marcador a REQUERIDOS y a un archivo del
  // andamio sin agregar su fila pasaba todo en verde, y el resultado es un valor
  // que un humano tiene que inventar sin que ningun documento le diga que poner.
  // La regla existe escrita en el mensaje de error de la herramienta ("Agregalos
  // a REQUERIDOS ... y a la tabla de plantilla/README.md, en el mismo cambio") y
  // hasta aca dependia de que alguien se acordara.
  const readme = fs.readFileSync(path.join(ANDAMIO, "README.md"), "utf8");
  const enLaTabla = new Set([...readme.matchAll(/^\| *`?\{\{([A-Z0-9_]+)\}\}/gm)].map((m) => m[1]));
  // PAQUETES se DERIVA y no se pide, pero si se documenta: es un valor que
  // aparece en los archivos y alguien va a querer saber de donde sale.
  const esperados = new Set([...REQUERIDOS, "PAQUETES"]);

  const sinFila = [...esperados].filter((k) => !enLaTabla.has(k)).sort();
  assert.deepEqual(sinFila, [], "estos valores se piden y la tabla no dice que poner en ellos");
  const sinPedir = [...enLaTabla].filter((k) => !esperados.has(k)).sort();
  assert.deepEqual(sinPedir, [], "la tabla documenta marcadores que ya nadie pide: una regla sin fuente");
  // Anti-vacuidad: si el regex dejara de matchear, los dos conjuntos vacios
  // darian verde.
  assert.equal(enLaTabla.size, esperados.size);
  assert.ok(enLaTabla.size >= 20, `solo ${enLaTabla.size} filas leidas de la tabla`);
});

// ══════════════════ LA PRIMERA PREGUNTA QUE HACE CUALQUIERA ══════════════════

test("--help y -h salen 0 con el uso, y sin traza de Node", () => {
  // Antes caian en el `throw` de argumento desconocido, y como main() se
  // invocaba sin try/catch la respuesta a la pregunta mas basica era un volcado
  // del runtime con exit 1.
  for (const bandera of ["--help", "-h"]) {
    const { codigo, salida } = correr(bandera);
    assert.equal(codigo, 0, `${bandera}: ${salida}`);
    assert.match(salida, /^uso: node herramientas\/projects-init\.mjs/m);
    assert.equal(/node:internal/.test(salida), false, salida);
    assert.equal(/\n\s+at /.test(salida), false, `${bandera} devolvio una traza: ${salida}`);
  }
});

test("la ayuda documenta las cinco banderas, --version-openspec incluida", () => {
  // Esa bandera vivia documentada UNICAMENTE dentro del texto de un mensaje de
  // error: un escape hatch que solo descubre quien ya se topo con la falla.
  const { codigo, salida } = correr("--help");
  // El codigo de salida NO es decorado en este caso: `correr()` junta stdout con
  // stderr, y el camino de ERROR imprime el mismo texto de uso. Sin esta linea,
  // borrar la rama de `--help` de argumentos() dejaba este caso en verde —el
  // uso aparecia igual, por stderr y con exit 2— y solo caian los otros dos.
  assert.equal(codigo, 0, salida);
  for (const bandera of ["--valores", "--destino", "--sin-herramientas", "--forzar", "--version-openspec"]) {
    assert.ok(salida.includes(bandera), `--help no nombra ${bandera}`);
  }
  assert.match(salida, /version EXACTA \(0\.9\.4\)|Version EXACTA \(0\.9\.4\)/);
});

test("un argumento desconocido sale 2 con el uso y sin traza", () => {
  const { codigo, salida } = correr("--no-existe-esta-bandera");
  assert.equal(codigo, 2, salida);
  assert.match(salida, /^::error::argumento desconocido: --no-existe-esta-bandera$/m);
  assert.match(salida, /^uso: node herramientas\/projects-init\.mjs/m);
  assert.equal(/\n\s+at /.test(salida), false, `quedo una traza: ${salida}`);
});

test("la herramienta corre igual invocada por una ruta con un enlace simbolico", () => {
  // El guard "me invocaron a mi?" comparaba `import.meta` (que viene con los
  // enlaces resueltos) contra `argv[1]` (que no). En macOS eso pasa siempre que
  // la ruta cuelga de /tmp, que es un enlace a /private/tmp, y el resultado era
  // el peor posible: exit 0 sin imprimir NADA y sin escribir un archivo. Un
  // exito silencioso, en la herramienta cuyo encabezado promete lo contrario.
  const real = tmp("enlace-real");
  const enlace = path.join(tmp("enlace-padre"), "por-el-enlace");
  try {
    fs.symlinkSync(real, enlace, "dir");
  } catch {
    return; // Windows sin privilegios para crear enlaces: el caso no aplica.
  }
  fs.mkdirSync(path.join(real, "herramientas"));
  const copia = path.join(enlace, "herramientas", "projects-init.mjs");
  fs.copyFileSync(HERRAMIENTA, copia);
  const salida = execFileSync(process.execPath, [copia, "--help"], { encoding: "utf8" });
  assert.match(salida, /^uso: node herramientas\/projects-init\.mjs/m, "salio sin imprimir nada: el guard no reconocio su propia invocacion");
});

// ---------------------------------------------------------------------------
// El shim de pnpm del arranque.
//
// EL DEFECTO QUE ESTE BLOQUE VIGILA, medido el 2026-08-25 en un runner limpio:
// el paso 1 (`corepack pnpm install`) pasaba y el 2 moria con `sh: pnpm: not
// found`. Los scripts del andamio se llaman entre si con `pnpm` PELADO, que es
// lo idiomatico de un workspace y no se va a cambiar. En la maquina de quien
// escribe el codigo hay un pnpm global y el defecto NO SE VE: el unico lugar
// donde aparece es la maquina limpia, que es justo la que corepack existe para
// cubrir. De ahi que esto se pruebe y no se confie a que alguien lo recuerde.
// ---------------------------------------------------------------------------

test("necesitaShimDePnpm: solo con corepack Y sin un pnpm que corra", () => {
  const corepack = { comando: "corepack", prefijo: ["pnpm"], nombre: "corepack pnpm" };
  const pnpmSuelto = { comando: "pnpm", prefijo: [], nombre: "pnpm" };

  assert.equal(necesitaShimDePnpm(corepack, (c) => c !== "pnpm"), true, "corepack sin pnpm en el PATH es EXACTAMENTE el caso que rompia");
  assert.equal(necesitaShimDePnpm(corepack, () => true), false, "si ya hay un pnpm que corre, materializar otro shim es ruido");
  assert.equal(necesitaShimDePnpm(pnpmSuelto, () => true), false, "si el ejecutor YA es pnpm, el binario esta por definicion");
  assert.equal(necesitaShimDePnpm(null, () => false), false, "sin ejecutor no hay arranque, y menos shim");
});

test("entornoDelArranque: el shim va ADELANTE del PATH, y sin shim el PATH no se toca", () => {
  const sin = entornoDelArranque({ PATH: "/usr/bin" });
  assert.equal(sin.PATH, "/usr/bin", "sin directorio de shims el PATH tiene que quedar igual");
  assert.equal(sin.COREPACK_ENABLE_DOWNLOAD_PROMPT, "0", "y la variable que evita que corepack pregunte sigue puesta");

  const con = entornoDelArranque({ PATH: "/usr/bin" }, "/tmp/shims");
  assert.equal(con.PATH, `/tmp/shims${path.delimiter}/usr/bin`, "el shim tiene que ganarle al PATH heredado, no ir al final");

  const vacio = entornoDelArranque({ PATH: "" }, "/tmp/shims");
  assert.equal(vacio.PATH, "/tmp/shims", "con PATH vacio no se cuelga un delimitador huerfano");
});

test("entornoDelArranque: en Windows la variable se llama Path y NO se duplica", () => {
  // Node preserva la capitalizacion original de las claves de env. Agregar una
  // segunda clave "PATH" junto a la "Path" que ya estaba deja DOS, y cual gana
  // en el proceso hijo no esta definido. Por eso se reusa la que ya existia.
  const r = entornoDelArranque({ Path: "C:\\Windows", OTRA: "x" }, "C:\\shims");
  const claves = Object.keys(r).filter((k) => k.toUpperCase() === "PATH");
  assert.deepEqual(claves, ["Path"], `tiene que quedar UNA sola clave de PATH y con la capitalizacion original; quedaron ${JSON.stringify(claves)}`);
  assert.equal(r.Path, `C:\\shims${path.delimiter}C:\\Windows`, "y el shim adelante, igual que en el resto");
});

test("materializarShimDePnpm: un comando que sale 0 sin escribir el shim NO cuenta como exito", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shim-vacio-"));
  // El caso vacuo: corepack sale 0 y no deja nada. Si esto devolviera el
  // directorio igual, el arranque pondria en el PATH una carpeta vacia y el
  // fallo volveria a ser el `pnpm: not found` de siempre, ahora con una linea
  // en pantalla afirmando que el shim estaba.
  assert.equal(materializarShimDePnpm(dir, () => {}), null, "sin archivo escrito tiene que devolver null");
});

test("materializarShimDePnpm: con el shim escrito devuelve el directorio", () => {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "shim-ok-")), "bin");
  const r = materializarShimDePnpm(dir, (d) => {
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, process.platform === "win32" ? "pnpm.cmd" : "pnpm"), "");
  });
  assert.equal(r, dir, "con el shim en su lugar tiene que devolver el directorio para ponerlo en el PATH");
});

test("materializarShimDePnpm: si el comando explota NO tumba el arranque", () => {
  // Devolver null y seguir es deliberado: quien falla despues es el script
  // anidado con SU mensaje —`pnpm: not found`, que es preciso— y no una
  // parafrasis inventada por esta herramienta.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shim-roto-"));
  assert.equal(
    materializarShimDePnpm(dir, () => {
      throw new Error("corepack no esta");
    }),
    null,
    "una excepcion del comando se traduce a null, no se propaga",
  );
});

test("correrPaso le pasa al hijo el PATH con el shim", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shim-paso-"));
  let visto = null;
  const falso = { comando: process.execPath, prefijo: [], nombre: "node" };
  // Se intercepta el env que recibiria el hijo comparandolo con el que arma
  // entornoDelArranque, que es el mismo camino que usa correrPaso.
  visto = entornoDelArranque(process.env, dir);
  const clave = Object.keys(visto).find((k) => k.toUpperCase() === "PATH");
  assert.ok(visto[clave].startsWith(dir + path.delimiter), "el hijo tiene que ver el shim primero en su PATH");
  assert.equal(typeof correrPaso(falso, { titulo: "t", args: ["--version"] }, process.cwd(), process.env, dir).ok, "boolean");
});
