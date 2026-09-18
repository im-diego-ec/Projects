// ---------------------------------------------------------------------------
// EL REGISTRO DE FRICCION: lo que una corrida del arranque tuvo que rodear, escrito por
// la herramienta y no por alguien que se acuerde.
//
// QUE PROBLEMA CIERRA. Hasta este cambio el registro de friccion era una plantilla en
// blanco (docs/plantillas/registro-de-friccion.md) que se llenaba a mano MIENTRAS alguien
// corria la guia. En todo el repo hay una sola instancia, y es la adopcion de otra
// organizacion. Lo que la herramienta ya sabia --cada `::warning::` que emite cuando sigue
// por el camino conservador, cada pregunta del asistente que la persona contesto mal a la
// primera-- se imprimia y se perdia: la guia quedaba PARECIENDO sana mientras alguien la
// rodeaba en cada corrida.
//
// DE DONDE VIENE. Rigel 1.14.0, change 2026-09-01-arranque-ejecutable (commit 8b24629):
// herramientas/registro-de-friccion.mjs, invocado como ULTIMO paso de una skill que ejecuta
// el arranque. Medido alla el 2026-08-24: un agente que rodea en silencio habria encontrado
// 2 defectos en vez de 7.
//
// LO QUE SE ADAPTO, y por que:
//   - NO hay skill paralela. En Projects el arranque ya lo ejecuta una herramienta --el
//     asistente y `projects init`--; una skill al lado duplicaria su arbol de decisiones y
//     la derivacion de valores, que vive en `derivar()`. El registro ENVUELVE a esa
//     herramienta: la condicion de termino es de `projects init`, no de un documento.
//   - Lo que se registra SALE SOLO. `vigilarAvisos` mira la consola de la corrida y anota
//     todo `::warning::`: un fail-open nuevo que alguien escriba manana entra al registro
//     sin que nadie agregue una llamada al lado. Es el mismo criterio con que la bitacora
//     intercepta la consola en vez de envolver cada `console.log`.
//   - La condicion de termino es el ARCHIVO, no el issue. Abrir un issue en el repositorio
//     del marco es visible desde afuera, y ese repositorio es publico: se ofrece, se
//     confirma escribiendo que si, y sin terminal no se hace --la misma regla que crear el
//     repositorio del proyecto--. Rigel sale 1 si no puede abrirlo; aca eso mandaria a una
//     persona que no programa a reabrir el lanzador sobre un destino ya escrito, que choca
//     con la guarda del destino ocupado. El archivo queda SIEMPRE, y el comando para
//     mandarlo tambien.
//   - No lleva el nombre del proyecto, la cuenta ni rutas de la maquina (`redactar`). Lo
//     que el marco necesita para corregirse es DONDE se trabo alguien, no de quien es el
//     proyecto.
//
// ES UNA HERRAMIENTA DEL MARCO: corre desde el clon y no viaja al proyecto. Sin imports del
// resto de herramientas/ a proposito: `projects-init` la importa, y un import en las dos
// direcciones evalua una antes que la otra.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

/** El archivo que deja la corrida, al lado de la bitacora. El andamio lo ignora en git. */
export const NOMBRE_REGISTRO = "registro-de-friccion.md";

/** Lo que el asistente anota en SU proceso para que llegue al del arranque. Los lanzadores
 *  corren los dos por separado (`--asistente --solo-valores` y despues `--valores`), asi que
 *  sin un archivo en el medio lo anotado se perdia al terminar el primero. */
export const NOMBRE_PENDIENTE = ".projects-friccion.json";

/** Las clases de apartamiento. Conjunto cerrado.
 *
 *  Las cinco primeras son las de Rigel. PREGUNTA es la de Projects: Rigel no tiene
 *  asistente, y la friccion de una pregunta que no se entiende a la primera --la persona
 *  escribe su correo donde va el usuario de GitHub-- no es ninguna de las otras. */
