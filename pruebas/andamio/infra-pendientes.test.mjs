// GUARDA DE LOS PENDIENTES DE INFRAESTRUCTURA DEL ANDAMIO.
//
// POR QUE EXISTE. El bloque 1 de `infra-exigible` puso en el andamio los dos
// directorios que la constitucion nombraba y no existian, con lo derivable
// funcionando y los pendientes de decision adentro. La compuerta que los exige
// —el paso de marcadores del pipeline— ya existia y no hubo que inventarla.
//
// Lo que NO existe todavia es algo que muerda si los pendientes se degradan. Y
// se degradan de formas concretas y silenciosas:
//   · alguien borra una seccion y deja su puntero del main.tf apuntando a nada;
//   · alguien saca el «COMO SE DECIDE» y deja un pendiente que solo puede
//     resolver quien ya sabia la respuesta, que es exactamente lo que el design
//     de este change existe para evitar;
//   · alguien agrega un recurso de Terraform y el andamio empieza a repartir
//     infraestructura sin verificar, cruzando la frontera declarada del change;
//   · alguien inventa un marcador que `projects init` no sustituye, y viaja literal
//     al repo nuevo;
//   · alguien mueve el pendiente de alarmas a dev, deshaciendo una decision
//     tomada (una alarma que suena por un deploy de prueba entrena a ignorarla).
//
// LA FRONTERA DE LO QUE ESTA PRUEBA PUEDE. Verifica que el pendiente tenga sus
// tres partes; NO puede verificar que el criterio sea BUENO. Distinguir un
// criterio util de una frase que suena bien no es decidible con un escaneo, y el
// design lo declara como deuda: se revisa una vez, en el PR del change, en vez de
// una vez por proyecto. Esta prueba cierra la mitad automatizable.
//
// LO QUE VERIFICA. Siete propiedades, todas LEIDAS del arbol:
//   1. los dos directorios existen con sus tres archivos;
//   2. cero recursos de Terraform — la frontera del change;
//   3. todo marcador usado esta entre los que `projects init` sustituye;
//   4. cada pendiente numerado trae sus tres partes;
//   5. el pendiente de alarmas existe SOLO en produccion;
//   6. cada puntero del main.tf resuelve a una seccion que existe;
//   7. la numeracion de los pendientes es correlativa, sin saltos.
//
// Mas una octava que hace que las siete signifiquen algo: cada una MUERDE. Se
// mutan copias en un directorio temporal —nunca el arbol del repo— y se exige que
// la comprobacion que le toca reporte el problema.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ANDAMIO = path.join(RAIZ, "plantilla");

const DIRS = ["infra", "infra-prod"];
const ARCHIVOS = ["main.tf", "pendientes.tf", "README.md"];

// El marcador de hueco de decision, por codepoint y sin el selector de variacion:
// depender del par exacto de bytes hace que la prueba falle por el locale del
// editor y no por el arbol. Es la misma razon por la que el paso del pipeline lo
// busca asi.
const HUECO = "\u{1F573}";

// Los valores que `projects init` sustituye salen de la herramienta, no de una lista
// repetida aca: una segunda declaracion puede divergir de la primera, y entonces
// la prueba diria la verdad sobre si misma y no sobre el andamio.
function valoresQueSustituyeElInit() {
  const salida = execFileSync("node", [path.join(RAIZ, "herramientas", "projects-init.mjs"), "--ejemplo"], {
    cwd: RAIZ,
    encoding: "utf8",
  });
  return new Set(Object.keys(JSON.parse(salida)));
}

const VALIDOS = valoresQueSustituyeElInit();

/** Las secciones numeradas de un `pendientes.tf`, con su numero y su cuerpo. */
function seccionesDe(texto) {
  const secciones = [];
  const lineas = texto.split("\n");
  let actual = null;
  for (const linea of lineas) {
    const enc = linea.match(new RegExp(`${HUECO}\\uFE0F? (\\d+) ·`, "u"));
    if (enc) {
      if (actual) secciones.push(actual);
      actual = { numero: Number(enc[1]), cuerpo: [linea] };
      continue;
    }
    // Una linea de cierre de bloque termina la seccion en curso.
    if (actual && /^# -{10,}$/.test(linea.trim())) {
      secciones.push(actual);
      actual = null;
      continue;
    }
    if (actual) actual.cuerpo.push(linea);
  }
  if (actual) secciones.push(actual);
  return secciones.map((s) => ({ numero: s.numero, cuerpo: s.cuerpo.join("\n") }));
}

function archivosTf(raiz, dir) {
  const d = path.join(raiz, dir);
  if (!fs.existsSync(d)) return [];
  return fs
    .readdirSync(d)
    .filter((f) => f.endsWith(".tf"))
    .map((f) => ({ ruta: `${dir}/${f}`, texto: fs.readFileSync(path.join(d, f), "utf8") }));
}

