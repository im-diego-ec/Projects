// EL INVENTARIO DEL CANONICO: que ninguna seccion desaparezca en silencio.
//
// EL HUECO. `leerCanonico()` deriva las secciones del ARBOL —todo `NN-*.md`, en
// orden— y el manifiesto lo dice explicitamente: «no de una lista aca que alguien
// tendria que acordarse de actualizar». La decision es buena y no se toca: agregar
// una seccion entra al render por existir, sin ceremonia.
//
// Lo que ese trade nunca nombro es su otra mitad: **derivar del arbol hace gratis
// AGREGAR y ciego BORRAR**. Medido: la unica asercion sobre el canonico real exigia
// `secciones.length >= 2`, asi que borrar `90-marca.md` —las siete reglas de
// identidad visual que llegan a cada repo— dejaba las 383 pruebas del marco en
// VERDE. Y del lado del consumidor tampoco se ve: su artefacto queda distinto, lo
// regenera, y pierde las reglas sin un solo aviso.
//
// POR QUE EL INVENTARIO VIVE ACA Y NO EN EL MANIFIESTO. Ponerlo en el manifiesto
// seria revertir esa decision para todos los consumidores y sumarle un campo que
// hay que mantener. Acá cuesta lo mismo —una linea cuando se agrega una seccion—
// pero el costo lo paga quien toca el canonico, en el PR donde lo toca, con el
// arreglo escrito en el mensaje. Que es exactamente lo que el marco quiere para su
// constitucion: agregar es barato, QUITAR exige decirlo.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { leerCanonico, renderizar } from "../constitucion.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const CANONICO = path.join(AQUI, "..", "canonico");

// El inventario. Si agregás una sección, agregá su línea acá y listo; si BORRÁS
// una, el rojo te va a pedir que digas que fue a propósito.
const SECCIONES = [
  { archivo: "00-preambulo.md", de_que: "el preámbulo y la regla de oro" },
  { archivo: "10-openspec.md", de_que: "cómo se trabaja con OpenSpec" },
  { archivo: "20-marco-version.md", de_que: "la versión del marco y cómo llega" },
  { archivo: "30-git-despliegue.md", de_que: "git, la promoción por ambientes y qué es «done»" },
  { archivo: "40-fronteras.md", de_que: "las fronteras de tres niveles" },
  { archivo: "50-seguridad-observabilidad.md", de_que: "auth, authz, logs y alertas" },
  { archivo: "60-infra-plataforma-secretos.md", de_que: "las cuatro capacidades de plataforma, la IaC y dónde viven los secretos" },
  { archivo: "70-agentes-modelos.md", de_que: "uso de modelos y effort" },
  { archivo: "80-github.md", de_que: "branches, issues, PRs y labels" },
  { archivo: "90-marca.md", de_que: "las 7 reglas de identidad visual del área" },
];

const VALORES = {
  PROYECTO: "proyecto-de-prueba",
  ORG: "po",
  PAQUETE_API: "api",
  PAQUETE_WEB: "web",
  PAQUETE_E2E: "e2e",
  PAQUETE_SITIO: "sitio",
  ORG_MARCO: "im-diego-ec",
  EQUIPO_BUILDERS: "builders",
  EQUIPO_PO: "po",
  BUILDER_1: "@uno",
  BUILDER_2: "@dos",
  PO: "@po",
  CUENTA_DEV: "111111111111",
  CUENTA_PROD: "222222222222",
  REGION: "us-east-1",
  PERFIL_DEV: "perfil-dev",
  PERFIL_PROD: "perfil-prod",
  PREFIJO_RECURSOS: "prefijo",
  DOMINIO_DEV: "dev.ejemplo.com",
  DOMINIO_PROD: "ejemplo.com",
  CANAL_ALERTAS: "#alertas",
  ID_MCP_SLACK: "00000000-0000-0000-0000-000000000000",
  GENERAR_CLIENTE_DATOS: "prisma generate",
};

