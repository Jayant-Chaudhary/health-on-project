import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';

export default function VerificationPending() {
  const { logout } = useAuth();

  return (
    <div className="max-w-md w-full mx-auto p-8 bg-raised rounded-xl shadow-sm border border-line mt-12 text-center">
      <div className="w-16 h-16 bg-attention-light text-attention-dark rounded-full flex items-center justify-center mx-auto mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shield-alert"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
      </div>
      <h2 className="text-2xl font-bold text-ink mb-2">Verification Pending</h2>
      <p className="text-ink-2 mb-8">
        Your medical credentials are currently being verified with the National Medical Commission. 
        You will receive an email once your account has been approved to take patients.
      </p>
      
      <Button onClick={logout} variant="outline" className="w-full">
        Sign Out
      </Button>
    </div>
  );
}