// ---------------------------------------------------------------------------
// Las comprobaciones. Cada una recibe la raiz del andamio y devuelve la lista de
// hallazgos: vacia significa que la propiedad se cumple. Se escriben UNA vez y se
// corren contra el arbol real y contra las copias mutadas.
// ---------------------------------------------------------------------------
const COMPROBACIONES = {
  estructura(raiz) {
    const falta = [];
    for (const d of DIRS) {
      for (const a of ARCHIVOS) {
        if (!fs.existsSync(path.join(raiz, d, a))) falta.push(`${d}/${a}`);
      }
    }
    return falta.map((f) => `falta ${f}: el andamio tiene que repartir los dos directorios completos`);
  },

  sinRecursos(raiz) {
    const hallazgos = [];
    for (const d of DIRS) {
      for (const { ruta, texto } of archivosTf(raiz, d)) {
        texto.split("\n").forEach((linea, i) => {
          if (/^resource\s/.test(linea)) {
            hallazgos.push(
              `${ruta}:${i + 1} declara un recurso. Es la frontera de infra-exigible: el andamio no reparte infraestructura sin verificar`
            );
          }
        });
      }
    }
    return hallazgos;
  },

  marcadoresValidos(raiz) {
    const hallazgos = [];
    for (const d of DIRS) {
      const dd = path.join(raiz, d);
      if (!fs.existsSync(dd)) continue;
      for (const f of fs.readdirSync(dd)) {
        const texto = fs.readFileSync(path.join(dd, f), "utf8");
        for (const m of texto.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)) {
          if (!VALIDOS.has(m[1])) {
            hallazgos.push(
              `${d}/${f} usa {{${m[1]}}}, que projects init NO sustituye: viajaria literal al repo nuevo`
            );
          }
        }
      }
    }
    return [...new Set(hallazgos)];
  },

  pendientesConSusTresPartes(raiz) {
    const PARTES = ["QUÉ FALTA", "CÓMO SE DECIDE", "SI NO SE HACE"];
    const hallazgos = [];
    for (const d of DIRS) {
      const p = path.join(raiz, d, "pendientes.tf");
      if (!fs.existsSync(p)) continue;
      for (const s of seccionesDe(fs.readFileSync(p, "utf8"))) {
        for (const parte of PARTES) {
          if (!s.cuerpo.includes(parte)) {
            hallazgos.push(
              `${d}/pendientes.tf pendiente ${s.numero} no dice «${parte}». Un pendiente sin criterio lo resuelve solo quien ya sabia la respuesta`
            );
          }
        }
      }
    }
    return hallazgos;
  },

  alarmasSoloEnProd(raiz) {
    const hallazgos = [];
    const tiene = (dir) => {
      const p = path.join(raiz, dir, "pendientes.tf");
      if (!fs.existsSync(p)) return false;
      return seccionesDe(fs.readFileSync(p, "utf8")).some((s) => /ALARMAS|alarmas/.test(s.cuerpo.split("\n")[0]));
    };
    if (!tiene("infra-prod")) {
      hallazgos.push("infra-prod/pendientes.tf no tiene el pendiente de alarmas, y el marco exige que existan y avisen");
    }
    if (tiene("infra")) {
      hallazgos.push(
        "infra/pendientes.tf tiene un pendiente de alarmas, y dev NO lleva alarmas por decision declarada: una que suena por un deploy de prueba entrena a ignorarla"
      );
    }
    return hallazgos;
  },

  punterosResuelven(raiz) {
    const hallazgos = [];
    for (const d of DIRS) {
      const pm = path.join(raiz, d, "main.tf");
      const pp = path.join(raiz, d, "pendientes.tf");
      if (!fs.existsSync(pm) || !fs.existsSync(pp)) continue;
      const existentes = new Set(seccionesDe(fs.readFileSync(pp, "utf8")).map((s) => s.numero));
      const main = fs.readFileSync(pm, "utf8");
      for (const m of main.matchAll(/SECCI[OÓ]N[- ](\d+)/gi)) {
        if (!existentes.has(Number(m[1]))) {
          hallazgos.push(
            `${d}/main.tf apunta a la seccion ${m[1]} de pendientes.tf y esa seccion no existe: la cita quedo huerfana`
          );
        }
      }
    }
    return [...new Set(hallazgos)];
  },

  numeracionCorrelativa(raiz) {
    const hallazgos = [];
    for (const d of DIRS) {
      const p = path.join(raiz, d, "pendientes.tf");
      if (!fs.existsSync(p)) continue;
      const nums = seccionesDe(fs.readFileSync(p, "utf8")).map((s) => s.numero);
      nums.forEach((n, i) => {
        if (n !== i + 1) {
          hallazgos.push(
            `${d}/pendientes.tf: la numeracion salta (esperaba ${i + 1} y encontro ${n}). Un salto suele ser una seccion borrada sin resolver`
          );
        }
      });
    }
    return hallazgos;
  },
};

