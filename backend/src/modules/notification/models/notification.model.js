const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: String, // userId
    required: true,
    index: true
  },
  sender: {
    type: String, // userId or "System"
    default: "System"
  },
  type: {
    type: String,
    enum: ['Assignment', 'Escalation', 'Critical', 'Service Material', 'Production NC', 'Activity'],
    default: 'Activity'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed, // For storing callNumber, etc.
  },
  isRead: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
