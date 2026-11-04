const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { protect } = require('../../middlewares/auth.middleware');

// Optional protect middleware: populates req.user if token is present, allows passing through
const optionalProtect = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return protect(req, res, next);
  }
  next();
};

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/employees', authController.getEmployees);
router.get('/employee-pictures', authController.getEmployeePictures);
router.get('/employee-picture/:id', authController.getEmployeePictureById);
router.put('/employees/:id', optionalProtect, authController.updateEmployee);

module.exports = router;
