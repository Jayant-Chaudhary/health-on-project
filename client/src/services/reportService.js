import { request } from './apiClient';
import { supabase } from './supabaseClient';

export const reportService = {
  async getReports() {
    const data = await request('/lab-reports');
    // Map DB fields to UI fields
    return data.map(r => ({
      id: r.id,
      title: r.source_name || r.storage_path?.split('/').pop() || 'Uploaded Report',
      reportDate: r.report_date || r.uploaded_at,
      status: r.ocr_status === 'completed' ? 'success' : 
              r.ocr_status === 'failed' || r.ocr_status === 'requires_review' ? 'needs_attention' : 
              'processing'
    }));
  },

  async uploadReport(file, appointmentId) {
    // 1. Upload file to Supabase storage 'lab-reports' bucket
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('lab-reports')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    // 2. Call backend to ingest it
    // If OCR pipeline is integrated, it might be triggered here or via a webhook.
    // For now we just create the record.
    return request('/lab-reports', {
      method: 'POST',
      body: {
        appointmentId: appointmentId || null,
        storagePath: uploadData.path,
        reportDate: new Date().toISOString(),
        metrics: [],
        ocrStatus: 'pending'
      }
    });
  },

  async removeReport(id) {
    // Not supported by backend yet, so just returning true for now
    // In real app we'd DELETE /lab-reports/:id
    return true;
  }
};