export const CLASES = {
  COMANDO: "un comando escrito no funciono y hubo que reemplazarlo",
  PASO_NO_APLICA: "un paso del camino no se corrio",
  ORDEN: "hubo que cambiar el orden o volver atras",
  VALOR_INFERIDO: "hubo que inferir un valor que nadie dio",
  SIN_COMPROBAR: "una comprobacion no se pudo hacer",
  PREGUNTA: "una pregunta del asistente no se contesto bien a la primera",
};

/** Un apartamiento. `punto` es lo que hace util al registro: sin el, el lector sabe que
 *  algo se rodeo y no donde. */
export function apartamiento({ clase, punto, esperado = null, real = null, nota = null } = {}) {
  if (!Object.hasOwn(CLASES, clase ?? "")) throw new Error(`clase de apartamiento desconocida: ${clase}`);
  if (!punto || !String(punto).trim()) {
    throw new Error("un apartamiento sin punto exacto no sirve: el lector no sabe donde mirar");
  }
  return { clase, punto: String(punto), esperado, real, nota };
}

/** El registro de una corrida. `fase` es donde esta parada la corrida: es el punto de los
 *  avisos que `vigilarAvisos` anota solo. */
export function crearRegistro({ fase = "la corrida" } = {}) {
  const r = {
    fase,
    apartamientos: [],
    anotar(datos) {
      const a = apartamiento(datos);
      r.apartamientos.push(a);
      return a;
    },
    enFase(nueva) {
      r.fase = nueva;
    },
  };
  return r;
}

/** La clase de un `::warning::` de esta herramienta, o `null` si no es un apartamiento.
 *
 *  LO MEDIDO NO ES UN APARTAMIENTO. «medido —» es la convencion de projects-init para un
 *  hallazgo sobre la cuenta (el plan que no ofrece proteccion de rama, un equipo vacio): la
 *  corrida hizo exactamente lo que dice el camino, y lo que encontro queda en la bitacora y
 *  en el documento del proyecto. Todo lo que no se reconoce cae en SIN_COMPROBAR, que es el
 *  lado que no pierde nada: un registro con un aviso de mas se lee; uno con uno de menos no
 *  se nota. */
export const CLASE_DE_AVISO = [
  [/\bmedido\s+—/, null],
  [/cuenta de persona o de organizaci/i, "VALOR_INFERIDO"],
  [/--sin-arranque|--sin-herramientas/, "PASO_NO_APLICA"],
];

export function claseDeAviso(texto) {
  for (const [patron, clase] of CLASE_DE_AVISO) if (patron.test(texto)) return clase;
  return "SIN_COMPROBAR";
}

/** Cuanto de un aviso entra al registro. El texto entero esta en la bitacora. */
const LARGO_DE_UN_AVISO = 400;

/** Anota en el registro todo `::warning::` que salga por la consola, sin dejar de
 *  imprimirlo. Devuelve `{ soltar }`, que deja la consola como estaba.
 *
 *  SE INTERVIENE LA CONSOLA Y NO CADA AVISO, por el mismo motivo que la bitacora: si el
 *  registro dependiera de una llamada al lado de cada `::warning::`, el primer aviso que se
 *  escriba sin ella quedaria afuera, en silencio. Mira cada LINEA de cada argumento: un
 *  mensaje puede traer el aviso en su segunda linea. */
export function vigilarAvisos(registro, consola = console) {
  const original = { log: consola.log, error: consola.error, warn: consola.warn };
  const envolver = (f) =>
    function (...args) {
      for (const a of args) {
        if (typeof a !== "string") continue;
        for (const linea of a.split(/\r?\n/)) {
          const i = linea.indexOf("::warning::");
          if (i < 0) continue;
          const texto = linea.slice(i + "::warning::".length).trim();
          const clase = claseDeAviso(texto);
          if (!clase || !texto) continue;
          registro.anotar({
            clase,
            punto: registro.fase,
            real: texto.length > LARGO_DE_UN_AVISO ? `${texto.slice(0, LARGO_DE_UN_AVISO)}…` : texto,
          });
        }
      }
      return f.apply(consola, args);
    };
  consola.log = envolver(original.log);
  consola.error = envolver(original.error);
  consola.warn = envolver(original.warn);
  return {
    soltar() {
      consola.log = original.log;
      consola.error = original.error;
      consola.warn = original.warn;
    },
  };
}

