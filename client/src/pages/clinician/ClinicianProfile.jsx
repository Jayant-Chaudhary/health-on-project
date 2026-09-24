import { useEffect, useState } from 'react';
import { Save, ShieldCheck, ShieldAlert } from 'lucide-react';
import { profileService } from '../../services/profileService';
import { useToast } from '../../context/ToastContext';
import { Sidebar } from '../../components/layout/Sidebar.jsx';
import { SectionCard } from '../../components/common/SectionCard.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';

const EDITABLE = ['fullName', 'phone', 'specialty', 'licenseNumber', 'stateMedicalCouncil'];

const FIELDS = [
  { key: 'fullName', label: 'Full name' },
  { key: 'phone', label: 'Phone', type: 'tel' },
  { key: 'specialty', label: 'Specialty' },
  { key: 'licenseNumber', label: 'Medical licence number' },
  { key: 'stateMedicalCouncil', label: 'State medical council' },
];

export default function ClinicianProfile() {
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    profileService
      .getProfile()
      .then((data) => {
        setProfile(data);
        setForm(EDITABLE.reduce((f, k) => ({ ...f, [k]: data?.[k] ?? '' }), {}));
      })
      .catch((err) => showToast(err.message || 'Could not load your profile.', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const changes = EDITABLE.reduce(
        (payload, key) => ({ ...payload, [key]: form[key] === '' ? null : form[key] }),
        {}
      );
      setProfile(await profileService.updateProfile(changes));
      showToast('Profile updated.');
    } catch (err) {
      showToast(err.message || 'Could not save your profile.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-2xl">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-24 text-ink-3">
              <Spinner /> Loading your profile…
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <SectionCard
                icon="users"
                title="My profile"
                subtitle="Shown to your patients on their appointments"
                bodyClassName="p-5"
                action={
                  <span
                    className={`pill ${
                      profile?.isVerified
                        ? 'border-sage-border bg-sage-surface text-sage-ink'
                        : 'border-olive-border bg-olive-surface text-olive'
                    }`}
                  >
                    {profile?.isVerified ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
                    {profile?.isVerified ? 'Verified' : 'Pending verification'}
                  </span>
                }
              >
                <div className="space-y-4">
                  {FIELDS.map(({ key, label, type = 'text' }) => (
                    <div key={key}>
                      <label
                        htmlFor={`profile-${key}`}
                        className="mb-1.5 block text-label-md text-ink-2"
                      >
                        {label}
                      </label>
                      <input
                        id={`profile-${key}`}
                        type={type}
                        value={form[key] ?? ''}
                        onChange={set(key)}
                        className="field h-10"
                      />
                    </div>
                  ))}

                  <p className="text-body-sm text-ink-3">
                    Verification is granted by an administrator and cannot be set here.
                  </p>
                </div>
              </SectionCard>

              <Button type="submit" disabled={saving} className="w-full">
                <Save size={16} />
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
