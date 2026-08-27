// GUARDA DE LOS MANIFIESTOS DEL ANDAMIO.
//
// POR QUE EXISTE, y es un hueco que se abrio el 2026-08-22. Hasta ese dia el
// andamio traia solo mecanica: ningun package.json, ningun script, ninguna
// config de cobertura. Desde que absorbio el esqueleto de aplicacion, reparte
// manifiestos — y un manifiesto es exactamente donde vive un fail-open barato.
// El material que se absorbio traia TRES, medidos: `"lint": "eslint . || true"`
// en los dos paquetes y `"test": "vitest run --passWithNoTests"` en el front.
// Se corrigieron al absorberlos; lo que faltaba era algo que muerda si vuelven.
//
// Y no es hipotetico: un `|| true` es la forma mas facil de poner verde una
// compuerta sin arreglar nada, y en un andamio se multiplica por cada repo que
// nazca de el.
//
// LO QUE VERIFICA. Cuatro propiedades sobre el andamio, cada una LEIDA del
// arbol y no repetida aca:
//   1. ningun script de ningun manifiesto enmascara su codigo de salida;
//   2. los scripts que el pipeline invoca estan declarados donde los busca, y
//      ninguna excepcion del ci.yml apunta a un paquete que no existe;
//   3. cada paquete verificable extiende la cobertura del marco Y emite reporte;
//   4. ninguna RUTA del andamio lleva un marcador, ni choca con otra al aterrizar.
//
// LA 4 CAMBIO DE ALCANCE, y el motivo es un cambio del andamio, no un gusto:
// hasta que existieron los RENOMBRES, la ruta de destino de un archivo ERA su
// ruta en el andamio, asi que mirar el arbol de origen alcanzaba. Desde que un
// archivo puede aterrizar con otro nombre, la ruta que llega al repo nuevo ya no
// se lee del `readdir`: hay que preguntarsela a la herramienta. Y aparece un
// segundo modo de falla que antes era imposible por construccion —dos archivos
// del andamio compitiendo por el MISMO nombre en el destino, donde el segundo
// pisa al primero y la corrida sale 0 igual—, asi que se comprueba tambien.
//
// Mas una que hace que las cuatro signifiquen algo: cada una MUERDE. Se
// mutan copias en un directorio temporal —nunca el arbol del repo— y se exige
// que la comprobacion que le toca reporte el problema.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
// El renombre se le PREGUNTA a la herramienta que lo hace, no se repite aca: una
// segunda copia del mapa es exactamente lo que se desincroniza del original.
import { destinoDe, seExcluyeDelCopiado } from "../../herramientas/projects-init.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ANDAMIO = path.join(RAIZ, "plantilla");

// ---------------------------------------------------------------------------
// Lectura del andamio. Todo sale del arbol: los paquetes del workspace, los
// scripts que el ci.yml exige y sus excepciones. Repetir cualquiera de esos
// aca seria una segunda declaracion que puede divergir de la primera.
// ---------------------------------------------------------------------------

/** El paquete al que apunta un lado izquierdo de EXCEPCIONES.
 *
 *  Un marcador `{{PAQUETE_FOO}}` resuelve al directorio `foo`: es la convencion del
 *  andamio (el valor de la clave ES el nombre del directorio) y es derivable, asi que
 *  la excepcion queda acotada a UN paquete. La primera version de esto aceptaba
 *  cualquier marcador como "aplica a todos", y con eso eximia a los tres paquetes de
 *  tener `test`: dos mutaciones no mordian. Lo cazo la propia prueba de mordida.
 */
function paqueteDeExcepcion(lado) {
  const m = lado.match(/^{{PAQUETE_([A-Z0-9_]+)}}$/);
  return m ? m[1].toLowerCase() : lado;
}

/** Los paquetes del workspace.
 *
 *  RESUELVE EL GLOB, y esa es la mitad que faltaba. El workspace dejo de listar
 *  `web`, `api` y `e2e` a mano —esa lista rompia cualquier forma de proyecto que
 *  no tuviera exactamente esos tres— y pasa a enumerar con `*`. Leer solo los
 *  literales devolvia `["*"]`, o sea un paquete llamado asterisco que no existe
 *  en ninguna parte, y todo lo que comparaba contra esta lista se caia. */
