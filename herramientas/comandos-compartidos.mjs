#!/usr/bin/env node
// ---------------------------------------------------------------------------
// LOS COMANDOS QUE UNA GUIA Y UNA SKILL DICEN COMPARTIR SE ESCRIBEN IGUAL, Y ESTO LO MIDE.
//
// POR QUE EXISTE. Una guia que una persona lee y una skill que un agente ejecuta pueden
// describir el mismo paso, y dos documentos que describen lo mismo DIVERGEN: nadie compara
// dos archivos sin un check que lo haga. Viene de Rigel 1.14.0 (change
// 2026-09-01-arranque-ejecutable, commits 4565182 y d7e5e63; el fin de linea, 6e9574f).
//
// POR QUE SE TRAE A PROJECTS, y solo por esto: hay un par REAL. `docs/12-upgrade-openspec.md`
// afirma que su comando para leer el pin de OpenSpec «es el mismo que usan las skills», y
// `.claude/skills/projects-adoptar/SKILL.md` lo repite. Medido el 2026-09-18, esa afirmacion
// ya estaba rota a medias: nombraba tambien a `projects-archive-change`, que hace rato lee el
// pin con `aplicar-deltas.mjs --pin-openspec`. Sin un par que comparar, esta herramienta no
// se habria traido: una herramienta sin par no es una compuerta.
//
// LO QUE SE COMPARA Y LO QUE NO. Los COMANDOS, byte a byte, con el fin de linea como unica
// excepcion declarada (ver `bloquesMarcados`). La prosa NO: la guia explica por que y la
// skill explica como, y pueden decir cosas distintas. Lo que no puede diferir es lo que se
// ejecuta.
//
// COMO SE MARCA UN BLOQUE. Un comentario HTML inmediatamente antes de la cerca, con un id que
// es el MISMO en los dos archivos:
//
//     <!-- projects:comando pin-de-openspec -->
//     ```bash
//     awk '...' .github/workflows/marco-ci.yml
//     ```
//
// Un comentario HTML y no un atributo de la cerca: los atributos los renderiza GitHub como
// parte del lenguaje y rompen el resaltado; el comentario es invisible y sobrevive a
// cualquier formateador.
//
// USO: `node herramientas/comandos-compartidos.mjs` compara todos los pares de PARES;
// `node herramientas/comandos-compartidos.mjs <guia.md> <skill.md>` compara uno. Sale 0 si
// coinciden, 1 si no (o si no hay nada marcado), 2 si se lo llama mal. Lo corre el banco
// `pruebas/docs/comandos-compartidos.test.mjs`, que el CI del marco ejecuta en cada PR.
// ---------------------------------------------------------------------------
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** La marca que declara que un bloque es compartido. */
export const MARCA = /^<!--\s*projects:comando\s+(\S+)\s*-->\s*$/;

/** Los pares reales: una guia y una skill que declaran compartir comandos. `minimo` es
 *  cuantos bloques marcados tiene hoy la guia: si baja, alguien desmarco un comando y la
 *  compuerta dejo de cubrirlo sin que nada mas lo diga. */
export const PARES = [
  { guia: "docs/12-upgrade-openspec.md", skill: ".claude/skills/projects-adoptar/SKILL.md", minimo: 1 },
];

/** Los bloques marcados de un markdown, por id.
 *
 *  DEVUELVE EL CUERPO CRUDO, sin recortar: recortar aca seria decidir en silencio que un
 *  espacio de mas no importa. LA UNICA EXCEPCION ES EL FIN DE LINEA: esto lee el working
 *  copy, y ahi el terminador es de la maquina y del editor. `.gitattributes` ya lo declara
 *  (`* text=auto eol=lf`): git mismo dice que el CRLF no es contenido. Se normaliza SOLO el
 *  terminador; un `\r` suelto en medio de una linea sobrevive, porque ese lo escribio alguien. */
export function bloquesMarcados(texto) {
  const lineas = texto.split(/\r?\n/);
  const bloques = new Map();
  const duplicados = [];

  for (let i = 0; i < lineas.length; i += 1) {
    const m = lineas[i].match(MARCA);
    if (!m) continue;
    const id = m[1];

    // La cerca tiene que venir INMEDIATAMENTE despues. Una marca huerfana --alguien movio el
    // bloque y dejo el comentario-- compararia vacio contra vacio y pasaria en verde.
    if (!/^```/.test(lineas[i + 1] ?? "")) {
      throw new Error(
        `la marca "projects:comando ${id}" (linea ${i + 1}) no esta seguida de un bloque de codigo. ` +
          "Una marca sin bloque no compara nada y pasaria en verde.",
      );
    }
    let j = i + 2;
    const cuerpo = [];
    while (j < lineas.length && !/^```\s*$/.test(lineas[j])) {
      cuerpo.push(lineas[j]);
      j += 1;
    }
    if (j >= lineas.length) throw new Error(`el bloque "projects:comando ${id}" (linea ${i + 1}) no cierra su cerca`);
    if (bloques.has(id)) duplicados.push(id);
    bloques.set(id, cuerpo.join("\n"));
    i = j;
  }
  if (duplicados.length > 0) {
    throw new Error(
      `hay ids de comando repetidos: ${[...new Set(duplicados)].join(", ")}. ` +
        "Un id repetido hace que la comparacion mire un bloque e ignore el otro.",
    );
  }
  return bloques;
}

