import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from the backend root folder
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
// Also fallback to default .env in cwd
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  knowledgeBasePath: path.resolve(
    __dirname,
    process.env.KNOWLEDGE_BASE_PATH || "../../../../knowledge-base"
  ),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || null,
  geminiApiKey: process.env.GEMINI_API_KEY || null,
};
