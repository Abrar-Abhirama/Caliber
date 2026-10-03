import { logger } from "../utils/logger.js";

export function errorHandler(err, req, res, next) {
  logger.error("Unhandled error:", err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: {
      message: err.message || "Internal Server Error",
      ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
    },
  });
}
