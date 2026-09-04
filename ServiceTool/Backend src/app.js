const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth.routes');
const masterRoutes = require('./routes/master.routes');
const serviceCallRoutes = require('./routes/serviceCall.routes');
const notificationRoutes = require('./routes/notification.routes');
const troubleshootRoutes = require('./routes/troubleshoot.routes');
const serviceMaterialRoutes = require('./routes/serviceMaterial.routes');
const productionMaterialRoutes = require('./routes/productionMaterial.routes');
const path = require('path');

const app = express();

// Middlewares
app.use(cors({
  origin: true, // Reflect the request origin
  credentials: true, // Allow cookies/authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(logger);

// Static folders
app.use('/api/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/service-calls', serviceCallRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/service-material', serviceMaterialRoutes);
app.use('/api/production-material', productionMaterialRoutes);
app.use('/api', troubleshootRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

module.exports = app;
