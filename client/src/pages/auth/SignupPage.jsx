import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { PasswordField } from '../../components/ui/PasswordField';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';

export default function SignupPage() {
  const [role, setRole] = useState('patient'); // 'patient' or 'clinician'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signup } = useAuth();

  const calculateStrength = (password) => {
    let score = 0;
    if (!password) return 0;
    if (password.length > 7) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[@$!%*?&]/.test(password)) score += 1;
    return score;
  };

  const strengthScore = calculateStrength(formData.password);
  
  const getStrengthColor = (score) => {
    if (score === 0) return 'bg-slate-200';
    if (score <= 2) return 'bg-red-500 w-2/5';
    if (score <= 4) return 'bg-yellow-500 w-4/5';
    return 'bg-green-500 w-full';
  };
  
  const getStrengthText = (score) => {
    if (score === 0) return '';
    if (score <= 2) return 'Weak';
    if (score <= 4) return 'Good';
    return 'Strong';
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(formData.password)) {
      setError('Password is too weak. It must be at least 8 characters and include uppercase, lowercase, numbers, and special characters.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    
    try {
      const { user, error: signupError } = await signup({
        email: formData.email,
        password: formData.password,
        role
      });
      
      if (signupError) {
        // If it's a rate limit error, we can inform the user nicely instead of throwing a generic error
        if (signupError.message?.toLowerCase().includes('rate limit')) {
          setError('Too many attempts. If you are testing, please disable rate limiting in your Supabase dashboard.');
          return;
        }
        throw signupError;
      }
      
      if (role === 'clinician') {
        navigate('/clinician');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-3xl font-bold text-slate-900 mb-2">Create an account</h2>
      <p className="text-slate-600 mb-6">Join HealthOn to manage maternal care effectively</p>

      {/* Role Toggle */}
      <div className="flex p-1 bg-slate-100 rounded-lg mb-6 border border-slate-200">
        <button
          type="button"
          onClick={() => setRole('patient')}
          className={cn(
            "flex-1 py-2 text-sm font-medium rounded-md transition-colors",
            role === 'patient'
              ? "bg-white text-slate-900 shadow-sm font-semibold"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          I am a Patient
        </button>
        <button
          type="button"
          onClick={() => setRole('clinician')}
          className={cn(
            "flex-1 py-2 text-sm font-medium rounded-md transition-colors",
            role === 'clinician'
              ? "bg-white text-slate-900 shadow-sm font-semibold"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          I am a Doctor
        </button>
      </div>

      {error && (
        <div className="p-3 mb-6 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Email address"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          placeholder="you@example.com"
        />

        <div className="space-y-1">
          <PasswordField
            label="Password (min. 8 characters)"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="At least 8 characters"
          />
          {formData.password && (
            <div className="pt-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-slate-500 font-medium">Password strength</span>
                <span className={`text-xs font-semibold ${strengthScore <= 2 ? 'text-red-600' : strengthScore <= 4 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {getStrengthText(strengthScore)}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div 
                  className={`h-full transition-all duration-300 ease-out ${getStrengthColor(strengthScore)}`}
                />
              </div>
            </div>
          )}
        </div>

        <PasswordField
          label="Confirm Password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          placeholder="Re-enter your password"
        />

        <Button type="submit" variant="primary" className="w-full mt-4" isLoading={isLoading}>
          Create account
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="text-green-800 hover:text-green-900 font-semibold underline-offset-4 hover:underline">
          Sign in here
        </Link>
      </p>
    </div>
  );
}
