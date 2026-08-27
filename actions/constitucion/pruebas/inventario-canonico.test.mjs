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