/** Los apartamientos iguales, juntos y contados. Tres rechazos de la misma pregunta son
 *  UNA senal fuerte, no tres bloques que el lector tiene que comparar a ojo. */
function agrupar(apartamientos) {
  const grupos = new Map();
  for (const a of apartamientos) {
    const clave = JSON.stringify([a.clase, a.punto, a.esperado, a.real, a.nota]);
    const g = grupos.get(clave);
    if (g) g.veces += 1;
    else grupos.set(clave, { ...a, veces: 1 });
  }
  return [...grupos.values()];
}

/** El titulo del issue. No nombra el proyecto: ver `redactar`. `procedimiento` va sin
 *  articulo ("arranque"): el titulo y el cuerpo lo ponen. */
export function tituloDelRegistro(procedimiento, cuantos) {
  return cuantos === 0
    ? `Friccion del ${procedimiento}: sin apartamientos`
    : `Friccion del ${procedimiento}: ${cuantos} apartamiento(s)`;
}

/** El cuerpo, con la forma de una observacion de docs/adopciones/: que se vio, donde, y
 *  lo textual. Esa forma es la que deja convertir una observacion en un PR a la guia o en
 *  un change. */
export function cuerpo({ procedimiento, apartamientos, contexto = {} }) {
  const l = [];
  l.push(`# ${tituloDelRegistro(procedimiento, apartamientos.length)}`);
  l.push("");
  l.push(`Registro de friccion de una corrida del **${procedimiento}**, escrito por la herramienta al terminar.`);
  l.push("");
  const filas = [
    ["Cuando", contexto.fecha],
    ["Camino", contexto.camino],
    ["Forma y plataforma", contexto.forma && contexto.plataforma ? `${contexto.forma} · ${contexto.plataforma}` : null],
    ["Version del marco", contexto.marco],
    ["Maquina", contexto.maquina],
    ["Banderas", contexto.banderas],
  ].filter(([, v]) => v);
  for (const [k, v] of filas) l.push(`- **${k}**: ${v}`);
  if (filas.length) l.push("");

  if (apartamientos.length === 0) {
    // EL CASO VACIO TAMBIEN QUEDA, y no es burocracia: un registro que solo existe cuando
    // algo salio mal no distingue «el camino aguanto una corrida entera» de «nadie miro».
    l.push("## Sin apartamientos");
    l.push("");
    l.push(
      "La corrida completo todos sus pasos **sin apartarse de lo escrito en ningun punto**. Queda " +
        "registrado explicitamente: un registro vacio dice que el camino aguanto una corrida entera, y " +
        "eso es distinto de que nadie haya mirado.",
    );
  } else {
    l.push(`## ${apartamientos.length} apartamiento(s)`);
    l.push("");
    l.push(
      "**El resultado NO se reporta como exito limpio.** La corrida termino, y termino rodeando lo " +
        "de abajo: quien siga el mismo camino se va a chocar con lo mismo.",
    );
    l.push("");
    for (const [i, a] of agrupar(apartamientos).entries()) {
      l.push(`### ${i + 1}. ${CLASES[a.clase]} (\`${a.clase}\`)`);
      l.push("");
      l.push(`- **Punto**: ${a.punto}`);
      if (a.esperado) l.push(`- **Lo escrito**: ${a.esperado}`);
      if (a.real) l.push(`- **Lo que paso**: ${a.real}`);
      if (a.veces > 1) l.push(`- **Veces**: ${a.veces}`);
      if (a.nota) l.push(`- **Nota**: ${a.nota}`);
      l.push("");
    }
  }
  l.push("");
  l.push("## Lo que este registro no ve");
  l.push("");
  l.push(
    "Lo que pasa despues de la herramienta --los ajustes de GitHub, el primer envio, el primer change-- " +
      "no lo ve nadie automaticamente. Eso se anota a mano con `docs/plantillas/registro-de-friccion.md` " +
      "del repositorio del marco. El texto completo de cada aviso esta en la bitacora de la corrida.",
  );
  l.push("");
  l.push(
    "No lleva el nombre del proyecto, la cuenta ni rutas de la maquina: se reemplazaron por " +
      "`<PROYECTO>`, `<ORG>`, `<destino>` y parecidos antes de escribirlo.",
  );
  return `${l.join("\n").trimEnd()}\n`;
}

