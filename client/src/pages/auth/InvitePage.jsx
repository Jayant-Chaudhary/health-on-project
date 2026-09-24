import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { acceptInvite, signIn, getInviteDetails } from '../../services/authService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/common/Spinner';

export default function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [fetchingEmail, setFetchingEmail] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadEmail() {
      try {
        const data = await getInviteDetails(token);
        if (mounted) {
          setInviteEmail(data.email);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Failed to load invite details. It may be invalid or expired.');
        }
      } finally {
        if (mounted) {
          setFetchingEmail(false);
        }
      }
    }
    loadEmail();
    return () => { mounted = false; };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await acceptInvite(token, password);
      setSuccess(true);
      
      // Auto login with the new password
      if (response && response.email) {
        const { error: signInError } = await signIn(response.email, password);
        if (!signInError) {
          navigate('/');
        } else {
          // If auto login fails, just redirect to login page
          navigate('/login');
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to accept invite. It may have expired or already been used.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-success-light text-success mx-auto rounded-full flex items-center justify-center text-3xl">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-ink">Account Created!</h2>
          <p className="text-ink-soft">Redirecting you to your dashboard...</p>
        </Card>
      </div>
    );
  }

  if (fetchingEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
      <Card className="max-w-md w-full p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-primary rounded-xl mx-auto flex items-center justify-center text-white font-bold text-2xl shadow-sm mb-4">
            M
          </div>
          <h2 className="text-2xl font-bold text-ink">Welcome to Mamta Care</h2>
          <p className="text-ink-soft">Set a password to confirm your appointment and create your account.</p>
          {inviteEmail && (
            <div className="mt-4 p-3 bg-canvas-alt rounded-lg border border-ink-soft/10">
              <p className="text-sm text-ink-soft">Creating account for:</p>
              <p className="font-medium text-ink">{inviteEmail}</p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-attention-light text-attention-dark p-3 rounded-lg text-sm font-medium border border-attention/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink">New Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-ink-soft/20 bg-white px-4 py-2.5 text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="••••••••"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-ink">Confirm Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-ink-soft/20 bg-white px-4 py-2.5 text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" className="w-full mt-2" disabled={loading || !inviteEmail}>
            {loading ? 'Creating Account...' : 'Set Password & Continue'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