/** Los `NN-*.md` que hay en un directorio de canónico, ordenados. */
function seccionesEnDisco(dir) {
  return fs
    .readdirSync(dir)
    .filter((n) => /^\d{2}-.+\.md$/.test(n))
    .sort();
}

/** La comprobación, en función, para que la corran los dos clientes: el canónico
 *  real y las copias mutadas. Devuelve null si está bien. */
function inventarioCompleto(dir) {
  const enDisco = seccionesEnDisco(dir);
  const declaradas = SECCIONES.map((s) => s.archivo);

  const faltan = SECCIONES.filter((s) => !enDisco.includes(s.archivo));
  const sobran = enDisco.filter((a) => !declaradas.includes(a));

  const problemas = [];
  if (faltan.length) {
    problemas.push(
      "DESAPARECIERON secciones del canónico que este inventario declara:\n  " +
        faltan.map((s) => `${s.archivo} — ${s.de_que}`).join("\n  ") +
        "\nSi fue a propósito, borrá su línea de SECCIONES en esta prueba, en el MISMO PR, y " +
        "explicá en el mensaje qué regla del área deja de llegar a cada repo. Si no fue a " +
        "propósito, esto es el aviso que el resto del marco no te iba a dar: el render " +
        "simplemente sale más corto.",
    );
  }
  if (sobran.length) {
    problemas.push(
      `hay secciones en el canónico que este inventario no declara: ${sobran.join(", ")}. ` +
        "Agregá su línea a SECCIONES con una frase de qué trae. No es burocracia: es lo que " +
        "hace que la próxima que se borre se vea.",
    );
  }
  return problemas.length ? problemas.join("\n\n") : null;
}

test("el inventario del canónico está completo: ninguna sección desapareció", () => {
  assert.equal(inventarioCompleto(CANONICO), null);
});

test("cada sección declarada aporta texto al render, no solo existe", () => {
  // Un archivo vacío o sin encabezado pasaría el inventario y no aportaría nada.
  // Lo que se verifica es que el CUERPO renderizado contenga el primer encabezado
  // de cada sección: si una sección deja de aportar, se ve acá.
  const canonico = leerCanonico(CANONICO);
  const render = renderizar({ canonico, valores: VALORES, desvios: [] });
  const cuerpo = typeof render === "string" ? render : (render.cuerpo ?? render.texto ?? "");
  assert.ok(cuerpo.length > 1000, `el render salió sospechosamente corto: ${cuerpo.length} caracteres`);

  const sinAporte = [];
  for (const s of SECCIONES) {
    const lineas = fs.readFileSync(path.join(CANONICO, s.archivo), "utf8").split("\n");
    // Cualquier nivel de encabezado sirve, y si la sección no tiene ninguno se
    // usa su primera línea con texto. El preámbulo, por ejemplo, arranca sin
    // `##` y eso es legítimo: la primera versión de esta prueba lo daba por roto.
    const ancla =
      lineas.find((l) => l.startsWith("#")) ??
      lineas.find((l) => l.trim() !== "" && !l.trim().startsWith("<!--") && l.trim() !== "---");
    if (!ancla) {
      sinAporte.push(`${s.archivo} no tiene ni un encabezado ni una línea con texto: está vacía`);
      continue;
    }
    // El render sustituye marcadores, así que se compara la parte anterior al
    // primer `{{` — que es lo que sobrevive intacto.
    const trozo = ancla.trim().split("{{")[0].trim();
    if (trozo.length < 8) continue; // demasiado corto para ser una señal
    if (!cuerpo.includes(trozo)) {
      sinAporte.push(`el comienzo de ${s.archivo} (${JSON.stringify(trozo)}) no llegó al render`);
    }
  }
  assert.deepEqual(sinAporte, []);
});

