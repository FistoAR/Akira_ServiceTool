const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  startDate: Date,
  workDoneBy: String,
  workDoneByName: String,
  fourMCategory: String,
  rootCause: String,
  materialChangeDetails: String,
  delayTime: String,
  materialCost: String,
  correctiveAction: String,
  correctiveActionDetails: String,
  completedDate: Date,
  validationStatus: String,
  verificationStatus: String,
  closingDate: Date,
  closedDate: Date,
  assembledBy: String,
  assembledByName: String,
  testedBy: String,
  testedByName: String,
  fiBy: String,
  fiByName: String,
  verifiedBy: String,
  verifiedByName: String,
  verifiedDate: Date,
  cae: String,
  partsReplacement: String,
  status: String,
  lastUpdated: Date,
  history: [mongoose.Schema.Types.Mixed]
});

const productSchema = new mongoose.Schema({
  _pid: String,
  productCode: String,
  productDescription: String,
  category: String,
  productType: String,
  productSegment: String,
  boardType: String,
  problemType: String,
  ncType: String,
  problem: String,
  repeatability: String,
  delayTime: String,
  designators: String,
  boardImage: String,
  stage: String,
  department: String,
  zone: String,
  inspectedBy: String,
  inspectedByName: String,
  qty: { type: Number, default: 1 },
  identification: String, // Serial / Batch
  serialNumber: String,
  disposition: String,
  raisedTo: String,
  raisedToName: String,
  initialRootCause: String, // Renamed from rootCause to avoid conflict with report rootCause
  status: { type: String, default: 'Open' },
  assignedTo: String,
  assignedToName: String,
  report: reportSchema,
  finalStatus: { type: String, default: 'Pending' },
  finalStatusRemarks: String,
  finalStatusDate: Date,
  finalStatusHistory: [mongoose.Schema.Types.Mixed]
});

const productionMaterialSchema = new mongoose.Schema({
  refNoInternal: { type: String, required: true, unique: true },
  date: { type: Date, default: Date.now },
  jobOrderNo: String,
  customerName: String,
  customerCode: String,
  category: String,
  department: String,
  creatorUserId: String,
  creatorName: String,
  products: [productSchema],
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

module.exports = mongoose.model('ProductionMaterial', productionMaterialSchema);
