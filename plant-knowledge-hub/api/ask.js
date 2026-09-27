// Serverless endpoint for live AI answers (Vercel format: /api/ask).
// The browser sends the prompt (question + retrieved, numbered sources);
// this function calls Claude with your API key, which never reaches the browser.
//
// Set ANTHROPIC_API_KEY in your hosting provider's environment variables.
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

export default async function handler(req, res) {
  // GET is a health check the page uses to decide whether live AI is available
  if (req.method === "GET") {
    return res.status(200).json({ ok: Boolean(process.env.ANTHROPIC_API_KEY) });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const prompt = req.body && typeof req.body.prompt === "string" ? req.body.prompt : "";
  if (!prompt || prompt.length > 60000) return res.status(400).json({ error: "Missing or oversized prompt" });

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      // If Claude Opus 5 declines a request, the API retries it on a fallback model
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [{ role: "user", content: prompt }],
    });
    if (response.stop_reason === "refusal") {
      return res.status(422).json({ error: "The model declined this question." });
    }
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    return res.status(200).json({ text });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return res.status(502).json({ error: `Claude API error ${err.status}` });
    }
    return res.status(500).json({ error: "Unexpected error" });
  }
}
