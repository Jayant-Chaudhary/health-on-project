import { mockDb } from './mock/mockDb';
import { delay } from './mock/delay';

let uploadCounter = 0;

export const reportService = {
  async getReports() {
    await delay();
    return mockDb.reports;
  },

  async uploadReport(file) {
    await delay(1500); // simulate upload
    uploadCounter++;
    
    // Every 3rd upload needs attention
    const finalStatus = (uploadCounter % 3 === 0) ? 'needs_attention' : 'success';
    
    const newReport = {
      id: `report_${Date.now()}`,
      imageUrl: URL.createObjectURL(file), // temporary local URL for preview
      title: file.name,
      reportDate: new Date().toISOString(),
      status: 'processing', // starts processing
      progress: 100
    };
    
    mockDb.reports.push(newReport);
    mockDb.persist();

    // Simulate backend processing
    setTimeout(() => {
      const report = mockDb.reports.find(r => r.id === newReport.id);
      if (report) {
        report.status = finalStatus;
        
        // If it needs attention, add an AI checklist item!
        if (finalStatus === 'needs_attention') {
           mockDb.checklist.push({
             id: `ai_${Date.now()}`,
             text: `Bring the printed ${file.name} lab report. We couldn't read it clearly.`,
             source: 'ai',
             done: false,
             relatedReportId: report.id
           });
        }
        mockDb.persist();
      }
    }, 2000); // 2 seconds processing time

    return newReport;
  },

  async removeReport(id) {
    await delay(500);
    mockDb.reports = mockDb.reports.filter(r => r.id !== id);
    // Also clean up any related AI checklist items
    mockDb.checklist = mockDb.checklist.filter(c => c.relatedReportId !== id);
    mockDb.persist();
    return true;
  }
};
