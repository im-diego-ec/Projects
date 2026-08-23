import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

// La capa de datos se dobla: estas pruebas verifican los endpoints y el
// cableado de middlewares, no a Postgres. La integracion contra una base real
// es otra suite (y otra decision de cuando corre).
const { consultar, obtenerPrisma } = vi.hoisted(() => ({
  consultar: vi.fn(),
  obtenerPrisma: vi.fn(),
}));

vi.mock("./lib/prisma.js", () => ({
  getPrisma: obtenerPrisma,
  desconectarPrisma: vi.fn(async () => {}),
}));

import { createApp } from "./app.js";

describe("app", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obtenerPrisma.mockResolvedValue({ $queryRaw: consultar });
    consultar.mockResolvedValue([{ uno: 1 }]);
    // El bypass de dev es la unica forma de ejercitar una ruta protegida sin
    // Clerk, y exige el opt-in explicito: exactamente lo que hace produccion.
    vi.stubEnv("ALLOW_DEV_AUTH", "true");
    vi.stubEnv("CLERK_SECRET_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("GET /api/health responde sin tocar base ni auth", async () => {
    const res = await request(createApp()).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.estado).toBe("ok");
    expect(res.body.servicio).toContain("-api");
  });

  it("toda respuesta trae X-Request-Id, y respeta el trace del balanceador", async () => {
    const propio = await request(createApp()).get("/api/health");
    expect(propio.headers["x-request-id"]).toMatch(/^local-/);

    const conTrace = await request(createApp())
      .get("/api/health")
      .set("x-amzn-trace-id", "Root=1-abc");
    expect(conTrace.headers["x-request-id"]).toBe("Root=1-abc");
  });

  it("declara el origen permitido para el frontend", async () => {
    vi.stubEnv("WEB_ORIGIN", "https://app.ejemplo.com");
    const res = await request(createApp()).get("/api/health");
    expect(res.headers["access-control-allow-origin"]).toBe("https://app.ejemplo.com");
  });

  it("GET /api/hello devuelve la identidad que resolvio el middleware", async () => {
    const res = await request(createApp()).get("/api/hello").set("x-dev-user-id", "usuario-7");
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe("usuario-7");
  });

  it("GET /api/db/health confirma que la base responde", async () => {
    const res = await request(createApp()).get("/api/db/health");
    expect(res.status).toBe(200);
    expect(res.body.db).toBe("ok");
    expect(consultar).toHaveBeenCalled();
  });

  it("base caida: 503 con el detalle, y /api/health sigue en 200", async () => {
    consultar.mockRejectedValue(new Error("connection refused"));
    const app = createApp();
    const res = await request(app).get("/api/db/health");
    expect(res.status).toBe(503);
    expect(res.body.detalle).toContain("connection refused");
    // Lo que mira el balanceador no depende de la base: si dependiera, una base
    // lenta daria de baja tareas sanas y el incidente se multiplicaria.
    expect((await request(app).get("/api/health")).status).toBe(200);
  });

  it("un rechazo que no es Error tambien sale como 503 legible", async () => {
    obtenerPrisma.mockRejectedValue("sin configuracion de base");
    const res = await request(createApp()).get("/api/db/health");
    expect(res.status).toBe(503);
    expect(res.body.detalle).toBe("sin configuracion de base");
  });
});
