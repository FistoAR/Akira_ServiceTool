const express = require('express');
const router  = express.Router();
const serviceCallController = require('../controllers/serviceCall.controller');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../public/uploads/serviceCall-ProductdetailsImg');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const random8 = Math.floor(10000000 + Math.random() * 90000000).toString();
    const ext = path.extname(file.originalname);
    cb(null, `${random8}${ext}`);
  }
});

const uploadMedia = multer({ storage });

router.post('/upload-media', uploadMedia.array('mediaFiles', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No files uploaded' });
    const fileData = req.files.map(f => ({
      name: f.originalname,
      size: (f.size / 1024 / 1024).toFixed(2) + "MB",
      type: f.mimetype,
      url: `/api/uploads/serviceCall-ProductdetailsImg/${f.filename}`
    }));
    res.json({ files: fileData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/upload-media/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../../public/uploads/serviceCall-ProductdetailsImg', filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res.json({ message: 'File deleted successfully' });
    }
    res.status(404).json({ message: 'File not found' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/sla-employees',     serviceCallController.getSLAEmployees);
router.get('/pending',           serviceCallController.getPendingAssignments);
router.get('/active',            serviceCallController.getActiveCalls);

// Support & Field Visit Routes
router.get('/customer-history/:customerIdentifier', serviceCallController.getCustomerHistory);
router.post('/support',          serviceCallController.createSupportRequest);
router.get('/support/:userId',   serviceCallController.getSupportRequests);
router.patch('/support/:id/resolve', serviceCallController.resolveSupportRequest);

router.post('/field-visit',      serviceCallController.createFieldVisit);
router.get('/field-visit/:userId', serviceCallController.getFieldVisits);
router.patch('/field-visit/:id/close', serviceCallController.closeFieldVisit);
router.patch('/field-visit/:id/reschedule', serviceCallController.rescheduleFieldVisit);
router.patch('/field-visit/:id/return', serviceCallController.returnFieldVisit);

router.patch('/:id/product/:pIdx/close', serviceCallController.closeProduct);
router.patch('/:id/product/:pIdx/attend', serviceCallController.attendProduct);

router.get('/',                  serviceCallController.getAllCalls);
router.post('/',                 serviceCallController.createCall);
router.post('/assign',           serviceCallController.assignServiceCall);
router.patch('/:id',             serviceCallController.updateCall);
router.post('/:id/auto-escalate', serviceCallController.autoEscalate);
router.delete('/:id',            serviceCallController.deleteCall);

module.exports = router;
