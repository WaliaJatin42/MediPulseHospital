const express = require('express');
const {
  getUploadUrl,
  confirmUpload,
  getDownloadUrl,
  deleteFile,
  getFiles
} = require('../controllers/fileController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/upload-url', getUploadUrl);
router.post('/:id/confirm', confirmUpload);
router.get('/:id/download-url', getDownloadUrl);
router.delete('/:id', deleteFile);
router.get('/', getFiles);

module.exports = router;
