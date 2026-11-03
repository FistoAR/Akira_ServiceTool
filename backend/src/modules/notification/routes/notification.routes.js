const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');

router.get('/:userId', notificationController.getNotifications);
router.patch('/:id/read', notificationController.markAsRead);
router.patch('/:id/unread', notificationController.markAsUnread);
router.patch('/:userId/read-all', notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);

router.get('/settings/:userId', notificationController.getSettings);
router.patch('/settings/:userId', notificationController.updateSettings);

router.delete('/:userId/clear-all', notificationController.clearAllNotifications);

module.exports = router;
