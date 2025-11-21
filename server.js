const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/edrive';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Import File model for cleanup
const File = require('./models/File'); // Fix: Import File model

// Routes
app.use('/api/files', require('./routes/files'));

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Edrive Eflashdrive server running on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}`);
});

// Cleanup expired files periodically
setInterval(async () => {
  try {
    const expiredFiles = await File.find({ 
      expiresAt: { $lte: new Date() }
    });
    
    for (const file of expiredFiles) {
      // Delete file from filesystem
      const fs = require('fs');
      if (fs.existsSync(file.filePath)) {
        fs.unlinkSync(file.filePath);
      }
      // Delete record from database
      await File.findByIdAndDelete(file._id);
    }
    
    if (expiredFiles.length > 0) {
      console.log(`Cleaned up ${expiredFiles.length} expired files`);
    }
  } catch (error) {
    console.error('Error cleaning up expired files:', error);
  }
}, 60000); // Run every minute