// ---------------------------------------------------------------------------
// El andamio real: las siete propiedades se cumplen.
// ---------------------------------------------------------------------------
for (const [nombre, comprobar] of Object.entries(COMPROBACIONES)) {
  test(`el andamio real cumple: ${nombre}`, () => {
    const hallazgos = comprobar(ANDAMIO);
    assert.deepEqual(hallazgos, [], `\n${hallazgos.join("\n")}\n`);
  });
}

// ---------------------------------------------------------------------------
// Y cada una MUERDE. Sin esta mitad, las de arriba solo dicen que hoy pasa —no
// que sirvan para algo el dia que alguien las rompa.
// ---------------------------------------------------------------------------
function copiaMutada(mutar) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "projects-infra-"));
  for (const d of DIRS) {
    fs.mkdirSync(path.join(tmp, d), { recursive: true });
    for (const f of fs.readdirSync(path.join(ANDAMIO, d))) {
      fs.copyFileSync(path.join(ANDAMIO, d, f), path.join(tmp, d, f));
    }
  }
  mutar(tmp);
  return tmp;
}

const MUTACIONES = [
  {
    nombre: "el directorio de produccion entero retirado",
    comprobacion: "estructura",
    mutar: (t) => fs.rmSync(path.join(t, "infra-prod"), { recursive: true, force: true }),
  },
  {
    nombre: "alguien agrega un recurso de Terraform",
    comprobacion: "sinRecursos",
    mutar: (t) =>
      fs.appendFileSync(path.join(t, "infra", "main.tf"), '\nresource "aws_s3_bucket" "algo" {\n  bucket = "x"\n}\n'),
  },
  {
    nombre: "un marcador que projects init no sustituye",
    comprobacion: "marcadoresValidos",
    mutar: (t) =>
      fs.appendFileSync(path.join(t, "infra", "main.tf"), '\n# cuenta: {{CUENTA_DE_PRUEBAS}}\n'),
  },
  {
    nombre: "a un pendiente le sacan el «COMO SE DECIDE»",
    comprobacion: "pendientesConSusTresPartes",
    // Ojo: NO se puede mutar la primera ocurrencia del texto. El encabezado del
    // archivo explica la forma de tres partes y la nombra, asi que la primera
    // ocurrencia esta FUERA de toda seccion y mutarla no degrada ningun pendiente.
    // La primera version de esta mutacion hacia exactamente eso y no mordia: lo
    // cazo esta misma prueba, que es para lo que existe.
    mutar: (t) => {
      const p = path.join(t, "infra", "pendientes.tf");
      const texto = fs.readFileSync(p, "utf8");
      const s1 = seccionesDe(texto).find((s) => s.numero === 1);
      fs.writeFileSync(p, texto.replace(s1.cuerpo, s1.cuerpo.replace("CÓMO SE DECIDE", "NOTAS")), "utf8");
    },
  },
  {
    nombre: "el pendiente de alarmas se mueve a dev",
    comprobacion: "alarmasSoloEnProd",
    mutar: (t) => {
      const prod = path.join(t, "infra-prod", "pendientes.tf");
      const dev = path.join(t, "infra", "pendientes.tf");
      const seccion = seccionesDe(fs.readFileSync(prod, "utf8")).find((s) => /ALARMAS/i.test(s.cuerpo.split("\n")[0]));
      fs.appendFileSync(dev, `\n# ${"-".repeat(72)}\n${seccion.cuerpo}\n# ${"-".repeat(72)}\n`);
    },
  },
  {
    nombre: "borran una seccion y dejan el puntero del main.tf huerfano",
    comprobacion: "punterosResuelven",
    mutar: (t) => {
      const p = path.join(t, "infra", "pendientes.tf");
      const texto = fs.readFileSync(p, "utf8");
      const s1 = seccionesDe(texto).find((s) => s.numero === 1);
      fs.writeFileSync(p, texto.replace(s1.cuerpo, "# (seccion borrada)"), "utf8");
    },
  },
  {
    nombre: "la numeracion de los pendientes salta",
    comprobacion: "numeracionCorrelativa",
    mutar: (t) => {
      const p = path.join(t, "infra", "pendientes.tf");
      const texto = fs.readFileSync(p, "utf8");
      fs.writeFileSync(p, texto.replace(`${HUECO}️ 2 ·`, `${HUECO}️ 9 ·`), "utf8");
    },
  },
];

for (const m of MUTACIONES) {
  test(`muerde: ${m.nombre}`, () => {
    const tmp = copiaMutada(m.mutar);
    try {
      const hallazgos = COMPROBACIONES[m.comprobacion](tmp);
      assert.ok(
        hallazgos.length > 0,
        `la comprobacion «${m.comprobacion}» NO reporto nada sobre una copia mutada. Sin mordida, la propiedad solo dice que hoy pasa`
      );
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
}
