import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import serverlessExpress from "@vendia/serverless-express";
import express from "express"; // ✅ Import Express
import { Elysia } from "elysia";

// ✅ Initialize AWS SSM Client
const ssmClient = new SSMClient({ region: "ap-southeast-1" });

// ✅ Fetch AWS Secrets
async function getSSMParameter(name: string, isSecure = false) {
  const command = new GetParameterCommand({ Name: name, WithDecryption: isSecure });

  try {
    const response = await ssmClient.send(command);
    if (!response.Parameter?.Value) throw new Error(`SSM Parameter ${name} is missing.`);
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
// const LOGGING_ENABLED = (await getSSMParameter("/bay-auto-backend/logging-enabled")) === "true";
const USE_MOCK = (await getSSMParameter("/bay-auto-backend/use-mock")) === "true";

// ✅ Initialize AWS S3 Client
const s3 = new S3Client({
  region: REGION,
  credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
});

// ✅ Initialize Elysia App
const app = new Elysia();

// ✅ CORS Middleware
app.onRequest((context) => {
  const allowedOrigins = ["http://13.215.45.229:4173", "https://main.d10zio24cxzx9i.amplifyapp.com"];
  const origin = context.request.headers.get("origin") || "";
  if (allowedOrigins.includes(origin)) {
    context.set.headers = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true",
    };
  }

  if (context.request.method === "OPTIONS") return new Response(null, { status: 204 });
});

// ✅ GPT Search API Endpoint
app.post("/gpt-search", async (context) => {
  try {
    const body = await context.request.json();
    const userInput = body?.input;
    if (!userInput) return new Response(JSON.stringify({ error: "Input is required" }), { status: 400 });

    if (USE_MOCK) return new Response(JSON.stringify({ choices: [{ message: { content: `Mock response: "${userInput}"` } }] }));

    const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: "gpt-4-turbo", messages: [{ role: "user", content: userInput }], max_tokens: 150 }),
    });

    const result = await gptResponse.json();
    return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
});

// ✅ Image Fetch API from S3
const fetchImagesFromS3 = async (prefix: string) => {
  try {
    const params = { Bucket: S3_BUCKET, Prefix: prefix };
    const command = new ListObjectsV2Command(params);
    const response = await s3.send(command);
    return response.Contents?.map((item) => `https://${S3_BUCKET}.s3.${REGION}.amazonaws.com/${item.Key}`) || [];
  } catch (error) {
    throw new Error(`Failed to fetch images from S3 (Prefix: ${prefix})`);
  }
};

// ✅ Image List Endpoints
app.get("/list-images", async () => new Response(JSON.stringify({ images: [...(await fetchImagesFromS3("cars/")), ...(await fetchImagesFromS3("motorcycles/"))] })));
app.get("/list-images-cars", async () => new Response(JSON.stringify({ images: await fetchImagesFromS3("cars/") })));
app.get("/list-images-motorcycles", async () => new Response(JSON.stringify({ images: await fetchImagesFromS3("motorcycles/") })));

// ✅ Default Route
app.get("/*", () => new Response(JSON.stringify({ message: "Backend is running, but no frontend is served." })));

// ✅ Convert Elysia App to Express-Compatible Handler
const expressApp = express();
expressApp.use(express.json());
expressApp.all("*", async (req, res) => {
  const request = new Request(`http://${req.headers.host}${req.url}`, {
    method: req.method,
    headers: req.headers as HeadersInit,
    body: req.method === "GET" || req.method === "HEAD" ? null : JSON.stringify(req.body),
  });

  const response = await app.handle(request);
  res.status(response.status);
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.send(await response.text());
});

// ✅ Export as AWS Lambda Handler
export const handler = serverlessExpress({ app: expressApp });
