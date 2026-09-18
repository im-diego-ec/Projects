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
// cuatro partes; NO puede verificar que el criterio sea BUENO. Distinguir un
// criterio util de una frase que suena bien no es decidible con un escaneo, y el
// design lo declara como deuda: se revisa una vez, en el PR del change, en vez de
// una vez por proyecto. Esta prueba cierra la mitad automatizable.
//
// LO QUE VERIFICA. Diez propiedades, todas LEIDAS del arbol:
//   1. los dos directorios existen con sus tres archivos;
//   2. cero recursos de Terraform — la frontera del change;
//   3. todo marcador usado esta entre los que `projects init` sustituye;
//   4. cada pendiente numerado trae sus CUATRO partes (la cuarta, CUANDO SE
//      RESUELVE, desde el porte de `pendientes-infra-cuando` de Rigel);
//   5. el pendiente de alarmas existe SOLO en produccion;
//   6. cada puntero del main.tf resuelve a una seccion que existe;
//   7. la numeracion de los pendientes es correlativa, sin saltos;
//   8. ninguno usa el hueco GATEADO del andamio — la que evita que un repo recien
//      nacido amanezca rojo por infraestructura que todavia no puede decidir;
//   9. el pendiente de la retencion y la clase del grupo de logs existe en los
//      DOS ambientes, y no solo en dev;
//  10. y los PENDIENTE-PLATAFORMA del catalogo de adaptadores tienen la misma
//      forma de cuatro partes que los PENDIENTE-INFRA.
//
// Mas una que hace que las diez signifiquen algo: cada una MUERDE. Se
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

// El marcador de los pendientes de infraestructura. NO es el hueco del andamio, y esa
// distincion es el nucleo de este archivo: ver HUECO_GATEADO abajo.
const MARCA = "PENDIENTE-INFRA";

// Y el marcador que los pendientes de infra NO pueden usar. El hueco del andamio SI
// lo cuenta el paso del pipeline, asi que ponerlo aca pondria rojo a todo repo recien
// nacido por decisiones de infraestructura que todavia no puede tomar — y el propio
// requirement exige que la verificacion sea INERTE para un repositorio que no se
// despliega. El cierre de `infra-exigible` (lote 12 del porte de Rigel) retiro del
// requirement la clausula que pedia «fallar mientras sobreviva un pendiente»: que
// forma tome una senal sobre los pendientes —aviso o rojo— la decide el change que
// mida por plataforma si un repositorio llego a su ambiente, no este banco.
const HUECO_GATEADO = "\u{1F573}";

// LAS CUATRO PARTES de todo pendiente, el de infraestructura y el de plataforma.
// UNA sola declaracion para los dos tokens: si el catalogo de adaptadores dijera
// "la misma forma que pendientes.tf" y cada archivo exigiera su propia lista,
// las dos listas divergen en el primer cambio y la frase miente sin que nada se
// ponga rojo. Es lo que paso al pasar de tres partes a cuatro: el catalogo
// seguia anunciando «la misma forma de tres partes».
//
// POR QUE HAY CUARTA. Un pendiente con que falta, con que criterio se decide y
// que queda sin garantia —y sin CUANDO— se lee como trabajo futuro sin dueno,
// y el trabajo futuro sin dueno no se hace. Medido en Rigel el 2026-08-28: su
// segundo consumidor llego al bloque 7 de 14 con sus seis pendientes de
// infraestructura intactos, ninguno mal escrito (change `dev-alcanzable`,
// commit 78c693c).
const PARTES = ["QUÉ FALTA", "CÓMO SE DECIDE", "CUÁNDO SE RESUELVE", "SI NO SE HACE"];

/** Por que importa cada parte, para que el mensaje diga el arreglo y no solo la falta. */
const POR_QUE_LA_PARTE = {
  "QUÉ FALTA": "Un pendiente que no dice que falta no se puede resolver: no hay nada que buscar",
  "CÓMO SE DECIDE": "Un pendiente sin criterio lo resuelve solo quien ya sabia la respuesta",
  "CUÁNDO SE RESUELVE":
    "Un pendiente sin momento no tiene quien lo reclame: se descubre cuando ya cuesta. Escribi en que momento del proyecto se contesta",
  "SI NO SE HACE": "Un pendiente que no dice que se pierde se saltea: nadie ve el costo de dejarlo",
};

// El catalogo de adaptadores vive en infra/ aunque no es Terraform (lo dice su
// propio encabezado), asi que la copia mutada lo trae junto con las raices.
const ADAPTADORES = path.join("infra", "adaptadores.md");
const MARCA_PLATAFORMA = "PENDIENTE-PLATAFORMA";

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
    const enc = linea.match(new RegExp(`${MARCA}:? (\\d+) ·`, "u"));
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

