import { Elysia } from "elysia";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Validate the presence of the OpenAI API key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error(
    "OpenAI API Key is missing. Add it to your .env file as OPENAI_API_KEY.",
  );
}

// Determine whether to use mocked responses
const USE_MOCK = process.env.USE_MOCK === "true";

// Define the frontend path for serving static files
const frontendPath = join(process.cwd(), "vite-frontend/dist");

const app = new Elysia();

// Global CORS Middleware
app.onRequest((context) => {
  // Set CORS headers for all requests
  context.set.headers = {
    "Access-Control-Allow-Origin": "http://localhost:4173", // Adjust to your frontend origin
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle preflight requests
  if (context.request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
});

// GPT-Search API Endpoint
app.post("/gpt-search", async (context) => {
  try {
    // Parse the incoming request body
    const body = await context.request.json();
    const userInput = body?.input;

    if (!userInput) {
      return new Response(JSON.stringify({ error: "Input is required" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Use mocked response if USE_MOCK is true
    if (USE_MOCK) {
      const mockResponse = {
        choices: [
          {
            message: {
              role: "assistant",
              content: `You said: "${userInput}". This is a mocked response from GPT.`,
            },
          },
        ],
      };
      return new Response(JSON.stringify(mockResponse), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const gptResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4-turbo", // Use "gpt-4" for the full version
          messages: [{ role: "user", content: userInput }],
          max_tokens: 150,
        }),
      },
    );

    const result = await gptResponse.json();

    if (gptResponse.ok) {
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    } else {
      console.error("Error from OpenAI API:", result);
      return new Response(JSON.stringify({ error: result.error }), {
        headers: { "Content-Type": "application/json" },
        status: gptResponse.status,
      });
    }
  } catch (error) {
    console.error("Error processing GPT request:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error. Please try again later.",
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

// Serve Static Files
app.get("/*", (context) => {
  const url = new URL(context.request.url);
  const filePath = join(frontendPath, url.pathname);

  // Check if the requested file exists
  if (existsSync(filePath) && !filePath.endsWith("/")) {
    return new Response(readFileSync(filePath), {
      headers: {
        "Content-Type": getMimeType(filePath),
      },
    });
  }

  // Fallback to index.html for SPA
  const html = readFileSync(join(frontendPath, "index.html"), "utf-8");
  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
});

// Start the server
app.listen(3000, () => {
  console.log("Elysia is serving at http://localhost:3000");
});

// Utility function to determine MIME type based on file extension
function getMimeType(filePath: string): string {
  const ext = filePath.split(".").pop();
  const mimeTypes: Record<string, string> = {
    html: "text/html",
    css: "text/css",
    js: "application/javascript",
    json: "application/json",
    png: "image/png",
    jpg: "image/jpeg",
    svg: "image/svg+xml",
    ico: "image/x-icon",
  };
  return mimeTypes[ext || ""] || "application/octet-stream";
}
