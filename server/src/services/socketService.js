import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'socket-service' }
});

// Store active connections
const activeConnections = new Map();

export function setupSocketHandlers(io) {
  logger.info('Setting up Socket.IO handlers');

  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    
    // Store connection info
    activeConnections.set(socket.id, {
      id: socket.id,
      connectedAt: new Date(),
      userAgent: socket.handshake.headers['user-agent'],
      ip: socket.handshake.address
    });

    // Handle client events
    setupClientHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
      activeConnections.delete(socket.id);
    });

    // Send welcome message
    socket.emit('connection:established', {
      clientId: socket.id,
      serverTime: new Date().toISOString(),
      availableEvents: [
        'document:processing:start',
        'document:processing:complete', 
        'document:processing:error',
        'analysis:start',
        'analysis:complete',
        'analysis:error',
        'voice:processing:start',
        'voice:processing:complete',
        'voice:processing:error'
      ]
    });
  });

  // Periodic cleanup and stats
  setInterval(() => {
    const stats = getConnectionStats();
    logger.info('Socket.IO stats:', stats);
    
    // Broadcast system stats to all clients
    io.emit('system:stats', {
      connections: stats.totalConnections,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  }, 60000); // Every minute
}

function setupClientHandlers(socket) {
  // Handle subscription to document processing updates
  socket.on('subscribe:document', (documentId) => {
    socket.join(`document:${documentId}`);
    logger.info(`Client ${socket.id} subscribed to document: ${documentId}`);
    
    socket.emit('subscription:confirmed', {
      type: 'document',
      id: documentId
    });
  });

  // Handle unsubscription
  socket.on('unsubscribe:document', (documentId) => {
    socket.leave(`document:${documentId}`);
    logger.info(`Client ${socket.id} unsubscribed from document: ${documentId}`);
  });

  // Handle subscription to analysis updates
  socket.on('subscribe:analysis', (documentId) => {
    socket.join(`analysis:${documentId}`);
    logger.info(`Client ${socket.id} subscribed to analysis: ${documentId}`);
    
    socket.emit('subscription:confirmed', {
      type: 'analysis',
      id: documentId
    });
  });

  // Handle subscription to voice processing updates
  socket.on('subscribe:voice', (sessionId) => {
    socket.join(`voice:${sessionId}`);
    logger.info(`Client ${socket.id} subscribed to voice session: ${sessionId}`);
    
    socket.emit('subscription:confirmed', {
      type: 'voice',
      id: sessionId
    });
  });

  // Handle ping/pong for connection health
  socket.on('ping', () => {
    socket.emit('pong', {
      timestamp: new Date().toISOString(),
      clientId: socket.id
    });
  });

  // Handle client status requests
  socket.on('client:status', () => {
    const connection = activeConnections.get(socket.id);
    socket.emit('client:status:response', {
      id: socket.id,
      connectedAt: connection?.connectedAt,
      rooms: Array.from(socket.rooms),
      connectedFor: Date.now() - (connection?.connectedAt || 0)
    });
  });

  // Handle error events
  socket.on('error', (error) => {
    logger.error(`Socket error for client ${socket.id}:`, error);
  });
}

// Utility functions for broadcasting events
export function broadcastDocumentEvent(io, documentId, eventType, data) {
  const room = `document:${documentId}`;
  const event = `document:${eventType}`;
  
  io.to(room).emit(event, {
    documentId,
    timestamp: new Date().toISOString(),
    ...data
  });
  
  logger.info(`Broadcasted ${event} to room ${room}`);
}

export function broadcastAnalysisEvent(io, documentId, eventType, data) {
  const room = `analysis:${documentId}`;
  const event = `analysis:${eventType}`;
  
  io.to(room).emit(event, {
    documentId,
    timestamp: new Date().toISOString(),
    ...data
  });
  
  logger.info(`Broadcasted ${event} to room ${room}`);
}

export function broadcastVoiceEvent(io, sessionId, eventType, data) {
  const room = `voice:${sessionId}`;
  const event = `voice:${eventType}`;
  
  io.to(room).emit(event, {
    sessionId,
    timestamp: new Date().toISOString(),
    ...data
  });
  
  logger.info(`Broadcasted ${event} to room ${room}`);
}

export function broadcastSystemEvent(io, eventType, data) {
  io.emit(`system:${eventType}`, {
    timestamp: new Date().toISOString(),
    ...data
  });
  
  logger.info(`Broadcasted system:${eventType} to all clients`);
}

// Get connection statistics
export function getConnectionStats() {
  return {
    totalConnections: activeConnections.size,
    connections: Array.from(activeConnections.values()).map(conn => ({
      id: conn.id,
      connectedAt: conn.connectedAt,
      duration: Date.now() - conn.connectedAt,
      userAgent: conn.userAgent
    })),
    uptime: process.uptime()
  };
}

// Cleanup function
export function cleanup() {
  activeConnections.clear();
  logger.info('Socket service cleanup completed');
}