function paquetesDeclarados(raiz) {
  const f = path.join(raiz, "pnpm-workspace.yaml");
  if (!fs.existsSync(f)) return [];
  const declarados = [...fs.readFileSync(f, "utf8").matchAll(/^\s*-\s*"([^"]+)"\s*$/gm)].map((m) => m[1]);
  if (!declarados.includes("*")) return declarados;
  const enDisco = fs
    .readdirSync(raiz, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(raiz, e.name, "package.json")))
    .map((e) => e.name);
  return [...new Set([...enDisco, ...declarados.filter((d) => d !== "*")])].sort();
}

/** Lo que el ci.yml del andamio exige: los scripts por paquete, las excepciones
 *  declaradas, y los scripts que invoca en la RAIZ. */
function exigenciasDelPipeline(raiz) {
  const f = path.join(raiz, ".github/workflows/ci.yml");
  const texto = fs.readFileSync(f, "utf8");

  const mScripts = texto.match(/^\s*SCRIPTS:\s*"([^"]*)"/m);
  const mExcepciones = texto.match(/^\s*EXCEPCIONES:\s*"([^"]*)"/m);

  return {
    porPaquete: mScripts ? mScripts[1].split(/\s+/).filter(Boolean) : [],
    excepciones: mExcepciones ? mExcepciones[1].split(/\s+/).filter(Boolean) : [],
    // `- run: pnpm <script>` en la raiz. Se excluyen los que llevan argumentos
    // (`pnpm install --frozen-lockfile`, `pnpm --filter ...`): esos no son
    // scripts del manifiesto.
    enLaRaiz: [...texto.matchAll(/^\s*-\s*run:\s*pnpm\s+([a-z][a-z0-9:-]*)\s*$/gm)].map((m) => m[1]),
  };
}

/** Todos los manifiestos del andamio: la raiz y cada paquete que exista. */
function manifiestos(raiz) {
  const salida = [];
  const raizPkg = path.join(raiz, "package.json");
  if (fs.existsSync(raizPkg)) {
    salida.push({ nombre: "(raiz)", ruta: raizPkg, json: JSON.parse(fs.readFileSync(raizPkg, "utf8")) });
  }
  for (const p of paquetesDeclarados(raiz)) {
    const f = path.join(raiz, p, "package.json");
    if (fs.existsSync(f)) salida.push({ nombre: p, ruta: f, json: JSON.parse(fs.readFileSync(f, "utf8")) });
  }
  return salida;
}

/** Los archivos del andamio, como rutas relativas con separador "/". */
function rutasDelAndamio(raiz) {
  const salida = [];
  for (const e of fs.readdirSync(raiz, { withFileTypes: true, recursive: true })) {
    const abs = path.join(e.parentPath ?? e.path, e.name);
    salida.push(path.relative(raiz, abs).split(path.sep).join("/"));
  }
  return salida;
}

// ---------------------------------------------------------------------------
// Las comprobaciones. En funciones, para que las corran DOS clientes: el
// andamio de verdad (sin problema) y las copias mutadas (con problema). Una
// comprobacion escrita dos veces se desincroniza y la mitad de mutacion deja de
// significar algo.
//
// Cada una devuelve null si esta bien, o el texto del problema.
// ---------------------------------------------------------------------------

// Las formas de enmascarar un codigo de salida que ya se vieron en este arbol o
// que son un clasico. La lista es EXACTA a proposito: un detector de la idea
// ("¿este script puede tapar un fallo?") no es decidible con un escaneo de
// texto, y un check que se pone rojo con un script bien escrito ensena a
// ignorarlo. Lo que garantiza esta lista es que las tres que ya se colaron no se
// cuelen otra vez.
const ENMASCARAMIENTOS = [
  { patron: "|| true", que: "el `|| true` traga el fallo y el script sale 0 igual" },
  { patron: "|| exit 0", que: "sale 0 aunque el comando de adentro fallara" },
  { patron: "; exit 0", que: "el `exit 0` final descarta el codigo del comando anterior" },
  { patron: "--passWithNoTests", que: "pasa en verde con CERO pruebas ejecutadas" },
  { patron: "|| :", que: "el `:` es un no-op que devuelve 0: mismo efecto que `|| true`" },
];

