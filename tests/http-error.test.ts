import { describe, expect, it } from "vitest";
import { HttpError } from "../src/utils/http-error";

describe("HttpError", () => {
  it("preserves an HTTP status and message", () => {
    const error = new HttpError(404, "Resource not found");
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe("Resource not found");
  });
});