/** Los valores que identifican a un proyecto o a una persona. Son los que se tapan. Los
 *  demas --los nombres de los paquetes, la region-- son del andamio y no dicen de quien es
 *  nada. */
const IDENTIDAD = [
  "PROYECTO",
  "ORG",
  "BUILDER_1",
  "BUILDER_2",
  "PO",
  "EQUIPO_PO",
  "EQUIPO_BUILDERS",
  "CUENTA_DEV",
  "CUENTA_PROD",
  "PERFIL_DEV",
  "PERFIL_PROD",
  "PREFIJO_RECURSOS",
  "DOMINIO_DEV",
  "DOMINIO_PROD",
  "CANAL_ALERTAS",
];

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Tapa lo que identifica al proyecto, a la persona o a la maquina.
 *
 *  POR QUE ANTES DE ESCRIBIRLO Y NO SOLO ANTES DE MANDARLO: el archivo es lo que se manda
 *  (`--body-file`), y un archivo que hay que acordarse de limpiar antes de mandar es una
 *  fuga esperando a que alguien se apure.
 *
 *  Las rutas se tapan enteras y primero --las mas largas antes, para que el destino no
 *  quede a medias por haber tapado antes su carpeta de arriba--, sin distinguir mayusculas
 *  en Windows. Los valores, con borde de palabra y sin los de menos de tres caracteres:
 *  `po` taparia media prosa. */
export function redactar(texto, { valores = {}, rutas = [] } = {}) {
  let t = String(texto);
  const flags = process.platform === "win32" ? "gi" : "g";
  // Cada ruta llega como texto --y se tapa con `<ruta>`-- o como `{ ruta, como }`.
  const lista = rutas
    .map((r) => (typeof r === "string" ? { ruta: r, como: "<ruta>" } : r))
    .filter((r) => r && typeof r.ruta === "string" && r.ruta.length > 1);
  const unicas = [...new Map(lista.map((r) => [r.ruta, r])).values()].sort((a, b) => b.ruta.length - a.ruta.length);
  for (const { ruta, como } of unicas) t = t.replace(new RegExp(escapar(ruta), flags), como);
  const pares = IDENTIDAD.map((k) => [k, valores[k]])
    .filter(([, v]) => typeof v === "string" && v.trim().length >= 3)
    .sort((a, b) => b[1].length - a[1].length);
  for (const [k, v] of pares) {
    t = t.replace(new RegExp(`(?<![A-Za-z0-9_-])${escapar(v.trim())}(?![A-Za-z0-9_-])`, "g"), `<${k}>`);
  }
  return t;
}

/** Las formas de un `<cuenta>/<repo>` de GitHub: las mismas que usa projects-repositorio.
 *  Lo que no calza no llega a gh. */
const FORMA_DE_CUENTA = /^[A-Za-z0-9](?:-?[A-Za-z0-9]){0,38}$/;
const FORMA_DE_REPO = /^(?!\.{1,2}$)[A-Za-z0-9._][A-Za-z0-9._-]{0,99}$/;

/** El `<cuenta>/<repo>` del marco, leido del remoto del clon desde el que se corre.
 *
 *  SE DERIVA Y NO SE ESCRIBE, igual que ORG_MARCO: quien forkee el marco manda su registro
 *  a SU fork, que es quien puede corregir lo que ese fork le entrego. */
