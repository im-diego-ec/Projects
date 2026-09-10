import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RELEASE = path.join(RAIZ, ".claude", "skills", "projects-release", "SKILL.md");
const VALIDAR = path.join(RAIZ, ".claude", "skills", "projects-validar-consumidor", "SKILL.md");

const release = fs.readFileSync(RELEASE, "utf8");
const validar = fs.readFileSync(VALIDAR, "utf8");

// ---------------------------------------------------------------------------
// LA EVIDENCIA DEL ENSAYO TIENE QUE SOBREVIVIR AL PROCEDIMIENTO QUE LA BORRA.
//
// QUE DEFECTO CIERRA. `AGENTS.md` fija que ninguna version se publica sin
// probarse contra un consumidor real. La evidencia de ese ensayo es una terna
// --id de corrida + SHA del consumidor + SHA del marco--, y vivia en un
// comentario del PR del ensayo... que el paso 5 de `projects-validar-consumidor`
// manda cerrar con `--delete-branch`. O sea: el procedimiento destruia el unico
// rastro reproducible de su propia precondicion.
//
// Y la unica verificacion mecanica del paso 6 del release medía el LARGO del
// cuerpo publicado. El largo dice que hay texto; no dice que se haya probado
// nada. Medido antes de este cambio: `grep -c "actions/runs" CHANGELOG.md` = 0
// en 237 KB de changelog.
// ---------------------------------------------------------------------------

test("el paso 6 del release exige un id de corrida y un SHA, no solo cuerpo", () => {
  assert.match(
    release,
    /corrida \[0-9\]\{6,\}|\[0-9a-f\]\{40\}/,
    "el paso 6 no busca un id de corrida ni un SHA: medir el largo del cuerpo no acredita ningun ensayo",
  );
});

test("el paso 6 dice que sin la evidencia el release NO esta cerrado", () => {
  // Un comando que se puede correr y cuyo resultado no cambia nada no es una
  // compuerta: es una sugerencia. El texto tiene que decir que detiene.
  assert.match(
    release,
    /release NO esta cerrado/i,
    "el paso 6 propone la medicion pero no dice que el release se detenga sin ella",
  );
});

test("la terna viaja al CHANGELOG, y la skill lo dice explicitamente", () => {
  assert.match(
    validar,
    /La terna va al `CHANGELOG\.md`/,
    "la skill de validacion no manda la terna al CHANGELOG",
  );
  assert.match(
    validar,
    /NO a un comentario del PR/,
    "la skill no descarta explicitamente el comentario del PR, que es de donde venia el defecto",
  );
});

test("las dos skills coinciden en donde vive la evidencia", () => {
  // ANTI-DIVERGENCIA. Son dos documentos que describen un mismo procedimiento en
  // dos momentos distintos. El defecto original fue exactamente que uno suponia
  // escrito lo que el otro no escribia.
  assert.ok(
    /CHANGELOG\.md/.test(validar) && /CHANGELOG/.test(release),
    "una de las dos skills dejo de nombrar el CHANGELOG como lugar de la evidencia",
  );
  assert.match(
    release,
    /--delete-branch/,
    "el paso 6 no menciona por que la evidencia no puede quedarse en el PR del ensayo",
  );
});

test("la skill de validacion sigue cerrando el PR: el defecto no se arreglo quitando el cierre", () => {
  // Si alguien "arreglara" esto dejando la rama viva, el rastro sobreviviria pero
  // el pin temporal tambien, que es peor. Este caso fija que la solucion NO fue esa.
  assert.match(validar, /gh pr close <numero> --delete-branch/, "el cierre con --delete-branch desaparecio del paso 5");
});

// ---------------------------------------------------------------------------
// LA CIRCULARIDAD DE ARRANQUE: CERO CONSUMIDORES.
//
// `AGENTS.md` tiene una frontera 🛑 --"publicar un cambio del marco que no se probo
// contra un consumidor real"-- y aclara que el ensayo es ADEMAS del dogfooding: "no
// solo en el CI de este repo". El registro de consumidores esta vacio.
//
// O sea que la precondicion no se puede cumplir, y no por descuido: el primer
// consumidor no puede existir hasta que el marco publique una version que consumir.
//
// Este banco existe porque el paso 6 EXIGE la terna desde `la-evidencia-del-ensayo-viaja`,
// y sin esta rama ese cambio habria convertido una violacion silenciosa en un
// bloqueo permanente. Las dos son malas; la declaracion escrita no.
// ---------------------------------------------------------------------------

test("el release distingue cero consumidores de consumidores sin probar", () => {
  assert.match(
    release,
    /NINGUN CONSUMIDOR/,
    "el paso 6 no contempla el caso de cero consumidores, asi que con el registro vacio el release queda bloqueado para siempre",
  );
  assert.match(
    release,
    /14-consumidores\.md/,
    "el paso 6 no dice de donde sale la cuenta de consumidores: quedaria a criterio de quien publique",
  );
});

test("la salida de cero consumidores CADUCA sola", () => {
  // Una excepcion sin caducidad es una excepcion para siempre. Esta se apaga sola
  // el dia que el registro tenga una fila, sin que nadie se acuerde de apagarla.
  assert.match(
    release,
    /deja de aplicar|caduca sola/i,
    "la salida por cero consumidores no dice cuando deja de valer, asi que sobreviviria al primer consumidor",
  );
});

test("y NO se finge la evidencia: la declaracion dice que no hubo ensayo", () => {
  // El modo de falla peligroso seria una salida que deje pasar el release
  // diciendo algo que suene a evidencia. La declaracion tiene que nombrar lo que
  // NO se hizo.
  assert.match(release, /no se puede cumplir/, "la salida no declara que la precondicion queda incumplida");
  assert.match(release, /dogfooding/, "la salida no dice que fue lo que SI se corrio en lugar del ensayo");
});
