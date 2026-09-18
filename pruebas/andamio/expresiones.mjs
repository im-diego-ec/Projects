// LAS CONDICIONES DE UN WORKFLOW, EVALUADAS Y NO BUSCADAS COMO TEXTO.
//
// POR QUE EXISTE. Un `if:` de GitHub Actions es un programa chico, y la forma de
// romperlo no es borrar la linea: es escribir una condicion que se LEE bien y
// DEJA PASAR lo que no deberia. `desplegar.yml` del andamio tenia exactamente
// eso: `branches: [main]` en el disparo y `conclusion == 'success'` en el job, y
// las dos cosas estaban, y un banco que las buscaba con un regex daba verde. Lo
// que ninguna busqueda de texto podia ver es que un pull request desde un FORK
// cuya rama se llama `main` cumple las dos, y que ese camino terminaba con el
// codigo del fork corriendo al lado del token que publica en produccion.
//
// Por eso este modulo EVALUA: toma la condicion tal como esta escrita en el
// archivo y la corre contra un contexto `github` simulado. Un banco que la usa
// dice "con ESTE evento, ESTE job corre o no corre", que es lo unico que importa.
//
// QUE SUBCONJUNTO ENTIENDE, y que hace con lo que no entiende. Literales
// (cadenas entre comillas simples, numeros, true, false, null), acceso a
// propiedades con punto o con corchetes, `!`, `==`, `!=`, `<`, `<=`, `>`, `>=`,
// `&&`, `||` y parentesis. Es todo lo que los workflows del andamio usan hoy en
// sus condiciones. CUALQUIER OTRA COSA -una funcion como `contains(...)`, un
// operador desconocido- LANZA, no se evalua "como se pueda": un evaluador que
// adivina lo que no entiende es la misma clase de verde falso que este modulo
// existe para cazar. Si el workflow empieza a usar una funcion, el banco se pone
// rojo diciendo cual, y se agrega aca con su caso.
//
// LA SEMANTICA ES LA DE GITHUB, no la de JavaScript, y las diferencias son las
// que muerden:
//   - Las cadenas se comparan SIN DISTINGUIR MAYUSCULAS: `'Main' == 'main'` es
//     verdadero. Una condicion que confia en el nombre de la rama para frenar a
//     un fork no lo frena ni siquiera escrita al reves.
//   - Tipos distintos se comparan como numeros (null es 0, una cadena que no es
//     un numero es NaN, y NaN no es igual a nada).
//   - `&&` y `||` devuelven uno de los operandos, no un booleano.
//   - Una propiedad que no existe es null, y seguir navegando desde null da null
//     (no un error): asi `github.event.workflow_run.conclusion` bajo un disparo
//     manual vale null y la comparacion da falso sola.
// Fuente: la referencia de expresiones de GitHub Actions ("Literals",
// "Operators", tabla de coercion a numero), leida el 2026-09-17.

/** La clave con la que un banco le DECLARA al evaluador las funciones que modela.
 *
 *  Es un simbolo y no un nombre porque ningun `if:` puede nombrarlo: una condicion
 *  que dijera `funciones.x` no tiene que encontrar este mapa. Y es opt-in a proposito:
 *  un banco que no la pasa sigue viendo que CUALQUIER funcion lanza, que es la
 *  garantia de la que dependen los bancos del despliegue. Hoy la usa
 *  `refs-propias.test.mjs`, que necesita `cancelled()` porque los jobs particionados
 *  de marco-ci.yml la llevan en su condicion. Solo funciones SIN argumentos: las de
 *  estado del job (`success()`, `failure()`, `cancelled()`, `always()`), cuyo valor
 *  lo fija el banco para el escenario que mide. */
export const FUNCIONES = Symbol("funciones");

/** Lo que GitHub considera verdadero. */
export function veraz(v) {
  return !(v === false || v === null || v === undefined || v === "" || v === 0 || Number.isNaN(v));
}

function aNumero(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    if (v.trim() === "") return 0;
    const n = Number(v);
    return Number.isNaN(n) ? NaN : n;
  }
  return NaN;
}

