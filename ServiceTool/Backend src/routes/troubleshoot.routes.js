const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const troubleshootController = require('../controllers/troubleshoot.controller');

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'public/uploads';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Solutions
router.get('/solutions', troubleshootController.getSolutions);
router.post('/solutions', troubleshootController.saveSolution);
router.put('/solutions/:id', troubleshootController.updateSolution);
router.delete('/solutions/:id', troubleshootController.deleteSolution);

// Chat
router.post('/chat', troubleshootController.chat);

// Unanswered
router.get('/unanswered', troubleshootController.getUnanswered);
router.post('/unanswered', troubleshootController.saveUnanswered);
router.delete('/unanswered/:id', troubleshootController.deleteUnanswered);

// File Upload
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  
  const fileData = {
    originalName: req.file.originalname,
    convertedName: req.file.filename,
    path: `/uploads/${req.file.filename}`,
    url: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`,
    timestamp: new Date(),
    type: req.file.mimetype.startsWith('image/') ? 'image' : 'video'
  };
  
  res.json({ file: fileData });
});

module.exports = router;
