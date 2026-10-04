import { knowledgeService } from "../services/knowledgeService.js";
import { pdfService } from "../services/pdfService.js";

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

  async uploadPdf(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: "No PDF file uploaded." });
      }

      if (req.file.mimetype !== "application/pdf" && !req.file.originalname.toLowerCase().endsWith(".pdf")) {
        return res.status(400).json({ success: false, error: "Only PDF files are supported." });
      }

      const { title, assetTag, docType } = req.body;
      const result = await pdfService.processAndAddPdf({
        buffer: req.file.buffer,
        originalFilename: req.file.originalname,
        customTitle: title,
        customAssetTag: assetTag,
        customDocType: docType,
      });

      res.status(201).json({
        success: true,
        message: "PDF successfully processed and indexed into Knowledge Base.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};

