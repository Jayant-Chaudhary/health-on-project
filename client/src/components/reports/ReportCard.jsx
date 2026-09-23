import { UploadCloud, FileType, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { formatDistanceToNow } from 'date-fns';

export default function ReportCard({ report, onRemove }) {
  const getStatusDisplay = () => {
    switch (report.status) {
      case 'success':
        return { icon: CheckCircle, color: 'text-success', bg: 'bg-success-light', label: 'Analyzed' };
      case 'processing':
        return { icon: Loader2, color: 'text-primary', bg: 'bg-primary-light', label: 'Processing', spin: true };
      case 'needs_attention':
        return { icon: AlertCircle, color: 'text-attention', bg: 'bg-attention-light', label: 'Needs Review' };
      default:
        return { icon: FileType, color: 'text-ink-soft', bg: 'bg-canvas', label: 'Unknown' };
    }
  };

  const status = getStatusDisplay();
  const Icon = status.icon;

  return (
    <Card className="flex items-center gap-4 p-4 hover:border-primary/30 transition-colors">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${status.bg} ${status.color}`}>
        <Icon size={24} className={status.spin ? 'animate-spin' : ''} />
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-ink truncate">{report.title}</h4>
        <div className="flex items-center gap-2 text-xs text-ink-soft mt-1">
          <span className={`font-medium ${status.color}`}>{status.label}</span>
          <span>&bull;</span>
          <span>{formatDistanceToNow(new Date(report.reportDate))} ago</span>
        </div>
      </div>

      <button 
        onClick={() => onRemove(report.id)}
        className="p-2 text-ink-soft hover:text-attention hover:bg-attention-light rounded-full transition-colors"
        aria-label="Remove report"
      >
        <span className="sr-only">Remove</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </Card>
  );
}
