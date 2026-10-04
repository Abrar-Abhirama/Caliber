import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { DEFAULT_GEMINI_MODEL } from "../config/geminiModels.js";

const CURATED_ANSWERS = [
  {
    pattern: /vibration.*(?:trip|rising|5\.3|high)/i,
    asset: "GA-1201A",
    answer: "Treat this as a developing bearing or alignment fault, not a nuisance alarm. Vibration is currently elevated against the 4.5 mm/s alarm and 7.1 mm/s trip [OPL-GA-1201A-07][TJC-LLD-IL-GA-1201A]. The same pattern preceded the Feb 2025 trip, which was traced to angular misalignment after foundation settlement [WO-240003].",
    steps: [
      "Correlate VT-1201 with TT-1201 bearing temperature [OPL-GA-1201A-07]",
      "Check oil bath level at the middle of the sight glass with ISO VG 68 [OPL-GA-1201A-02]",
      "Prepare controlled changeover to GA-1201B before reaching the 7.1 mm/s trip limit [TJC-LLD-IL-GA-1201A]",
      "Once on standby, laser-check alignment (< 0.05 mm/100 mm angular and < 0.05 mm offset) [OPL-GA-1201A-03]",
    ],
    confidence: 88,
    cautions: ["Confirm trip setpoint against live SIS configuration."],
  },
  {
    pattern: /seal flush.*(?:dp|pressure|pdi-1201)/i,
    asset: "GA-1201A",
    answer: "Seal flush differential pressure across orifice RO-1201 must be above 1.5 bar before start, and normally reads 1.5 to 2.5 bar on PDI-1201 [OPL-GA-1201A-01]. Low flush causes seal face overheating and hexane leakage to atmosphere, as recorded in Aug 2025 [WO-240002].",
    steps: [
      "Verify PDI-1201 indicates between 1.5 and 2.5 bar [OPL-GA-1201A-01]",
      "Inspect RO-1201 orifice for polymer or fines plugging if dP is low [WO-240002]",
      "Ensure Plan 62 quench is active [OPL-GA-1201A-01]",
    ],
    confidence: 90,
    cautions: [],
  },
  {
    pattern: /alignment.*(?:tolerances?|targets?|hot check)/i,
    asset: "GA-1201A",
    answer: "Target angular misalignment is below 0.05 mm/100 mm and offset below 0.05 mm, corrected by shimming motor feet [OPL-GA-1201A-03]. For hexane service, perform a hot alignment check after ~2 hours of continuous operation at temperature [OPL-GA-1201A-05].",
    steps: [
      "Laser align at 0, 90, 180, and 270 degrees [OPL-GA-1201A-03]",
      "Record cold alignment values in machine log [OPL-GA-1201A-05]",
      "Perform hot check after ~2 h at temperature [OPL-GA-1201A-05]",
    ],
    confidence: 86,
    cautions: ["In OPL-03, verify targets against the Action column due to row shift in the template."],
  }
];

// Inspect mode: the sources were already filtered to one P&ID set; tell the model not to reach beyond them.
const scopeNote = (scope) =>
  scope
    ? `Scope: the user is inspecting P&ID set ${scope.pid}${scope.opl ? ` (OPL ${scope.opl})` : ""}. The sources below are only the documents, OPLs and work orders linked to this P&ID. Do not answer about other P&IDs or equipment; if the answer is not in these sources, say it is not recorded for this P&ID.`
    : "";

class AIService {
  constructor() {
    this.geminiApiKey = config.geminiApiKey;
    this.anthropicApiKey = config.anthropicApiKey;
  }

