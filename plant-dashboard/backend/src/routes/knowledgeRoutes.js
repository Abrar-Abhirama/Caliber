import { Router } from "express";
import multer from "multer";
import { knowledgeController } from "../controllers/knowledgeController.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max limit
});

const router = Router();
router.get("/search", knowledgeController.search);
router.get("/doc/:id", knowledgeController.getDocument);
router.post("/upload-pdf", upload.single("file"), knowledgeController.uploadPdf);

export default router;

