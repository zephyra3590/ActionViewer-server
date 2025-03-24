const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const { exec } = require('child_process');
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

// Function to run frame extraction in conda environment
const runFrameExtraction = (fileName) => {
  return new Promise((resolve, reject) => {
    // Command to activate conda environment and run the script
    const command = `conda run -n paddle3.0 /bin/bash -c "cd /workspace/PaddleVideo/applications/FootballAction/datasets/script && python get_frames_pcm.py ${fileName}"`;
    
    console.log(`Executing command: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Frame extraction error: ${error.message}`);
        return reject(error);
      }
      if (stderr) {
        console.log(`Frame extraction stderr: ${stderr}`);
      }
      console.log(`Frame extraction stdout: ${stdout}`);
      resolve({ stdout, stderr });
    });
  });
};

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
      await fsPromises.rename(oldPath, newPath);
      console.log(`Renamed file from ${oldPath} to ${newPath}`);
    }
    
    // Send initial success response
    res.json({
      message: `Success! ${fileName} was saved to ${uploadDir}. Starting frame extraction...`
    });
    
    // Run frame extraction after sending response
    try {
      await runFrameExtraction(fileName);
      console.log(`Frame extraction completed for ${fileName}`);
    } catch (extractionError) {
      console.error(`Frame extraction failed: ${extractionError.message}`);
    }
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Server error during upload' });
  }
});

// Add endpoint to check frame extraction status
app.get('/api/extraction-status/:fileName', async (req, res) => {
  const fileName = req.params.fileName;
  // You could implement logic here to check if frames have been extracted
  // For now, just return a placeholder response
  res.json({
    fileName,
    status: 'Processing frame extraction...'
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});