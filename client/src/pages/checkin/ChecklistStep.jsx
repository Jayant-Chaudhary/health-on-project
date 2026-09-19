import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkinService } from '../../services/checkinService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { Skeleton } from '../../components/ui/Skeleton';
import { Sparkles } from 'lucide-react';

export default function ChecklistStep() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const data = await checkinService.getChecklist();
      setItems(data);
      setLoading(false);
    }
    load();
  }, []);

  const handleToggle = (id) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, done: !item.done } : item
    ));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    await checkinService.submitCheckin();
    navigate('/checkin/done');
  };

  const clinicItems = items.filter(i => i.source === 'clinic');
  const aiItems = items.filter(i => i.source === 'ai');

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-24">
      <div>
        <h2 className="text-2xl font-bold text-ink mb-2">Pre-Visit Checklist</h2>
        <p className="text-ink-soft">Please ensure you have these ready for your consultation today.</p>
      </div>

      <div className="space-y-6">
        
        {aiItems.length > 0 && (
          <Card className="p-5 border-attention/30 bg-attention/5">
            <div className="flex items-center gap-2 mb-4 text-attention-dark">
              <Sparkles size={20} />
              <h3 className="font-bold text-lg leading-tight">Just for you</h3>
            </div>
            <div className="space-y-4">
              {aiItems.map(item => (
                <Checkbox 
                  key={item.id}
                  id={item.id}
                  label={item.text}
                  checked={item.done}
                  onChange={() => handleToggle(item.id)}
                />
              ))}
            </div>
          </Card>
        )}

        <Card className="p-5">
          <h3 className="font-bold text-lg text-ink mb-4 leading-tight">Standard requirements</h3>
          <div className="space-y-4">
            {clinicItems.map(item => (
              <Checkbox 
                key={item.id}
                id={item.id}
                label={item.text}
                checked={item.done}
                onChange={() => handleToggle(item.id)}
              />
            ))}
          </div>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-ink-soft/10 p-4 z-40 max-w-3xl mx-auto">
        <Button 
          className="w-full" 
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Submitting Check-in...' : 'Submit Check-in'}
        </Button>
      </div>
    </div>
  );
}
