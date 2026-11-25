const mongoose = require('mongoose');

const DEFAULT_ZONE_ROLES = [
  "Manufacturing",
  "Assembly 1",
  "Assembly 2",
  "Machine Testing",
  "Manual Testing",
  "Quality Inspection"
];

const zoneSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  roles: {
    type: [String],
    default: DEFAULT_ZONE_ROLES
  },
  defaultReceiverRole: {
    type: String,
    default: "Manual Testing"
  },
  defaultReceiverUserId: {
    type: String,
    trim: true,
    default: ""
  },
  defaultReceiverUserName: {
    type: String,
    trim: true,
    default: ""
  }
}, { timestamps: true });

module.exports = mongoose.model('Zone', zoneSchema);