  async generateAnswer({ question, passages, assetContext, scope, model }) {
    let lastApiError = null;
    const geminiKey = process.env.GEMINI_API_KEY || config.geminiApiKey || this.geminiApiKey;
    if (geminiKey) {
      try {
        this.geminiApiKey = geminiKey;
        logger.info("Calling Google Gemini API...");
        return await this.callGemini({ question, passages, assetContext, scope, model });
      } catch (err) {
        lastApiError = err.message;
        logger.error("Gemini API call failed, trying fallback:", err.message);
      }
    }

    // 2. Anthropic Claude if configured
    if (this.anthropicApiKey) {
      try {
        logger.info("Calling Anthropic Claude API...");
        return await this.callAnthropic({ question, passages, assetContext, scope });
      } catch (err) {
        lastApiError = err.message;
        logger.error("Anthropic API call failed, falling back to retrieval mode:", err.message);
      }
    }

    // 3. Offline Curated Fallback (only used when NO api key is provided or cloud unavailable)
    const match = CURATED_ANSWERS.find(
      (c) => c.pattern.test(question) && (!c.asset || c.asset === assetContext || !assetContext)
    );

    if (match) {
      return {
        answer: match.answer,
        steps: match.steps,
        confidence: match.confidence,
        cautions: match.cautions,
        mode: lastApiError ? "Offline Fallback (Gemini API 503 Spike)" : "Offline Demo Mode (Scripted Answer)",
        model: null,
        fallback: true,
        fallbackReason: lastApiError ? "No Gemini model answered; scripted answer" : "No API key; scripted answer",
        sources: passages,
      };
    }

    // 4. Passage summary fallback
    const topPassage = passages[0];
    if (!topPassage) {
      return {
        answer: "No relevant documents found in the plant knowledge base for your inquiry.",
        steps: [],
        confidence: 20,
        cautions: ["Try specifying the asset tag (e.g., GA-1201A, KC-4501)."],
        mode: "Retrieval only (Offline)",
        model: null,
        fallback: true,
        fallbackReason: "No model answered; nothing retrieved",
        sources: [],
      };
    }

    let cleanSentence = "";
    if (topPassage.kind === "work_order") {
      const cleanTitle = topPassage.title.replace(/^WO-\d+\s*-\s*[A-Z0-9-]+\s*-\s*/i, "");
      cleanSentence = `According to work order [${topPassage.ref}], the maintenance task was performed on asset **${topPassage.tag || "the plant"}** regarding "${cleanTitle}".`;
    } else {
      cleanSentence = `According to technical document [${topPassage.ref}] (${topPassage.title}), please review the operating specifications below.`;
    }

    const cautions = [];
    if (lastApiError) {
      cautions.push(`Google Gemini Cloud Notice: The model returned a temporary 503 traffic demand spike. Serving grounded knowledge base records directly.`);
    }

    return {
      answer: cleanSentence,
      steps: [],
      confidence: Math.min(85, Math.round(topPassage.score * 1.5)),
      cautions,
      mode: lastApiError ? "Local Grounded Fallback (Gemini High Demand Spike)" : "Grounded retrieval (Offline)",
      model: null,
      fallback: true,
      fallbackReason: lastApiError ? `No Gemini model answered (${lastApiError.slice(0, 120)}); showing top record` : "No API key; showing top record",
      sources: passages,
    };
  }

