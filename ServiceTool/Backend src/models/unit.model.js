const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
}, { timestamps: true });

module.exports = mongoose.model('Unit', unitSchema);
