import { Router } from "express";
import { inspectController } from "../controllers/inspectController.js";

const router = Router();
router.get("/sets", inspectController.listSets);
router.get("/sets/:pid", inspectController.getSet);
router.get("/opl/:code", inspectController.getOpl);

export default router;
