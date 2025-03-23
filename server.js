const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Middleware to parse JSON and URL-encoded bodies
app.use(express.json()); // Add this if your frontend sends JSON
app.use(express.urlencoded({ extended: true })); // Add this for form data
app.use(cors());

const uploadDir = '/home/work/datasets/EuroCup2016/mp4';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    console.log('Request Body:', req.body); // Debug: Log the entire body
    console.log('File Object:', file); // Debug: Log the file details
    const fileName = req.body.fileName || file.originalname;
    console.log('Using fileName:', fileName); // Debug: Log the chosen filename
    cb(null, fileName);
  }
});

const upload = multer({ storage: storage });

// Upload endpoint
app.post('/api/upload-video', upload.single('video'), (req, res) => {
  try {
    console.log('Received Request:', {
      body: req.body,
      file: req.file
    }); // Debug: Log request details
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

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});