const COMPROBACIONES = {
  "el andamio trae manifiestos, y estan donde el workspace dice": (raiz) => {
    const ms = manifiestos(raiz);
    if (ms.length === 0) {
      return "el andamio no trae ningun package.json: o se rompio el recorrido, o el andamio " +
        "volvio a ser solo mecanica. Las tres comprobaciones de abajo no verificarian nada";
    }
    const declarados = paquetesDeclarados(raiz);
    const faltantes = declarados.filter((p) => !fs.existsSync(path.join(raiz, p, "package.json")));
    return faltantes.length
      ? `el workspace declara paquetes sin manifiesto: ${faltantes.join(", ")}. Un paquete ` +
          "declarado y ausente hace que el censo del ci.yml le exija scripts a un directorio que no existe"
      : null;
  },

  "ningun script de ningun manifiesto enmascara su codigo de salida": (raiz) => {
    const hallazgos = [];
    for (const m of manifiestos(raiz)) {
      for (const [nombre, cuerpo] of Object.entries(m.json.scripts ?? {})) {
        for (const e of ENMASCARAMIENTOS) {
          if (String(cuerpo).includes(e.patron)) {
            hallazgos.push(`${m.nombre}:${nombre} usa "${e.patron}" — ${e.que}`);
          }
        }
      }
    }
    return hallazgos.length ? hallazgos.join("\n  ") : null;
  },

  "los scripts que el pipeline invoca estan declarados donde los busca": (raiz) => {
    const { porPaquete, excepciones, enLaRaiz } = exigenciasDelPipeline(raiz);
    const problemas = [];

    if (porPaquete.length === 0 && enLaRaiz.length === 0) {
      return "no pude leer del ci.yml del andamio ni SCRIPTS ni un solo `pnpm <script>` en la " +
        "raiz: el extractor se rompio y esta comprobacion pasaria vacuamente";
    }

    const ms = manifiestos(raiz);
    const raizM = ms.find((m) => m.nombre === "(raiz)");
    for (const s of enLaRaiz) {
      if (!raizM?.json.scripts?.[s]) problemas.push(`la raiz no declara "${s}", y el ci.yml lo invoca`);
    }

    // Las excepciones vienen como "<paquete>:<script>", y el paquete puede venir
    // como marcador porque el andamio no esta instanciado.
    const exentos = new Set();
    const declarados = paquetesDeclarados(raiz);
    for (const e of excepciones) {
      const [pkg, script] = e.split(":");
      const esMarcador = /^\{\{.+\}\}$/.test(pkg);
      // Un marcador se resuelve al valor de su clave, y por convencion del
      // andamio ese valor es el nombre del DIRECTORIO. Se acepta si alguno de
      // los paquetes declarados podria ser ese.
      if (!esMarcador && !declarados.includes(pkg)) {
        problemas.push(
          `la excepcion "${e}" del ci.yml apunta al paquete "${pkg}", que el workspace no declara. ` +
            "Una excepcion sin paquete es una compuerta apagada para nadie",
        );
      }
      if (esMarcador && declarados.length === 0) {
        problemas.push(`la excepcion "${e}" usa un marcador y el workspace no declara ningun paquete`);
      }
      exentos.add(script);
    }

    for (const m of ms) {
      if (m.nombre === "(raiz)") continue;
      for (const s of porPaquete) {
        if (m.json.scripts?.[s]) continue;
        // Exento solo si la excepcion nombra a ESTE paquete.
        const exentoDeEste = excepciones.some((e) => {
          const [lado, script] = e.split(":");
          return script === s && paqueteDeExcepcion(lado) === m.nombre;
        });
        if (!exentoDeEste) {
          problemas.push(`el paquete "${m.nombre}" no declara "${s}", que el ci.yml le exige`);
        }
      }
    }
    return problemas.length ? problemas.join("\n  ") : null;
  },

  "cada paquete verificable extiende la cobertura del marco y emite reporte": (raiz) => {
    const { porPaquete, excepciones } = exigenciasDelPipeline(raiz);
    if (!porPaquete.includes("test")) {
      return 'el ci.yml del andamio ya no exige el script "test" por paquete: esta comprobacion ' +
        "quedo sin sujeto y hay que revisarla, no borrarla";
    }
    const problemas = [];
    for (const m of manifiestos(raiz)) {
      if (m.nombre === "(raiz)") continue;
      // Un paquete exento de "test" no tiene cobertura que cablear.
      const exento = excepciones.some((e) => {
        const [lado, script] = e.split(":");
        return script === "test" && paqueteDeExcepcion(lado) === m.nombre;
      });
      if (exento || !m.json.scripts?.test) continue;

      if (!String(m.json.scripts.test).includes("--coverage")) {
        problemas.push(
          `el script "test" de "${m.nombre}" no emite cobertura (le falta --coverage). Pasa en ` +
            "verde y no deja lcov, y la compuerta del marco da rojo por falta de reporte",
        );
      }

      const dir = path.join(raiz, m.nombre);
      const configs = fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((e) => e.isFile() && /^(vitest|vite)\.config\.(ts|mts|js|mjs)$/.test(e.name))
        .map((e) => fs.readFileSync(path.join(dir, e.name), "utf8"));
      if (configs.length === 0) {
        problemas.push(`"${m.nombre}" corre pruebas y no tiene config de vitest ni de vite`);
      } else if (!configs.some((c) => c.includes("coberturaDelMarco"))) {
        problemas.push(
          `ninguna config de "${m.nombre}" extiende coberturaDelMarco(): sin eso se pierden el ` +
            "`all: true` y el projectRoot del monorepo, y la medicion sale por rutas ambiguas",
        );
      }
    }
    return problemas.length ? problemas.join("\n  ") : null;
  },

  "ningun marcador vive en una RUTA del andamio": (raiz, renombrar = destinoDe) => {
    // POR QUE ESTA. `projects init` sustituye el CONTENIDO de los archivos; una
    // RUTA no pasa por esa sustitucion. Un directorio llamado {{PAQUETE_API}}
    // llegaria literal al repo nuevo, y el check de marcadores sobrevivientes
    // —que lee contenido— firmaria "cero" sobre ese repositorio.
    //
    // Se miran las rutas de los DOS lados: la del andamio y la de destino. Un
    // renombre cuyo destino trajera un marcador tiene el mismo efecto y no
    // aparece en ningun `readdir`, porque ese nombre no existe todavia en disco.
    const conMarcador = [];
    for (const r of rutasDelAndamio(raiz)) {
      if (r.includes("{{")) conMarcador.push(r);
      const d = renombrar(r);
      if (d !== r && d.includes("{{")) conMarcador.push(`${r} -> ${d}`);
    }
    return conMarcador.length
      ? `estas rutas llevan un marcador: ${conMarcador.join(", ")}. Una ruta no pasa por la ` +
          "sustitucion de contenido, asi que llegaria literal al repo nuevo y el check de marcadores " +
          "sobrevivientes no la ve porque solo lee contenido"
      : null;
  },

  "ninguna ruta de destino la reclaman dos archivos del andamio": (raiz, renombrar = destinoDe) => {
    // POR QUE ESTA, y es un modo de falla que el renombre ESTRENO. Mientras cada
    // archivo aterrizaba con su propio nombre, dos archivos del andamio no podian
    // chocar: el sistema de archivos ya garantizaba nombres unicos en el origen.
    // Un renombre rompe esa garantia — el destino es un nombre INVENTADO, que
    // puede coincidir con el de otro archivo que si viaja.
    //
    // Y el choque no se nota: la copia escribe los dos en orden, el segundo pisa
    // al primero, el conteo de archivos escritos sale bien, no queda ningun
    // marcador sobreviviente y la corrida declara exito. El repo nuevo pierde un
    // archivo entero sin una sola linea de diagnostico.
    const porDestino = new Map();
    for (const rel of rutasDelAndamio(raiz)) {
      // Solo archivos que VIAJAN: un directorio no se pisa, y el excluido no llega.
      if (!fs.statSync(path.join(raiz, rel)).isFile()) continue;
      if (seExcluyeDelCopiado(rel)) continue;
      const d = renombrar(rel);
      porDestino.set(d, [...(porDestino.get(d) ?? []), rel]);
    }
    const choques = [...porDestino].filter(([, origenes]) => origenes.length > 1);
    return choques.length
      ? choques
          .map(([d, origenes]) => `${origenes.join(" y ")} aterrizan los dos como "${d}"`)
          .join("; ") +
          ". La copia los escribe en orden y el segundo PISA al primero, sin que nada lo diga: el conteo " +
          "de archivos escritos sale bien y no queda ningun marcador sobreviviente"
      : null;
  },
};

