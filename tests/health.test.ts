import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app";

describe("HTTP API", () => {
  it("returns service metadata", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.body.data).toBeUndefined();
    expect(response.body.service).toBe("MarketPulse API");
  });
});
