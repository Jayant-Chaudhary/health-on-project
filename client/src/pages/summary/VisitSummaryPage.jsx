import { useState, useEffect } from 'react';
import { patientService } from '../../services/patientService';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { Checkbox } from '../../components/ui/Checkbox';
import { FileText, ClipboardList, Calendar, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export default function VisitSummaryPage() {
  const [summaries, setSummaries] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await patientService.getVisitSummary();
      // data is now an array
      setSummaries(data);
      if (data && data.length > 0) {
        // Select the most recent one by default
        setSelectedId(data[data.length - 1].id);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleToggle = (id, done) => {
    // Optimistic update locally
    setSummaries(prev => prev.map(summary => ({
      ...summary,
      nextSteps: summary.nextSteps.map(step => 
        step.id === id ? { ...step, done } : step
      )
    })));
    patientService.toggleNextStep(id, done);
  };

  if (loading) {
    return (
      <div className="py-8 space-y-6">
        <Skeleton className="h-40 w-full rounded-card" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }

  if (!summaries || summaries.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-ink-soft">No visit history available yet.</p>
      </div>
    );
  }

  const selectedSummary = summaries.find(s => s.id === selectedId);

  return (
    <div className="py-8 animate-in fade-in duration-300 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-ink mb-2">Visit History</h1>
        <p className="text-ink-soft">Review past doctor's notes and manage your next steps.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: History Timeline / List */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="font-bold text-lg text-ink mb-4">Past Appointments</h3>
          
          <div className="space-y-3">
            {[...summaries].reverse().map(summary => (
              <div 
                key={summary.id}
                onClick={() => setSelectedId(summary.id)}
                className={`p-4 rounded-card border cursor-pointer transition-all ${
                  selectedId === summary.id 
                    ? 'bg-primary-light border-primary/50 shadow-sm' 
                    : 'bg-white border-ink-soft/20 hover:border-primary/40 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedId === summary.id ? 'bg-primary text-white' : 'bg-canvas text-primary'}`}>
                      <Calendar size={18} />
                    </div>
                    <div>
                      <p className={`font-bold ${selectedId === summary.id ? 'text-primary-dark' : 'text-ink'}`}>
                        {format(new Date(summary.date), 'MMMM d, yyyy')}
                      </p>
                      <p className="text-xs text-ink-soft">{summary.doctorName}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className={selectedId === summary.id ? 'text-primary' : 'text-ink-soft/50'} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Selected Summary Details */}
        <div className="lg:col-span-8">
          {selectedSummary && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Notes & Prescriptions */}
                <div className="space-y-6">
                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4 text-ink">
                      <FileText size={20} className="text-primary" />
                      <h3 className="font-bold text-lg">Doctor's Notes</h3>
                    </div>
                    <div className="bg-canvas p-4 rounded-lg text-ink font-medium leading-relaxed">
                      {selectedSummary.notes}
                    </div>
                  </Card>

                  {selectedSummary.prescriptionImageUrl && (
                    <Card className="p-6">
                      <h3 className="font-bold text-lg text-ink mb-4">Prescription</h3>
                      <div className="rounded-lg overflow-hidden border border-ink-soft/20 bg-canvas">
                        <img 
                          src={selectedSummary.prescriptionImageUrl} 
                          alt="Prescription" 
                          className="w-full h-auto object-cover opacity-50"
                        />
                      </div>
                    </Card>
                  )}
                </div>

                {/* Next Steps Checklist */}
                <div>
                  <Card className="p-6 sticky top-24">
                    <div className="flex items-center gap-2 mb-6 text-ink">
                      <ClipboardList size={20} className="text-accent" />
                      <h3 className="font-bold text-lg">Your Next Steps</h3>
                    </div>
                    
                    {selectedSummary.nextSteps && selectedSummary.nextSteps.length > 0 ? (
                      <div className="space-y-4">
                        {selectedSummary.nextSteps.map(step => (
                          <div key={step.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-canvas transition-colors">
                            <div className="pt-1">
                              <Checkbox 
                                id={step.id}
                                checked={step.done}
                                onChange={(e) => handleToggle(step.id, e.target.checked)}
                              />
                            </div>
                            <div className="flex-1">
                              <label htmlFor={step.id} className={`font-bold block cursor-pointer transition-colors ${step.done ? 'text-ink-soft line-through' : 'text-ink'}`}>
                                {step.title}
                              </label>
                              <span className="text-xs font-bold text-primary px-2 py-0.5 bg-primary-light rounded-full mt-1 inline-block">
                                {step.dueLabel}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-ink-soft">No next steps assigned for this visit.</p>
                    )}
                  </Card>
                </div>

              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
