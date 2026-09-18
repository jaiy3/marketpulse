import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "../src/schemas/auth";

describe("authentication validation", () => {
  it("accepts a valid registration payload", () => {
    expect(registerSchema.parse({ email: "dev@example.com", password: "Password123" })).toEqual({
      email: "dev@example.com",
      password: "Password123",
    });
  });

  it("rejects invalid emails and short passwords", () => {
    expect(() => loginSchema.parse({ email: "not-an-email", password: "short" })).toThrow();
  });
});
