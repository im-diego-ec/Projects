// GUARDA DE LA TABLA DE VALORES DEL ANDAMIO.
//
// DE QUE TABLA HABLA. plantilla/README.md seccion 2 es la fuente de verdad de
// QUE PONER en cada uno de los valores que un humano decide al crear un repo. Es
// el unico documento que responde esa pregunta: la herramienta valida, pero no
// ensena.
//
// POR QUE EXISTE ESTA GUARDA, y es un desfase medido. Ya habia un banco que
// comparaba el CONJUNTO de filas contra el conjunto de valores que se piden —o
// sea que ninguna fila sobra ni falta— y con eso alcanzaba mientras la
// validacion miraba dos valores de los veintiuno. Cuando la validacion paso a
// declarar una FORMA por valor, la tabla quedo atras sin que nada lo dijera: dos
// de sus ejemplos eran exactamente el valor que la nueva validacion RECHAZA (un
// nombre de perfil con un espacio adentro), y uno mas era un valor de otra fila
// que una pasada de anonimizado habia dejado ahi.
//
// El defecto no es cosmetico y no se parece a un typo. Quien llena el archivo de
// valores copia el ejemplo de la tabla, corre la herramienta y recibe un error
// sobre SU archivo — cuando el que estaba mal era el documento que le dijo que
// poner. Y el ejemplo que apunta a otra fila es peor: ese SI pasa la validacion,
// entra al repo nuevo y aparece meses despues como una coordenada que no resuelve.
//
// LA REGLA, DECIDIBLE: cada fila de la tabla cuyo valor tenga una forma declarada
// tiene que dar un ejemplo, y ese ejemplo tiene que PASAR esa forma. Se corre la
// validacion de verdad contra el texto de la tabla; no se repite aca ningun
// patron, porque una segunda copia de la forma es justamente lo que se
// desincroniza.
//
// LO QUE ESTA GUARDA NO PUEDE. No sabe si el ejemplo es BUENO —`agenda` y `xyz`
// pasan igual— ni si la columna "que poner" describe la forma. Verifica lo unico
// decidible: que el documento no le pida a nadie un valor que la herramienta va a
// rechazar.
//
// Y LA SEGUNDA MITAD: el registro de valores del andamio. Los valores viajan a
// los archivos que los usan, pero el repo nuevo necesita ademas UN lugar donde
// quede escrito de donde salio cada uno —es de ahi que la porcion del marco de la
// constitucion se renderiza—. Ese lugar es plantilla/.projects-valores.json, y
// una clave que ese archivo no declara es un valor sin fuente en el repo que
// nace. Es la misma clase de desfase que el de la tabla, en el otro archivo.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  clavesQueElRegistroNoDeclara,
  FORMATOS,
  REGISTRO_DE_VALORES,
  REQUERIDOS,
} from "../../herramientas/projects-init.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ANDAMIO = path.join(RAIZ, "plantilla");
const GUIA = path.join(ANDAMIO, "README.md");

/**
 * Las filas de la tabla de valores, leidas del documento.
 *
 * La forma que reconoce: una fila de tabla markdown cuya PRIMERA celda es el
 * marcador entre backticks, y cuya TERCERA celda —cuando existe— es el ejemplo,
 * tambien entre backticks. Las tablas de la seccion 2 tienen tres o cuatro
 * columnas (algunas agregan "si no existe"), y en las cuatro la de ejemplo es la
 * tercera.
 */
export function filasDeLaTabla(texto) {
  const filas = [];
  for (const m of texto.matchAll(/^\| *`\{\{([A-Z0-9_]+)\}\}` *\|(.*)$/gm)) {
    const celdas = m[2].split("|").map((c) => c.trim());
    const bruto = celdas[1] ?? "";
    const entreBackticks = bruto.match(/^`(.+)`$/);
    filas.push({ clave: m[1], bruto, ejemplo: entreBackticks ? entreBackticks[1] : null });
  }
  return filas;
}