function igual(a, b) {
  const na = a === undefined ? null : a;
  const nb = b === undefined ? null : b;
  if (typeof na === "string" && typeof nb === "string") return na.toLowerCase() === nb.toLowerCase();
  if (na === null && nb === null) return true;
  if (typeof na === typeof nb && typeof na !== "object") return na === nb;
  return aNumero(na) === aNumero(nb);
}

function comparar(op, a, b) {
  if (op === "==") return igual(a, b);
  if (op === "!=") return !igual(a, b);
  let x = a;
  let y = b;
  if (!(typeof a === "string" && typeof b === "string")) {
    x = aNumero(a);
    y = aNumero(b);
  } else {
    x = a.toLowerCase();
    y = b.toLowerCase();
  }
  if (op === "<") return x < y;
  if (op === "<=") return x <= y;
  if (op === ">") return x > y;
  if (op === ">=") return x >= y;
  throw new Error(`operador no soportado: ${op}`);
}

function tokens(texto) {
  const salida = [];
  let i = 0;
  while (i < texto.length) {
    const c = texto[i];
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    if (c === "'") {
      let valor = "";
      i += 1;
      for (;;) {
        if (i >= texto.length) throw new Error(`cadena sin cerrar en: ${texto}`);
        if (texto[i] === "'" && texto[i + 1] === "'") {
          valor += "'";
          i += 2;
          continue;
        }
        if (texto[i] === "'") {
          i += 1;
          break;
        }
        valor += texto[i];
        i += 1;
      }
      salida.push({ tipo: "lit", valor });
      continue;
    }
    const dos = texto.slice(i, i + 2);
    if (["==", "!=", "&&", "||", "<=", ">="].includes(dos)) {
      salida.push({ tipo: "op", valor: dos });
      i += 2;
      continue;
    }
    if ("!<>().[],".includes(c)) {
      salida.push({ tipo: "op", valor: c });
      i += 1;
      continue;
    }
    const num = /^\d+(\.\d+)?/.exec(texto.slice(i));
    if (num) {
      salida.push({ tipo: "lit", valor: Number(num[0]) });
      i += num[0].length;
      continue;
    }
    const id = /^[A-Za-z_][A-Za-z0-9_-]*/.exec(texto.slice(i));
    if (id) {
      const p = id[0];
      if (p === "true" || p === "false") salida.push({ tipo: "lit", valor: p === "true" });
      else if (p === "null") salida.push({ tipo: "lit", valor: null });
      else salida.push({ tipo: "id", valor: p });
      i += p.length;
      continue;
    }
    throw new Error(`caracter que el evaluador no entiende ("${c}") en: ${texto}`);
  }
  return salida;
}

/** Evalua una condicion de GitHub Actions contra un contexto.
 *
 *  `contexto` es un objeto con los contextos de nivel superior que la condicion
 *  nombra (`github`, `steps`, `inputs`, ...). Nombrar uno que no esta LANZA: un
 *  contexto olvidado en el banco no puede leerse como null y dar un veredicto. */
