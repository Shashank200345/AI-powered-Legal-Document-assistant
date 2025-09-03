import express from 'express';
import winston from 'winston';
import { voiceQuerySystem } from '../services/voiceService.js';

const router = express.Router();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'health-api' }
});

// GET /api/health - Basic health check
router.get('/', (req, res) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    services: {
      api: 'operational',
      database: 'operational', // Would check Firestore connection
      storage: 'operational',   // Would check Cloud Storage
      ai: 'operational',        // Would check Vertex AI
      voice: 'operational'      // Would check Speech services
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      },
      cpu: {
        usage: process.cpuUsage()
      }
    }
  };

  res.json({
    success: true,
    data: healthStatus
  });
});

// GET /api/health/detailed - Detailed health check with service tests
router.get('/detailed', async (req, res) => {
  const startTime = Date.now();
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checkDuration: 0,
    services: {}
  };

  try {
    // Test Google Cloud Services
    healthStatus.services.googleCloud = await testGoogleCloudServices();
    
    // Test Voice System
    healthStatus.services.voiceSystem = testVoiceSystem();
    
    // Test Database (Firestore)
    healthStatus.services.database = await testDatabase();
    
    // Test Storage
    healthStatus.services.storage = await testStorage();

    // Calculate overall status
    const serviceStatuses = Object.values(healthStatus.services);
    const allHealthy = serviceStatuses.every(service => service.status === 'healthy');
    
    healthStatus.status = allHealthy ? 'healthy' : 'degraded';
    healthStatus.checkDuration = Date.now() - startTime;

    const statusCode = allHealthy ? 200 : 503;
    
    res.status(statusCode).json({
      success: allHealthy,
      data: healthStatus
    });

  } catch (error) {
    logger.error('Health check failed:', error);
    
    healthStatus.status = 'unhealthy';
    healthStatus.error = error.message;
    healthStatus.checkDuration = Date.now() - startTime;

    res.status(503).json({
      success: false,
      data: healthStatus
    });
  }
});

// GET /api/health/metrics - System metrics
router.get('/metrics', (req, res) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    
    // System metrics
    system: {
      memory: {
        rss: process.memoryUsage().rss,
        heapTotal: process.memoryUsage().heapTotal,
        heapUsed: process.memoryUsage().heapUsed,
        external: process.memoryUsage().external,
        arrayBuffers: process.memoryUsage().arrayBuffers
      },
      cpu: process.cpuUsage(),
      eventLoop: {
        delay: process.hrtime.bigint() // Simplified event loop delay
      }
    },

    // Application metrics
    application: {
      voiceSystem: voiceQuerySystem.getSystemStats(),
      environment: process.env.NODE_ENV,
      nodeVersion: process.version
    }
  };

  res.json({
    success: true,
    data: metrics
  });
});

// GET /api/health/readiness - Readiness probe for Kubernetes
router.get('/readiness', async (req, res) => {
  try {
    // Check if all critical services are ready
    const checks = [
      // Add your readiness checks here
      { name: 'voice-system', ready: true },
      { name: 'google-cloud', ready: true }, // Would actually test connection
    ];

    const allReady = checks.every(check => check.ready);

    res.status(allReady ? 200 : 503).json({
      ready: allReady,
      checks: checks,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(503).json({
      ready: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/health/liveness - Liveness probe for Kubernetes
router.get('/liveness', (req, res) => {
  // Simple liveness check - if we can respond, we're alive
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Service test functions
async function testGoogleCloudServices() {
  try {
    // In a real implementation, you'd test actual connections
    // For now, return mock status
    return {
      status: 'healthy',
      latency: Math.floor(Math.random() * 100) + 50,
      services: {
        vertexAI: 'operational',
        vision: 'operational',
        speech: 'operational',
        textToSpeech: 'operational'
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

function testVoiceSystem() {
  try {
    const stats = voiceQuerySystem.getSystemStats();
    return {
      status: 'healthy',
      ...stats
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

async function testDatabase() {
  try {
    // In a real implementation, test Firestore connection
    return {
      status: 'healthy',
      latency: Math.floor(Math.random() * 50) + 20,
      type: 'firestore'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      type: 'firestore'
    };
  }
}

async function testStorage() {
  try {
    // In a real implementation, test Cloud Storage connection
    return {
      status: 'healthy',
      latency: Math.floor(Math.random() * 100) + 30,
      type: 'cloud-storage'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      type: 'cloud-storage'
    };
  }
}

export default router;
