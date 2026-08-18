const mongoose = require('mongoose');

const escalationStepSchema = new mongoose.Schema({
  dept: { type: String, required: true },
  engineerIds: [{ type: String }],
  durationHours: { type: Number, default: 0 },
  durationMins: { type: Number, default: 0 },
});

const escalationFlowSchema = new mongoose.Schema({
  type: { type: String, required: true, unique: true }, // e.g., "Service Call", "Service Material"
  steps: [escalationStepSchema],
}, { timestamps: true });

module.exports = mongoose.model('EscalationFlow', escalationFlowSchema);
