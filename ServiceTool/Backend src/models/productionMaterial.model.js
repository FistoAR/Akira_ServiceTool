const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  startDate: Date,
  fourMCategory: String,
  rootCause: String,
  correctiveAction: String,
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
  boardType: String,
  qty: { type: Number, default: 1 },
  identification: String, // Serial / Batch
  serialNumber: String,
  stage: String,
  problemType: String,
  ncType: String,
  problem: String,
  initialRootCause: String, // Renamed from rootCause to avoid conflict with report rootCause
  partsDetails: String,
  correction: String,
  disposition: String,
  raisedTo: String,
  delayTime: String,
  inspectedBy: String,
  inspectedByName: String,
  designators: String,
  boardImage: String,
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
  creatorUserId: String,
  creatorName: String,
  products: [productSchema]
}, { timestamps: true });

module.exports = mongoose.model('ProductionMaterial', productionMaterialSchema);
