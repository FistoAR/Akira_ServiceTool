const mongoose = require('mongoose');

const boardTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
}, { timestamps: true });

module.exports = mongoose.model('BoardType', boardTypeSchema);