// ---------------------------------------------------------------------------
// 1. El andamio de verdad pasa todas.
// ---------------------------------------------------------------------------
for (const [nombre, comprobar] of Object.entries(COMPROBACIONES)) {
  test(nombre, () => {
    assert.equal(comprobar(ANDAMIO), null);
  });
}

// ---------------------------------------------------------------------------
// 2. Cada comprobacion muerde. Se mutan COPIAS: el andamio del repo no se toca,
//    asi que un fallo a mitad de camino no puede dejarlo modificado.
// ---------------------------------------------------------------------------

function copiar(origen, destino) {
  fs.mkdirSync(destino, { recursive: true });
  for (const e of fs.readdirSync(origen, { withFileTypes: true })) {
    const a = path.join(origen, e.name);
    const b = path.join(destino, e.name);
    if (e.isDirectory()) copiar(a, b);
    else fs.copyFileSync(a, b);
  }
}

function editarJson(raiz, rel, f) {
  const p = path.join(raiz, rel);
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  f(j);
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n", "utf8");
}

const MUTACIONES = [
  {
    nombre: "vuelve un `|| true` al script lint de un paquete",
    rompe: "ningun script de ningun manifiesto enmascara su codigo de salida",
    mutar: (raiz) => editarJson(raiz, "api/package.json", (j) => (j.scripts.lint += " || true")),
  },
  {
    nombre: "vuelve el --passWithNoTests al front",
    rompe: "ningun script de ningun manifiesto enmascara su codigo de salida",
    mutar: (raiz) => editarJson(raiz, "web/package.json", (j) => (j.scripts.test = "vitest run --passWithNoTests")),
  },
  {
    nombre: "la raiz pierde un script que el ci.yml invoca",
    rompe: "los scripts que el pipeline invoca estan declarados donde los busca",
    mutar: (raiz) => editarJson(raiz, "package.json", (j) => delete j.scripts["format:check"]),
  },
  {
    nombre: "un paquete pierde un script que el ci.yml le exige",
    rompe: "los scripts que el pipeline invoca estan declarados donde los busca",
    mutar: (raiz) => editarJson(raiz, "web/package.json", (j) => delete j.scripts.typecheck),
  },
  {
    nombre: "el script test de un paquete deja de emitir cobertura",
    rompe: "cada paquete verificable extiende la cobertura del marco y emite reporte",
    mutar: (raiz) => editarJson(raiz, "api/package.json", (j) => (j.scripts.test = "vitest run")),
  },
  {
    nombre: "un paquete deja de extender coberturaDelMarco()",
    rompe: "cada paquete verificable extiende la cobertura del marco y emite reporte",
    mutar: (raiz) => {
      const p = path.join(raiz, "api/vitest.config.ts");
      fs.writeFileSync(p, fs.readFileSync(p, "utf8").split("coberturaDelMarco").join("otraCosa"), "utf8");
    },
  },
  {
    nombre: "un marcador se cuela en el nombre de un directorio",
    rompe: "ningun marcador vive en una RUTA del andamio",
    mutar: (raiz) => fs.renameSync(path.join(raiz, "api"), path.join(raiz, "{{PAQUETE_API}}")),
  },
  {
    // LAS DOS DE ABAJO NO MUTAN EL ARBOL sino el MAPA DE RENOMBRES, y se pasa
    // uno fabricado en vez de tocar el de la herramienta. El motivo es el mismo
    // por el que la guarda de procedencias fabrica su excepcion: probar la
    // mitad rota con la entrada REAL haria que esta prueba se cayera sola el dia
    // que alguien arregle esa entrada, que es lo que hay que celebrar y no lo
    // que hay que reparar. Ademas un renombre no se puede simular renombrando el
    // archivo en disco: ahi el origen y el destino cambiarian juntos y no habria
    // desfase que medir.
    nombre: "un renombre apunta a una ruta que lleva un marcador",
    rompe: "ningun marcador vive en una RUTA del andamio",
    mutar: () => {},
    renombrar: (rel) => (rel === "package.json" ? "{{PROYECTO}}/package.json" : rel),
  },
  {
    nombre: "dos archivos del andamio aterrizan con el mismo nombre",
    rompe: "ninguna ruta de destino la reclaman dos archivos del andamio",
    mutar: () => {},
    // El caso realista: se agrega un renombre nuevo y su destino ya lo ocupa un
    // archivo que viaja. Nadie lo ve, porque el nombre de destino no existe en
    // el arbol del andamio y no aparece en ningun listado.
    renombrar: (rel) => (rel === "AGENTS.md" ? "CLAUDE.md" : rel),
  },
  {
    nombre: "el andamio se queda sin manifiestos",
    rompe: "el andamio trae manifiestos, y estan donde el workspace dice",
    mutar: (raiz) => {
      // SE ENUMERAN, no se listan. Con los cuatro nombres escritos a mano, el
      // dia que el andamio sumo un paquete —`sitio/`, de la forma «un sitio
      // para leer»— la mutacion borraba cuatro manifiestos, sobrevivia el
      // quinto, y la comprobacion seguia encontrando manifiestos: o sea que el
      // caso que existe para probar que la comprobacion muerde dejo de morder.
      // Es la misma leccion que el workspace y los scripts de la raiz.
      const borrar = (dir) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const abs = path.join(dir, e.name);
          if (e.isDirectory() && e.name !== "node_modules") borrar(abs);
          else if (e.isFile() && e.name === "package.json") fs.unlinkSync(abs);
        }
      };
      borrar(raiz);
    },
  },
];

