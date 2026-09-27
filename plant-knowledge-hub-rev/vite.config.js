import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Runs api/ask.js inside `npm run dev`, so live AI works locally with ANTHROPIC_API_KEY in .env.local.
// In production (Vercel) the api/ folder is deployed as a serverless function instead.
function localApi(){
  return {
    name: "local-api",
    configureServer(server){
      const env = loadEnv("development", process.cwd(), "");
      if (env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
      server.middlewares.use("/api/ask", async (req, res) => {
        let raw = "";
        for await (const chunk of req) raw += chunk;
        req.body = raw ? JSON.parse(raw) : {};
        res.status = code => { res.statusCode = code; return res; };
        res.json = obj => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(obj)); };
        const { default: handler } = await server.ssrLoadModule("/api/ask.js");
        await handler(req, res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localApi()],
});
