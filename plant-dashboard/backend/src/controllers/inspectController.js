import { inspectService } from "../services/inspectService.js";

export const inspectController = {
  listSets(req, res) {
    res.json({ success: true, data: inspectService.listSets() });
  },

  getSet(req, res) {
    const set = inspectService.getSet(req.params.pid);
    if (!set) return res.status(404).json({ success: false, error: `P&ID set ${req.params.pid} not found.` });
    res.json({ success: true, data: set });
  },

  getOpl(req, res) {
    const opl = inspectService.getOpl(req.params.code);
    if (!opl) return res.status(404).json({ success: false, error: `OPL ${req.params.code} not found.` });
    res.json({ success: true, data: opl });
  },
};