export function evaluar(expresion, contexto) {
  const limpio = String(expresion).trim().replace(/^\$\{\{([\s\S]*)\}\}$/, "$1");
  const ts = tokens(limpio);
  let pos = 0;
  const mira = () => ts[pos];
  const es = (v) => ts[pos] && ts[pos].tipo === "op" && ts[pos].valor === v;
  const come = (v) => {
    if (!es(v)) throw new Error(`se esperaba "${v}" en: ${limpio}`);
    pos += 1;
  };

  function o() {
    let izq = y();
    while (es("||")) {
      pos += 1;
      const der = y();
      izq = veraz(izq) ? izq : der;
    }
    return izq;
  }
  function y() {
    let izq = cmp();
    while (es("&&")) {
      pos += 1;
      const der = cmp();
      izq = veraz(izq) ? der : izq;
    }
    return izq;
  }
  function cmp() {
    let izq = unario();
    while (mira() && mira().tipo === "op" && ["==", "!=", "<", "<=", ">", ">="].includes(mira().valor)) {
      const op = mira().valor;
      pos += 1;
      izq = comparar(op, izq, unario());
    }
    return izq;
  }
  function unario() {
    if (es("!")) {
      pos += 1;
      return !veraz(unario());
    }
    return primario();
  }
  function primario() {
    const t = mira();
    if (!t) throw new Error(`la condicion termina antes de tiempo: ${limpio}`);
    if (t.tipo === "lit") {
      pos += 1;
      return t.valor;
    }
    if (es("(")) {
      pos += 1;
      const v = o();
      come(")");
      return v;
    }
    if (t.tipo === "id") {
      pos += 1;
      if (es("(")) return llamada(t.valor);
      if (!(t.valor in contexto)) throw new Error(`el contexto "${t.valor}" no esta en el banco: ${limpio}`);
      let v = contexto[t.valor];
      for (;;) {
        if (es(".")) {
          pos += 1;
          const p = mira();
          if (!p || p.tipo !== "id") throw new Error(`se esperaba un nombre despues del punto en: ${limpio}`);
          pos += 1;
          v = v === null || v === undefined ? null : (v[p.valor] ?? null);
          continue;
        }
        if (es("[")) {
          pos += 1;
          const clave = o();
          come("]");
          v = v === null || v === undefined ? null : (v[clave] ?? null);
          continue;
        }
        break;
      }
      return v;
    }
    throw new Error(`no se esperaba "${t.valor}" en: ${limpio}`);
  }
  // Una funcion solo se evalua si el banco la DECLARO (ver FUNCIONES) y se llama sin
  // argumentos. Todo lo demas lanza con el mismo mensaje de siempre: un evaluador que
  // adivina una funcion es un verde falso con otra forma.
  function llamada(nombre) {
    const declaradas = contexto[FUNCIONES] ?? {};
    if (!Object.hasOwn(declaradas, nombre)) {
      throw new Error(`funcion no soportada por el evaluador: ${nombre}(...) en: ${limpio}`);
    }
    come("(");
    if (!es(")")) {
      throw new Error(`funcion no soportada por el evaluador: ${nombre}(...) con argumentos en: ${limpio}`);
    }
    come(")");
    return declaradas[nombre]();
  }

  const v = o();
  if (pos !== ts.length) throw new Error(`sobra texto despues de la condicion: ${limpio}`);
  return v;
}

// ---------------------------------------------------------------------------
// LECTURA DEL WORKFLOW, por sangria y no con un parser de YAML: el andamio trae
// marcadores de doble llave (`{{PAQUETE_SITIO}}`) que un parser lee como un
// mapa en flujo y rechaza. Es la misma decision -y el mismo motivo- que
// `workflows.mjs`, y la forma de estos archivos es fija: dos espacios para el
// job, cuatro para sus claves, seis para el guion de cada paso.
// ---------------------------------------------------------------------------

/** El valor de una clave `if:` que empieza en `lineas[i]`, con su bloque plegado
 *  si lo tiene. Devuelve la expresion en una sola linea. */
