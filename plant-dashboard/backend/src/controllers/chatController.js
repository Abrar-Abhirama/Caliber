import { knowledgeService } from "../services/knowledgeService.js";
import { aiService } from "../services/aiService.js";

export const chatController = {
  async ask(req, res, next) {
    try {
      const { question, assetContext } = req.body;
      if (!question) {
        return res.status(400).json({ success: false, error: "Question is required." });
      }

      // 1. Retrieve knowledge passages
      const searchResult = await knowledgeService.searchPassages(question, assetContext);

      // 2. Generate grounded AI response
      const aiResponse = await aiService.generateAnswer({
        question,
        passages: searchResult.passages,
        assetContext,
      });

      res.json({
        success: true,
        data: aiResponse,
      });
    } catch (error) {
      next(error);
    }
  },
};
