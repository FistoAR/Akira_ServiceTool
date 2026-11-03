const mongoose = require('mongoose');

const warrantyRuleSchema = new mongoose.Schema({
  partyType: { type: String, required: true, unique: true },
  weekStartIdx: { type: Number, default: 3 },
  weekLength: { type: Number, default: 2 },
  yearStartIdx: { type: Number, default: 5 },
  yearLength: { type: Number, default: 2 },
  warrantyPeriodYears: { type: Number, default: 1 },
  warrantySLADays: { type: Number, default: 7 },
  postWarrantySLADays: { type: Number, default: 10 },
}, { timestamps: true });

module.exports = mongoose.model('WarrantyRule', warrantyRuleSchema);