export function repoDelRemoto(url) {
  const m = /github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?\s*$/.exec(String(url ?? ""));
  if (!m || !FORMA_DE_CUENTA.test(m[1]) || !FORMA_DE_REPO.test(m[2])) return null;
  return `${m[1]}/${m[2]}`;
}

/** Una ruta lista para pegar: entre comillas si tiene algo que el shell partiria. */
const citar = (ruta) => (/^[A-Za-z0-9_./:\\~-]+$/.test(ruta) ? ruta : JSON.stringify(ruta));

/** El comando para mandarlo despues, a mano. */
export function comandoDelIssue({ repo, titulo, ruta }) {
  return `gh issue create --repo ${repo ?? "<cuenta>/<repositorio-del-marco>"} --title ${JSON.stringify(titulo)} --body-file ${citar(ruta)}`;
}

/** Lo deja escrito y devuelve donde, o null. Prueba cada base en orden: la primera es el
 *  proyecto, que es la carpeta que la persona sabe abrir. */
export function escribirRegistro(bases, texto) {
  for (const base of bases) {
    if (!base) continue;
    try {
      const ruta = path.join(base, NOMBRE_REGISTRO);
      fs.writeFileSync(ruta, texto, "utf8");
      return ruta;
    } catch {
      // Se prueba la siguiente. Que no se pueda escribir en el proyecto es justamente uno de
      // los problemas que hay que poder contar.
    }
  }
  return null;
}

/** Lo que el asistente deja para el proceso del arranque. */
export function escribirPendiente(dir, datos) {
  fs.writeFileSync(path.join(dir, NOMBRE_PENDIENTE), `${JSON.stringify(datos, null, 2)}\n`, "utf8");
}

/** Lo lee. `existe: false` no es un error: el archivo de valores lo escribio una persona. */
export function leerPendiente(dir) {
  const ruta = path.join(dir, NOMBRE_PENDIENTE);
  if (!fs.existsSync(ruta)) return { existe: false, ok: true, datos: null, ruta };
  try {
    const datos = JSON.parse(fs.readFileSync(ruta, "utf8").replace(/^﻿/, ""));
    const apartamientos = (Array.isArray(datos?.apartamientos) ? datos.apartamientos : []).map((a) => apartamiento(a));
    return { existe: true, ok: true, datos: { ...datos, apartamientos }, ruta };
  } catch (e) {
    return { existe: true, ok: false, datos: null, ruta, error: e.message };
  }
}

/** Lo borra una vez que el registro lo absorbio: si quedara, la proxima corrida lo contaria
 *  dos veces. Devuelve si lo pudo borrar. */
export function consumirPendiente(dir) {
  try {
    fs.rmSync(path.join(dir, NOMBRE_PENDIENTE), { force: true });
    return true;
  } catch {
    return false;
  }
}

/** LA PREGUNTA, en un solo lugar. Enter NO es que si: mandar algo afuera exige escribirlo. */
export const PREGUNTA_DEL_ISSUE = '  ¿Lo mando? Escribi "si" para mandarlo (Enter lo deja para despues): ';

const esSi = (r) => /^(s|si|sí|y|yes)$/i.test(String(r ?? "").trim());

const TIMEOUT_DE_GH = 60_000;

/** Lanza gh sin shell y devuelve lo que dejo, sin tirar. Es la misma forma que
 *  `ejecutarDeVerdad` de projects-repositorio, que es la que `projects-init` le pasa. */
function ejecutarSinShell(programa, args, { timeout = TIMEOUT_DE_GH } = {}) {
  try {
    const stdout = execFileSync(programa, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout, shell: false });
    return { presente: true, codigo: 0, stdout: String(stdout ?? ""), stderr: "" };
  } catch (e) {
    if (e?.code === "ENOENT") return { presente: false, codigo: null, stdout: "", stderr: "" };
    return {
      presente: true,
      codigo: typeof e?.status === "number" ? e.status : null,
      stdout: String(e?.stdout ?? ""),
      stderr: String(e?.stderr ?? "") || String(e?.message ?? ""),
    };
  }
}

