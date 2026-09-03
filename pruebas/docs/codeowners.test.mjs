// EL PRIMER CHECK EJECUTABLE DE LA CAPABILITY `gobierno-contribucion`.
//
// POR QUE ESTE Y POR QUE AHORA. De las ocho capabilities del contrato,
// `gobierno-contribucion` era la unica cuyos requirements —plantilla de PR,
// CODEOWNERS, proteccion de main— son integramente prosa: ningun archivo
// ejecutable la nombraba, o sea que la capability que gobierna QUIEN APRUEBA QUE
// era la menos enforzada de todas. Y no por falta de material: el requirement
// "Definicion de propietarios de codigo" exige que el propietario quede asignado
// como revisor solicitado, y el propio CODEOWNERS del marco escribe, en su
// encabezado, el modo de falla que lo rompe — "un handle mal escrito falla en
// SILENCIO: GitHub no asigna a nadie y el review cruzado desaparece sin ruido".
//
// QUE PARTE SE PUEDE DECIDIR SIN NUBE. Que el owner quede efectivamente asignado
// depende de la API de GitHub —y de que tenga permiso de escritura, que es la
// trampa que el encabezado documenta— y eso no se verifica offline. Lo que SI se
// decide leyendo el archivo es su SINTAXIS, que es de donde sale el fallo mudo:
// un owner con una forma que la cuenta no puede resolver, o un patron que GitHub
// ignora sin decir nada. Un CODEOWNERS que GitHub descarta se comporta
// exactamente igual que un CODEOWNERS ausente, y ningun rojo lo decia.
//
// LOS DOS ARCHIVOS, Y LA FORMA VALIDA NO ES LA MISMA EN LOS DOS. El de este repo
// y el del andamio, que es el que viaja al consumidor.
//
//   · `plantilla/.github/CODEOWNERS` viaja a un repo de ORGANIZACION, asi que
//     ahi el owner tiene que ser un EQUIPO: sobrevive a que el rol cambie de
//     persona y no mete un nombre de cuenta en la pieza que se copia. Sus owners
//     llevan placeholders `{{...}}`, y lo que se exige es que el placeholder
//     este en la posicion de la organizacion o del equipo, no que no exista.
//   · `.github/CODEOWNERS` vive en una cuenta PERSONAL, y ahi la forma de equipo
//     es justamente la que falla en silencio. Medido contra la API publica:
//     `https://api.github.com/users/im-diego-ec` responde `"type": "User"` con
//     un `node_id` que empieza en `U_`. En una cuenta personal no existen los
//     equipos, asi que `@cuenta/equipo` no resuelve a NADIE y GitHub no emite
//     ningun error — el mismo fallo mudo que este banco existe para cazar, esta
//     vez del lado que parecia el correcto.
//
// La version anterior de este caso exigia forma de equipo en LOS DOS y salia
// verde sobre owners que no resolvian a nadie: la regla estaba bien escrita
// sobre un repo que no la admite.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..", "..");
const CODEOWNERS = [".github/CODEOWNERS", "plantilla/.github/CODEOWNERS"];

/**
 * Las reglas de un CODEOWNERS: patron + owners, sin comentarios ni vacias.
 *
 * Toma el TEXTO y no la ruta para que el juicio de owners de abajo se pueda ver
 * fallar sobre casos sinteticos, sin editar archivos que este banco no posee.
 */
