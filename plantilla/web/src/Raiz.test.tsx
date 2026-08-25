import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { Raiz } from "./Raiz";

// El provider de Clerk entra reemplazado por un marcador que expone la clave
// que recibio: lo que hay que verificar es la DECISION del arranque (envolver o
// no, y con que clave), no el SDK del tercero. El mock cubre tambien lo que
// importa App, que se monta debajo.
vi.mock("@clerk/clerk-react", () => ({
  ClerkProvider: ({
    children,
    publishableKey,
  }: {
    children?: ReactNode;
    publishableKey: string;
  }) => (
    <div data-testid="provider-de-clerk" data-clave={publishableKey}>
      {children}
    </div>
  ),
  SignedOut: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SignedIn: () => null,
  SignInButton: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  UserButton: () => <div>menu de usuario</div>,
}));

beforeEach(() => {
  // App consulta el healthcheck al montarse; sin esto la prueba dependeria de
  // que haya un API escuchando, que es la definicion de prueba intermitente.
  //
  // EL DOBLE COPIA LA FORMA QUE DEVUELVE api/src/app.ts (`{ estado }`), no una
  // inventada. Decia `{ status: "ok" }` —el nombre que el API de este andamio no
  // emite— y las dos pruebas de abajo estaban ROJAS por eso: el esquema Zod de
  // App.tsx rechazaba el cuerpo, la portada mostraba "el API respondio algo que
  // no entiendo" y el `findByText("ok")` no encontraba nada. Medido: el mismo
  // safeParse falla igual con zod 3 y con zod 4, o sea el rojo no lo estreno la
  // subida de mayor, estaba ahi desde que se corrigieron los dobles de
  // App.test.tsx y este quedo sin corregir.
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ estado: "ok" }) })
    )
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Raiz", () => {
  it("sin clave publicable corre sin auth, y la interfaz lo dice", async () => {
    vi.stubEnv("VITE_CLERK_PUBLISHABLE_KEY", "");

    render(<Raiz />);

    expect(await screen.findByText("ok")).toBeTruthy();
    expect(screen.queryByTestId("provider-de-clerk")).toBeNull();
    // Que la app corra sin auth no puede ser silencioso: en dev es comodo y en
    // un ambiente desplegado es un aviso de que falta la variable.
    expect(screen.getByText(/Clerk no configurado/)).toBeTruthy();
  });

  it("con clave publicable envuelve la app en el provider y le pasa esa clave", async () => {
    vi.stubEnv("VITE_CLERK_PUBLISHABLE_KEY", "pk_test_del_andamio");

    render(<Raiz />);

    expect(await screen.findByText("ok")).toBeTruthy();
    const provider = screen.getByTestId("provider-de-clerk");
    // La clave se COMPRUEBA, no se da por sentada: un provider montado sin
    // clave deja la app sin sesion y sin decir por que.
    expect(provider.getAttribute("data-clave")).toBe("pk_test_del_andamio");
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeTruthy();
    expect(screen.queryByText(/Clerk no configurado/)).toBeNull();
  });
});
