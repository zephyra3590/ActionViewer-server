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
    const command = `conda run -n paddle3.0 /bin/bash -c "cd /workspace/PaddleVideo/applications/FootballAction/datasets/script && python get_frames_pcm.py mp4/${fileName}"`;
    
    console.log(`Executing frame extraction command: ${command}`);
    
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

// Function to run prediction in conda environment
const runPrediction = (fileName) => {
  return new Promise((resolve, reject) => {
    const command = `conda run -n paddle3.0 /bin/bash -c "cd /workspace/PaddleVideo/applications/FootballAction/predict && python predict.py ~/datasets/EuroCup2016/mp4/${fileName}"`;
    
    console.log(`Executing prediction command: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Prediction error: ${error.message}`);
        return reject(error);
      }
      if (stderr) {
        console.log(`Prediction stderr: ${stderr}`);
      }
      console.log(`Prediction stdout: ${stdout}`);
      resolve({ stdout, stderr });
    });
  });
};

// Existing upload video endpoint remains the same...
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

// New endpoint to trigger prediction
app.post('/api/predict', async (req, res) => {
  try {
    const { fileName } = req.body;
    
    if (!fileName) {
      return res.status(400).json({ error: 'No file name provided' });
    }
    
    // Initiate prediction process
    try {
      const predictionResult = await runPrediction(fileName);
      res.json({
        message: 'Prediction completed successfully',
        details: predictionResult.stdout
      });
    } catch (predictionError) {
      console.error(`Prediction failed: ${predictionError.message}`);
      res.status(500).json({ 
        error: 'Prediction process failed', 
        details: predictionError.message 
      });
    }
  } catch (error) {
    console.error('Prediction endpoint error:', error);
    res.status(500).json({ error: 'Server error during prediction' });
  }
});

// Existing extraction status endpoint
app.get('/api/extraction-status/:fileName', async (req, res) => {
  const fileName = req.params.fileName;
  // You could implement logic here to check if frames have been extracted
  // For now, just return a placeholder response
  res.json({
    fileName,
    status: 'Processing frame extraction...'
  });
});

// New endpoint to download JSON file
app.get('/api/download-json', (req, res) => {
  const { fileName } = req.query;
  
  if (!fileName) {
    return res.status(400).json({ error: 'No file name provided' });
  }
  
  const jsonFilePath = path.join('/home/work/datasets/EuroCup2016/mp4', fileName);
  
  // Check if file exists
  if (!fs.existsSync(jsonFilePath)) {
    return res.status(404).json({ error: 'JSON file not found' });
  }
  
  // Send the file for download
  res.download(jsonFilePath, fileName, (err) => {
    if (err) {
      console.error('Download error:', err);
      res.status(500).json({ error: 'Error downloading file' });
    }
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});