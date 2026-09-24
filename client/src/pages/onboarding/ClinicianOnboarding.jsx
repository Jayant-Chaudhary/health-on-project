import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { useAuthContext } from '../../context/AuthContext';

export default function ClinicianOnboarding() {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    specialty: '',
    licenseNumber: '',
    stateMedicalCouncil: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { completeOnboarding, logout } = useAuthContext();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const result = await completeOnboarding(formData, 'clinician');
      if (!result.success) throw result.error;
      
      // Redirect to the pending verification screen or dashboard
      navigate('/clinician');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl w-full mx-auto p-8 bg-white rounded-xl shadow-sm border border-slate-200 mt-12">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Doctor Verification</h2>
      <p className="text-slate-600 mb-8">Please provide your details for NMC verification.</p>

      {error && (
        <div className="p-3 mb-6 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TextField
            label="Full Name (as per NMC Register)"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            required
            placeholder="Dr. Jane Doe"
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
        </div>

        <TextField
          label="Specialty"
          name="specialty"
          value={formData.specialty}
          onChange={handleChange}
          required
          placeholder="e.g. OB/GYN"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TextField
            label="Registration Number"
            name="licenseNumber"
            value={formData.licenseNumber}
            onChange={handleChange}
            required
            placeholder="e.g. 12345"
          />
          <TextField
            label="State Medical Council"
            name="stateMedicalCouncil"
            value={formData.stateMedicalCouncil}
            onChange={handleChange}
            required
            placeholder="e.g. Delhi Medical Council"
          />
        </div>

        <Button type="submit" variant="primary" className="w-full mt-4" isLoading={isLoading}>
          Submit for Verification
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
