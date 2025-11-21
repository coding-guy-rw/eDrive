const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const File = require('../models/File'); // Fix: Import File model
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Generate random access code
function generateAccessCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Upload single file
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { duration, customCode } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Calculate expiration time
    const durations = {
      '2min': 2 * 60 * 1000,
      '5min': 5 * 60 * 1000,
      '1hr': 60 * 60 * 1000,
      '5hr': 5 * 60 * 60 * 1000,
      '1day': 24 * 60 * 60 * 1000
    };

    const expiresAt = new Date(Date.now() + (durations[duration] || durations['1hr']));
    
    // Generate or use custom access code
    let accessCode;
    if (customCode && customCode.trim() !== '') {
      accessCode = customCode.toUpperCase();
      // Check if code already exists
      const existingFile = await File.findOne({ accessCode });
      if (existingFile) {
        return res.status(400).json({ error: 'Access code already in use' });
      }
    } else {
      accessCode = generateAccessCode();
    }

    // Create file record
    const fileRecord = new File({
      filename: file.filename,
      originalName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      fileType: file.mimetype,
      accessCode,
      expiresAt,
      isFolder: false
    });

    await fileRecord.save();

    res.json({
      success: true,
      message: 'File uploaded successfully!',
      accessCode,
      expiresAt: expiresAt.toLocaleString()
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload multiple files as a "folder"
router.post('/upload-folder', upload.array('files'), async (req, res) => {
  try {
    const { duration, customCode } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Calculate expiration time
    const durations = {
      '2min': 2 * 60 * 1000,
      '5min': 5 * 60 * 1000,
      '1hr': 60 * 60 * 1000,
      '5hr': 5 * 60 * 60 * 1000,
      '1day': 24 * 60 * 60 * 1000
    };

    const expiresAt = new Date(Date.now() + (durations[duration] || durations['1hr']));
    
    // Generate or use custom access code
    let accessCode;
    if (customCode && customCode.trim() !== '') {
      accessCode = customCode.toUpperCase();
      const existingFile = await File.findOne({ accessCode });
      if (existingFile) {
        return res.status(400).json({ error: 'Access code already in use' });
      }
    } else {
      accessCode = generateAccessCode();
    }

    // Create folder record with all files
    const folderRecord = new File({
      filename: `folder-${Date.now()}`,
      originalName: `Folder with ${files.length} files`,
      filePath: 'multiple',
      fileSize: files.reduce((sum, file) => sum + file.size, 0),
      fileType: 'folder',
      accessCode,
      expiresAt,
      isFolder: true,
      folderFiles: files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        fileType: file.mimetype
      }))
    });

    await folderRecord.save();

    res.json({
      success: true,
      message: `Folder with ${files.length} files uploaded successfully!`,
      accessCode,
      expiresAt: expiresAt.toLocaleString()
    });

  } catch (error) {
    console.error('Folder upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Find files by access code
router.get('/find/:accessCode', async (req, res) => {
  try {
    const { accessCode } = req.params;
    
    const fileRecord = await File.findOne({ 
      accessCode: accessCode.toUpperCase(),
      expiresAt: { $gt: new Date() }
    });

    if (!fileRecord) {
      return res.status(404).json({ error: 'Invalid or expired access code' });
    }

    res.json({
      success: true,
      file: fileRecord
    });

  } catch (error) {
    console.error('Find error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download file
router.get('/download/:fileId/:filename?', async (req, res) => {
  try {
    const { fileId, filename } = req.params;
    
    const fileRecord = await File.findById(fileId);
    
    if (!fileRecord || !fileRecord.expiresAt || new Date() > fileRecord.expiresAt) {
      return res.status(404).send('File not found or expired');
    }

    if (fileRecord.isFolder) {
      return res.status(400).send('Cannot download folder directly');
    }

    const filePath = fileRecord.filePath;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }

    res.download(filePath, fileRecord.originalName);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).send('Internal server error');
  }
});

module.exports = router;