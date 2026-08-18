const { Server } = require('socket.io');

let io;

module.exports = {
  init: (httpServer) => {
    io = new Server(httpServer, {
      pingInterval: 10000, // Send ping every 10 seconds to keep connection alive
      pingTimeout: 5000,   // Wait 5 seconds before closing connection if no pong
      cors: {
        origin: '*', // Adjust for production
        methods: ['GET', 'POST']
      }
    });
    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  }
};