/** Los desfases entre la tabla y las formas que la herramienta exige. */
export function desfasesDeLaTabla(texto) {
  const problemas = [];
  const filas = filasDeLaTabla(texto);
  const vistas = new Set(filas.map((f) => f.clave));

  for (const f of filas) {
    const formato = FORMATOS[f.clave];
    // Un marcador DERIVADO (PAQUETES) se documenta pero no se pide, asi que no
    // tiene forma declarada y no hay contra que medir su ejemplo.
    if (!formato) continue;
    if (formato.patron === null) continue; // texto libre por definicion: ver FORMATOS.
    if (f.ejemplo === null) {
      problemas.push(
        `${f.clave}: la fila no da un ejemplo entre backticks, y su valor SI tiene forma declarada ` +
          `(se espera ${formato.que}). Quien llena el archivo de valores no tiene de donde copiar, y la ` +
          `herramienta le va a rechazar lo que invente`,
      );
      continue;
    }
    if (!formato.patron.test(f.ejemplo)) {
      problemas.push(
        `${f.clave}: el ejemplo de la tabla es \`${f.ejemplo}\` y la herramienta lo RECHAZA — se espera ` +
          `${formato.que}. Copiado tal cual, el error sale sobre el archivo de quien lo copio y no sobre el ` +
          `documento que se lo dijo`,
      );
    }
  }

  // Anti-vacuidad hacia el otro lado: si el lector dejara de matchear, "cero
  // desfases" seria la respuesta de un escaneo que no leyo nada.
  const sinFila = REQUERIDOS.filter((k) => !vistas.has(k));
  if (sinFila.length) {
    problemas.push(
      `la tabla no tiene fila para ${sinFila.join(", ")}. O falta documentar esos valores, o el lector de ` +
        `filas dejo de reconocer la forma de la tabla y este banco esta midiendo un subconjunto`,
    );
  }
  return problemas;
}

// ---------------------------------------------------------------------------
// LAS COMPROBACIONES
// ---------------------------------------------------------------------------

test("tabla · el lector encuentra una fila por cada valor, y alguna mas", () => {
  const filas = filasDeLaTabla(fs.readFileSync(GUIA, "utf8"));
  // Los 21 que se piden, mas los derivados que se documentan igual.
  assert.ok(
    filas.length >= REQUERIDOS.length,
    `solo ${filas.length} filas leidas para ${REQUERIDOS.length} valores: el lector se rompio`,
  );
  const conEjemplo = filas.filter((f) => f.ejemplo !== null).length;
  assert.ok(conEjemplo >= 20, `solo ${conEjemplo} filas con ejemplo: el lector de la tercera celda se rompio`);
});

test("tabla · todo ejemplo de la tabla PASA la validacion de su valor", () => {
  assert.deepEqual(desfasesDeLaTabla(fs.readFileSync(GUIA, "utf8")), []);
});

test("tabla · la comprobacion de los ejemplos MUERDE", () => {
  const texto = fs.readFileSync(GUIA, "utf8");
  const mutaciones = [
    {
      nombre: "un nombre de perfil vuelve a llevar un espacio adentro",
      // La forma exacta del desfase que esta guarda cierra: el valor viaja dentro
      // de un patron de la allowlist, donde un espacio no rompe el JSON, rompe el
      // patron — y una entrada de allowlist que no matchea nada no avisa.
      mutar: (t) => t.replace("| `ejemplo-dev` |", "| `perfil de ejemplo dev` |"),
      espera: /PERFIL_DEV/,
    },
    {
      nombre: "un id de cuenta pierde un digito",
      mutar: (t) => t.replace("| `111111111111` |", "| `11111111111` |"),
      espera: /CUENTA_DEV/,
    },
    {
      nombre: "un handle de GitHub aparece con la arroba adelante",
      mutar: (t) => t.replace("| `handle-del-po` |", "| `@handle-del-po` |"),
      espera: /^PO:/,
    },
    {
      nombre: "una fila se queda sin su ejemplo",
      mutar: (t) => t.replace("| `#alertas-prod` |", "| — |"),
      espera: /CANAL_ALERTAS: la fila no da un ejemplo/,
    },
    {
      nombre: "el dominio se escribe con esquema",
      mutar: (t) => t.replace("| `agenda.ejemplo.com` |", "| `https://agenda.ejemplo.com/` |"),
      espera: /DOMINIO_PROD/,
    },
  ];
  for (const m of mutaciones) {
    const mutado = m.mutar(texto);
    assert.notEqual(mutado, texto, `la mutacion "${m.nombre}" no cambio nada: el ancla que usa se movio y esta prueba estaba pasando en vacio`);
    const problemas = desfasesDeLaTabla(mutado);
    assert.ok(problemas.length >= 1, `la mutacion "${m.nombre}" no fue detectada`);
    assert.ok(
      problemas.some((p) => m.espera.test(p)),
      `la mutacion "${m.nombre}" se detecto, pero el mensaje no nombra el valor que la tiene: ${JSON.stringify(problemas)}`,
    );
  }
});

