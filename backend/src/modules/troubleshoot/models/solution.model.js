const mongoose = require('mongoose');

const solutionSchema = mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  keywords: [{
    type: String,
  }],
  responseText: {
    type: String,
    required: true,
  },
  images: [{
    path: String,
    url: String,
    originalName: String,
    convertedName: String,
    type: String,
    timestamp: Date
  }],
  videos: [{
    path: String,
    url: String,
    originalName: String,
    convertedName: String,
    type: String,
    timestamp: Date
  }]
}, {
  timestamps: true,
});

const Solution = mongoose.model('Solution', solutionSchema);

module.exports = Solution;
