const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  testedBy: String,
  fqaBy: String,
  timeInHours: String,
  materialCost: String,
  manpowerCost: Number,
  pvCv: String,
  pv: String,
  cv: String,
  faultParts: String,
  designators: String,
  image: String,
  disposition: String,
  fourMCategory: String,
  errorCode: String,
  problemDescription: String,
  rootCause: String,
  partsReplacement: String,
  correctiveAction: String,
  completedDate: Date,
  status: String,
  lastUpdated: Date,
  history: [mongoose.Schema.Types.Mixed]
});

const productSchema = new mongoose.Schema({
  _pid: String,
  productCode: String,
  productDescription: String,
  productSegment: String,
  serialNumber: String,
  boardType: String,
  qty: { type: Number, default: 1 },
  type: { type: String, enum: ['W', 'PW'], default: 'W' },
  expectedDeliveryDate: Date,
  status: { type: String, default: 'Open' },
  assignedTo: String,
  assignedToName: String,
  assignedDepartment: String,
  escalationLevel: { type: Number, default: 0 },
  escalationHistory: [mongoose.Schema.Types.Mixed],
  report: reportSchema,
  finalStatus: { type: String, default: 'Pending' },
  finalStatusRemarks: String,
  finalStatusDate: Date,
  finalStatusHistory: [mongoose.Schema.Types.Mixed],
  _closureEdits: [mongoose.Schema.Types.Mixed]
});

const serviceMaterialSchema = new mongoose.Schema({
  refNo: { type: String, required: true, unique: true },
  refNoCustomer: String,
  refNoInternal: String,
  date: { type: Date, default: Date.now },
  dateTime: String,
  timestamp: Date,
  customerName: String,
  customerCode: String,
  site: String,
  category: String,
  assignedTo: String,
  assignedToName: String,
  assignedDepartment: String,
  finalStatus: { type: String, default: 'Pending' },
  finalStatusDate: Date,
  finalStatusRemarks: String,
  unit: String,
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

// Performance indexes for faster querying and sorting
serviceMaterialSchema.index({ createdAt: -1 });
serviceMaterialSchema.index({ date: -1 });
serviceMaterialSchema.index({ refNo: 1 });
serviceMaterialSchema.index({ customerCode: 1 });
serviceMaterialSchema.index({ customerName: 1 });
serviceMaterialSchema.index({ finalStatus: 1 });
serviceMaterialSchema.index({ 'products.serialNumber': 1 });
serviceMaterialSchema.index({ 'products.assignedTo': 1 });
serviceMaterialSchema.index({ 'products.status': 1 });

module.exports = mongoose.model('ServiceMaterial', serviceMaterialSchema);
