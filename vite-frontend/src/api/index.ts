import { Elysia } from "elysia";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

// Load environment variables
dotenv.config();

// Validate required environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const S3_BUCKET = process.env.S3_BUCKET;
const REGION = process.env.AWS_REGION;
const LOGGING_ENABLED = process.env.LOGGING_ENABLED === "true";

if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY in .env file.");
if (!S3_BUCKET) throw new Error("Missing S3_BUCKET in .env file.");
if (!REGION) throw new Error("Missing AWS_REGION in .env file.");

const s3 = new S3Client({ region: REGION });
const USE_MOCK = process.env.USE_MOCK === "true";
const frontendPath = join(process.cwd(), "vite-frontend/dist");

if (LOGGING_ENABLED) console.log("Frontend Path:", frontendPath);

const app = new Elysia();

// Dynamic CORS Middleware
app.onRequest((context) => {
  const allowedOrigins = [
    "http://localhost:4173", // Local development
    "https://main.d10zio24cxzx9i.amplifyapp.com" // Add production frontend URL
  ];

  const origin = context.request.headers.get("origin") || "";
  if (allowedOrigins.includes(origin)) {
    context.set.headers = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "X-Content-Type-Options": "nosniff", // Security header
    };
  }

  if (context.request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
});

// GPT Search API Endpoint
app.post("/gpt-search", async (context) => {
  try {
    const body = await context.request.json();
    const userInput = body?.input;

    if (!userInput) {
      return new Response(
        JSON.stringify({ error: "Input is required" }),
        { headers: { "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (USE_MOCK) {
      const mockResponse = {
        choices: [
          {
            message: {
              role: "assistant",
              content: `You said: "${userInput}". This is a mocked response.`,
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

    if (!gptResponse.ok) {
      console.error("Error from OpenAI API:", result);
      return new Response(
        JSON.stringify({ error: result.error.message || "Unknown error" }),
        { headers: { "Content-Type": "application/json" }, status: gptResponse.status }
      );
    }

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing GPT request:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// Helper to fetch images from S3
const fetchImagesFromS3 = async (prefix: string) => {
  try {
    const params = { Bucket: S3_BUCKET, Prefix: prefix };
    const command = new ListObjectsV2Command(params);
    const response = await s3.send(command);

    return (
      response.Contents?.map(
        (item) => `https://${S3_BUCKET}.s3.${REGION}.amazonaws.com/${item.Key}`
      ) || []
    );
  } catch (error) {
    console.error(`Error fetching images from prefix: ${prefix}`, error);
    throw new Error(`Failed to fetch images from S3 (Prefix: ${prefix})`);
  }
};

// API Endpoints for images
app.get("/list-images", async () => {
  try {
    const carImages = await fetchImagesFromS3("cars/");
    const motorcycleImages = await fetchImagesFromS3("motorcycles/");
    return new Response(
      JSON.stringify({ images: [...carImages, ...motorcycleImages] }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
});

app.get("/list-images-cars", async () => {
  try {
    const carImages = await fetchImagesFromS3("cars/");
    return new Response(
      JSON.stringify({ images: carImages }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
});

app.get("/list-images-motorcycles", async () => {
  try {
    const motorcycleImages = await fetchImagesFromS3("motorcycles/");
    return new Response(
      JSON.stringify({ images: motorcycleImages }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// Serve Static Files
app.get("/*", (context) => {
  const url = new URL(context.request.url);
  const filePath = join(frontendPath, url.pathname);

  if (existsSync(filePath) && !filePath.endsWith("/")) {
    return new Response(readFileSync(filePath), {
      headers: { "Content-Type": getMimeType(filePath) },
    });
  }

  const html = readFileSync(join(frontendPath, "index.html"), "utf-8");
  return new Response(html, { headers: { "Content-Type": "text/html" } });
});

// Start the server
app.listen(3000, () => {
  console.log("Elysia is serving at http://localhost:3000");
});

// Utility function to determine MIME type
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