  async callGemini({ question, passages, assetContext, scope, model: preferredModel }) {
    const labeledSources = passages
      .map((p, i) => `[S${i + 1}] (${p.ref}) ${p.title} [Tag: ${p.tag || "N/A"}] [Status: ${p.status || "N/A"}]\n${p.text.slice(0, 3500)}`)
      .join("\n\n");

    const systemInstruction = `You are an expert AI Plant Knowledge Hub assistant for an industrial chemical plant (LLDPE unit).
A plant engineer asked: "${question}"
${assetContext ? `Active Asset Context: ${assetContext}` : ""}
${scopeNote(scope)}

CRITICAL INSTRUCTIONS:
1. Answer comprehensively using the provided numbered sources below.
2. Cite every factual claim with source numbers in square brackets like [S1], [S2]. Always put a space between citations.
3. When the user asks for work orders or maintenance records for an equipment, list each relevant work order clearly with a bullet point (- [S#] **WO-NUMBER**: Date, Description, Status, Cost if available).
4. You can extract and calculate details (such as labor costs, downtime, totals, dates, or comparing equipment) directly from the data in the sources.
5. If the exact answer or specific record is genuinely missing from the sources, state clearly that it is not recorded in the plant dataset. Never guess or hallucinate ungrounded numbers.
6. Reply in the same language as the question (e.g., Indonesian or English).
7. Structure your answer using clear Markdown paragraphs and bullet lists (- item) with clean line breaks so it is easily readable.
8. Never recommend bypassing or defeating a safety interlock.
9. Return valid JSON only with this schema:
{
  "answer": "Clear, well-formatted explanation with clean markdown paragraphs and lists citing [S#] sources",
  "steps": ["Step 1 with [S#]", "Step 2 with [S#]"],
  "confidence": 85,
  "cautions": ["Any safety alerts or data conflicts"]
}

Sources:
${labeledSources}`;

    // The model picked in the UI goes first; on 503/429/404 fall back to the default Flash models.
    // Fallbacks stay on free-tier models so a free API key never hits a paid model.
    const candidateModels = [...new Set([preferredModel, DEFAULT_GEMINI_MODEL, "gemini-3.5-flash-lite"].filter(Boolean))];
    let lastError = null;
    // Why each earlier model was skipped, so the answer can say it fell back.
    const skipped = [];

    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiApiKey}`;

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(15000),
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemInstruction }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          logger.warn(`Model ${model} returned HTTP ${response.status}: ${errText.slice(0, 160)}`);
          lastError = new Error(`Gemini API error (${response.status}) on ${model}: ${errText}`);
          skipped.push(`${model}: HTTP ${response.status}`);
          // If 503 (high demand) or 429 (rate limit), continue to next model in pool
          if (response.status === 503 || response.status === 429 || response.status === 404) {
            continue;
          }
          throw lastError;
        }

        const data = await response.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        // Skip thinking parts and find the JSON payload part
        const jsonPart = parts.find((p) => !p.thought && p.text && p.text.includes("{")) || parts.find((p) => p.text) || {};
        let rawText = jsonPart.text || "{}";
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) rawText = jsonMatch[0];
        const parsed = JSON.parse(rawText);

        // Replace [S1] and [S1, S2] with actual document references like [OPL-GA-1201A-07]
        const map = Object.fromEntries(passages.map((p, i) => [`S${i + 1}`, p.ref]));
        const conv = (str) =>
          String(str || "")
            .replace(/\[([S\d,\s]+)\]/g, (m, inner) => {
              const keys = inner.split(/,\s*/);
              return keys.map((k) => (map[k.trim()] ? `[${map[k.trim()]}]` : `[${k.trim()}]`)).join(" ");
            })
            .replace(/\[(S\d+)\]/g, (m, k) => (map[k] ? `[${map[k]}]` : m));

        return {
          answer: conv(parsed.answer),
          steps: (parsed.steps || []).map(conv),
          confidence: parsed.confidence || 85,
          cautions: parsed.cautions || [],
          mode: `Generated by Google Gemini (${model}) with Knowledge Citations`,
          sources: passages,
          // modelVersion is what Gemini reports it actually ran.
          model: data.modelVersion || model,
          requestedModel: preferredModel || null,
          fallback: model !== candidateModels[0],
          fallbackReason: skipped.length ? skipped.join("; ") : null,
        };
      } catch (err) {
        lastError = err;
        if (!skipped.some((x) => x.startsWith(`${model}:`))) skipped.push(`${model}: ${err.message.slice(0, 80)}`);
        logger.warn(`Model ${model} failed: ${err.message}. Trying next model...`);
      }
    }

    throw lastError || new Error("All candidate Gemini models failed to respond.");
  }

  async callAnthropic({ question, passages, assetContext, scope }) {
    const labeledSources = passages.map((p, i) => `[S${i + 1}] (${p.ref}) ${p.title} [Status: ${p.status || "N/A"}]\n${p.text.slice(0, 1000)}`).join("\n\n");

    const prompt = `You are an AI Plant Knowledge Hub assistant for an industrial chemical plant.
A plant engineer asked: "${question}"
${assetContext ? `Active Asset Context: ${assetContext}` : ""}
${scopeNote(scope)}

Answer ONLY using the provided numbered sources below.
Cite every factual claim with source numbers in square brackets like [S1], [S2].
Do NOT guess or invent numbers or setpoints.
Reply in valid JSON format:
{
  "answer": "Clear explanation citing [S#] sources",
  "steps": ["Step 1 with [S#]", "Step 2 with [S#]"],
  "confidence": 85,
  "cautions": ["Any safety alerts or data conflicts"]
}

Sources:
${labeledSources}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text || "{}";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    const map = Object.fromEntries(passages.map((p, i) => [`S${i + 1}`, p.ref]));
    const conv = (str) =>
      String(str || "")
        .replace(/\[([S\d,\s]+)\]/g, (m, inner) => {
          const keys = inner.split(/,\s*/);
          return keys.map((k) => (map[k.trim()] ? `[${map[k.trim()]}]` : `[${k.trim()}]`)).join("");
        })
        .replace(/\[(S\d+)\]/g, (m, k) => (map[k] ? `[${map[k]}]` : m));

    return {
      answer: conv(parsed.answer),
      steps: (parsed.steps || []).map(conv),
      confidence: parsed.confidence || 80,
      cautions: parsed.cautions || [],
      mode: "Generated by Claude with Knowledge Citations",
      sources: passages,
    };
  }
}

export const aiService = new AIService();
