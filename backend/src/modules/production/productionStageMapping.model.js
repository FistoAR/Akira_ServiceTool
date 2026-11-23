const mongoose = require('mongoose');

const productionStageMappingSchema = new mongoose.Schema({
  stage: { 
    type: String, 
    required: true,
    trim: true
  },
  userId: { 
    type: String, 
    required: true,
    unique: true, // 1 person will be assigned to 1 stage only
    trim: true
  },
  userName: { 
    type: String, 
    required: true,
    trim: true
  },
  userEmail: {
    type: String,
    trim: true
  },
  assignedBy: {
    type: String,
    trim: true
  },
  assignedByName: {
    type: String,
    trim: true
  }
}, { timestamps: true });

productionStageMappingSchema.index({ stage: 1 });
productionStageMappingSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('ProductionStageMapping', productionStageMappingSchema);
