const mongoose = require('mongoose');

const unansweredSchema = mongoose.Schema({
  query: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true,
});

const Unanswered = mongoose.model('Unanswered', unansweredSchema);

module.exports = Unanswered;