function valorDeIf(lineas, i, sangria) {
  const m = new RegExp(`^ {${sangria}}if:\\s*(.*)$`).exec(lineas[i]);
  const cabeza = m[1].trim();
  if (!/^[>|][-+]?$/.test(cabeza)) return cabeza.replace(/^(['"])([\s\S]*)\1$/, "$2");
  const partes = [];
  for (let j = i + 1; j < lineas.length; j += 1) {
    const l = lineas[j];
    if (l.trim() === "") continue;
    const s = l.length - l.trimStart().length;
    if (s <= sangria) break;
    partes.push(l.trim());
  }
  return partes.join(" ");
}

/** Los jobs de un workflow: nombre, condicion (o null), texto del cuerpo y pasos.
 *
 *  Cada paso trae su `name`, su `id`, su `if` (o null), su `env` como mapa de
 *  texto crudo, las lineas de su `with:` y su `run:` desindentado. */
export function jobsConCondiciones(texto) {
  const lineas = texto.split(/\r?\n/);
  const inicio = lineas.findIndex((l) => /^jobs:\s*$/.test(l));
  if (inicio === -1) throw new Error("el workflow no tiene bloque jobs:");
  const jobs = [];
  let actual = null;
  for (let i = inicio + 1; i < lineas.length; i += 1) {
    const l = lineas[i];
    const job = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(l);
    if (job) {
      actual = { nombre: job[1], si: null, lineas: [], pasos: [] };
      jobs.push(actual);
      continue;
    }
    if (!actual) continue;
    actual.lineas.push(l);
    if (/^ {4}if:/.test(l)) actual.si = valorDeIf(lineas, i, 4);
  }
  for (const j of jobs) {
    j.cuerpo = j.lineas.join("\n");
    j.pasos = pasosDe([...j.lineas]);
    delete j.lineas;
  }
  return jobs;
}

function pasosDe(lineas) {
  const pasos = [];
  let actual = null;
  let enSteps = false;
  for (let i = 0; i < lineas.length; i += 1) {
    const l = lineas[i];
    if (/^ {4}steps:\s*$/.test(l)) {
      enSteps = true;
      continue;
    }
    if (!enSteps) continue;
    if (/^ {4}\S/.test(l)) {
      enSteps = false;
      continue;
    }
    const nuevo = /^ {6}- (.*)$/.exec(l);
    if (nuevo) {
      actual = { name: null, id: null, si: null, env: {}, with: [], run: null, texto: [] };
      pasos.push(actual);
      lineas[i] = `        ${nuevo[1]}`;
    }
    if (!actual) continue;
    const t = lineas[i];
    actual.texto.push(t);
    const clave = /^ {8}([a-z-]+):\s*(.*)$/.exec(t);
    if (!clave) continue;
    const [, k, v] = clave;
    if (k === "name") actual.name = v.trim();
    if (k === "id") actual.id = v.trim();
    if (k === "if") actual.si = valorDeIf(lineas, i, 8);
    if (k === "env" || k === "with") {
      for (let j = i + 1; j < lineas.length; j += 1) {
        const e = /^ {10}([A-Za-z0-9_-]+):\s*(.*)$/.exec(lineas[j]);
        if (/^\s*#/.test(lineas[j]) || lineas[j].trim() === "") continue;
        if (!e) break;
        if (k === "env") actual.env[e[1]] = e[2].trim();
        else actual.with.push(`${e[1]}: ${e[2].trim()}`);
      }
    }
    if (k === "run" && /^\|/.test(v.trim())) {
      const cuerpo = [];
      for (let j = i + 1; j < lineas.length; j += 1) {
        const r = lineas[j];
        if (r.trim() && !r.startsWith("          ")) break;
        cuerpo.push(r.slice(10));
      }
      actual.run = cuerpo.join("\n");
    }
  }
  for (const p of pasos) p.texto = p.texto.join("\n");
  return pasos;
}

/** Si el disparo `workflow_run` del workflow deja pasar este evento.
 *
 *  Modela lo que GitHub hace ANTES de mirar ningun `if`: que el workflow que
 *  termino este en la lista y que su `head_branch` pase el filtro `branches`.
 *  Ese filtro compara un NOMBRE de rama, y en un pull request desde un fork ese
 *  nombre lo elige quien lo abre: por eso este modelo existe, para que un banco
 *  pueda afirmar en voz alta que el filtro deja pasar al fork. */
export function elDisparoDejaPasar(texto, github) {
  if (github.event_name === "workflow_dispatch") return /^ {2}workflow_dispatch:/m.test(texto);
  if (github.event_name !== "workflow_run") return false;
  const bloque = /^ {2}workflow_run:\s*\n((?: {4}.*\n|\s*\n)+)/m.exec(texto);
  if (!bloque) return false;
  const sinComentarios = bloque[1]
    .split("\n")
    .filter((l) => !/^\s*#/.test(l))
    .join("\n");
  const lista = (clave) => {
    const m = new RegExp(`^ {4}${clave}:\\s*\\[([^\\]]*)\\]`, "m").exec(sinComentarios);
    return m ? m[1].split(",").map((x) => x.trim().replace(/^["']|["']$/g, "")) : null;
  };
  const workflows = lista("workflows") ?? [];
  const ramas = lista("branches");
  const run = github.event.workflow_run;
  if (!workflows.includes(run.name)) return false;
  if (ramas && !ramas.includes(run.head_branch)) return false;
  return true;
}
