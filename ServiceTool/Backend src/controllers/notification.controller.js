const Notification = require('../models/notification.model');
const socketConfig = require('../config/socket');

exports.getNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndDelete(id);
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Helper function to create and emit notification
exports.sendNotification = async (data) => {
  try {
    const notification = new Notification(data);
    await notification.save();

    const io = socketConfig.getIO();
    // Emit to specific user room
    io.to(data.recipient).emit('notification:new', notification);
    
    // If it's a critical notification, also alert admins
    if (data.priority === 'Critical') {
        io.emit('notification:critical', notification);
    }

    return notification;
  } catch (err) {
    console.error('Error sending notification:', err);
  }
};

exports.markAsUnread = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndUpdate(id, { isRead: false }, { new: true });
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const User = require('../models/user.model');

exports.getSettings = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.notificationSettings || { onlyUnread: false, sortOrder: 'Desc' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { userId } = req.params;
    const { onlyUnread, sortOrder } = req.body;
    const user = await User.findOneAndUpdate(
      { userId },
      { $set: { notificationSettings: { onlyUnread, sortOrder } } },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.notificationSettings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.clearAllNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    await Notification.deleteMany({ recipient: userId });
    res.json({ message: 'All notifications cleared successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
