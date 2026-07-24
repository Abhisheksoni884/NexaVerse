import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck } from 'lucide-react';

export function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(`OAuth login failed: ${errorParam}`);
      setIsProcessing(false);
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    if (isLoading) {
      // Still checking auth state in the background
      return;
    }

    if (isAuthenticated) {
      navigate('/chat', { replace: true });
    } else {
      setError('Authentication failed. Please try again.');
      setIsProcessing(false);
      setTimeout(() => navigate('/login'), 3000);
    }
  }, [searchParams, navigate, isAuthenticated, isLoading]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
      <div className="w-full max-w-sm p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-brand-coral rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          
          {isProcessing ? (
            <>
              <h2 className="text-2xl font-bold text-brand-dark">Signing you in...</h2>
              <p className="text-slate-600 text-center">
                Please wait while we authenticate your credentials
              </p>
              <div className="mt-8">
                <div className="w-12 h-12 border-4 border-brand-teal/20 border-t-brand-teal rounded-full animate-spin mx-auto"></div>
              </div>
            </>
          ) : error ? (
            <>
              <h2 className="text-2xl font-bold text-red-600">Authentication Failed</h2>
              <p className="text-slate-600 text-center">{error}</p>
              <p className="text-sm text-slate-500 text-center mt-4">
                Redirecting you back to login in a moment...
              </p>
              <div className="mt-8">
                <div className="w-12 h-12 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto"></div>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-green-600">Success!</h2>
              <p className="text-slate-600 text-center">
                You are being redirected to your dashboard...
              </p>
              <div className="mt-8">
                <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto"></div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
