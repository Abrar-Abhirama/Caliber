import { Router } from "express";
import { reliabilityService } from "../services/reliabilityService.js";

const router = Router();
router.get("/overview", (req, res, next) => {
  try {
    const { pid, period, crit, type } = req.query;
    res.json({
      success: true,
      data: reliabilityService.overview({
        pid: pid || null,
        period: /^(\d+m|\d{4})$/.test(period || "") ? period : null,
        crit: ["high", "other"].includes(crit) ? crit : null,
        type: ["Preventive", "Corrective", "Predictive", "Inspection", "Calibration", "Overhaul"].includes(type) ? type : null,
      }),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