test("cada comprobacion muerde: el andamio mutado da rojo donde corresponde", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "projects-manifiestos-"));
  const antes = fs.readFileSync(path.join(ANDAMIO, "package.json"), "utf8");
  try {
    for (const [i, m] of MUTACIONES.entries()) {
      const copia = path.join(tmp, `m${i}`);
      copiar(ANDAMIO, copia);
      m.mutar(copia);
      const problema = COMPROBACIONES[m.rompe](copia, m.renombrar);
      // Una mutacion que no cambia nada —ni el arbol ni el renombre— seria una
      // entrada de esta lista que no prueba nada, y saldria verde igual.
      if (m.renombrar) {
        assert.ok(
          rutasDelAndamio(copia).some((r) => m.renombrar(r) !== r),
          `la mutacion "${m.nombre}" trae un renombre que no aplica a ningun archivo del andamio: el ancla que usa se movio`,
        );
      }
      assert.ok(
        problema !== null,
        `la mutacion "${m.nombre}" NO puso en rojo a "${m.rompe}": esa comprobacion pasa ` +
          "siempre y no esta verificando nada",
      );
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  // El andamio del repo no se toco en ningun momento.
  assert.equal(fs.readFileSync(path.join(ANDAMIO, "package.json"), "utf8"), antes);
});

