import { useState, useEffect } from 'react';
import { reportService } from '../../services/reportService';
import { useToast } from '../../context/ToastContext';
import UploadZone from '../../components/reports/UploadZone';
import ReportCard from '../../components/reports/ReportCard';
import { Skeleton } from '../../components/ui/Skeleton';

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    const data = await reportService.getReports();
    setReports(data);
    setLoading(false);
  };

  const handleUpload = async (file) => {
    setUploading(true);
    showToast("Starting upload...", "info");
    
    try {
      await reportService.uploadReport(file);
      await loadReports();
      showToast("Report uploaded successfully!");
    } catch (err) {
      showToast("Failed to upload report.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (id) => {
    await reportService.removeReport(id);
    await loadReports();
    showToast("Report removed.");
  };

  return (
    <div className="py-8 animate-in fade-in duration-300">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-ink mb-2">Lab Reports</h1>
        <p className="text-ink-soft">Upload and manage all your medical records and lab results here.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Upload Zone */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <UploadZone onUpload={handleUpload} />
            {uploading && (
              <div className="mt-4 text-sm text-primary font-bold flex items-center justify-center gap-2">
                <span className="animate-spin text-xl">⏳</span> Uploading your document...
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Reports List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-lg text-ink mb-4 border-b pb-2">Uploaded Documents</h3>
          
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full rounded-card" />
              <Skeleton className="h-24 w-full rounded-card" />
              <Skeleton className="h-24 w-full rounded-card" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center p-12 bg-canvas rounded-card border border-ink-soft/20 border-dashed">
              <p className="text-ink-soft">No reports uploaded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map(report => (
                <ReportCard 
                  key={report.id} 
                  report={report} 
                  onRemove={handleRemove} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
