import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { PasswordField } from '../../components/ui/PasswordField';
import { useAuth } from '../../hooks/useAuth';
import { User, Stethoscope } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login, signup } = useAuth();

  const handleLoginSubmit = async (emailToUse, passwordToUse) => {
    setError('');
    setIsLoading(true);
    
    try {
      let { user, profile, error: loginError } = await login({ email: emailToUse, password: passwordToUse });
      
      if (loginError) {
        if (loginError.message?.toLowerCase().includes('email not confirmed')) {
          setError('Supabase Email Verification is currently ON. To bypass email verification: Go to your Supabase Dashboard -> Authentication -> Providers -> Email and uncheck "Confirm email".');
          return;
        }
        throw loginError;
      }
      
      const activeRole = profile?.role || user?.user_metadata?.role;
      if (activeRole === 'clinician') {
        navigate('/clinician');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Failed to login. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLoginSubmit(email, password);
  };

  return (
    <div className="w-full">
      <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome back</h2>
      <p className="text-slate-600 mb-6">Sign in to your MedBrief account</p>

      {error && (
        <div className="p-3 mb-6 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <TextField
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="you@example.com"
        />

        <PasswordField
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="rounded text-green-700 focus:ring-green-600" />
            <span className="text-slate-600">Remember me</span>
          </label>
          <a href="#" className="text-green-800 hover:text-green-900 font-medium">
            Forgot password?
          </a>
        </div>

        <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
          Sign in
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-600">
        Don't have an account?{' '}
        <Link to="/signup" className="text-green-800 hover:text-green-900 font-semibold underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
