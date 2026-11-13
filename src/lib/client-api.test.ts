import { describe, expect, it, vi, afterEach } from "vitest";
import { z } from "zod";
import { ClientApiError, clientApi } from "./client-api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("clientApi", () => {
  it("returns validated data on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ data: { id: "1" } }), { status: 200 })),
    );
    const result = await clientApi("/api/x", undefined, z.object({ id: z.string() }));
    expect(result).toEqual({ id: "1" });
  });

  it("throws ClientApiError with API message on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Złe dane" } }), {
            status: 400,
          }),
      ),
    );
    await expect(clientApi("/api/x")).rejects.toMatchObject({
      message: "Złe dane",
      code: "VALIDATION_ERROR",
      status: 400,
    } satisfies Partial<ClientApiError>);
  });

  it("throws on network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("failed");
      }),
    );
    await expect(clientApi("/api/x")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      message: "Nie udało się połączyć z serwerem.",
    });
  });

  it("throws when success payload fails schema validation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ data: { id: 1 } }), { status: 200 })),
    );
    await expect(clientApi("/api/x", undefined, z.object({ id: z.string() }))).rejects.toMatchObject({
      code: "RESPONSE_VALIDATION_ERROR",
    });
  });
});
