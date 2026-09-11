import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CHANGES = path.join(RAIZ, "openspec", "changes");

// ---------------------------------------------------------------------------
// UN CHANGE QUE CITA EL CANONICO TIENE QUE CITAR UN ARCHIVO QUE EXISTA.
//
// QUE DEFECTO CIERRA. Projects se bifurco de Rigel el 2026-08-24 y generalizo la
// constitucion: `60-infra-aws-secretos.md` paso a llamarse
// `60-infra-plataforma-secretos.md`. CINCO citas en changes ACTIVOS quedaron
// apuntando al nombre viejo, en cuatro archivos de dos changes. Un agente que
// abre uno de esos changes para ejecutarlo va a buscar su evidencia y no la
// encuentra; peor, puede concluir que la regla no existe.
//
// POR QUE SOLO EL CANONICO Y NO TODA RUTA. Un change PROPONE cosas, asi que cita
// archivos que todavia no existen a proposito --es su trabajo--. Exigir que toda
// ruta exista pondria rojo al change que propone crear algo, que es al reves de
// lo que hace falta. El canonico es distinto: se cita como EVIDENCIA de lo que la
// constitucion ya dice. Una evidencia que no existe no es una promesa: es un error.
//
// LO QUE ESTA COMPUERTA NO HACE, y quedo escrito en el change: no comprueba que el
// TEXTO citado siga diciendo lo mismo. Las dos citas que motivaron esto tenian la
// ruta rota Y el contenido cambiado de sentido --"IaC = Terraform, sin excepcion"
// hoy es "Terraform es la forma por defecto"--, y eso no lo caza un existsSync.
// ---------------------------------------------------------------------------

const RUTA_CANONICO = /actions\/constitucion\/canonico\/[0-9A-Za-z._-]+\.md/g;

/** Los .md de los changes ACTIVOS (sin archive). El archive es historia: sus
 *  citas quedaron correctas el dia que se archivaron y reescribirlas seria
 *  reescribir lo que paso. */
function documentosDeChangesActivos() {
  const salida = [];
  const recorrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) recorrer(p);
      else if (e.name.endsWith(".md")) salida.push(p);
    }
  };
  for (const e of fs.readdirSync(CHANGES, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name === "archive") continue;
    recorrer(path.join(CHANGES, e.name));
  }
  return salida;
}

function citasDelCanonico() {
  const citas = [];
  for (const f of documentosDeChangesActivos()) {
    for (const m of fs.readFileSync(f, "utf8").matchAll(RUTA_CANONICO)) {
      citas.push({ desde: path.relative(RAIZ, f), ruta: m[0] });
    }
  }
  return citas;
}

test("hay changes activos que citan el canonico: si no, todo lo de abajo pasa vacuamente", () => {
  const citas = citasDelCanonico();
  assert.ok(
    citas.length > 0,
    "ningun change activo cita el canonico. Si dejaron de citarlo, esta compuerta sobra; si el patron dejo de matchear, quedo mirando al vacio",
  );
});

test("toda cita del canonico en un change ACTIVO apunta a un archivo que existe", () => {
  const rotas = citasDelCanonico().filter((c) => !fs.existsSync(path.join(RAIZ, c.ruta)));
  assert.deepEqual(
    rotas,
    [],
    "estos changes citan como evidencia un archivo del canonico que no existe:\n  " +
      rotas.map((r) => `${r.desde} -> ${r.ruta}`).join("\n  "),
  );
});

test("MUERDE: una cita a un canonico inexistente se caza", () => {
  // Anti-vacuidad: se comprueba el predicado con una ruta sintetica.
  const inventada = "actions/constitucion/canonico/99-no-existe.md";
  assert.ok(!fs.existsSync(path.join(RAIZ, inventada)), "la ruta sintetica existe: el caso no mide nada");
  const rotas = [{ desde: "sintetico.md", ruta: inventada }].filter((c) => !fs.existsSync(path.join(RAIZ, c.ruta)));
  assert.equal(rotas.length, 1, "el predicado no detecta una cita rota");
});
