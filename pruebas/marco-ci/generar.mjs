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
// LA SEGUNDA VUELTA DE LA MISMA TAUTOLOGIA, y como se corta. La ronda anterior
// paso a generar las entradas por producto de ejes, pero leyendo el alfabeto del
// propio paso. Eso arregla la parte de los ejes y deja intacta la de los gestores:
// un corpus que sale del mismo alfabeto que la regla usa no puede encontrar un
// miembro nuevo de la clase, solo formas nuevas de los miembros que la regla ya
// conoce. Medido: ese corpus encontro dos defectos reales (el carril del
// ::warning con una bandera de valor separado, y el corte de salida a los 64 KiB)
// y ninguno de los dos era un gestor ni una ortografia, porque ese era justo el
// eje que salia de la regla.
//
// Desde esta ronda el alfabeto del banco es INDEPENDIENTE: sale de
// casos/ortografias.md, escrito desde la documentacion de cada gestor, y el paso
// tiene el suyo. El banco afirma la RELACION entre los dos en vez de compartir
// uno. Lo que sigue viviendo aca son las FORMAS del entrecomillado, de las
// banderas y del envoltorio, y esas si son una lista —pero es la lista de la
// gramatica de POSIX shell (comilla simple, comilla doble, barra invertida)
// cruzada con la puntuacion de los formatos donde estas lineas viven de verdad
// (shell, YAML, string de JSON, entrada de allowlist de Claude Code), no una
// lista de casos.
//
// CUIDADO AL EDITAR ESTE ARCHIVO: es codigo rastreado y no es .md, asi que el
// propio check lo lee. Ningun nombre de gestor puede aparecer literal aca — todos
// llegan del .md en tiempo de corrida — porque un nombre suelto seguido de algo
// que parezca su subcomando pondria el arbol en rojo sobre su propio banco. Es
// tambien el motivo por el que el alfabeto del banco vive en un .md y no aca: el
// pathspec del paso excluye los .md y nada mas.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RUTA_ORTOGRAFIAS = join(AQUI, "casos", "ortografias.md");

const comillaSimple = "'";

/** Escapa un texto como string de JSON, que es como viaja adentro de un .json. */
function comoJson(texto) {
  return JSON.stringify(texto);
}

/**
 * El alfabeto PROPIO del banco, leido de casos/ortografias.md.
 *
 * Falla ruidoso a proposito: si el archivo desaparece o su bloque JSON deja de
 * parsear, el banco se cae en vez de generar un corpus vacio y declararlo verde.
 * Y exige que cada par diga DE DONDE sale su ortografia: un alfabeto de banco con
 * una forma inventada produce un rojo que nadie puede arreglar, que es la unica
 * manera de que un banco asi pierda la confianza del equipo.
 */
