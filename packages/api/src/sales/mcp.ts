import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

const envelope = z.object({
  id: z.number().optional(),
  result: z.unknown().optional(),
  error: z.unknown().optional(),
});

export function salesProviderReady() {
  return Boolean(process.env.SALES_MCP_URL && process.env.SALES_MCP_TOKEN);
}

export async function salesTool<T>(
  name: string,
  args: Record<string, unknown>,
  output: z.ZodType<T>,
): Promise<T> {
  const url = process.env.SALES_MCP_URL;
  const token = process.env.SALES_MCP_TOKEN;
  if (!url || !token) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Configure the sales MCP provider to use this action.",
    });
  }

  const headers = new Headers({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  });
  const signal = AbortSignal.timeout(25_000);
  const post = async (method: string, params?: object, id?: number) => {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
      redirect: "error",
      signal,
    });
    if (!response.ok) throw new Error("MCP HTTP error");
    return response;
  };

  async function result(response: Response, id: number) {
    const check = (value: unknown) => {
      const parsed = envelope.safeParse(value);
      if (!parsed.success || parsed.data.id !== id) return;
      if (parsed.data.error !== undefined || parsed.data.result === undefined) {
        throw new Error("MCP response error");
      }
      return parsed.data;
    };

    if (!response.headers.get("content-type")?.includes("text/event-stream")) {
      return check(await response.json())?.result;
    }

    const reader = response.body
      ?.pipeThrough(new TextDecoderStream())
      .getReader();
    if (!reader) throw new Error("Empty MCP stream");
    let buffer = "";
    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) throw new Error("MCP stream ended without a result");
        buffer += chunk.value;
        if (buffer.length > 1_000_000) throw new Error("MCP event too large");
        let separator = /\r?\n\r?\n/.exec(buffer);
        while (separator) {
          const event = buffer.slice(0, separator.index);
          buffer = buffer.slice(separator.index + separator[0].length);
          const data = event
            .split(/\r?\n/)
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).replace(/^ /, ""))
            .join("\n");
          const message = data ? check(JSON.parse(data)) : undefined;
          if (message) return message.result;
          separator = /\r?\n\r?\n/.exec(buffer);
        }
      }
    } finally {
      void reader.cancel().catch(() => undefined);
    }
  }

  try {
    const initial = await post(
      "initialize",
      {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "custa-sales", version: "1.0.0" },
      },
      1,
    );
    const version = z
      .object({
        protocolVersion: z.enum(["2025-11-25", "2025-06-18", "2025-03-26"]),
      })
      .parse(await result(initial, 1));
    headers.set("MCP-Protocol-Version", version.protocolVersion);
    const session = initial.headers.get("Mcp-Session-Id");
    if (session) headers.set("Mcp-Session-Id", session);

    try {
      await post("notifications/initialized");
      const payload = z
        .object({
          isError: z.boolean().optional(),
          structuredContent: z.unknown().optional(),
          content: z
            .array(z.object({ text: z.string().optional() }))
            .optional(),
        })
        .parse(
          await result(
            await post("tools/call", { name, arguments: args }, 2),
            2,
          ),
        );
      if (payload.isError) throw new Error("MCP tool error");
      return output.parse(
        payload.structuredContent ??
          JSON.parse(payload.content?.[0]?.text ?? "null"),
      );
    } finally {
      if (session) {
        void fetch(url, {
          method: "DELETE",
          headers,
          redirect: "error",
          signal: AbortSignal.timeout(2_000),
        }).catch(() => undefined);
      }
    }
  } catch {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message:
        "The sales provider could not confirm this action. Check the provider before retrying.",
    });
  }
}
