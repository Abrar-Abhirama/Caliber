import { Router } from "express";
import chatRoutes from "./chatRoutes.js";
import knowledgeRoutes from "./knowledgeRoutes.js";

const router = Router();

router.use("/chat", chatRoutes);
router.use("/knowledge", knowledgeRoutes);

export default router;