export function alfabetoPropio(ruta = RUTA_ORTOGRAFIAS) {
  const md = readFileSync(ruta, "utf8");
  const bloque = md.match(/```json\n([\s\S]*?)\n```/);
  if (!bloque) throw new Error(`${ruta} tiene que traer un bloque json con el alfabeto`);
  const datos = JSON.parse(bloque[1]);
  if (!Array.isArray(datos.gestores) || datos.gestores.length === 0) {
    throw new Error(`${ruta} quedo sin gestores: sin alfabeto el corpus no prueba nada`);
  }
  for (const par of datos.gestores) {
    if (typeof par.gestor !== "string" || par.gestor === "") {
      throw new Error(`${ruta} trae un par sin nombre`);
    }
    if (typeof par.sub !== "string") throw new Error(`el par de "${par.gestor}" no declara sub`);
    if (!Array.isArray(par.ortografias) || par.ortografias.length === 0) {
      throw new Error(`el par de "${par.gestor}" no declara ninguna ortografia`);
    }
    if (par.ortografias[0] !== par.gestor) {
      throw new Error(`la primera ortografia de "${par.gestor}" tiene que ser la canonica`);
    }
    if (typeof par.fuente !== "string" || par.fuente.length < 20) {
      throw new Error(`el par de "${par.gestor}" no dice de donde sale su ortografia`);
    }
  }
  return datos.gestores;
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

// DONDE CAE EL COMODIN DEL ANFITRION, que es el eje que esta ronda agrego. En un
// allowlist de Claude Code la entrada se escribe Bash(<comando>:*) para decir "con
// cualquier argumento", y ese ":*" puede quedar pegado a tres cosas distintas. El
// corpus anterior solo generaba la primera, porque siempre ponia un paquete al
// final de la invocacion; las otras dos median exit 0 y CERO lineas de salida en
// el paso, o sea un permiso permanente para descargar y ejecutar que el check no
// veia.
//
// El veredicto no sale del paquete aca: sale de si la entrada autoriza algo sin
// pinar. Un allowlist que permite el ejecutor con cualquier argumento es lo MENOS
// pinado que se puede escribir, asi que es rojo aunque no nombre ningun paquete.
const POSICIONES_DEL_COMODIN = [
  {
    nombre: "comodin pegado al EJECUTOR, sin paquete",
    partes: (ort) => [ort],
    rojo: true,
  },
  {
    nombre: "comodin pegado al SUBCOMANDO, sin paquete",
    partes: (ort, sub) => (sub === "" ? null : [ort, sub]),
    rojo: true,
  },
  {
    nombre: "comodin pegado a un paquete SIN version",
    partes: (ort, sub) => [ort, sub, "openspec"],
    rojo: true,
  },
  {
    nombre: "comodin pegado a un paquete pinado",
    partes: (ort, sub) => [ort, sub, "openspec@1.9.0"],
    rojo: false,
  },
];

/**
 * El corpus completo: producto de los ejes contra el alfabeto PROPIO del banco.
 *
 * Cada entrada trae el archivo donde se escribe, su linea y si el check TIENE que
 * ponerse rojo. Son dos familias:
 *
 *   · INVOCACION — la de siempre, ahora cruzada tambien por el eje de las
 *     ortografias que cada gestor deja en el PATH (el sufijo de ejecutable de
 *     Windows, la ruta a node_modules/.bin). El veredicto sale del eje del
 *     paquete y de nada mas: si una combinacion de entrecomillado, de ortografia
 *     o de envoltorio hace que el check deje de ver una invocacion sin pinar, el
 *     corpus lo cobra como falla en vez de no preguntar.
 *   · PERMISO DE ALLOWLIST — el eje del comodin del anfitrion, en sus tres
 *     posiciones. Vive solo en archivos de allowlist porque es ahi donde la linea
 *     significa un permiso permanente y no una invocacion que alguien vaya a
 *     revisar cuando falle.
 *
 * Las ortografias no canonicas se cruzan solo con la bandera vacia: el eje de las
 * banderas ya esta cubierto por la canonica, y el producto completo multiplicaria
 * el corpus sin agregar una sola pregunta nueva.
 */
export function corpus(alfabeto = alfabetoPropio()) {
  const entradas = [];
  let n = 0;
  const anotar = (archivoDe, linea, rojo, nota) => {
    n += 1;
    const id = `g${String(n).padStart(4, "0")}`;
    entradas.push({ id: id, archivo: archivoDe(id), linea: linea, rojo: rojo, nota: nota });
  };

  for (const par of alfabeto) {
    const directo = par.sub === "";

    for (const ortografia of par.ortografias) {
      const canonica = ortografia === par.gestor;
      const banderas = directo ? BANDERAS_DIRECTAS : BANDERAS_GLOBALES;
      const usadas = canonica ? banderas : [banderas[0]];
      const rotulo = `${ortografia}${directo ? "" : ` ${par.sub}`}`;

      for (const bandera of usadas) {
        for (const paquete of PAQUETES) {
          const partes = directo
            ? [ortografia, bandera.texto, paquete.texto]
            : [ortografia, bandera.texto, par.sub, paquete.texto];
          const invocacion = partes.filter((p) => p !== "").join(" ");
          for (const envoltorio of ENVOLTORIOS) {
            const linea = envoltorio.envolver(invocacion);
            if (linea === null) continue;
            anotar(
              envoltorio.archivo,
              linea,
              paquete.rojo,
              `${rotulo} · ${bandera.nota} · ${paquete.nota} · ${envoltorio.nombre}`,
            );
          }
        }
      }

      for (const posicion of POSICIONES_DEL_COMODIN) {
        const partes = posicion.partes(ortografia, par.sub);
        if (partes === null) continue;
        const comando = partes.filter((p) => p !== "").join(" ");
        anotar(
          (id) => `.claude/settings.${id}.json`,
          `      ${comoJson(`Bash(${comando}:*)`)},`,
          posicion.rojo,
          `${rotulo} · ${posicion.nombre}`,
        );
      }
    }
  }
  return entradas;
}
