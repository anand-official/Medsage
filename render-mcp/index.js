#!/usr/bin/env node

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

const RENDER_API_KEY = process.env.RENDER_API_KEY;

if (!RENDER_API_KEY) {
  console.error("RENDER_API_KEY environment variable is missing.");
  process.exit(1);
}

// Render API Client base setup
const renderAPI = axios.create({
  baseURL: 'https://api.render.com/v1',
  headers: {
    'Accept': 'application/json',
    'Authorization': `Bearer ${RENDER_API_KEY}`
  }
});

// Setup the MCP server
const server = new Server(
  {
    name: "Render MCP Server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools available from Render API
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_services",
        description: "List all Render services",
        inputSchema: {
          type: "object",
          properties: {
             limit: {
                 type: "string",
                 description: "Limit the number of results"
             }
          },
        },
      },
      {
        name: "get_service",
        description: "Get details for a specific Render service",
        inputSchema: {
          type: "object",
           properties: {
            serviceId: {
                type: "string",
                description: "The unique ID of the specific Render service (e.g. srv-cabcdefg1234567890)"
            }
          },
          required: ["serviceId"]
        },
      },
      {
        name: "trigger_deploy",
        description: "Trigger a deployment for a specific Render service",
        inputSchema: {
          type: "object",
           properties: {
            serviceId: {
                type: "string",
                description: "The ID of the service to deploy"
            },
            clearCache: {
                type: "string",
                description: "Either 'true' or 'false' to indicate clearing the build cache. Default is false."
            }
          },
          required: ["serviceId"]
        },
      }
    ],
  };
});

// Handle incoming tool requests from Claude/Gemini
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  
  try {
      if (request.params.name === "list_services") {
        const response = await renderAPI.get('/services', { params: request.params.arguments });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }
      
      if (request.params.name === "get_service") {
        const serviceId = request.params.arguments.serviceId;
        if (!serviceId) throw new Error("Missing serviceId");
        
        const response = await renderAPI.get(`/services/${serviceId}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

       if (request.params.name === "trigger_deploy") {
        const { serviceId, clearCache } = request.params.arguments;
        if (!serviceId) throw new Error("Missing serviceId");
        
        const body = clearCache === "true" ? { clearCache: "clear" } : {};
        const response = await renderAPI.post(`/services/${serviceId}/deploys`, body);
        return {
          content: [
            {
              type: "text",
              text: `Deployment successfully triggered!\n\n${JSON.stringify(response.data, null, 2)}`,
            },
          ],
        };
      }

      throw new Error("Tool not found");

  } catch (error) {
      console.error(`Error executing ${request.params.name}:`, error.response?.data || error.message);
      return {
          content: [
            {
              type: "text",
              text: `Error from Render API: ${error.response?.data?.message || error.message}`,
            },
          ],
         isError: true,
       };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("Render MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
