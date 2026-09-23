import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkinService } from '../../services/checkinService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { YesNoToggle } from '../../components/ui/YesNoToggle';
import { Skeleton } from '../../components/ui/Skeleton';

export default function SymptomsStep() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const q = await checkinService.getQuestions();
      setQuestions(q);
      setLoading(false);
    }
    load();
  }, []);

  const handleToggle = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], value }
    }));
  };

  const handleNotes = (questionId, notes) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], notes }
    }));
  };

  const handleNext = async () => {
    // In a real app we'd validate here
    await checkinService.saveAnswers(answers);
    navigate('/checkin/checklist');
  };

  const allAnswered = questions.length > 0 && questions.every(q => answers[q.id]?.value !== undefined);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-card" />
        <Skeleton className="h-40 w-full rounded-card" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-24">
      <div>
        <h2 className="text-2xl font-bold text-ink mb-2">How are you feeling today?</h2>
        <p className="text-ink-soft">Your doctor will review these answers before your consultation begins.</p>
      </div>

      <div className="space-y-6">
        {questions.map(q => {
          const ans = answers[q.id];
          return (
            <Card key={q.id} className="p-5">
              <h3 className="font-bold text-lg text-ink mb-4 leading-tight">{q.text}</h3>
              
              <div className="mb-4">
                <YesNoToggle 
                  value={ans?.value} 
                  onChange={(val) => handleToggle(q.id, val)} 
                />
              </div>

              {ans?.value === 'yes' && (
                <div className="animate-in slide-in-from-top-2 fade-in">
                  <label className="block text-sm font-medium text-ink-soft mb-2">
                    Please provide a few details:
                  </label>
                  <textarea
                    className="w-full bg-canvas rounded-lg border border-ink-soft/20 p-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="E.g. It started yesterday..."
                    value={ans.notes || ''}
                    onChange={(e) => handleNotes(q.id, e.target.value)}
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Sticky footer for action button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-ink-soft/10 p-4 z-40 max-w-3xl mx-auto">
        <Button 
          className="w-full" 
          onClick={handleNext}
          disabled={!allAnswered}
        >
          {allAnswered ? 'Continue to Next Step' : 'Please answer all questions'}
        </Button>
      </div>
    </div>
  );
}
