const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  itemCode: String,
  itemDescription: String,
  serialNumber: String,
  productModel: String,
  productSegment: String,
  errorCode: String,
  dateOfSupply: String,
  warrantyPeriodDays: String,
  warrantyExpiryDate: String,
  warrantyStatus: String,
  _assigned: { type: Boolean, default: false },
  _assignedAt: Date,
  _assignedEngineerId: String,
  _assignedEngineerName: String,
  _escalationLevel: { type: Number, default: 0 },
  _currentDepartment: String,
  _assignedSegment: String,
  _resolved: { type: Boolean, default: false },
  _supportRequested: { type: Boolean, default: false },
  _supportRequestedAt: Date,
  _supportPersonId: String,
  callDescription: String,
  mediaReceived: String,
  mediaFiles: [mongoose.Schema.Types.Mixed],
  _escalationHistory: [mongoose.Schema.Types.Mixed],
  // SLA escalation tracking
  _deadline: Date,
  _isCritical: { type: Boolean, default: false },
  _alerted50: { type: Boolean, default: false },
  _levelPointer: { type: Number, default: 0 },      // which step in SLA flow
  _escalationPointer: { type: Number, default: 0 }, // which engineer within that step
  _productClosure: mongoose.Schema.Types.Mixed,
  _attended: { type: Boolean, default: false },
  _attendedAt: Date,
  _history: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    updatedBy: String,
    updatedByName: String,
    remarks: String,
    metadata: mongoose.Schema.Types.Mixed
  }],
  _fieldVisit: {
    isAssigned: { type: Boolean, default: false },
    assignedTo: String,
    assignedToName: String,
    assignedBy: String,
    assignedByName: String,
    visitDate: Date,
    diagnosisSummary: String,
    status: { type: String, default: 'Open' },
    closedAt: Date
  }
});

const serviceCallSchema = new mongoose.Schema({
  callNumber: { type: String, required: true, unique: true },
  customerName: String,
  partyCode: String,
  contactPerson: String,
  contactNumber: String,
  location: String,
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  status: { type: String, default: 'Registered', enum: ['Registered', 'Assigned', 'Open', 'Pending', 'Resolved', 'Critical', 'Escalated'] },
  dateTime: { type: Date, default: Date.now },
  timestamp: { type: Date, default: Date.now },
  mode: String,
  emailId: String,
  locationType: { type: String, default: 'IPR' },
  segment: String,
  customerType: String,
  products: [productSchema],
  
  // SLA / Escalation Fields
  currentEngineerId: String,
  currentEngineerName: String,
  currentDepartment: String,
  escalationLevel: { type: Number, default: 0 },
  deadline: Date,
  escalationHistory: [mongoose.Schema.Types.Mixed]
}, { timestamps: true });

serviceCallSchema.index({ createdAt: -1 });
serviceCallSchema.index({ status: 1 });
serviceCallSchema.index({ priority: 1 });
serviceCallSchema.index({ currentEngineerId: 1 });

// Indexes for nested product arrays to speed up Action Logs queries
serviceCallSchema.index({ 'products._supportPersonId': 1 });
serviceCallSchema.index({ 'products._history.updatedBy': 1 });
serviceCallSchema.index({ 'products._fieldVisit.assignedTo': 1 });
serviceCallSchema.index({ 'products._fieldVisit.assignedBy': 1 });

module.exports = mongoose.model('ServiceCall', serviceCallSchema);
