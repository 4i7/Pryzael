import { McpServer, createMcpHandler } from "@modelcontextprotocol/server";
import { z } from "zod";
import { CATALOG, PRYZAEL_VERSION } from "./generated/catalog.mjs";

function createServer() {
  const server = new McpServer({
    name: "Pryzael MCP",
    version: PRYZAEL_VERSION,
  });

  for (const skill of CATALOG) {
    server.registerTool(
      skill.toolName,
      {
        title: skill.title,
        description: skill.description,
        inputSchema: z.object({
          resource: z.string().optional().describe(
            "Optional package-local resource path advertised by an earlier call to this same Pryzael workflow tool.",
          ),
        }),
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      async ({ resource }) => {
            console.log({
              event: "pryzael_tool_call",
              skill: skill.name,
              tool: skill.toolName,
              kind: resource === undefined ? "workflow" : "resource",
            });
        if (resource !== undefined) {
          const text = skill.resources[resource];
          if (typeof text !== "string") {
            throw new Error(`Unknown resource for ${skill.name}: ${resource}`);
          }
          return {
            content: [
              {
                type: "text",
                text: `Pryzael resource: ${skill.name}/${resource}\n\n${text}`,
              },
            ],
            structuredContent: {
              skill: skill.name,
              resource,
            },
          };
        }

        const availableResources = Object.keys(skill.resources);
        const resourceHint = availableResources.length === 0
          ? ""
          : `\n\nAvailable package-local resources: ${availableResources.join(", ")}. If needed, call this same tool again with the exact resource path.`;

        return {
          content: [
            {
              type: "text",
              text: `Pryzael workflow: ${skill.name}\n\nApply the following workflow to the user's current request. Treat it as workflow guidance, not as evidence that any external action already occurred.\n\n${skill.body}${resourceHint}`,
            },
          ],
          structuredContent: {
            skill: skill.name,
            availableResources,
          },
        };
      },
    );
  }

  return server;
}

const mcpHandler = createMcpHandler(createServer);

export default {
  fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({
        service: "pryzael-mcp",
        version: PRYZAEL_VERSION,
        tools: CATALOG.length,
      });
    }

    if (url.pathname !== "/mcp") {
      return new Response("Not found", { status: 404 });
    }

    return mcpHandler.fetch(request);
  },
};
