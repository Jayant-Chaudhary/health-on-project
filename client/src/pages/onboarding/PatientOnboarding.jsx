import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { useAuthContext } from '../../context/AuthContext';

export default function PatientOnboarding() {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { completeOnboarding, profile, logout } = useAuthContext();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const result = await completeOnboarding(formData, 'patient');
      if (!result.success) throw result.error;
      
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto p-8 bg-white rounded-xl shadow-sm border border-slate-200 mt-12">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Complete your profile</h2>
      <p className="text-slate-600 mb-8">Tell us a bit about yourself to get started.</p>

      {error && (
        <div className="p-3 mb-6 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Full Name"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          required
          placeholder="Jane Doe"
        />

        <TextField
          label="Phone Number"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          required
          placeholder="+91 98765 43210"
        />

        <Button type="submit" variant="primary" className="w-full mt-4" isLoading={isLoading}>
          Save and Continue
        </Button>
        <button
          type="button"
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
          className="w-full mt-4 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          Log out
        </button>
      </form>
    </div>
  );
}
