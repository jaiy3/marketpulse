import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app";

describe("Auth API validation", () => {
  it("rejects malformed registration requests before hitting the database", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "not-an-email", password: "short" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
