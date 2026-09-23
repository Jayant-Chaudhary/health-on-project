import { request } from './apiClient';

export const reportService = {
  async getReports() {
    // GET /api/lab-reports returns all reports for the current patient globally.
    return request('/api/lab-reports');
  },

  async uploadReport(file) {
    // In a full implementation, we would upload 'file' to Supabase Storage first,
    // get the public storagePath, and run an OCR extractor on it.
    // For now, we simulate the OCR payload so the backend can ingest it.
    
    // Create a local blob URL for temporary preview if needed (though storagePath is better)
    const localUrl = URL.createObjectURL(file);
    
    const payload = {
      storagePath: localUrl, // In reality, this would be "reports/uuid-filename.jpg"
      reportDate: new Date().toISOString(),
      ocrStatus: 'success',
      metrics: [
        { key: 'HGB', value: 12.5, unit: 'g/dL', confidence: 0.95 },
        { key: 'WBC', value: 8.2, unit: '10^9/L', confidence: 0.90 }
      ]
    };

    // Send the simulated OCR payload to the backend
    return request('/api/lab-reports', {
      method: 'POST',
      body: payload
    });
  },

  async removeReport(id) {
    // Currently no DELETE route for lab reports in the backend yet.
    console.warn("Backend does not support deleting reports yet.");
    return true;
  }
};