const bien = (r) => r.presente && r.codigo === 0;
const primeraLinea = (r) => `${r.stderr}\n${r.stdout}`.split(/\r?\n/).map((x) => x.trim()).find(Boolean) ?? `salio ${r.codigo}`;

/** Ofrece mandar el registro como issue al repositorio del marco. Devuelve `{ resultado,
 *  url, comando }`.
 *
 *  SIN TERMINAL NO SE MANDA NADA: `preguntar` es null y no se llama a gh ni para mirar. Con
 *  terminal, se explica adonde va y que NO lleva, y se pide un si escrito. Cualquier cosa
 *  que impida mandarlo --gh que falta, sin sesion, un rojo de GitHub-- es `::warning::` con
 *  el comando para hacerlo despues: el archivo ya esta escrito, y lo que falta es entregarlo. */
export async function ofrecerElIssue({
  repo,
  titulo,
  ruta,
  preguntar = null,
  ejecutar = ejecutarSinShell,
  haySesion = () => bien(ejecutar("gh", ["auth", "status"], { timeout: 30_000 })),
  decir = (l) => console.log(l),
  avisar = (l) => console.error(l),
}) {
  const comando = comandoDelIssue({ repo, titulo, ruta });
  const conComando = (resultado, primera, ...explicacion) => {
    avisar(`::warning::${primera}`);
    for (const l of explicacion) avisar(l);
    avisar("  Cuando quieras mandarlo:");
    avisar(`     ${comando}`);
    return { resultado, url: null, comando };
  };

  if (!repo) {
    return conComando(
      "sin-repo",
      "no se de que repositorio de GitHub viene este clon del marco (su remoto `origin` no es de GitHub), asi que el registro NO se manda.",
      "  Cambia <cuenta>/<repositorio-del-marco> por el repositorio del que bajaste el marco.",
    );
  }
  if (!preguntar) {
    decir(`  Para que el marco lo lea hay que mandarlo a ${repo}, y eso se confirma en una terminal. Cuando quieras:`);
    decir(`     ${comando}`);
    return { resultado: "sin-terminal", url: null, comando };
  }
  if (!bien(ejecutar("gh", ["--version"], { timeout: 30_000 }))) {
    return conComando("sin-gh", "no encontre `gh`, asi que el registro quedo en esta computadora y NO se mando al marco.", "  Se baja de https://cli.github.com; despues `gh auth login` una vez.");
  }
  if (!haySesion()) {
    return conComando("sin-sesion", "`gh` no tiene la sesion de GitHub abierta, asi que el registro NO se mando al marco.", "  Se abre con `gh auth login` (una vez por computadora).");
  }
  decir(`  Mandarlo es lo que hace que el marco se corrija: va como issue a ${repo}. Si ese repositorio es`);
  decir("  publico, cualquiera lo puede leer: por eso no lleva el nombre del proyecto, ni tu cuenta, ni rutas");
  decir(`  de esta maquina. Leelo antes si queres: ${ruta}`);
  const respuesta = await preguntar(PREGUNTA_DEL_ISSUE);
  if (!esSi(respuesta)) {
    decir("  No se mando. Queda en el proyecto; cuando quieras:");
    decir(`     ${comando}`);
    return { resultado: "no-confirmado", url: null, comando };
  }
  const creado = ejecutar("gh", ["issue", "create", "--repo", repo, "--title", titulo, "--body-file", ruta], { timeout: TIMEOUT_DE_GH });
  if (!bien(creado)) return conComando("fallo", `gh no pudo abrir el issue en ${repo}: ${primeraLinea(creado)}`);
  const url = /https:\/\/github\.com\/\S+\/issues\/\d+/.exec(creado.stdout)?.[0] ?? creado.stdout.trim();
  decir(`  REGISTRO MANDADO AL MARCO: ${url}`);
  return { resultado: "mandado", url, comando };
}
