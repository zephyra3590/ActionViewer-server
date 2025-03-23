const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000; // You can change this port if needed

// Enable CORS to allow requests from your frontend
app.use(cors());

// Set up storage for uploaded files
const uploadDir = '/home/work/datasets/EuroCup2016/mp4';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true }); // Create directory if it doesn't exist
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Save files to this directory
  },
  filename: (req, file, cb) => {
    const fileName = req.body.fileName || file.originalname; // Use provided fileName or original name
    cb(null, fileName);
  }
});

const upload = multer({ storage: storage });

// Define the upload endpoint
app.post('/api/upload-video', upload.single('video'), (req, res) => {
  try {
    const fileName = req.body.fileName;
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }
    res.json({
      message: `Success! ${fileName} was saved to ${uploadDir}.`
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Server error during upload' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
