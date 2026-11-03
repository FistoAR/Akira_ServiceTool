const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/employees', authController.getEmployees);
router.put('/employees/:id', authController.updateEmployee);

module.exports = router;
