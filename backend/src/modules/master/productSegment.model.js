const mongoose = require('mongoose');

const productSegmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
}, { timestamps: true });

module.exports = mongoose.model('ProductSegment', productSegmentSchema);