test("la comprobación muerde: borrar una sección da rojo y nombra qué se pierde", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "projects-inventario-"));
  try {
    // Se copia el canónico y se borra la sección de marca, que es el caso medido:
    // hasta hoy borrarla dejaba las pruebas del marco en verde.
    const copia = path.join(tmp, "canonico");
    fs.mkdirSync(copia);
    for (const n of fs.readdirSync(CANONICO)) {
      fs.copyFileSync(path.join(CANONICO, n), path.join(copia, n));
    }
    fs.unlinkSync(path.join(copia, "90-marca.md"));

    const problema = inventarioCompleto(copia);
    assert.ok(problema, "borrar 90-marca.md tiene que dar rojo");
    assert.match(problema, /DESAPARECIERON/);
    assert.match(problema, /90-marca\.md/);
    assert.match(
      problema,
      /identidad visual/,
      "el rojo tiene que decir QUÉ se pierde, no solo que falta un archivo",
    );

    // Y el caso inverso: una sección nueva sin declarar también muerde.
    fs.copyFileSync(path.join(CANONICO, "90-marca.md"), path.join(copia, "90-marca.md"));
    fs.writeFileSync(path.join(copia, "95-nueva.md"), "## Una seccion nueva\n\n---\n", "utf8");
    const problema2 = inventarioCompleto(copia);
    assert.ok(problema2, "una sección sin declarar tiene que dar rojo");
    assert.match(problema2, /95-nueva\.md/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  // El canónico del repo no se tocó.
  assert.equal(inventarioCompleto(CANONICO), null);
});

// ---------------------------------------------------------------------------
// LAS REGLAS DE `el-canonico-dice-como-se-trabaja`, POR ID Y POR LO QUE DICEN.
//
// POR QUE ACA. Ninguna de estas reglas describe una herramienta ni un pipeline:
// describen como se conduce el trabajo, y su unico enforcement es LLEGAR al
// contexto de cada sesion. Una regla que se cae del canonico no rompe nada —el
// render sale mas corto, igual que con una seccion borrada—, asi que se verifica
// como el inventario de secciones: nombrandola.
//
// POR QUE POR ID. El id es lo que un desvio nombra: si cambia, el
// `.projects-desvios.json` de un consumidor deja de resolver y su pipeline sale
// rojo por `desvio-muerto` sin que nadie de ese repo haya tocado nada.
//
// Y POR LO QUE DICEN, en las tres donde el texto ES la adaptacion:
//   - la pregunta al PO nombra al rol por su placeholder (decision D8 del PO: los
//     roles son roles y reasignarlos cuesta editar un solo lugar);
//   - el estado «terminado en local y no cerrado» va pegado a la definicion de
//     terminado, y dice que con plataforma `ninguna` es legitimo (decision D6: no
//     desplegar es un estado legitimo);
//   - el PR final LLEVA el enlace al issue macro desde que se crea. «Lo cierra» es
//     un hecho posterior al merge, y enunciado asi la tarea que lo atestigua no se
//     podia marcar en el PR que la cumple: en Rigel costo un PR de una linea en dos
//     changes seguidos (5f47b28).
//
// La comprobacion es una FUNCION, para que la corran los dos clientes: el canonico
// real y las copias mutadas de abajo. Una guarda que nadie vio fallar no es guarda.
// ---------------------------------------------------------------------------

const REGLAS_REVISION_CON_META = [
  ["revision-declara-su-meta", "que una revisión declare su meta y que la meta pueda cerrar"],
  ["hallazgo-se-clasifica-contra-la-meta", "que lo que no bloquea se anote y no se pregunte"],
  ["pregunta-al-po-declara-que-desbloquea", "que una pregunta al PO diga qué desbloquea"],
  ["change-congelado-contra-su-insumo", "que un change se congele contra su versión de insumo"],
];

/** El bloque crudo de cada regla (desde su marca hasta la marca siguiente, el
 *  próximo encabezado o el próximo separador), por id. Es el mismo corte que usa
 *  `insertarDesvios`, así que lo que se mira acá es lo que un desvío anularía. */
