import { Elysia } from "elysia";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

// Load environment variables
dotenv.config();

// Validate the presence of the OpenAI API key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error(
    "OpenAI API Key is missing. Add it to your .env file as OPENAI_API_KEY."
  );
}

// S3 Configuration
const S3_BUCKET = process.env.S3_BUCKET;
const REGION = process.env.AWS_REGION;
if (!S3_BUCKET) {
  throw new Error("S3_BUCKET environment variable is missing.");
}
if (!REGION) {
  throw new Error("AWS_REGION environment variable is missing.");
}

const s3 = new S3Client({ region: REGION });

// Determine whether to use mocked responses
const USE_MOCK = process.env.USE_MOCK === "true";

// Define the frontend path for serving static files
const frontendPath = join(process.cwd(), "vite-frontend/dist");
console.log("Frontend Path:", frontendPath);

const app = new Elysia();

// Global CORS Middleware
app.onRequest((context) => {
  context.set.headers = {
    "Access-Control-Allow-Origin": "http://localhost:4173", // Update to your frontend's URL in production
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (context.request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
});

// GPT-Search API Endpoint
app.post("/gpt-search", async (context) => {
  try {
    const body = await context.request.json();
    const userInput = body?.input;

    if (!userInput) {
      return new Response(
        JSON.stringify({ error: "Input is required" }),
        {
          headers: { "Content-Type": "application/json" },
          status: 400,
        }
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

    if (gptResponse.ok) {
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    } else {
      console.error("Error from OpenAI API:", result);
      return new Response(
        JSON.stringify({ error: result.error.message || "Unknown error" }),
        {
          headers: { "Content-Type": "application/json" },
          status: gptResponse.status,
        }
      );
    }
  } catch (error) {
    console.error("Error processing GPT request:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

app.get("/list-images", async () => {
  try {
    const carParams = { Bucket: S3_BUCKET, Prefix: "cars/" };
    const motorcycleParams = { Bucket: S3_BUCKET, Prefix: "motorcycles/" };

    const carCommand = new ListObjectsV2Command(carParams);
    const motorcycleCommand = new ListObjectsV2Command(motorcycleParams);

    const [carResponse, motorcycleResponse] = await Promise.all([
      s3.send(carCommand),
      s3.send(motorcycleCommand),
    ]);

    const carImages =
      carResponse.Contents?.map((item) => `https://${S3_BUCKET}.s3.${REGION}.amazonaws.com/${item.Key}`) || [];
    const motorcycleImages =
      motorcycleResponse.Contents?.map((item) => `https://${S3_BUCKET}.s3.${REGION}.amazonaws.com/${item.Key}`) || [];

    const allImages = [...carImages, ...motorcycleImages];

    return new Response(
      JSON.stringify({ images: allImages }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching images:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch images" }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

app.get("/list-images-cars", async () => {
  try {
    const params = { Bucket: S3_BUCKET, Prefix: "cars/" };
    const command = new ListObjectsV2Command(params);
    const response = await s3.send(command);

    const carImages =
      response.Contents?.map((item) => `https://${S3_BUCKET}.s3.${REGION}.amazonaws.com/${item.Key}`) || [];

    return new Response(
      JSON.stringify({ images: carImages }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching car images:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch car images" }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

app.get("/list-images-motorcycles", async () => {
  try {
    const params = { Bucket: S3_BUCKET, Prefix: "motorcycles/" };
    const command = new ListObjectsV2Command(params);
    const response = await s3.send(command);

    const motorcycleImages =
      response.Contents?.map((item) => `https://${S3_BUCKET}.s3.${REGION}.amazonaws.com/${item.Key}`) || [];

    return new Response(
      JSON.stringify({ images: motorcycleImages }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching motorcycle images:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch motorcycle images" }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

// Serve Static Files
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
