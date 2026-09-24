import { useState, useEffect } from 'react';
import { request } from '../../services/apiClient.js';
import { Topbar } from '../../components/layout/Topbar.jsx';
import { Sidebar } from '../../components/layout/Sidebar.jsx';
import { Plus, Trash2, Check } from 'lucide-react';
import { Spinner } from '../../components/common/Spinner.jsx';
import { getQuestionnaireTemplates } from '../../services/clinicianService.js';

export function ClinicianProfile() {
  const [collapsed, setCollapsed] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newQuestion, setNewQuestion] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await getQuestionnaireTemplates();
      setTemplates(data);
    } catch (err) {
      setError(err.message || 'Failed to load templates.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTemplate = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    setIsAdding(true);
    try {
      const created = await request('/questionnaire/templates', {
        method: 'POST',
        body: { questionText: newQuestion.trim() },
      });
      setTemplates([...templates, created]);
      setNewQuestion('');
    } catch (err) {
      setError(err.message || 'Failed to add question.');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar patients={[]} notifications={[]} />

        <main className="flex min-h-0 flex-1 flex-col gap-6 px-6 py-8 overflow-y-auto">
          <div className="max-w-3xl w-full mx-auto space-y-6">
            <h1 className="font-display text-heading-lg text-ink">Profile Settings</h1>
            
            <div className="card space-y-6 p-6">
              <div>
                <h2 className="text-body-lg font-semibold text-pine-900">Pre-Visit Questionnaire Library</h2>
                <p className="text-sm text-ink-3 mt-1">
                  Manage the list of questions you can ask patients before their appointments. 
                  These are available for selection when you invite a new patient.
                </p>
              </div>

              {error && (
                <div className="rounded-md bg-terracotta-50 p-3 text-sm text-terracotta-600 border border-terracotta-200">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="flex justify-center p-8">
                  <Spinner />
                </div>
              ) : (
                <div className="space-y-4">
                  {templates.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-pine-200 p-8 text-center text-ink-3">
                      No questions in your library yet. Add your first one below!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {templates.map(t => (
                        <div key={t.id} className="flex items-start justify-between gap-4 rounded-lg border border-pine-100 bg-white p-4 shadow-sm">
                          <p className="text-sm text-pine-900 font-medium">{t.question_text}</p>
                          {/* Note: Delete logic is not fully implemented in backend yet, just visual for MVP */}
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleAddTemplate} className="rounded-lg border border-pine-200 bg-pine-50/30 p-4 space-y-3 mt-4">
                    <label className="block text-sm font-medium text-pine-800">Add a New Question</label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={newQuestion}
                        onChange={e => setNewQuestion(e.target.value)}
                        className="flex-1 rounded-md border border-pine-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-pine-400 focus:ring-1 focus:ring-pine-400"
                        placeholder="E.g., Have you experienced any headaches recently?"
                      />
                      <button
                        type="submit"
                        disabled={!newQuestion.trim() || isAdding}
                        className="flex items-center gap-2 rounded-lg bg-pine-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-pine-700 disabled:opacity-50"
                      >
                        {isAdding ? <Spinner size={16} /> : <Plus className="h-4 w-4" />}
                        Add
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ClinicianProfile;
