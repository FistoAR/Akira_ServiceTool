const http      = require('http');
const dotenv    = require('dotenv');
const app       = require('./app');
const connectDB = require('./config/db');
const socketConfig = require('./config/socket');

// Load env vars
dotenv.config();

const PORT   = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.io
const io = socketConfig.init(server);
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join a private room for the user to receive targeted notifications
  socket.on('join-room', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their notification room.`);
  });

  socket.on('service-material:change', () => {
    socket.broadcast.emit('service-material:updated');
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Connect DB then start the escalation worker
connectDB().then(async () => {
  try {
    const mongoose = require('mongoose');
    await mongoose.connection.collection('customers').dropIndex('itemCode_1');
    console.log('Successfully dropped old itemCode index');
  } catch (err) {
    // Ignore if index doesn't exist
  }

  const { startEscalationWorker } = require('./services/escalationWorker.service');
  startEscalationWorker();
});

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
