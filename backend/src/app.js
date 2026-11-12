
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const logger = require('./utils/logger');
const path = require('path');

const authRoutes = require('./modules/auth/auth.routes');
const masterRoutes = require('./modules/master/master.routes');
const serviceCallRoutes = require('./modules/serviceCall/serviceCall.routes');
const notificationRoutes = require('./modules/notification/notification.routes');
const troubleshootRoutes = require('./modules/troubleshoot/troubleshoot.routes');
const serviceMaterialRoutes = require('./modules/serviceMaterial/serviceMaterial.routes');
const productionMaterialRoutes = require('./modules/production/productionMaterial.routes');

const app = express();

// Middlewares
app.use(compression({
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ]
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(logger);

// Static upload folders
app.use('/api/uploads', express.static(
  path.join(__dirname, '../public/uploads')
));

app.use('/uploads', express.static(
  path.join(__dirname, '../public/uploads')
));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/service-calls', serviceCallRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/service-material', serviceMaterialRoutes);
app.use('/api/production-material', productionMaterialRoutes);
app.use('/api', troubleshootRoutes);

// React production build
const frontendPath = path.join(
  __dirname,
  '../../frontend/dist'
);

app.use(express.static(frontendPath));

// React SPA fallback - Express 5 compatible
app.get('/{*splat}', (req, res, next) => {
  // Don't return React HTML for unknown API requests
  if (req.path.startsWith('/api/')) {
    return next();
  }

  res.sendFile(
    path.join(frontendPath, 'index.html'),
    (err) => {
      if (err) next(err);
    }
  );
});

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

module.exports = app;
