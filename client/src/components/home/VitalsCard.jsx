import { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { usePatientContext } from '../../context/PatientContext';
import { useToast } from '../../context/ToastContext';
import { patientService } from '../../services/patientService';
import { Plus, Minus, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function VitalsCard() {
  const { vitals } = usePatientContext();
  const { showToast } = useToast();
  
  // Base weight on last logged, or default to 65kg
  const initialWeight = vitals ? vitals.weightKg : 65.0;
  
  const [weight, setWeight] = useState(initialWeight);
  const [showBp, setShowBp] = useState(false);
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [saving, setSaving] = useState(false);
  const [localVitals, setLocalVitals] = useState(vitals);

  const handleSave = async () => {
    setSaving(true);
    const newVitals = {
      weightKg: weight,
      ...(showBp && systolic && diastolic ? { bpSystolic: parseInt(systolic), bpDiastolic: parseInt(diastolic) } : {})
    };
    
    await patientService.logVitals(newVitals);
    setLocalVitals({ ...newVitals, date: new Date().toISOString() });
    setSaving(false);
    showToast("Saved. Thanks, Priya!");
    setShowBp(false);
  };

  return (
    <Card className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="text-accent" size={20} />
        <h3 className="font-bold text-ink text-lg">Quick Vitals Update</h3>
      </div>
      
      <div className="bg-canvas rounded-xl p-4 mb-4 flex items-center justify-between">
        <span className="font-medium text-ink">Weight (kg)</span>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setWeight(w => parseFloat((w - 0.1).toFixed(1)))}
            className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-primary active:scale-95 transition-transform"
          >
            <Minus size={20} />
          </button>
          <span className="text-xl font-bold w-16 text-center">{weight.toFixed(1)}</span>
          <button 
            onClick={() => setWeight(w => parseFloat((w + 0.1).toFixed(1)))}
            className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-primary active:scale-95 transition-transform"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
      
      {localVitals?.date && (
        <p className="text-xs text-ink-soft mb-4 text-center">
          Last logged: {localVitals.weightKg} kg · {formatDistanceToNow(new Date(localVitals.date))} ago
        </p>
      )}

      {showBp ? (
        <div className="bg-canvas rounded-xl p-4 mb-4 animate-in slide-in-from-top-2">
          <span className="font-medium text-ink block mb-2">Blood Pressure (optional)</span>
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              placeholder="120"
              value={systolic}
              onChange={e => setSystolic(e.target.value)}
              className="w-full bg-white rounded-lg p-3 text-center font-bold focus-visible:ring-2 ring-primary outline-none" 
            />
            <span className="text-ink-soft text-xl">/</span>
            <input 
              type="number" 
              placeholder="80"
              value={diastolic}
              onChange={e => setDiastolic(e.target.value)}
              className="w-full bg-white rounded-lg p-3 text-center font-bold focus-visible:ring-2 ring-primary outline-none" 
            />
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setShowBp(true)}
          className="text-primary font-bold text-sm w-full py-2 mb-2 hover:underline"
        >
          + I have a home BP monitor
        </button>
      )}

      <Button 
        variant="outline" 
        className="w-full border-primary text-primary hover:bg-primary-light"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save today\'s vitals'}
      </Button>
    </Card>
  );
}
