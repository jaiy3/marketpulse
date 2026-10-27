import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app";

describe("HTTP API", () => {
  it("serves the live dashboard at /", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/html/);
    expect(response.text).toContain("MarketPulse");
  });

  it("returns service metadata at /api", async () => {
    const response = await request(app).get("/api");
    expect(response.status).toBe(200);
    expect(response.body.service).toBe("MarketPulse API");
    expect(response.body.websocket).toBe("/ws");
  });

  it("returns a JSON 404 for unknown routes", async () => {
    const response = await request(app).get("/api/does-not-exist");
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("publishes the OpenAPI document", async () => {
    const response = await request(app).get("/openapi.json");
    expect(response.status).toBe(200);
    expect(response.body.paths).toHaveProperty("/api/market/history");
  });
});
