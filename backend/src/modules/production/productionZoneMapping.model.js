const mongoose = require('mongoose');

const productionZoneMappingSchema = new mongoose.Schema({
  zone: { 
    type: String, 
    required: true, 
    trim: true 
  },
  roleInZone: {
    type: String,
    trim: true,
    default: "Manual Testing"
  },
  isDefaultReceiver: {
    type: Boolean,
    default: false
  },
  userId: { 
    type: String, 
    required: true, 
    unique: true, // 1 person assigned to 1 zone
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
  department: {
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

productionZoneMappingSchema.index({ zone: 1 });
productionZoneMappingSchema.index({ userId: 1 }, { unique: true });
productionZoneMappingSchema.index({ zone: 1, roleInZone: 1 });

module.exports = mongoose.model('ProductionZoneMapping', productionZoneMappingSchema);