// ---------------------------------------------------------------------------
// 3. El rojo HISTORICO, que es la razon de que esto exista.
//
// Los manifiestos que se absorbieron el 2026-08-22 traian tres fail-opens. Esta
// prueba los reconstruye textualmente y exige que la comprobacion los cace: es
// la evidencia de que el check habria mordido el dia que hizo falta, y no una
// afirmacion sobre el pasado.
// ---------------------------------------------------------------------------
test("el rojo historico: los tres fail-opens del esqueleto que se absorbio", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "projects-historico-"));
  try {
    const copia = path.join(tmp, "origen");
    copiar(ANDAMIO, copia);
    // Tal como venian, textual.
    editarJson(copia, "api/package.json", (j) => {
      j.scripts.lint = "eslint . || true";
      j.scripts.test = "vitest run";
    });
    editarJson(copia, "web/package.json", (j) => {
      j.scripts.lint = "eslint . || true";
      j.scripts.test = "vitest run --passWithNoTests";
    });

    const enmascarados = COMPROBACIONES["ningun script de ningun manifiesto enmascara su codigo de salida"](copia);
    assert.ok(enmascarados, "los tres fail-opens del origen tienen que salir en rojo");
    for (const esperado of ["api:lint", "web:lint", "web:test"]) {
      assert.ok(
        enmascarados.includes(esperado),
        `el hallazgo "${esperado}" no aparece en el rojo:\n${enmascarados}`,
      );
    }

    const sinCobertura = COMPROBACIONES["cada paquete verificable extiende la cobertura del marco y emite reporte"](copia);
    assert.ok(
      sinCobertura && sinCobertura.includes("api"),
      `el "test" pelado de api tenia que salir en rojo por no emitir cobertura:\n${sinCobertura}`,
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
