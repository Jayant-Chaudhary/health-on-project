const express = require('express');
const router = express.Router();
const upload = require('../middleware/ocrUpload');
const authGuard = require('../middleware/authGuard');
const { getOcrHealth, recognizeUpload } = require('../controllers/ocr.controller');

// Public health probe — used by infra monitoring; no auth required.
router.get('/health', getOcrHealth);

// Authenticated OCR extraction endpoint.
router.post('/recognize', authGuard, upload.single('file'), recognizeUpload);

module.exports = router;