/** Compara los bloques marcados de dos textos. `comparados` es la magnitud a vigilar: si es
 *  CERO, «todo coincide» seria cierto por vacuidad. */
export function compararComandos(textoGuia, textoSkill) {
  const guia = bloquesMarcados(textoGuia);
  const skill = bloquesMarcados(textoSkill);
  const difieren = [];
  for (const [id, cuerpo] of guia) {
    if (skill.has(id) && skill.get(id) !== cuerpo) difieren.push({ id, guia: cuerpo, skill: skill.get(id) });
  }
  return {
    comparados: [...guia.keys()].filter((id) => skill.has(id)).length,
    difieren,
    soloEnGuia: [...guia.keys()].filter((id) => !skill.has(id)),
    soloEnSkill: [...skill.keys()].filter((id) => !guia.has(id)),
  };
}

/** El veredicto legible, con el arreglo escrito. Devuelve `{ ok, mensajes }`. */
export function veredicto(r, rutaGuia, rutaSkill) {
  const mensajes = [];
  for (const d of r.difieren) {
    mensajes.push(
      `::error::el comando "${d.id}" DIFIERE entre ${rutaGuia} y ${rutaSkill}. Los dos ejecutan lo mismo, asi ` +
        "que el texto tiene que ser identico: la guia es la fuente, asi que el arreglo va del lado de la skill " +
        "salvo que la guia este mal (y entonces se corrigen las dos en el mismo cambio)." +
        `\n  guia : ${JSON.stringify(d.guia)}\n  skill: ${JSON.stringify(d.skill)}`,
    );
  }
  for (const id of r.soloEnGuia) {
    mensajes.push(
      `::error::el comando "${id}" esta marcado en ${rutaGuia} y NO en ${rutaSkill}. Una marca que no tiene ` +
        "contraparte es una promesa sin cumplir: o la skill lo usa y se marca ahi, o se le saca la marca a la guia.",
    );
  }
  for (const id of r.soloEnSkill) {
    mensajes.push(
      `::error::el comando "${id}" esta marcado en ${rutaSkill} y NO en ${rutaGuia}. La skill ejecuta algo que ` +
        "la guia no describe: o se agrega a la guia, o la skill se aparto de lo escrito.",
    );
  }
  return { ok: mensajes.length === 0, mensajes };
}

/** Compara un par de archivos y devuelve el codigo de salida, imprimiendo el porque. */
function compararPar(rutaGuia, rutaSkill) {
  for (const ruta of [rutaGuia, rutaSkill]) {
    if (!fs.existsSync(ruta)) {
      // Un lado que falta NO es verde: la comparacion no se hizo. Y en un par declarado es
      // rojo, porque el par dejo de existir sin que nadie lo decidiera.
      console.log(
        `::error::${ruta} no existe, asi que no hay con que comparar los comandos de ${rutaGuia === ruta ? rutaSkill : rutaGuia}. ` +
          "Esto NO es un verde: es la comparacion sin hacer. Si el par dejo de existir a proposito, sacalo de PARES en " +
          "herramientas/comandos-compartidos.mjs; si no, restaura el archivo.",
      );
      return 1;
    }
  }
  let r;
  try {
    r = compararComandos(fs.readFileSync(rutaGuia, "utf8"), fs.readFileSync(rutaSkill, "utf8"));
  } catch (e) {
    console.log(`::error::${e.message}`);
    return 1;
  }
  if (r.comparados === 0 && r.soloEnGuia.length === 0 && r.soloEnSkill.length === 0) {
    console.log(
      `::error::${rutaGuia} y ${rutaSkill} no tienen un solo comando marcado. Sin marcas esta comparacion no mide ` +
        "nada y pasaria en verde para siempre. Marca el bloque compartido con <!-- projects:comando <id> --> " +
        "inmediatamente antes de su cerca, en los dos archivos y con el mismo id.",
    );
    return 1;
  }
  const v = veredicto(r, rutaGuia, rutaSkill);
  for (const m of v.mensajes) console.log(m);
  console.log(`comandos comparados entre ${rutaGuia} y ${rutaSkill}: ${r.comparados}`);
  return v.ok ? 0 : 1;
}

function meInvocaronAMi() {
  try {
    return fs.realpathSync(fileURLToPath(import.meta.url)) === fs.realpathSync(process.argv[1] ?? "");
  } catch {
    return false;
  }
}

if (meInvocaronAMi()) {
  const args = process.argv.slice(2);
  if (args.length === 1 || args.length > 2) {
    console.error("uso: node herramientas/comandos-compartidos.mjs                  (todos los pares declarados)");
    console.error("     node herramientas/comandos-compartidos.mjs <guia.md> <skill.md>");
    process.exit(2);
  }
  if (args.length === 2) process.exit(compararPar(args[0], args[1]));
  // Sin argumentos: los pares declarados, con rutas relativas a la raiz del clon.
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  let codigo = 0;
  for (const { guia, skill } of PARES) codigo = Math.max(codigo, compararPar(path.join(raiz, guia), path.join(raiz, skill)));
  process.exit(codigo);
}
