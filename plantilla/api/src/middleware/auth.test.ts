import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import {
  authConfigInsegura,
  clavePublica,
  clerkConfigurado,
  devAuthPermitido,
  requireAuth,
} from "./auth.js";

// Se dobla el verificador de Clerk, no el middleware: lo que estas pruebas
// tienen que fijar es QUE SE ACEPTA y que se rechaza, incluidos los caminos que
// nadie prueba a mano (token vencido, claim ausente, sin configuracion).
const { verificar } = vi.hoisted(() => ({ verificar: vi.fn() }));
vi.mock("@clerk/backend", () => ({ verifyToken: verificar }));

function appDePrueba() {
  const app = express();
  app.get("/protegido", requireAuth, (req, res) => {
    res.json({ userId: req.auth?.userId, email: req.auth?.email, name: req.auth?.name });
  });
  return app;
}

describe("configuracion de auth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("el bypass de dev exige el opt-in explicito, no la ausencia de Clerk", () => {
    vi.stubEnv("CLERK_SECRET_KEY", "");
    vi.stubEnv("ALLOW_DEV_AUTH", "");
    expect(devAuthPermitido()).toBe(false);
    // El bug que esto cierra: el bypass colgado de NODE_ENV, que en produccion
    // no se seteaba, dejaba el guard muerto y el API abierto.
    vi.stubEnv("NODE_ENV", "development");
    expect(devAuthPermitido()).toBe(false);
    vi.stubEnv("ALLOW_DEV_AUTH", "true");
    expect(devAuthPermitido()).toBe(true);
  });

  it("sin Clerk y sin opt-in, la configuracion es insegura", () => {
    expect(authConfigInsegura({})).toBe(true);
    expect(authConfigInsegura({ CLERK_SECRET_KEY: "sk" })).toBe(false);
    expect(authConfigInsegura({ ALLOW_DEV_AUTH: "true" })).toBe(false);
    expect(clerkConfigurado({ CLERK_SECRET_KEY: "sk" })).toBe(true);
  });

  it("convierte los \\n literales de la clave publica en saltos reales", () => {
    const pem = clavePublica({ CLERK_JWT_KEY: "-----BEGIN-----\\nabc\\n-----END-----" });
    expect(pem).toBe("-----BEGIN-----\nabc\n-----END-----");
    expect(clavePublica({})).toBeUndefined();
  });
});

describe("requireAuth con Clerk configurado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test");
    vi.stubEnv("CLERK_JWT_KEY", "-----BEGIN-----\\nabc\\n-----END-----");
    vi.stubEnv("ALLOW_DEV_AUTH", "true"); // no debe importar: Clerk manda
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("acepta un token valido y toma la identidad de los claims firmados", async () => {
    verificar.mockResolvedValue({ sub: "user_1", email: "a@b.co", name: "Ana" });
    const res = await request(appDePrueba())
      .get("/protegido")
      .set("authorization", "Bearer tok")
      .set("x-dev-user-id", "impostor");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ userId: "user_1", email: "a@b.co", name: "Ana" });
    // La clave llega ya normalizada: si no, la verificacion offline falla.
    expect(verificar).toHaveBeenCalledWith("tok", { jwtKey: expect.stringContaining("\n") });
  });

  it("ignora claims que no son texto en vez de propagarlos", async () => {
    verificar.mockResolvedValue({ sub: "user_2", email: 42, name: null });
    const res = await request(appDePrueba()).get("/protegido").set("authorization", "Bearer tok");
    expect(res.body).toEqual({ userId: "user_2" });
  });

  it("401 si el token no trae sub", async () => {
    verificar.mockResolvedValue({ sub: "" });
    const res = await request(appDePrueba()).get("/protegido").set("authorization", "Bearer tok");
    expect(res.status).toBe(401);
  });

  it("401 si la verificacion lanza, sin tumbar el proceso", async () => {
    verificar.mockRejectedValue(new Error("token expired"));
    const res = await request(appDePrueba()).get("/protegido").set("authorization", "Bearer x");
    expect(res.status).toBe(401);
    // Auth fallida es rutina: warn, no error. La semantica la leen las alarmas.
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it("401 sin header, y con un header que no es Bearer", async () => {
    expect((await request(appDePrueba()).get("/protegido")).status).toBe(401);
    const basica = await request(appDePrueba()).get("/protegido").set("authorization", "Basic zzz");
    expect(basica.status).toBe(401);
    expect(verificar).not.toHaveBeenCalled();
  });
});

describe("requireAuth sin Clerk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CLERK_SECRET_KEY", "");
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("con ALLOW_DEV_AUTH=true acepta el usuario que pida quien llama", async () => {
    vi.stubEnv("ALLOW_DEV_AUTH", "true");
    const conHeader = await request(appDePrueba()).get("/protegido").set("x-dev-user-id", "u9");
    expect(conHeader.body.userId).toBe("u9");
    const sinHeader = await request(appDePrueba()).get("/protegido");
    expect(sinHeader.body.userId).toBe("dev-user");
  });

  it("sin el opt-in, 401: fail-closed", async () => {
    vi.stubEnv("ALLOW_DEV_AUTH", "");
    const res = await request(appDePrueba()).get("/protegido").set("x-dev-user-id", "u9");
    expect(res.status).toBe(401);
    expect(console.warn).toHaveBeenCalledOnce();
  });
});
