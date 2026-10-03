import { Router } from "express";
import { knowledgeController } from "../controllers/knowledgeController.js";

const router = Router();
router.get("/search", knowledgeController.search);
router.get("/doc/:id", knowledgeController.getDocument);

export default router;
