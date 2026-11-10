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
  _initialEngineerId: String,
  _initialEngineerName: String,
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
  _isReverseEscalated: { type: Boolean, default: false },
  _reverseEscalatedFrom: String,
  _reverseEscalatedFromName: String,
  _reverseEscalationReason: String,
  _reverseEscalationAt: Date,
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
  },
  _closureEdits: [{
    editedAt: { type: Date, default: Date.now },
    editedBy: String,
    editedByName: String,
    role: String,
    reason: String,
    diffs: [{
      field: String,
      originalValue: mongoose.Schema.Types.Mixed,
      editedValue: mongoose.Schema.Types.Mixed
    }]
  }]
});

const serviceCallSchema = new mongoose.Schema({
  callNumber: { type: String, required: true, unique: true },
  customerName: String,
  partyCode: String,
  contactPerson: String,
  contactNumber: String,
  location: String,
  site: String,
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
  initialEngineerId: String,
  initialEngineerName: String,
  currentDepartment: String,
  escalationLevel: { type: Number, default: 0 },
  deadline: Date,
  escalationHistory: [mongoose.Schema.Types.Mixed],
  registeredBy: String,
  noEscalation: { type: Boolean, default: false },

  // Track field-level diffs on call edits
  editHistory: [{
    editedAt: { type: Date, default: Date.now },
    editedBy: String,
    editedByName: String,
    role: String,
    reason: String,
    diffs: [{
      field: String,
      originalValue: mongoose.Schema.Types.Mixed,
      editedValue: mongoose.Schema.Types.Mixed
    }]
  }]
}, { timestamps: true });

serviceCallSchema.index({ createdAt: -1 });
serviceCallSchema.index({ status: 1 });
serviceCallSchema.index({ priority: 1 });
serviceCallSchema.index({ currentEngineerId: 1 });
serviceCallSchema.index({ callNumber: 1 });
serviceCallSchema.index({ partyCode: 1 });
serviceCallSchema.index({ customerName: 1 });
serviceCallSchema.index({ 'products.serialNumber': 1 });
serviceCallSchema.index({ 'products._assignedEngineerId': 1 });

// Indexes for nested product arrays to speed up Action Logs queries
serviceCallSchema.index({ 'products._supportPersonId': 1 });
serviceCallSchema.index({ 'products._history.updatedBy': 1 });
serviceCallSchema.index({ 'products._fieldVisit.assignedTo': 1 });
serviceCallSchema.index({ 'products._fieldVisit.assignedBy': 1 });

module.exports = mongoose.model('ServiceCall', serviceCallSchema);
