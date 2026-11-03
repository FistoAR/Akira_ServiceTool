const mongoose = require('mongoose');

const masterSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // e.g. "column_visibility"
  value: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

module.exports = mongoose.model('MasterSettings', masterSettingsSchema);
