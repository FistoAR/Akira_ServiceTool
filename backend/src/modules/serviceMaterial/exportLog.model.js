const mongoose = require('mongoose');

const exportLogSchema = new mongoose.Schema({
  module: { type: String, default: 'ServiceMaterial' },
  reportType: { type: String, default: 'Service Material Reports' },
  exportedBy: { type: String, default: 'Unknown' },
  exportedByName: { type: String, default: 'System User' },
  exportedByRole: { type: String, default: 'User' },
  recordCount: { type: Number, default: 0 },
  filters: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

exportLogSchema.index({ createdAt: -1 });
exportLogSchema.index({ module: 1 });

module.exports = mongoose.model('ExportLog', exportLogSchema);

