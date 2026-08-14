// Flat config de ESLint 9 para el monorepo. Una sola config en la raiz que
// ESLint resuelve hacia arriba desde cada paquete (`eslint .` dentro de
// {{PAQUETE_WEB}}/ o {{PAQUETE_API}}/ usa esta).
//
// La POLITICA del marco, en cuatro lineas:
//   1. Reglas type-checked en ERROR sobre codigo FUENTE (no sobre config ni
//      generados). El lint corre con --max-warnings=0: no existe el "warning
//      tolerado" que nadie arregla.
//   2. La familia no-unsafe-* y no-explicit-any se apagan SOLO en tests, y es
//      una decision, no deuda (ver el bloque correspondiente).
//   3. `no-console` es ERROR en el codigo de producto del backend: todo log
//      pasa por la libreria de log estructurado.
//   4. `prettier` va SIEMPRE al final: apaga las reglas de formato que
//      colisionan con el formateador.
//
// ADAPTAR AL PROYECTO: los globs usan los paquetes de este repo. Los bloques
// marcados [FRONT] aplican solo si hay frontend React — si no lo hay, borralos
// junto a sus imports y a sus devDependencies.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks"; // [FRONT]
import reactRefresh from "eslint-plugin-react-refresh"; // [FRONT]
import pluginQuery from "@tanstack/eslint-plugin-query"; // [FRONT] solo con TanStack Query
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    // No lintar generados/artefactos ni archivos de config.
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/*.config.js",
      "**/*.config.mjs",
      "**/*.config.ts",
      // Agregar aqui los directorios GENERADOS del proyecto. Ejemplos reales:
      //   "{{PAQUETE_WEB}}/src/components/ui/**",  // componentes de UI generados
      //   "{{PAQUETE_API}}/src/generated/**",      // cliente generado del ORM
    ],
  },

  // Base no type-checked para todo el TS/JS.
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Reglas TYPE-CHECKED solo en codigo fuente (no-floating-promises necesita
  // informacion de tipos). projectService autodetecta el tsconfig de cada
  // paquete, asi que no hay que enumerar proyectos aqui.
  {
    files: ["{{PAQUETE_API}}/src/**/*.ts", "{{PAQUETE_WEB}}/src/**/*.{ts,tsx}"],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Args no usados con prefijo _ son intencionales (p.ej. la firma de 4
      // argumentos que un errorHandler de Express exige).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  // Entorno Node: el backend, los scripts operativos (.mjs one-off, migraciones
  // de datos) y la suite E2E (el runner orquesta el navegador DESDE Node).
  {
    files: [
      "{{PAQUETE_API}}/**/*.ts",
      "{{PAQUETE_API}}/scripts/**/*.mjs",
      "scripts/**/*.mjs",
      "{{PAQUETE_E2E}}/**/*.mjs",
    ],
    languageOptions: { globals: { ...globals.node } },
  },

  // Logging estructurado: en el codigo de producto del backend todo log pasa
  // por lib/log.ts (JSON consultable, niveles con semantica de alerta,
  // requestId automatico). console.* directo queda prohibido — log.ts es la
  // unica excepcion (disable inline en ese archivo) y los tests quedan fuera
  // (espian console y eso esta bien).
  {
    files: ["{{PAQUETE_API}}/src/**/*.ts"],
    ignores: ["**/*.test.ts"],
    rules: { "no-console": "error" },
  },

  // [FRONT] Entorno browser + React.
  {
    files: ["{{PAQUETE_WEB}}/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser } },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Error, no warning: las excepciones legitimas (entrypoint,
      // provider+hook en el mismo archivo) llevan disable POR ARCHIVO con su
      // porque escrito al lado.
      "react-refresh/only-export-components": ["error", { allowConstantExport: true }],
    },
  },

  // [FRONT] TanStack Query: reglas recomendadas, acotadas al frontend.
  ...pluginQuery.configs["flat/recommended"].map((c) => ({
    ...c,
    files: ["{{PAQUETE_WEB}}/**/*.{ts,tsx}"],
  })),
  {
    files: ["{{PAQUETE_WEB}}/**/*.{ts,tsx}"],
    rules: {
      // Una queryKey incompleta cachea respuestas de otra consulta: error.
      "@tanstack/query/exhaustive-deps": "error",
    },
  },

  // [FRONT] Promesas en el front: recommendedTypeChecked ya deja
  // no-floating-promises en ERROR (los fire-and-forget intencionales llevan
  // `void` explicito). Lo que se ajusta aqui es misused-promises:
  // checksVoidReturn.attributes=false porque el patron del repo es
  // onClick={handlerAsync} donde TODO handler atrapa internamente (red global
  // + try/catch) — el caso "atributo" es falso positivo; el resto de la regla
  // queda en error.
  {
    files: ["{{PAQUETE_WEB}}/src/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },

  // Tests: la familia no-unsafe-* y no-explicit-any quedan OFF — DECISION, no
  // deuda: el `.body` de un cliente HTTP de test es `any` por la libreria, y la
  // unica "correccion" posible son casts que el compilador NO verifica
  // (cumplimiento cosmetico). El contrato real lo verifican las aserciones del
  // test al ejecutarse. En codigo de producto estas reglas son ERROR (un any
  // ahi si esconde bugs que llegan a usuarios). Todo lo demas
  // (floating-promises, misused, unused-vars, ...) sigue activo tambien aqui.
  {
    files: ["**/*.test.{ts,tsx}", "{{PAQUETE_API}}/src/test-helpers.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      // unbound-method: el patron expect(mock.metodo).toHaveBeenCalled() la
      // dispara siempre; typescript-eslint recomienda oficialmente apagarla en
      // tests (los mocks no dependen de `this`).
      "@typescript-eslint/unbound-method": "off",
    },
  },

  // Debe ir al final: apaga reglas de formato que colisionan con Prettier.
  prettier
);
