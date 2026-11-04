const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/employees', authController.getEmployees);
router.get('/employee-pictures', authController.getEmployeePictures);
router.put('/employees/:id', authController.updateEmployee);

module.exports = router;
