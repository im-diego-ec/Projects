import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import App from "./App";

// Clerk entra reemplazado por marcadores. Lo que estas pruebas verifican es la
// interfaz del andamio —que diga la verdad sobre el API y sobre el estado de la
// auth—, no el SDK de un tercero: montar el real exige una clave publicable
// valida y saldria a la red desde una prueba unitaria. El SignedIn/SignedOut de
// aca simula la visita SIN sesion, que es el estado en el que la app tiene que
// ofrecer el ingreso.
vi.mock("@clerk/clerk-react", () => ({
  SignedOut: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SignedIn: () => null,
  SignInButton: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  UserButton: () => <div>menu de usuario</div>,
}));

// LOS DOBLES COPIAN LA FORMA QUE DEVUELVE api/src/app.ts, no una inventada.
// Antes decian `status`/`service`/`time` y `message`: campos que el API de este
// mismo andamio no emite. Con eso los seis casos de abajo pasaban en verde
// contra un API que no existe, y el front —que validaba con esos mismos nombres
// inventados— no podia leer al backend real sin que nada mordiera. El acople
// entre estos dobles, los esquemas de App.tsx y los `res.json` de app.ts lo
// vigila pruebas/andamio/acoples-del-andamio.test.mjs.
const SALUD_OK = { estado: "ok", servicio: "{{PROYECTO}}-api", ts: "2026-01-01T00:00:00.000Z" };
const HOLA_OK = { mensaje: "Hola desde el API", userId: "dev-user" };

/** Una respuesta de fetch con lo unico que el codigo bajo prueba le pide. */
function respuesta(cuerpo: unknown, ok = true) {
  return { ok, status: ok ? 200 : 401, json: () => Promise.resolve(cuerpo) };
}

/**
 * Reemplaza fetch por uno que responde segun la ruta, y lo devuelve para
 * espiarlo. El manejador corre DENTRO de la promesa a proposito: asi un throw
 * suyo llega como rechazo, que es la forma en la que fetch reporta que no hubo
 * respuesta (una caida de red no es una excepcion sincronica).
 */
function cablearFetch(porRuta: (url: string) => unknown) {
  const falso = vi.fn((url: string) => Promise.resolve().then(() => porRuta(url)));
  vi.stubGlobal("fetch", falso);
  return falso;
}

const respondeTodoBien = (url: string) =>
  url.endsWith("/api/health") ? respuesta(SALUD_OK) : respuesta(HOLA_OK);

afterEach(() => {
  // El DOM lo limpia Testing Library con su afterEach global (por eso
  // globals: true en la config). Lo que hay que devolver a su lugar es lo que
  // estas pruebas pisan: el fetch global, las variables de entorno y el
  // registro de modulos que usa la ultima prueba.
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("App", () => {
  it("muestra el estado que reporta el API y no adelanta el saludo", async () => {
    const fetchFalso = cablearFetch(respondeTodoBien);

    render(<App clerkHabilitado={false} />);

    expect(await screen.findByText("ok")).toBeTruthy();
    expect(fetchFalso).toHaveBeenCalledWith("http://localhost:3000/api/health");
    // El saludo aparece cuando se lo pide, no antes: si esto se rompe, la
    // interfaz esta llamando al endpoint protegido en cada carga.
    expect(screen.queryByText(/dev-user/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Llamar /api/hello" }));

    expect(await screen.findByText("Hola desde el API (userId: dev-user)")).toBeTruthy();
    expect(fetchFalso).toHaveBeenCalledWith("http://localhost:3000/api/hello");
  });

  it("cuando el API no responde, lo dice en vez de quedarse en blanco", async () => {
    cablearFetch(() => {
      throw new Error("ECONNREFUSED");
    });

    render(<App clerkHabilitado={false} />);

    expect(await screen.findByText("sin conexion con el API")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Llamar /api/hello" }));

    expect(await screen.findByText(/no se pudo llamar \/api\/hello/)).toBeTruthy();
  });

  it("distingue una respuesta con otra forma de una caida del API", async () => {
    // El caso real: una version anterior del API todavia desplegada, o un proxy
    // que devuelve otra cosa. La validacion con Zod tiene que atajarlo ANTES de
    // la interfaz, y el mensaje tiene que mandar a mirar otro lado que "sin
    // conexion".
    //
    // El ejemplo de forma AJENA es `{ status: "ok" }` a proposito: es la forma
    // que este banco doblaba como si fuera la del andamio. Tiene que ser una
    // forma que el API de api/src/app.ts NO emita — si aca se pusiera la que si
    // emite, el caso estaria exigiendo que la respuesta buena y real se muestre
    // como basura, que es exactamente lo que pasaba.
    cablearFetch(() => respuesta({ status: "ok" }));

    render(<App clerkHabilitado={false} />);

    expect(await screen.findByText("el API respondio algo que no entiendo")).toBeTruthy();
    expect(screen.queryByText("sin conexion con el API")).toBeNull();

    // El endpoint protegido corre por el mismo carril: los dos lugares donde el
    // andamio muestra datos del API los validan antes de mostrarlos.
    fireEvent.click(screen.getByRole("button", { name: "Llamar /api/hello" }));

    // waitFor y no findAllByText: findAll* se conforma con UNA coincidencia, y
    // el healthcheck ya puso la primera — la prueba pasaria sin que el click
    // hubiera hecho nada. Lo que se espera es que aparezca la SEGUNDA.
    await waitFor(() =>
      expect(screen.getAllByText("el API respondio algo que no entiendo")).toHaveLength(2)
    );
  });

  it("un endpoint protegido que responde 401 no se lee como si trajera dato", async () => {
    cablearFetch((url) =>
      url.endsWith("/api/health")
        ? respuesta(SALUD_OK)
        : respuesta({ error: "no autenticado" }, false)
    );

    render(<App clerkHabilitado={false} />);
    await screen.findByText("ok");

    fireEvent.click(screen.getByRole("button", { name: "Llamar /api/hello" }));

    expect(await screen.findByText(/no se pudo llamar \/api\/hello/)).toBeTruthy();
  });

  it("con Clerk configurado ofrece ingresar, y sin Clerk lo dice en pantalla", async () => {
    cablearFetch(respondeTodoBien);

    const { unmount } = render(<App clerkHabilitado />);
    await screen.findByText("ok");
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeTruthy();
    expect(screen.queryByText(/Clerk no configurado/)).toBeNull();
    unmount();

    render(<App clerkHabilitado={false} />);
    await screen.findByText("ok");
    expect(screen.queryByRole("button", { name: "Iniciar sesión" })).toBeNull();
    expect(screen.getByText(/Clerk no configurado/)).toBeTruthy();
  });

  it("la base del API sale de la variable de entorno cuando esta puesta", async () => {
    // Se vuelve a importar el modulo porque la base se resuelve UNA vez, al
    // cargarlo: sin resetModules la prueba mediria el valor de la importacion
    // de arriba y pasaria en verde sin haber probado nada.
    vi.stubEnv("VITE_API_URL", "https://api.ejemplo.test");
    vi.resetModules();
    const { default: AppRecargado } = await import("./App");
    const fetchFalso = cablearFetch(respondeTodoBien);

    render(<AppRecargado clerkHabilitado={false} />);

    expect(await screen.findByText("ok")).toBeTruthy();
    expect(fetchFalso).toHaveBeenCalledWith("https://api.ejemplo.test/api/health");
  });
});
