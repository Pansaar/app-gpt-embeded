import { Elysia } from "elysia";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Validate the presence of the OpenAI API key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error(
    "OpenAI API Key is missing. Add it to your .env file as OPENAI_API_KEY."
  );
}

// Determine whether to use mocked responses
const USE_MOCK = process.env.USE_MOCK === "true";

// Define the frontend path for serving static files
const frontendPath = join(process.cwd(), "vite-frontend/dist");
const automobilePath = join(process.cwd(), "../../automobile");
console.log("Automobile Path:", automobilePath);

const app = new Elysia();

// Global CORS Middleware
app.onRequest((context) => {
  // Set CORS headers for all requests
  context.set.headers = {
    "Access-Control-Allow-Origin": "http://localhost:4173", // Change this to your frontend's URL
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
          model: "gpt-4-turbo",
          messages: [{ role: "user", content: userInput }],
          max_tokens: 150,
        }),
      }
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
      }
    );
  }
});

// List Images API Endpoint
app.get("/list-images", () => {
  try {
    if (!existsSync(automobilePath)) {
      return new Response(
        JSON.stringify({ error: "Automobile directory not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Read all files in the automobile directory
    const files = readdirSync(automobilePath);
    const imageFiles = files.filter((file) =>
      /\.(jpeg|jpg|png)$/i.test(file)
    );

    return new Response(JSON.stringify({ images: imageFiles }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error reading automobile directory:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to read automobile directory",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

app.get("/automobile/*", (context) => {
  // Extract the path from the URL
  const url = new URL(context.request.url);
  const fileName = url.pathname.replace("/automobile/", ""); // Only get the file name
  const filePath = join(automobilePath, fileName); // Join with the automobilePath

  // Log debug information
  console.log("Requested File:", fileName);
  console.log("Resolved File Path:", filePath);
  console.log("File Exists:", existsSync(filePath));

  // Check if the file exists and serve it
  if (existsSync(filePath)) {
    return new Response(readFileSync(filePath), {
      headers: { "Content-Type": getMimeType(filePath) },
    });
  }

  // Return 404 if the file doesn't exist
  return new Response("File not found", { status: 404 });
});


// Fallback route for SPA
app.get("/*", (context) => {
  const url = new URL(context.request.url);
  const filePath = join(frontendPath, url.pathname);

  if (existsSync(filePath) && !filePath.endsWith("/")) {
    return new Response(readFileSync(filePath), {
      headers: {
        "Content-Type": getMimeType(filePath),
      },
    });
  }

  const html = readFileSync(join(frontendPath, "index.html"), "utf-8");
  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
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
    jpeg: "image/jpeg",
    svg: "image/svg+xml",
    ico: "image/x-icon",
  };
  return mimeTypes[ext || ""] || "application/octet-stream";
}
