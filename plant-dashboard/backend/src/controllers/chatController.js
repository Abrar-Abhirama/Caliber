import { knowledgeService } from "../services/knowledgeService.js";
import { aiService } from "../services/aiService.js";
import { inspectService } from "../services/inspectService.js";
import { DEFAULT_GEMINI_MODEL, GEMINI_MODELS, isAllowedModel } from "../config/geminiModels.js";

export const chatController = {
  async ask(req, res, next) {
    try {
      const { question, model, scope: scopeReq } = req.body;
      let { assetContext } = req.body;
      if (!question) {
        return res.status(400).json({ success: false, error: "Question is required." });
      }
      if (model && !isAllowedModel(model)) {
        return res.status(400).json({ success: false, error: `Model "${model}" is not available.` });
      }

      // Inspect mode: retrieval is limited to the records linked to one P&ID set (and optionally one OPL).
      let scope = null;
      if (scopeReq?.pid) {
        scope = inspectService.scopeFor(scopeReq.pid, scopeReq.opl || null);
        if (!scope) {
          return res.status(400).json({ success: false, error: `Unknown P&ID set or OPL: ${scopeReq.pid} ${scopeReq.opl || ""}`.trim() });
        }
        assetContext = scope.asset;
      }

      // 1. Retrieve knowledge passages
      const searchResult = await knowledgeService.searchPassages(question, assetContext, scope ? 8 : 6, scope);
      const passages = scope
        ? searchResult.passages.filter((p) => scope.allowed.has(p.ref))
        : searchResult.passages;

      // 2. Generate grounded AI response
      const aiResponse = await aiService.generateAnswer({
        question,
        passages,
        assetContext,
        scope,
        model: model || DEFAULT_GEMINI_MODEL,
      });

      res.json({
        success: true,
        data: scope ? { ...aiResponse, scope: { pid: scope.pid, opl: scope.opl } } : aiResponse,
      });
    } catch (error) {
      next(error);
    }
  },

  listModels(req, res) {
    res.json({ success: true, data: { models: GEMINI_MODELS, defaultModel: DEFAULT_GEMINI_MODEL } });
  },
};
