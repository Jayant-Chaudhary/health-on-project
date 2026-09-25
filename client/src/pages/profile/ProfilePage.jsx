import { useEffect, useState } from 'react';
import { User, Save } from 'lucide-react';
import { usePatientContext } from '../../context/PatientContext';
import { useToast } from '../../context/ToastContext';
import { profileService } from '../../services/profileService';
import VitalsCard from '../../components/home/VitalsCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { Skeleton } from '../../components/ui/Skeleton';

/** Only these keys are editable; anything else the API returns is display-only. */
const EDITABLE = [
  'fullName',
  'phone',
  'dateOfBirth',
  'bloodType',
  'address',
  'emergencyContactName',
  'emergencyContactPhone',
];

function toForm(profile) {
  return EDITABLE.reduce((form, key) => ({ ...form, [key]: profile?.[key] ?? '' }), {});
}

export default function ProfilePage() {
  const { profile, loading, refresh } = usePatientContext();
  const { showToast } = useToast();

  const [form, setForm] = useState(() => toForm(profile));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setForm(toForm(profile));
  }, [profile]);

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);

    try {
      // Send empty strings as null so clearing a field actually clears it.
      const changes = EDITABLE.reduce((payload, key) => {
        const value = form[key];
        return { ...payload, [key]: value === '' || value == null ? null : value };
      }, {});

      await profileService.updateProfile(changes);
      await refresh();
      showToast('Profile updated.');
    } catch (err) {
      showToast(err.message || 'Could not save your profile.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="py-8 space-y-6">
        <Skeleton className="h-40 w-full rounded-card" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }

  return (
    <div className="py-8 animate-in fade-in duration-300 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-ink mb-2">My Profile</h1>
        <p className="text-ink-soft">Keep your details current — your clinician sees them at every visit.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center font-bold text-2xl shadow-sm">
                {(form.fullName || '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-xl text-ink truncate">{form.fullName || 'Your name'}</h3>
                <p className="text-sm text-ink-soft flex items-center gap-1.5">
                  <User size={14} /> Patient
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <TextField label="Full name" value={form.fullName} onChange={set('fullName')} />
              <TextField label="Phone" value={form.phone} onChange={set('phone')} type="tel" />
              <TextField
                label="Date of birth"
                value={form.dateOfBirth}
                onChange={set('dateOfBirth')}
                type="date"
              />
              <TextField label="Address" value={form.address} onChange={set('address')} />
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-lg text-ink mb-4">Health</h3>
            <div className="space-y-4">
              <TextField label="Blood type" value={form.bloodType} onChange={set('bloodType')} />
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-lg text-ink mb-4">Emergency contact</h3>
            <div className="space-y-4">
              <TextField
                label="Name"
                value={form.emergencyContactName}
                onChange={set('emergencyContactName')}
              />
              <TextField
                label="Phone"
                value={form.emergencyContactPhone}
                onChange={set('emergencyContactPhone')}
                type="tel"
              />
            </div>
          </Card>

          <Button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2">
            <Save size={18} />
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </form>

        <div className="space-y-6">
          <VitalsCard canEditWeight />
        </div>
      </div>
    </div>
  );
}
