import { Router } from "express";
import { chatController } from "../controllers/chatController.js";

const router = Router();
router.post("/ask", chatController.ask);
router.get("/models", chatController.listModels);

export default router;
