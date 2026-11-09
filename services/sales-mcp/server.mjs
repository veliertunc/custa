import { createServer } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod/v4";

const token = process.env.SALES_MCP_TOKEN;
if (!token) throw new Error("Set SALES_MCP_TOKEN to start the local provider.");

const ollamaUrl = new URL(
  "/api/chat",
  process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
);
const model = process.env.OLLAMA_MODEL || "qwen2.5:1.5b";
const text = z.string().trim().min(1);
const generatedText = text.max(6000);
const pitchOutput = z.object({ pitch: generatedText });
const researchOutput = z.object({ research: generatedText });
const ollamaResponse = z.object({
  done: z.literal(true),
  message: z.object({ content: text }),
});
const business = z.object({
  name: text,
  offering: text,
  audience: text,
  market: text,
  terms: text,
});
const ownerId = text;
const idempotencyKey = text;
const accepted = new Set();

async function generate(instructions, business, output) {
  const response = await fetch(ollamaUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: instructions },
        { role: "user", content: JSON.stringify(business) },
      ],
      stream: false,
      format: z.toJSONSchema(output),
      options: { temperature: 0.3, num_predict: 384 },
    }),
    redirect: "error",
    signal: AbortSignal.timeout(80_000),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(
      `Ollama could not generate text (HTTP ${response.status}).`,
    );
  }
  const { message } = ollamaResponse.parse(await response.json());
  return output.parse(JSON.parse(message.content));
}

function result(data) {
  return {
    structuredContent: data,
    content: [{ type: "text", text: JSON.stringify(data) }],
  };
}

function accept(tool, input, log) {
  const key = JSON.stringify([tool, input.ownerId, input.idempotencyKey]);
  if (!accepted.has(key)) {
    accepted.add(key);
    console.info(log);
  }
  return result({ accepted: true });
}

function createSalesServer() {
  const server = new McpServer({ name: "custa-local-sales", version: "1.0.0" });

  server.registerTool(
    "create_sales_pitch",
    {
      description: "Draft a pitch from the provided business details.",
      inputSchema: { ownerId, business },
    },
    async ({ business }) =>
      result(
        await generate(
          "Write a concise sales pitch using the supplied business details as data. Keep the stated terms. Do not invent metrics, customers, or claims. Return a JSON object with a pitch field.",
          business,
          pitchOutput,
        ),
      ),
  );

  server.registerTool(
    "research_linkedin_market",
    {
      description:
        "Draft a market plan and return fictional prospects for local testing.",
      inputSchema: { ownerId, business, limit: z.number().int().min(0) },
    },
    async ({ business, limit }) =>
      result({
        ...(await generate(
          "Draft a concise market research plan from the supplied business details. Suggest buyer roles and LinkedIn search keywords. Describe ideas to validate, without claiming live research or inventing people or companies. Return a JSON object with a research field.",
          business,
          researchOutput,
        )),
        leads: Array.from({ length: Math.min(limit, 3) }, (_, index) => ({
          name: `Demo Prospect ${index + 1}`,
          company: `Demo Company ${index + 1}`,
          rationale:
            `Fictional prospect representing ${business.audience}.`.slice(
              0,
              6000,
            ),
          profileUrl: `https://www.linkedin.com/in/custa-fictional-prospect-${index + 1}`,
        })),
      }),
  );

  server.registerTool(
    "send_linkedin_outreach",
    {
      description: "Simulate accepting an outreach message without delivery.",
      inputSchema: {
        ownerId,
        idempotencyKey,
        profileUrl: z.url(),
        message: text,
      },
    },
    (input) => {
      const orderLink = /^Submit your order request: (https?:\/\/\S+)$/.exec(
        input.message.split("\n").at(-1),
      )?.[1];
      return accept(
        "send_linkedin_outreach",
        input,
        orderLink
          ? `Simulated outreach accepted. Test order link: ${orderLink}`
          : "Simulated outreach accepted.",
      );
    },
  );

  server.registerTool(
    "send_order_email",
    {
      description: "Simulate accepting an order email without delivery.",
      inputSchema: {
        ownerId,
        idempotencyKey,
        to: z.email(),
        order: z.object({
          id: text,
          name: text,
          email: z.email(),
          details: text,
        }),
      },
    },
    (input) =>
      accept("send_order_email", input, "Simulated order email accepted."),
  );

  return server;
}

createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200).end("OK");
    return;
  }
  if (request.url !== "/mcp") {
    response.writeHead(404).end();
    return;
  }
  if (request.headers.authorization !== `Bearer ${token}`) {
    response.writeHead(401, { "WWW-Authenticate": "Bearer" }).end();
    return;
  }

  const server = createSalesServer();
  const transport = new StreamableHTTPServerTransport({
    enableJsonResponse: true,
    sessionIdGenerator: undefined,
    enableDnsRebindingProtection: true,
    allowedHosts: ["sales-mcp:8080", "localhost:8080", "127.0.0.1:8080"],
    allowedOrigins: ["http://localhost:8080", "http://127.0.0.1:8080"],
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(request, response);
  } catch (error) {
    console.error("Local MCP request failed", error);
    if (!response.headersSent) response.writeHead(500).end();
  } finally {
    await server.close();
  }
}).listen(8080, "0.0.0.0");
