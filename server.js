const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); // Use standard fs for existsSync
const fsPromises = require('fs').promises; // Alias fs.promises for async operations

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
    cb(null, file.originalname); // Temporarily use original name
  }
});

const upload = multer({ storage: storage });

app.post('/api/upload-video', upload.single('video'), async (req, res) => {
  try {
    console.log('Received Request:', {
      body: req.body,
      file: req.file
    });

    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const fileName = req.body.fileName || req.file.originalname;
    const oldPath = req.file.path;
    const newPath = path.join(uploadDir, fileName);

    if (fileName !== req.file.originalname) {
      await fsPromises.rename(oldPath, newPath); // Use fs.promises for rename
      console.log(`Renamed file from ${oldPath} to ${newPath}`);
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