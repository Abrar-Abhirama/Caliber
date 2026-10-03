import { Router } from "express";
import chatRoutes from "./chatRoutes.js";
import knowledgeRoutes from "./knowledgeRoutes.js";
import inspectRoutes from "./inspectRoutes.js";
import reliabilityRoutes from "./reliabilityRoutes.js";

const router = Router();

router.use("/chat", chatRoutes);
router.use("/knowledge", knowledgeRoutes);
router.use("/inspect", inspectRoutes);
router.use("/reliability", reliabilityRoutes);

export default router;
