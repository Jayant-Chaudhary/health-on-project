# OCR integration

The Express server forwards image uploads to the FastAPI service configured by
`OCR_SERVICE_URL` (default `http://localhost:8000`). Start the Python service
first, then start the Node server.

Both endpoints below require the same Supabase bearer token as other lab-report
routes:

- `GET /api/lab-reports/ocr/health` checks whether the OCR API is reachable.
- `POST /api/lab-reports/ocr` accepts multipart form data with an image in the
  `file` field. Supported formats are JPEG, PNG, BMP, and TIFF; files are limited
  to 10 MB. The response contains the OCR service result and a convenience `text`
  field assembled from its recognized text lines.

The OCR endpoint returns recognized text and coordinates. It does not create a
lab report: review and map recognized values to metrics before sending the
existing validated payload to `POST /lab-reports`.
