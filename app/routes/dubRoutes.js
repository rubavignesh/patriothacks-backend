const express = require('express');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const fs = require('fs');
const router = express.Router();

const app = express();

// Multer setup for file uploads
const upload = multer({ dest: 'uploads/' });

// Route for uploading video and starting translation
router.post('/translate-video', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { source_lang, target_lang } = req.body;

    // Create form data to send to ElevenLabs
    const formData = new FormData();
    // formData.append('file', fs.createReadStream(file.path));
    // formData.append('name', file.originalname);
    formData.append('file', fs.createReadStream(file.path), {
        filename: file.originalname,
        contentType: file.mimetype, // Set the correct MIME type
      });
    formData.append('name', 'check1');
    formData.append('source_lang', source_lang);
    formData.append('target_lang', target_lang);
    formData.append('watermark', 'true'); // Add this line

    // Send request to ElevenLabs API
    const response = await axios.post('https://api.elevenlabs.io/v1/dubbing', formData, {
      headers: {
        ...formData.getHeaders(),
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
    });

    const { dubbing_id, expected_duration_sec } = response.data;

    // Send the response to the UI
    res.json({ message: 'Translation started', dubbing_id, expected_duration_sec });

    // Start checking translation status in the background
    checkTranslationStatus(dubbing_id, target_lang, res);
  } catch (error) {
    // console.error('Error starting translation:', error);
    // res.status(500).json({ message: 'Failed to start translation', error });
    console.error('Error starting translation:', error.response ? error.response.data : error);
    res.status(500).json({ message: 'Failed to start translation', error });
  }
});

// Function to check translation status periodically
const checkTranslationStatus = async (dubbing_id, target_lang, res) => {
  const interval = 10000; // 10 seconds
  const maxAttempts = 50; // Limit to avoid infinite loops
  let attempts = 0;

  const checkStatus = async () => {
    try {
      // Check the translation status
      const response = await axios.get(`https://api.elevenlabs.io/v1/dubbing/${dubbing_id}`, {
        headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
      });

      const { status } = response.data;

      // If the video is dubbed, download it
      if (status === 'dubbed') {
        console.log('Translation completed. Downloading video...');
        downloadTranslatedVideo(dubbing_id, target_lang, res);
      } else if (status === 'in_progress' || status === 'pending') {
        // Check again after 10 seconds
        attempts++;
        if (attempts < maxAttempts) {
          console.log(`Checking status... Attempt: ${attempts}`);
          setTimeout(checkStatus, interval);
        } else {
          console.error('Translation taking too long.');
          res.status(500).json({ message: 'Translation timed out.' });
        }
      }
    } catch (error) {
      console.error('Error checking translation status:', error);
      res.status(500).json({ message: 'Error checking translation status', error });
    }
  };

  checkStatus();
};

// Function to download translated video
const downloadTranslatedVideo = async (dubbing_id, target_lang, res) => {
  try {
    // Get the translated video
    const response = await axios({
      url: `https://api.elevenlabs.io/v1/dubbing/${dubbing_id}/audio/${target_lang}`,
      method: 'GET',
      responseType: 'stream',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
    });

    // Send the translated video back to the UI
    res.setHeader('Content-Disposition', `attachment; filename=translated_video_${dubbing_id}.mp4`);
    response.data.pipe(res);
  } catch (error) {
    console.error('Error downloading video:', error);
    res.status(500).json({ message: 'Failed to download video', error });
  }
};

module.exports = router;
