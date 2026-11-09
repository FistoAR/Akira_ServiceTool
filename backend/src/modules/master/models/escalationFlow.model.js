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
  reverseEscalation: {
    enabled: { type: Boolean, default: true },
    durationHours: { type: Number, default: 2 },
    durationMins: { type: Number, default: 0 },
    onTimeout: { type: String, enum: ['same_person', 'next_in_chain', 'critical'], default: 'same_person' },
  },
}, { timestamps: true });

module.exports = mongoose.model('EscalationFlow', escalationFlowSchema);
