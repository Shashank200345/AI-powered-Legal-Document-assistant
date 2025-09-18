import express from "express";
import winston from "winston";
import databaseService from "../services/databaseService.js";
import speechService from "../services/speechService.js";

const router = express.Router();
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "health-api" },
});

// GET /api/health - Basic health check
router.get("/", (req, res) => {
  const healthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
    services: {
      api: "operational",
      database: "operational",
      storage: "operational",
      chat: "operational",
      voice: "operational",
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      },
      cpu: {
        usage: process.cpuUsage(),
      },
    },
  };

  res.json({
    success: true,
    data: healthStatus,
  });
});

// GET /api/health/detailed - Detailed health check with service tests
router.get("/detailed", async (req, res) => {
  try {
    const dbHealth = await databaseService.healthCheck();
    const voiceHealth = await speechService.healthCheck();

    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      version: "1.0.0",
      services: {
        database: {
          status: dbHealth.status,
          message: dbHealth.message,
          responseTime: Date.now(),
        },
        voice: {
          status: voiceHealth.status,
          message: voiceHealth.message,
          capabilities: voiceHealth.supportedLanguages || 0,
        },
        chat: {
          status: "operational",
          message: "Chat service is running",
        },
        storage: {
          status: "operational",
          message: "Local file storage is available",
        },
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
        },
        cpu: {
          usage: process.cpuUsage(),
        },
      },
    };

    // Determine overall status
    const allServicesHealthy = Object.values(healthStatus.services).every(
      (service) =>
        service.status === "healthy" || service.status === "operational",
    );

    healthStatus.status = allServicesHealthy ? "healthy" : "degraded";

    res.json({
      success: true,
      data: healthStatus,
    });
  } catch (error) {
    logger.error("Detailed health check failed:", error);
    res.status(500).json({
      success: false,
      error: "Health check failed",
      message: error.message,
    });
  }
});

// GET /api/health/metrics - Runtime metrics
router.get("/metrics", (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      cpu: process.cpuUsage(),
      platform: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
      },
    };

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error("Metrics collection failed:", error);
    res.status(500).json({
      success: false,
      error: "Metrics collection failed",
      message: error.message,
    });
  }
});

// GET /api/health/readiness - Readiness probe
router.get("/readiness", async (req, res) => {
  try {
    const dbHealth = await databaseService.healthCheck();

    if (dbHealth.status === "healthy") {
      res.json({
        success: true,
        status: "ready",
        message: "Service is ready to accept requests",
      });
    } else {
      res.status(503).json({
        success: false,
        status: "not ready",
        message: "Service is not ready",
        reason: dbHealth.message,
      });
    }
  } catch (error) {
    logger.error("Readiness check failed:", error);
    res.status(503).json({
      success: false,
      status: "not ready",
      message: "Readiness check failed",
      reason: error.message,
    });
  }
});

// GET /api/health/liveness - Liveness probe
router.get("/liveness", (req, res) => {
  res.json({
    success: true,
    status: "alive",
    message: "Service is alive",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
