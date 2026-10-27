import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app";

// These cases are rejected by validation before any Redis or PostgreSQL call.
describe("Market API validation", () => {
  it("rejects a history request with an invalid symbol", async () => {
    const response = await request(app).get("/api/market/history?symbol=btc!");
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a page size above 100", async () => {
    const response = await request(app).get("/api/market/history?symbol=BTCUSDT&limit=500");
    expect(response.status).toBe(400);
  });

  it("requires the symbols parameter for latest prices", async () => {
    const response = await request(app).get("/api/market/latest");
    expect(response.status).toBe(400);
  });

  it("protects /api/auth/me", async () => {
    const response = await request(app).get("/api/auth/me");
    expect(response.status).toBe(401);
  });
});
