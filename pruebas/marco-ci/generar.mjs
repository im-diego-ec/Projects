// Generador del corpus del check "Ejecutores de paquetes pinados".
//
// POR QUE EXISTE. Hasta la ronda del 2026-08-20 el invariante del banco
// ("el prefiltro no puede ser mas angosto que el lector") se afirmaba iterando
// la lista escrita a mano de casos/ejecutores.md. Un invariante que solo recorre
// los casos que alguien ya penso NO PUEDE, por construccion, encontrar un miembro
// nuevo de la clase: es la razon por la que dos rondas seguidas cerraron los
// casos citados y el refutador encontro la misma clase una ortografia mas
// adentro, en minutos.
//
// La salida es GENERAR las entradas por producto de ejes en vez de enumerarlas, y
// derivar del propio paso lo unico que no es un eje: el ALFABETO de ejecutores se
// lee del YAML, asi que un gestor nuevo entra al corpus solo. Lo que queda escrito
// aca son las FORMAS del entrecomillado y del envoltorio, y esas si son una lista
// —pero es la lista de la gramatica de POSIX shell (comilla simple, comilla doble,
// barra invertida) cruzada con los formatos donde estas lineas viven de verdad
// (shell, YAML, string de JSON, entrada de allowlist), no una lista de casos.
//
// CUIDADO AL EDITAR ESTE ARCHIVO: es codigo rastreado y no es .md, asi que el
// propio check lo lee. Ningun nombre de gestor puede aparecer literal aca — todos
// llegan del alfabeto en tiempo de corrida — porque un nombre suelto seguido de
// algo que parezca su subcomando pondria el arbol en rojo sobre su propio banco.

const comillaSimple = "'";

/** Escapa un texto como string de JSON, que es como viaja adentro de un .json. */
function comoJson(texto) {
  return JSON.stringify(texto);
}

// Banderas GLOBALES entre el gestor y su subcomando. Los tres primeros ejes son
// las tres formas de la gramatica de entrecomillado; los demas cubren las dos
// formas de pasar valor (pegado y separado) y la acumulacion.
const BANDERAS_GLOBALES = [
  { texto: "", nota: "sin bandera" },
  { texto: "--silent", nota: "booleana" },
  { texto: "--loglevel=error", nota: "valor pegado" },
  { texto: "-C .", nota: "valor separado sin espacios" },
  { texto: '-C "./mi dir"', nota: "valor entrecomillado doble CON espacio" },
  { texto: `-C ${comillaSimple}./mi dir${comillaSimple}`, nota: "valor entrecomillado simple CON espacio" },
  { texto: "-C ./mi\\ dir", nota: "valor con espacio escapado por barra" },
  { texto: '--prefix "./a b" --silent', nota: "dos banderas, la primera con valor entrecomillado" },
  { texto: "-w foo", nota: "bandera corta con valor separado" },
];

// Banderas de un ejecutor DIRECTO: van despues del ejecutor, no entre gestor y
// subcomando, y por eso son otro juego.
const BANDERAS_DIRECTAS = [
  { texto: "", nota: "sin bandera" },
  { texto: "--yes", nota: "booleana larga" },
  { texto: "-y", nota: "booleana corta" },
  { texto: "--registry https://registro.invalid", nota: "valor separado" },
];

// El eje que decide el veredicto. "rojo" es la propiedad que el check afirma:
// sin version exacta, la invocacion no esta pinada.
const PAQUETES = [
  { texto: "openspec", rojo: true, nota: "nombre pelado" },
  { texto: "openspec@latest", rojo: true, nota: "etiqueta movil" },
  { texto: "openspec@^1.9.0", rojo: true, nota: "rango" },
  { texto: "@fission-ai/openspec", rojo: true, nota: "con scope y sin version" },
  { texto: "openspec@1.9.0", rojo: false, nota: "version exacta" },
  { texto: "@fission-ai/openspec@1.9.0", rojo: false, nota: "scope y version exacta" },
  { texto: "openspec@${PIN}", rojo: false, nota: "pin por variable" },
];

// Donde vive la invocacion. El allowlist ademas cambia la RUTA, porque ahi la
// severidad de lo indeterminado es otra.
const ENVOLTORIOS = [
  { nombre: "pelado", envolver: (x) => x, archivo: (id) => `${id}.sh` },
  { nombre: "run de yaml", envolver: (x) => `      - run: ${x}`, archivo: (id) => `${id}.yml` },
  { nombre: "string de json", envolver: (x) => `      "cmd": ${comoJson(x)},`, archivo: (id) => `${id}.json` },
  {
    nombre: "entrada de allowlist",
    envolver: (x) => `      ${comoJson(`Bash(${x}:*)`)},`,
    archivo: (id) => `.claude/settings.${id}.json`,
  },
  { nombre: "encadenado con &&", envolver: (x) => `echo hola && ${x}`, archivo: (id) => `${id}.sh` },
  {
    nombre: "adentro de sh -c",
    // No se puede meter una comilla simple dentro de comillas simples de shell:
    // ese envoltorio se saltea cuando la invocacion ya trae una, y saltearlo es
    // lo honesto (envolverlo igual generaria un comando que ningun shell acepta).
    envolver: (x) => (x.includes(comillaSimple) ? null : `sh -c ${comillaSimple}${x}${comillaSimple}`),
    archivo: (id) => `${id}.sh`,
  },
];

/**
 * El corpus completo: producto de los ejes contra el alfabeto leido del paso.
 *
 * Cada entrada trae el archivo donde se escribe, su linea y si el check TIENE que
 * ponerse rojo. El veredicto sale del eje del paquete y de nada mas: si una
 * combinacion de entrecomillado o de envoltorio hace que el check deje de ver una
 * invocacion sin pinar, el corpus lo cobra como falla en vez de no preguntar.
 */
export function corpus(alfabeto) {
  const entradas = [];
  let n = 0;
  for (const par of alfabeto) {
    const directo = par.sub === "";
    const banderas = directo ? BANDERAS_DIRECTAS : BANDERAS_GLOBALES;
    for (const bandera of banderas) {
      for (const paquete of PAQUETES) {
        const partes = directo
          ? [par.gestor, bandera.texto, paquete.texto]
          : [par.gestor, bandera.texto, par.sub, paquete.texto];
        const invocacion = partes.filter((p) => p !== "").join(" ");
        for (const envoltorio of ENVOLTORIOS) {
          const linea = envoltorio.envolver(invocacion);
          if (linea === null) continue;
          n += 1;
          const id = `g${String(n).padStart(4, "0")}`;
          entradas.push({
            id: id,
            archivo: envoltorio.archivo(id),
            linea: linea,
            rojo: paquete.rojo,
            nota: `${par.gestor}${directo ? "" : ` ${par.sub}`} · ${bandera.nota} · ${paquete.nota} · ${envoltorio.nombre}`,
          });
        }
      }
    }
  }
  return entradas;
}
