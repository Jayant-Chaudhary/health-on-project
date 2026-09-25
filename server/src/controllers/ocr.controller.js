const { extractFromFile, checkOcrHealth } = require('../services/ocrService');

async function getOcrHealth(req, res) {
  const healthy = await checkOcrHealth();
  return res.status(healthy ? 200 : 503).json({ healthy });
}

async function recognizeUpload(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Upload an image using the "file" field.' });
    }

    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/bmp', 'image/tiff']);
    if (!allowedTypes.has(req.file.mimetype)) {
      return res.status(415).json({ error: 'Supported image types are JPEG, PNG, BMP, and TIFF.' });
    }

    const result = await extractFromFile({
      buffer: req.file.buffer,
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      requestId: req.id,
    });

    const pages = Array.isArray(result?.data) ? result.data : [];
    const text = pages
      .flatMap((page) => Array.isArray(page.rec_texts) ? page.rec_texts : [])
      .join('\n');

    return res.json({ ...result, text });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getOcrHealth, recognizeUpload };
