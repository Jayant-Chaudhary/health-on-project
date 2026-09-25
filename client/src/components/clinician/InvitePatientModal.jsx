import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, CheckSquare, Square } from 'lucide-react';
import { createAppointment, getQuestionnaireTemplates } from '../../services/clinicianService.js';

export function InvitePatientModal({ isOpen, onClose, onInviteSent }) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState(new Set());
  
  const [newQuestions, setNewQuestions] = useState([]);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [saveNewToList, setSaveNewToList] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      resetForm();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      const data = await getQuestionnaireTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const resetForm = () => {
    setEmail('');
    setFullName('');
    setDate('');
    setTime('');
    setSelectedTemplateIds(new Set());
    setNewQuestions([]);
    setNewQuestionText('');
    setSaveNewToList(false);
    setError(null);
  };

  const toggleTemplate = (id) => {
    const next = new Set(selectedTemplateIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedTemplateIds(next);
  };

  const addNewQuestion = () => {
    if (!newQuestionText.trim()) return;
    setNewQuestions(current => [
      ...current, 
      { id: Date.now().toString(), text: newQuestionText.trim(), saveToList: saveNewToList }
    ]);
    setNewQuestionText('');
    setSaveNewToList(false);
  };

  const removeNewQuestion = (id) => {
    setNewQuestions(current => current.filter(q => q.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !fullName || !date || !time) {
      setError('Please fill out all required fields.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const scheduledAt = new Date(`${date}T${time}`).toISOString();
      const newAppointment = await createAppointment({
        patientEmail: email,
        patientFullName: fullName,
        scheduledAt,
        questionnaireTemplateIds: Array.from(selectedTemplateIds),
        newQuestions: newQuestions.map(q => ({ text: q.text, saveToList: q.saveToList })),
      });
      // SMTP is best-effort, so the clinic needs the link in hand either way.
      if (newAppointment?.inviteLink) {
        alert(
          newAppointment.isReturningPatient
            ? 'Appointment added to the existing patient record.'
            : `Invite sent.\n\nIf the email does not arrive, share this link:\n${newAppointment.inviteLink}`
        );
      }
      onInviteSent?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to send invite.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6">
      <div className="card flex max-h-full w-full max-w-2xl flex-col overflow-hidden bg-canvas p-0 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-pine-200/30 bg-pine-50/50 px-6 py-4">
          <h2 className="font-display text-head-sm text-pine-900">Invite Patient</h2>
          <button onClick={onClose} className="rounded-full p-2 text-pine-600 transition-colors hover:bg-pine-100/50">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <form id="invite-form" onSubmit={handleSubmit} className="space-y-6">
            
            {error && (
              <div className="rounded-md bg-terracotta-50 p-3 text-sm text-terracotta-600 border border-terracotta-200">
                {error}
              </div>
            )}

            {/* Patient Info */}
            <div className="space-y-4">
              <h3 className="text-body-md font-semibold text-pine-900">Patient Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-body-sm font-medium text-pine-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full rounded-md border border-pine-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-pine-400 focus:ring-1 focus:ring-pine-400"
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-body-sm font-medium text-pine-700">Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full rounded-md border border-pine-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-pine-400 focus:ring-1 focus:ring-pine-400"
                    placeholder="jane@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-4">
              <h3 className="text-body-md font-semibold text-pine-900">Schedule Appointment</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-body-sm font-medium text-pine-700">Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full rounded-md border border-pine-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-pine-400 focus:ring-1 focus:ring-pine-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-body-sm font-medium text-pine-700">Time *</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-full rounded-md border border-pine-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-pine-400 focus:ring-1 focus:ring-pine-400"
                  />
                </div>
              </div>
            </div>

            <hr className="border-pine-100" />

            {/* Pre-visit Questionnaire */}
            <div className="space-y-4">
              <h3 className="text-body-md font-semibold text-pine-900">Pre-Visit Questionnaire</h3>
              <p className="text-sm text-ink-3">Select questions to ask the patient before their visit.</p>
              
              {/* Existing Templates */}
              {templates.length > 0 && (
                <div className="space-y-2 rounded-lg border border-pine-100 bg-pine-50/30 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-pine-500">From Library</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    {templates.map(t => (
                      <label key={t.id} className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-pine-50">
                        <div className="pt-0.5 text-pine-600">
                          {selectedTemplateIds.has(t.id) ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5 opacity-50" />}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={selectedTemplateIds.has(t.id)}
                          onChange={() => toggleTemplate(t.id)}
                        />
                        <span className="text-sm text-pine-900">{t.question_text}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Added Questions */}
              {newQuestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-pine-500">New Questions</p>
                  {newQuestions.map(q => (
                    <div key={q.id} className="flex items-start gap-3 rounded-lg border border-pine-200 bg-white p-3 shadow-sm">
                      <div className="flex-1 space-y-1">
                        <p className="text-sm text-pine-900">{q.text}</p>
                        {q.saveToList && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sand-100 px-2.5 py-0.5 text-xs font-medium text-sand-800">
                            <Check className="h-3 w-3" /> Will save to library
                          </span>
                        )}
                      </div>
                      <button type="button" onClick={() => removeNewQuestion(q.id)} className="text-ink-3 hover:text-terracotta">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Question Input */}
              <div className="rounded-lg border border-pine-200 bg-white p-4 space-y-3">
                <input
                  type="text"
                  value={newQuestionText}
                  onChange={e => setNewQuestionText(e.target.value)}
                  onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); addNewQuestion(); } }}
                  className="w-full rounded-md border border-pine-200 bg-pine-50/30 px-3 py-2 text-sm text-ink outline-none focus:border-pine-400 focus:bg-white focus:ring-1 focus:ring-pine-400"
                  placeholder="Type a new question..."
                />
                <div className="flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={saveNewToList}
                      onChange={e => setSaveNewToList(e.target.checked)}
                      className="rounded border-pine-300 text-pine-600 focus:ring-pine-500"
                    />
                    <span className="text-sm text-pine-700">Save to my library</span>
                  </label>
                  <button
                    type="button"
                    onClick={addNewQuestion}
                    disabled={!newQuestionText.trim()}
                    className="flex items-center gap-1.5 rounded-md bg-pine-100 px-3 py-1.5 text-sm font-medium text-pine-700 transition-colors hover:bg-pine-200 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" /> Add
                  </button>
                </div>
              </div>

            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-pine-200/30 bg-pine-50/50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-pine-700 hover:bg-pine-100"
          >
            Cancel
          </button>
          <button
            form="invite-form"
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-pine-600 px-6 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-pine-700 focus:outline-none focus:ring-2 focus:ring-pine-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>
  );
}
