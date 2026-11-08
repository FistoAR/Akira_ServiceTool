const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  partyType: { type: String },
  productSegment: { type: String },
  partyCode: { type: String, required: true },
  partyDescription: { type: String, required: true },
  itemCode: { type: String, required: true },
  itemDescription: { type: String },
  warrantyPeriodDays: { type: Number },
  state: { type: String },
  districtCity: { type: String },
}, { timestamps: true });

customerSchema.index({ partyCode: 1, itemCode: 1 }, { unique: true });
customerSchema.index({ partyCode: 1 });
customerSchema.index({ partyDescription: 1 });
customerSchema.index({ itemCode: 1 });
customerSchema.index({ productSegment: 1 });

module.exports = mongoose.model('Customer', customerSchema);