function bloquesDeReglas(cuerpo) {
  const bloques = new Map();
  let actual = null;
  for (const linea of cuerpo.split("\n")) {
    const marca = linea.match(/^<!--\s*projects:regla\s+id=([a-z0-9-]+)\s*-->\s*$/);
    if (marca) {
      actual = marca[1];
      bloques.set(actual, "");
      continue;
    }
    if (/^#{1,6}\s/.test(linea) || /^(-{3,}|\*{3,}|_{3,})\s*$/.test(linea)) {
      actual = null;
      continue;
    }
    if (actual) bloques.set(actual, `${bloques.get(actual)}${linea}\n`);
  }
  return bloques;
}

/** Los problemas de las reglas de este change sobre un canónico. [] si está bien. */
function reglasDeComoSeTrabaja(dir) {
  const { cuerpo, ids } = leerCanonico(dir);
  const bloques = bloquesDeReglas(cuerpo);
  const problemas = [];

  const faltan = REGLAS_REVISION_CON_META.filter(([id]) => !ids.includes(id));
  if (faltan.length) {
    problemas.push(
      "faltan reglas de `revision-con-meta` en el canónico:\n  " +
        faltan.map(([id, de_que]) => `${id} — ${de_que}`).join("\n  ") +
        "\nSi se quitó a propósito, borrá su línea de REGLAS_REVISION_CON_META en el MISMO PR y explicá " +
        "en el mensaje qué deja de llegar a cada sesión. Si no, esto es el aviso que el resto del marco no " +
        "te iba a dar: el render simplemente sale más corto.",
    );
  }

  const pregunta = bloques.get("pregunta-al-po-declara-que-desbloquea");
  if (pregunta !== undefined && !pregunta.includes("{{PO}}")) {
    problemas.push(
      "`pregunta-al-po-declara-que-desbloquea` no nombra al rol por `{{PO}}`. Los roles del marco son " +
        "placeholders (decisión D8): reasignar el PO a otra persona tiene que costar editar " +
        "`.projects-valores.json`, no reescribir reglas. Arreglo: «Una pregunta a {{PO}} (PO) ...».",
    );
  }

  const iDone = ids.indexOf("definicion-de-done");
  const iLocal = ids.indexOf("terminado-en-local-y-no-cerrado");
  if (iLocal === -1) {
    problemas.push(
      "falta `terminado-en-local-y-no-cerrado` en el canónico: sin ella, la definición de terminado se lee " +
        "como un incumplimiento en todo repositorio que todavía no tiene ambiente —o que declaró plataforma " +
        "`ninguna`, que es una respuesta legítima—.",
    );
  } else if (iDone === -1 || iLocal !== iDone + 1) {
    problemas.push(
      "`terminado-en-local-y-no-cerrado` tiene que ir INMEDIATAMENTE después de `definicion-de-done`: sola " +
        "no significa nada, y la definición sin ella al lado vuelve a decir que un bloque verde en local sin " +
        "desplegar no está hecho, sin la salida. Las dos viajan juntas.",
    );
  } else {
    const local = bloques.get("terminado-en-local-y-no-cerrado");
    for (const [re, que] of [
      [/\[~\]/, "la marca `[~]` del bloque que lleva casilla"],
      [/`ninguna`/, "que con plataforma `ninguna` el estado es legítimo (decisión D6)"],
      [/BLOQUE/, "que lo que queda sin cerrar es el BLOQUE y no sus tareas"],
    ]) {
      if (!re.test(local)) problemas.push(`\`terminado-en-local-y-no-cerrado\` no dice ${que}.`);
    }
  }

  for (const id of ["openspec-flujo", "github-closes-apunta-al-sub-issue"]) {
    const texto = (bloques.get(id) ?? "").replace(/\s+/g, " ");
    if (!texto) {
      problemas.push(`falta la regla \`${id}\` en el canónico`);
      continue;
    }
    if (/cierra el issue macro|lo cierra [uú]nicamente/i.test(texto)) {
      problemas.push(
        `\`${id}\` vuelve a decir que el PR final CIERRA el issue macro. Eso solo es verdad DESPUÉS del ` +
          "merge, así que la tarea que lo atestigua no se puede marcar en el PR que la cumple. Arreglo: que " +
          "el PR final LLEVA `Closes` al issue macro en su cuerpo desde que se crea.",
      );
    } else if (!/issue macro/.test(texto) || !/desde (que se crea|la creaci[oó]n|su creaci[oó]n)/.test(texto)) {
      problemas.push(
        `\`${id}\` no dice que el PR final lleva el enlace al issue macro en su cuerpo desde que se crea.`,
      );
    }
  }
  return problemas;
}

