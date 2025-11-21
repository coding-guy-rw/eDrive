const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  accessCode: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  isFolder: {
    type: Boolean,
    default: false
  },
  folderFiles: [{
    filename: String,
    originalName: String,
    filePath: String,
    fileSize: Number,
    fileType: String
  }]
});

// Create index for expiration
fileSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Fix: Make sure to export properly
const File = mongoose.model('File', fileSchema);
module.exports = File;