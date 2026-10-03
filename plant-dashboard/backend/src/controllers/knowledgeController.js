import { knowledgeService } from "../services/knowledgeService.js";

export const knowledgeController = {
  async search(req, res, next) {
    try {
      const { q, asset, limit } = req.query;
      const parsedLimit = limit ? parseInt(limit, 10) : 24;
      const results = await knowledgeService.searchPassages(q, asset, parsedLimit);
      res.json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  },

  async getDocument(req, res, next) {
    try {
      const { id } = req.params;
      const doc = await knowledgeService.getDocumentById(id);
      res.json({ success: true, data: doc });
    } catch (error) {
      next(error);
    }
  },
};
