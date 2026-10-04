import express from "express";
import cors from "cors";
import { config } from "./config/index.js";
import routes from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { knowledgeService } from "./services/knowledgeService.js";
import { logger } from "./utils/logger.js";

// Server entry point - reloaded with .env support
const app = express();

// Middlewares
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json());

// Serve original document/drawing images from knowledge-base/images
import path from "path";
app.use("/api/images", express.static(path.join(config.knowledgeBasePath, "images")));

// Serve uploaded PDF documents from knowledge-base/uploads/pdf
app.use("/api/documents/pdf", express.static(path.join(config.knowledgeBasePath, "uploads", "pdf")));

// API Routes
app.use("/api", routes);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    environment: config.nodeEnv,
    knowledgeBaseLinked: knowledgeService.isInitialized,
    geminiKeySet: Boolean(config.geminiApiKey || process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Error handling
app.use(errorHandler);

// Start server
const server = app.listen(config.port, async () => {
  logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
  await knowledgeService.initialize();
});

// Keep-alive timeouts to prevent ECONNRESET behind reverse proxies (like Vite proxy)
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