/** Los PENDIENTE-PLATAFORMA del catalogo de adaptadores, con su titulo y su cuerpo.
 *  Cada uno es un encabezado `### PENDIENTE-PLATAFORMA · <adaptador> · <que>` y
 *  termina en el siguiente encabezado de nivel 2 o 3, o en una regla `---`. */
function seccionesDePlataforma(texto) {
  const secciones = [];
  let actual = null;
  for (const linea of texto.split("\n")) {
    if (linea.startsWith(`### ${MARCA_PLATAFORMA}`)) {
      if (actual) secciones.push(actual);
      actual = { titulo: linea.slice(4).trim(), cuerpo: [linea] };
      continue;
    }
    if (actual && (/^#{2,3} /.test(linea) || /^---\s*$/.test(linea))) {
      secciones.push(actual);
      actual = null;
      continue;
    }
    if (actual) actual.cuerpo.push(linea);
  }
  if (actual) secciones.push(actual);
  return secciones.map((s) => ({ titulo: s.titulo, cuerpo: s.cuerpo.join("\n") }));
}

/** Si la primera linea de una seccion de pendientes.tf la identifica como la del grupo de logs. */
const esDeLogs = (s) => /grupo de logs/i.test(s.cuerpo.split("\n")[0]);

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

  pendientesConSusCuatroPartes(raiz) {
    // CUATRO desde el porte de `pendientes-infra-cuando` (Rigel 1.9.0). Eran tres
    // —que falta, con que criterio, que queda sin garantia— y la cuarta la agrego
    // una medicion: ver el comentario de PARTES arriba.
    const hallazgos = [];
    for (const d of DIRS) {
      const p = path.join(raiz, d, "pendientes.tf");
      if (!fs.existsSync(p)) continue;
      for (const s of seccionesDe(fs.readFileSync(p, "utf8"))) {
        for (const parte of PARTES) {
          if (!s.cuerpo.includes(parte)) {
            hallazgos.push(`${d}/pendientes.tf pendiente ${s.numero} no dice «${parte}». ${POR_QUE_LA_PARTE[parte]}`);
          }
        }
      }
    }
    return hallazgos;
  },

  retencionDeLogsEnLosDosAmbientes(raiz) {
    // El contrato (`operacion-infra` · «Higiene operativa de logs y TLS») pide
    // retencion explicita EN CUALQUIER AMBIENTE, y la clase del grupo no se puede
    // cambiar despues de crearlo. Faltar en produccion es lo caro: es el ambiente
    // que no se puede rehacer. En Rigel paso exactamente eso (6b91fef): dev tenia
    // el pendiente y produccion no, y un README que decia «siete» lo escondia.
    const hallazgos = [];
    for (const d of DIRS) {
      const p = path.join(raiz, d, "pendientes.tf");
      if (!fs.existsSync(p)) continue;
      if (!seccionesDe(fs.readFileSync(p, "utf8")).some(esDeLogs)) {
        hallazgos.push(
          `${d}/pendientes.tf no tiene el pendiente de «la retención y la clase del grupo de logs del servicio». ` +
            `La retencion es contrato en todos los ambientes y la clase no se puede cambiar despues de crear el grupo: ` +
            `agrega la seccion con sus cuatro partes y el titulo que nombre el grupo de logs`
        );
      }
    }
    return hallazgos;
  },

  pendientesDePlataformaConSusCuatroPartes(raiz) {
    const p = path.join(raiz, ADAPTADORES);
    if (!fs.existsSync(p)) {
      return [`falta ${ADAPTADORES}: el catalogo de adaptadores es donde viven los ${MARCA_PLATAFORMA}`];
    }
    const secciones = seccionesDePlataforma(fs.readFileSync(p, "utf8"));
    // Sin esto, un cambio de forma del encabezado dejaria la comprobacion
    // mirando el vacio y en verde.
    if (!secciones.length) {
      return [
        `${ADAPTADORES} no tiene ningun encabezado «### ${MARCA_PLATAFORMA} · ...»: o cambio su forma y esta comprobacion quedo mirando el vacio, o se borraron todos`,
      ];
    }
    const hallazgos = [];
    for (const s of secciones) {
      for (const parte of PARTES) {
        if (!s.cuerpo.includes(parte)) {
          hallazgos.push(
            `${ADAPTADORES} «${s.titulo}» no dice «${parte}». Tiene que tener la misma forma que los PENDIENTE-INFRA: ${POR_QUE_LA_PARTE[parte]}`
          );
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

  sinElHuecoGateado(raiz) {
    // Si alguien pone el hueco del andamio en estos archivos, TODO repo nuevo amanece
    // rojo en el paso de marcadores por decisiones de infraestructura que todavia no
    // puede tomar. Es el defecto que este archivo existe para que no vuelva.
    const hallazgos = [];
    for (const d of DIRS) {
      const dd = path.join(raiz, d);
      if (!fs.existsSync(dd)) continue;
      for (const f of fs.readdirSync(dd)) {
        const texto = fs.readFileSync(path.join(dd, f), "utf8");
        if (texto.includes(HUECO_GATEADO)) {
          hallazgos.push(
            `${d}/${f} usa el hueco del andamio, que el pipeline SI cuenta: pondria rojo a todo repo nuevo por infraestructura que todavia no puede decidir`
          );
        }
      }
    }
    return hallazgos;
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
// El andamio real: las diez propiedades se cumplen.
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
    comprobacion: "pendientesConSusCuatroPartes",
    // Ojo: NO se puede mutar la primera ocurrencia del texto. El encabezado del
    // archivo explica la forma de cuatro partes y la nombra, asi que la primera
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
    nombre: "a un pendiente de produccion le sacan el «CUANDO SE RESUELVE»",
    comprobacion: "pendientesConSusCuatroPartes",
    // Mismo cuidado que la de arriba: se muta el CUERPO de la seccion, no la
    // primera ocurrencia, que esta en el encabezado que explica la forma.
    mutar: (t) => {
      const p = path.join(t, "infra-prod", "pendientes.tf");
      const texto = fs.readFileSync(p, "utf8");
      const s1 = seccionesDe(texto).find((s) => s.numero === 1);
      fs.writeFileSync(p, texto.replace(s1.cuerpo, s1.cuerpo.replace("CUÁNDO SE RESUELVE", "NOTAS")), "utf8");
    },
  },
  {
    nombre: "el pendiente de la retencion y la clase de los logs se borra de produccion",
    comprobacion: "retencionDeLogsEnLosDosAmbientes",
    mutar: (t) => {
      const p = path.join(t, "infra-prod", "pendientes.tf");
      const texto = fs.readFileSync(p, "utf8");
      const logs = seccionesDe(texto).find(esDeLogs);
      fs.writeFileSync(p, texto.replace(logs.cuerpo, "# (seccion borrada)"), "utf8");
    },
  },
  {
    nombre: "a un PENDIENTE-PLATAFORMA le sacan el «CUANDO SE RESUELVE»",
    comprobacion: "pendientesDePlataformaConSusCuatroPartes",
    // El encabezado del catalogo explica la forma y nombra las cuatro partes
    // fuera de toda seccion: se muta el cuerpo de un pendiente, no el texto.
    mutar: (t) => {
      const p = path.join(t, ADAPTADORES);
      const texto = fs.readFileSync(p, "utf8");
      const s = seccionesDePlataforma(texto).find((x) => x.cuerpo.includes("CUÁNDO SE RESUELVE"));
      fs.writeFileSync(p, texto.replace(s.cuerpo, s.cuerpo.replace("CUÁNDO SE RESUELVE", "NOTAS")), "utf8");
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
    nombre: "alguien pone el hueco gateado del andamio en un pendiente de infra",
    comprobacion: "sinElHuecoGateado",
    mutar: (t) =>
      fs.appendFileSync(path.join(t, "infra", "pendientes.tf"), `\n# ${HUECO_GATEADO} algo pendiente\n`),
  },
  {
    nombre: "la numeracion de los pendientes salta",
    comprobacion: "numeracionCorrelativa",
    mutar: (t) => {
      const p = path.join(t, "infra", "pendientes.tf");
      const texto = fs.readFileSync(p, "utf8");
      fs.writeFileSync(p, texto.replace(`${MARCA}: 2 ·`, `${MARCA}: 9 ·`), "utf8");
    },
  },
];

for (const m of MUTACIONES) {
  test(`muerde: ${m.nombre}`, () => {
    const tmp = copiaMutada(m.mutar);
    try {
      // MAS hallazgos que sobre el arbol real, y no solo "alguno": si el arbol
      // real ya estuviera rojo en esa comprobacion, "alguno" pasaria sin que la
      // mutacion hubiera mordido nada.
      const antes = COMPROBACIONES[m.comprobacion](ANDAMIO).length;
      const hallazgos = COMPROBACIONES[m.comprobacion](tmp);
      assert.ok(
        hallazgos.length > antes,
        `la comprobacion «${m.comprobacion}» NO reporto nada nuevo sobre una copia mutada (${antes} antes, ${hallazgos.length} despues). Sin mordida, la propiedad solo dice que hoy pasa`
      );
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
}
