import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { Elysia } from "elysia";
import { join } from "path";

const ssmClient = new SSMClient({ region: "ap-southeast-1" });

async function getSSMParameter(name: string, isSecure = false) {
  const command = new GetParameterCommand({
    Name: name,
    WithDecryption: isSecure,
  });

  try {
    const response = await ssmClient.send(command);
    console.log(`SSM Parameter Loaded: ${name} = ${response.Parameter?.Value}`);

    if (!response.Parameter?.Value) {
      throw new Error(`SSM Parameter ${name} is missing or empty.`);
    }

    return response.Parameter?.Value;
  } catch (error) {
    console.error(`Error fetching ${name} from SSM:`, error);
    throw new Error(`Failed to load parameter ${name}`);
  }
}


const OPENAI_API_KEY = await getSSMParameter("/bay-auto-backend/openai", true);
const S3_BUCKET = await getSSMParameter("/bay-auto-backend/s3-bucket", true); 
const REGION = await getSSMParameter("/bay-auto-backend/aws-region", true);
const AWS_ACCESS_KEY_ID = await getSSMParameter("/bay-auto-backend/aws-access-key-id", true);
const AWS_SECRET_ACCESS_KEY = await getSSMParameter("/bay-auto-backend/aws-secret-access-key", true);
const LOGGING_ENABLED = (await getSSMParameter("/bay-auto-backend/logging-enabled")) === "true";
const USE_MOCK = (await getSSMParameter("/bay-auto-backend/use-mock")) === "true";

console.log(OPENAI_API_KEY)

if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY from SSM.");
if (!S3_BUCKET) throw new Error("Missing S3_BUCKET from SSM.");
if (!REGION) throw new Error("Missing AWS_REGION from SSM.");
if (!AWS_ACCESS_KEY_ID) throw new Error("Missing AWS_ACCESS_KEY_ID from SSM.");
if (!AWS_SECRET_ACCESS_KEY) throw new Error("Missing AWS_SECRET_ACCESS_KEY from SSM.");

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

const frontendPath = join(process.cwd(), "public");
const app = new Elysia();

if (LOGGING_ENABLED) console.log("Frontend Path:", frontendPath);


app.onRequest((context) => {
  const allowedOrigins = [
    "http://localhost:4173", 
    "https://main.d10zio24cxzx9i.amplifyapp.com", 
  ];

  const origin = context.request.headers.get("origin") || "";
  if (allowedOrigins.includes(origin)) {
    context.set.headers = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true", 
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

app.get("/*", () => {
  return new Response(
    JSON.stringify({ message: "Backend is running, but no frontend is served." }),
    { headers: { "Content-Type": "application/json" } }
  );
});

app.listen({
  port: 3000,
  hostname: "0.0.0.0",
}, () => {
  console.log("Elysia is serving at http://0.0.0.0:3000");
});
