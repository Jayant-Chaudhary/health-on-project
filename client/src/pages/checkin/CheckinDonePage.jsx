import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CheckCircle2 } from 'lucide-react';

export default function CheckinDonePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="max-w-md w-full text-center space-y-6">
        
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 bg-success-light rounded-full flex items-center justify-center">
            <CheckCircle2 size={48} className="text-success" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-ink">You're all set!</h1>
        <p className="text-ink-soft text-lg leading-relaxed">
          Your check-in is complete. The doctor has received your symptoms and lab reports.
        </p>

        <Card className="bg-raised p-6 mt-8 shadow-sm">
          <h3 className="font-bold text-ink mb-2">What happens next?</h3>
          <p className="text-sm text-ink-soft">
            Please arrive at the clinic 10 minutes before your scheduled appointment time. Bring the physical copies of the items from your checklist.
          </p>
        </Card>

        <div className="pt-8">
          <Button className="w-full" onClick={() => navigate('/')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