test("las reglas de cómo se trabaja llegan a cada repo, por id y con lo que dicen", () => {
  assert.deepEqual(reglasDeComoSeTrabaja(CANONICO), []);
});

test("cada una de las cuatro de revisión con meta tiene su propio id, no uno compartido", () => {
  // Un desvío anula la regla ENTERA. Agrupar las cuatro bajo un id obligaría a
  // quien quiera apartarse de una a anular las cuatro.
  const ids = new Set(REGLAS_REVISION_CON_META.map(([id]) => id));
  assert.equal(ids.size, 4, "las cuatro reglas tienen que tener ids distintos");
});

test("la comprobación de cómo se trabaja muerde: cada mutación da su rojo", () => {
  const casos = [
    {
      que: "borrar una de las cuatro de revisión con meta",
      archivo: "40-fronteras.md",
      mutar: (t) => t.replace("<!-- projects:regla id=hallazgo-se-clasifica-contra-la-meta -->", ""),
      espera: /hallazgo-se-clasifica-contra-la-meta/,
    },
    {
      que: "escribir el rol a mano en vez de su placeholder",
      archivo: "40-fronteras.md",
      mutar: (t) =>
        t.replace(/(id=pregunta-al-po-declara-que-desbloquea -->[\s\S]*?)\{\{PO\}\}/, (_, antes) => `${antes}el PO`),
      espera: /\{\{PO\}\}/,
    },
    {
      que: "separar el estado transitorio de la definición de terminado",
      archivo: "30-git-despliegue.md",
      mutar: (t) =>
        t.replace("<!-- projects:regla id=terminado-en-local-y-no-cerrado -->", "<!-- projects:regla id=otra-cosa -->"),
      espera: /terminado-en-local-y-no-cerrado/,
    },
    {
      que: "volver a decir que el PR final cierra el issue macro",
      archivo: "80-github.md",
      mutar: (t) =>
        t.replace(
          /(id=github-closes-apunta-al-sub-issue -->\s*\n\s*\n)[\s\S]*?(\n\s*\n<!--)/,
          (_, a, b) =>
            `${a}- \`Closes\` apunta solo al sub-issue 1:1; el issue macro del change lo cierra\n  únicamente el PR final del change.${b}`,
        ),
      espera: /github-closes-apunta-al-sub-issue.*CIERRA/s,
    },
  ];

  for (const caso of casos) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "projects-como-se-trabaja-"));
    try {
      const copia = path.join(tmp, "canonico");
      fs.mkdirSync(copia);
      for (const n of fs.readdirSync(CANONICO)) fs.copyFileSync(path.join(CANONICO, n), path.join(copia, n));
      const ruta = path.join(copia, caso.archivo);
      const antes = fs.readFileSync(ruta, "utf8");
      const despues = caso.mutar(antes);
      assert.notEqual(despues, antes, `la mutación «${caso.que}» no cambió nada: este caso mide aire`);
      fs.writeFileSync(ruta, despues, "utf8");
      const problemas = reglasDeComoSeTrabaja(copia).join("\n");
      assert.match(problemas, caso.espera, `«${caso.que}» tenía que dar rojo y dio: ${problemas || "(nada)"}`);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  // El canónico del repo no se tocó.
  assert.deepEqual(reglasDeComoSeTrabaja(CANONICO), []);
});