test("tabla · la anti-vacuidad MUERDE: un lector que no lee nada no sale verde", () => {
  // Si la tabla cambiara de forma —otra ortografia del marcador, otra columna—
  // el lector devolveria cero filas y "cero desfases" seria la respuesta de no
  // haber mirado. Se simula rompiendo la forma de TODAS las filas a la vez.
  const roto = fs.readFileSync(GUIA, "utf8").replaceAll("| `{{", "| {{");
  assert.equal(filasDeLaTabla(roto).length, 0, "la mutacion no rompio el lector: esta prueba no prueba nada");
  const problemas = desfasesDeLaTabla(roto);
  assert.ok(problemas.length >= 1, "un lector que no encontro una sola fila salio verde");
  assert.match(problemas.at(-1), /el lector de filas dejo de reconocer la forma de la tabla/);
});

// ---------------------------------------------------------------------------
// LA OTRA MITAD: el registro de valores que le queda al repo nuevo.
// ---------------------------------------------------------------------------

test("registro · el andamio declara los valores en su .projects-valores.json", () => {
  const r = clavesQueElRegistroNoDeclara(ANDAMIO);
  assert.equal(r.error, null);
  assert.deepEqual(
    r.faltan,
    [],
    `plantilla/${REGISTRO_DE_VALORES} no declara estos valores, asi que el repo que nazca del andamio los ` +
      `tiene en los archivos que los usan y sin ninguna fuente que diga de donde salieron`,
  );
});

test("registro · el andamio lo llena con el marcador de cada clave, no con un valor", () => {
  // El archivo se llena SOLO durante la instanciacion, porque cada clave apunta
  // a su propio marcador y entra al mismo buscar-y-reemplazar que el resto del
  // arbol. Una clave escrita con un valor concreto no se sustituiria: el repo
  // nuevo nace con el dato de otro proyecto y ningun check lo dice, porque el
  // escaneo de marcadores sobrevivientes busca los que QUEDAN, no los que faltan.
  const guardados = JSON.parse(fs.readFileSync(path.join(ANDAMIO, REGISTRO_DE_VALORES), "utf8"));
  const mal = REQUERIDOS.filter((k) => guardados[k] !== `{{${k}}}`);
  assert.deepEqual(
    mal,
    [],
    `estas claves no apuntan a su propio marcador, asi que la instanciacion no las va a sustituir: ` +
      `${mal.map((k) => `${k} = ${JSON.stringify(guardados[k])}`).join(", ")}`,
  );
});

test("registro · la comprobacion del registro MUERDE", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "projects-registro-"));
  const copia = path.join(tmp, "plantilla");
  try {
    fs.cpSync(ANDAMIO, copia, { recursive: true });
    assert.deepEqual(clavesQueElRegistroNoDeclara(copia).faltan, [], "la copia no arranco limpia");
    const archivo = path.join(copia, REGISTRO_DE_VALORES);
    const original = fs.readFileSync(archivo, "utf8");

    // (a) la clave que se va. Es el desfase real que este banco cierra: el
    // registro guardaba quince de los veintiuno, y entre los seis que faltaban
    // estaban los dos equipos que CODEOWNERS sustituye.
    const guardados = JSON.parse(original);
    delete guardados.EQUIPO_BUILDERS;
    fs.writeFileSync(archivo, JSON.stringify(guardados, null, 2) + "\n");
    assert.deepEqual(
      clavesQueElRegistroNoDeclara(copia).faltan,
      ["EQUIPO_BUILDERS"],
      "una clave borrada del registro no fue detectada",
    );

    // (b) el archivo que deja de ser JSON. Sin esta rama, un archivo roto
    // devolveria una lista vacia de faltantes y la comprobacion saldria VERDE
    // sobre un registro ilegible.
    fs.writeFileSync(archivo, "{ esto no es json\n");
    const roto = clavesQueElRegistroNoDeclara(copia);
    assert.ok(roto.error, "un registro que no parsea tiene que reportarse como error, no como cero faltantes");
    assert.deepEqual(roto.faltan, []);

    fs.writeFileSync(archivo, original);
    assert.deepEqual(clavesQueElRegistroNoDeclara(copia).faltan, [], "la copia no volvio limpia");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