function reglasDeTexto(archivo, texto) {
  const reglas = [];
  const lineas = texto.split(/\r?\n/);
  // EN QUE BLOQUE DE CENTINELA CAE CADA REGLA, y por que hace falta saberlo.
  //
  // El andamio reparte DOS formas de CODEOWNERS --una para organizacion y otra
  // para cuenta de usuario-- y poda la que no corresponde. Sin esto, este banco
  // juzgaba las dos con la misma vara y marcaba como invalida la mitad que es
  // correcta para el otro lado. Era la vara vieja: daba por hecho que todo
  // proyecto vive en una organizacion, que es exactamente el defecto que las dos
  // formas vinieron a cerrar.
  let bloque = null;
  for (let i = 0; i < lineas.length; i += 1) {
    const cruda = lineas[i].trim();
    const abre = /^#\s*projects:solo-si-(organizacion|usuario)\s*$/.exec(cruda);
    if (abre) { bloque = abre[1]; continue; }
    if (/^#\s*projects:fin-solo-si-(organizacion|usuario)\s*$/.test(cruda)) { bloque = null; continue; }
    const limpia = lineas[i].replace(/\s+#.*$/, "").trim();
    if (limpia === "" || limpia.startsWith("#")) continue;
    const campos = limpia.split(/\s+/);
    reglas.push({ archivo, linea: i + 1, patron: campos[0], duenios: campos.slice(1), bloque });
  }
  return reglas;
}

const reglasDe = (archivo) => reglasDeTexto(archivo, readFileSync(path.join(RAIZ, archivo), "utf8"));

const REGLAS = CODEOWNERS.flatMap(reglasDe);

// Las tres ortografias que GitHub acepta escribir. Ninguna de las tres RESUELVE
// siempre: cual resuelve depende de donde vive el archivo, y eso lo decide
// FORMA_ESPERADA de aca abajo.
// `[A-Z0-9_]` y no `[A-Z_]`: los marcadores del andamio llevan digitos
// --`{{BUILDER_1}}`, `{{BUILDER_2}}`-- y sin el digito el patron los declaraba
// invalidos. No se noto antes porque hasta ahora ningun CODEOWNERS del andamio
// nombraba a un builder por su marcador.
const EQUIPO = /^@(?:[A-Za-z0-9][A-Za-z0-9-]*|\{\{[A-Z0-9_]+\}\})\/(?:[A-Za-z0-9][A-Za-z0-9._-]*|\{\{[A-Z0-9_]+\}\})$/;
const USUARIO = /^@(?:[A-Za-z0-9][A-Za-z0-9-]*|\{\{[A-Z0-9_]+\}\})$/;
const CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Que forma tiene que tener el owner en cada archivo, y por que la otra falla. */
const FORMA_ESPERADA = {
  ".github/CODEOWNERS": {
    forma: "@usuario",
    vale: (duenio) => USUARIO.test(duenio),
    motivo: (duenio) =>
      EQUIPO.test(duenio)
        ? "tiene forma de equipo y este repo vive en una cuenta PERSONAL, donde los equipos no existen: no resuelve a nadie y GitHub no lo dice"
        : CORREO.test(duenio)
          ? "es un correo: solo funciona si coincide con el de una cuenta de GitHub, y si no coincide falla en silencio"
          : "no tiene la forma @usuario",
  },
  // LA PIEZA QUE VIAJA AL CONSUMIDOR TIENE DOS FORMAS, y cual vale lo decide el
  // BLOQUE DE CENTINELA en el que esta la regla, no el archivo.
  //
  //   - dentro de `solo-si-organizacion` -> EQUIPO. Sobrevive a que el rol cambie
  //     de persona y no clava un nombre de cuenta en lo que se copia.
  //   - dentro de `solo-si-usuario` -> HANDLE. En una cuenta personal los equipos
  //     NO EXISTEN: `@cuenta/equipo` no asigna a nadie, nunca, y sin decir nada.
  //   - fuera de todo bloque -> NO puede haber reglas: viajarian a los dos lados
  //     y en uno de los dos no resolverian.
  "plantilla/.github/CODEOWNERS": {
    forma: "@{{ORG}}/{{EQUIPO}} en el bloque de organizacion, @{{HANDLE}} en el de usuario",
    vale: (duenio, bloque) =>
      bloque === "organizacion" ? EQUIPO.test(duenio) : bloque === "usuario" ? USUARIO.test(duenio) : false,
    motivo: (duenio, bloque) =>
      bloque === null
        ? "esta fuera de todo bloque de centinela, asi que viajaria a los dos lados y en uno de los dos no resuelve"
        : bloque === "organizacion"
          ? USUARIO.test(duenio)
            ? "es un handle suelto dentro del bloque de ORGANIZACION: ahi el owner tiene que ser un EQUIPO"
            : CORREO.test(duenio)
              ? "es un correo: solo funciona si coincide con el de una cuenta de GitHub, y si no falla en silencio"
              : "no tiene la forma @organizacion/equipo"
          : EQUIPO.test(duenio)
            ? "tiene forma de equipo dentro del bloque de CUENTA DE USUARIO, donde los equipos no existen: no resuelve a nadie y GitHub no lo dice"
            : CORREO.test(duenio)
              ? "es un correo: solo funciona si coincide con el de una cuenta de GitHub, y si no falla en silencio"
              : "no tiene la forma @handle",
  },
};

/** Los owners que su propio archivo no puede resolver, con el motivo. */
function ownersInvalidos(reglas) {
  const malos = [];
  for (const regla of reglas) {
    const esperada = FORMA_ESPERADA[regla.archivo];
    if (!esperada) throw new Error(`no hay forma de owner declarada para ${regla.archivo}: agregala antes de creerle a este banco`);
    for (const duenio of regla.duenios) {
      if (esperada.vale(duenio, regla.bloque)) continue;
      malos.push(`${regla.archivo}:${regla.linea} "${duenio}" ${esperada.motivo(duenio, regla.bloque)}`);
    }
  }
  return malos;
}

test("codeowners · hay reglas que mirar en los dos archivos", () => {
  // Cero reglas JAMAS es un exito: un parseo roto o un archivo movido dejarian
  // todo lo de abajo en verde sin haber leido una sola linea.
  for (const archivo of CODEOWNERS) {
    const reglas = reglasDe(archivo);
    assert.ok(
      reglas.length >= 3,
      `${archivo}: se leyeron ${reglas.length} reglas y se esperaban al menos 3. Antes de creerle a este verde, revisa el parseo`,
    );
  }
});

test("codeowners · cada regla nombra al menos un owner", () => {
  // Un patron sin owner no asigna a nadie y GitHub no se queja: la ruta queda
  // sin propietario y el review cruzado no ocurre, que es el requirement roto.
  const huerfanas = REGLAS.filter((regla) => regla.duenios.length === 0);
  assert.deepEqual(
    huerfanas.map((r) => `${r.archivo}:${r.linea} (${r.patron})`),
    [],
    "estas reglas declaran un patron y ningun owner: la ruta queda sin propietario y nadie avisa",
  );
});

test("codeowners · cada owner tiene la forma que SU archivo puede resolver", () => {
  const malos = ownersInvalidos(REGLAS);
  assert.deepEqual(
    malos,
    [],
    `owners que su propio archivo no resuelve: ${malos.join(" | ")}. Un owner que GitHub no resuelve no asigna a nadie y no emite ningun error: el review cruzado desaparece sin ruido`,
  );
});

test("codeowners · el juicio de owners se pone rojo donde tiene que ponerse", () => {
  // UN CHECK QUE NADIE VIO FALLAR NO ES UN CHECK, y el de arriba juzga dos
  // archivos con reglas OPUESTAS: si las dos mitades se cruzaran, saldria verde
  // sobre lo que existe para prohibir. Se refuta con texto sintetico y no
  // editando los archivos de verdad, que este banco no posee.
  const org = (linea) => `# projects:solo-si-organizacion\n${linea}# projects:fin-solo-si-organizacion\n`;
  const usr = (linea) => `# projects:solo-si-usuario\n${linea}# projects:fin-solo-si-usuario\n`;
  const casos = [
    [".github/CODEOWNERS", "*  @im-diego-ec/un-equipo\n", "el equipo en la cuenta personal"],
    [".github/CODEOWNERS", "*  quien@ejemplo.com\n", "el correo en el repo del marco"],
    ["plantilla/.github/CODEOWNERS", org("*  @un-handle-suelto\n"), "el handle suelto en el bloque de organizacion"],
    ["plantilla/.github/CODEOWNERS", usr("*  @una-org/un-equipo\n"), "el equipo en el bloque de cuenta de usuario"],
    // LA TERCERA FORMA DE ROMPERLO, y es la que solo existe desde que hay dos
    // bloques: una regla FUERA de todo centinela viaja a los dos lados, y en uno
    // de los dos no resuelve. Sin este caso, agregar una regla suelta al andamio
    // saldria en verde.
    ["plantilla/.github/CODEOWNERS", "*  @{{ORG}}/{{EQUIPO_BUILDERS}}\n", "la regla fuera de todo bloque"],
  ];
  for (const [archivo, texto, que] of casos) {
    assert.equal(
      ownersInvalidos(reglasDeTexto(archivo, texto)).length,
      1,
      `${que} tenia que reportarse como invalido en ${archivo} y no se reporto`,
    );
  }
  // Y la forma buena de cada lado NO se reporta: un check que reporta todo
  // tampoco decide nada.
  assert.deepEqual(ownersInvalidos(reglasDeTexto(".github/CODEOWNERS", "*  @im-diego-ec\n")), []);
  assert.deepEqual(ownersInvalidos(reglasDeTexto("plantilla/.github/CODEOWNERS", org("*  @{{ORG}}/{{EQUIPO_BUILDERS}}\n"))), []);
  assert.deepEqual(ownersInvalidos(reglasDeTexto("plantilla/.github/CODEOWNERS", usr("*  @{{BUILDER_1}} @{{BUILDER_2}}\n"))), []);
});

test("codeowners · ningun patron usa formas que GitHub ignora en silencio", () => {
  // CODEOWNERS NO es .gitignore, aunque se le parezca. GitHub no soporta la
  // negacion con "!" ni los rangos de caracteres "[a-z]", y una regla con
  // cualquiera de las dos no se aplica — sin error, sin aviso, sin nada. Es la
  // misma clase de fallo mudo que el handle mal escrito.
  const dudosos = [];
  for (const regla of REGLAS) {
    if (regla.patron.includes("!")) dudosos.push(`${regla.archivo}:${regla.linea} "${regla.patron}" usa "!" (negacion), que GitHub NO soporta en CODEOWNERS`);
    if (/\[[^\]]*\]/.test(regla.patron)) dudosos.push(`${regla.archivo}:${regla.linea} "${regla.patron}" usa un rango [..], que GitHub NO soporta en CODEOWNERS`);
  }
  assert.deepEqual(
    dudosos,
    [],
    `estas reglas no se van a aplicar y GitHub no lo va a decir: ${dudosos.join(" | ")}`,
  );
});

test("codeowners · hay una regla que cubre TODO el repositorio", () => {
  // Es lo que hace que el review cruzado sea el default y no una lista de rutas
  // que alguien tenga que ir ampliando: sin ella, un archivo nuevo nace sin
  // propietario y su PR no asigna revisor.
  for (const archivo of CODEOWNERS) {
    const reglas = reglasDe(archivo);
    assert.ok(
      reglas.some((regla) => regla.patron === "*"),
      `${archivo}: ninguna regla cubre "*", asi que todo archivo fuera de las rutas listadas nace sin propietario`,
    );
  }
});

test("codeowners · el que viaja al consumidor deja sus placeholders en la posicion correcta", () => {
  // El andamio se copia y se sustituye. Un placeholder que quede en la posicion
  // del patron —y no en la del owner— sobreviviria a la sustitucion como una
  // ruta invalida, y otra vez sin ruido.
  const reglas = reglasDe("plantilla/.github/CODEOWNERS");
  const conPlaceholder = reglas.filter((regla) => regla.duenios.some((d) => d.includes("{{")));
  assert.ok(
    conPlaceholder.length >= 3,
    `el CODEOWNERS del andamio tiene ${conPlaceholder.length} regla(s) con placeholder en el owner y se esperaban al menos 3: si bajaron, alguien cableo una organizacion o un equipo concreto en la pieza que se copia`,
  );
  const enElPatron = reglas.filter((regla) => regla.patron.includes("{{"));
  assert.deepEqual(
    enElPatron.map((r) => `${r.linea}: ${r.patron}`),
    [],
    "estas reglas del andamio traen un placeholder en la RUTA y no en el owner: la sustitucion las deja como un patron que no calza con nada",
  );
});
