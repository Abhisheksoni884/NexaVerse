import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, User as UserIcon, Lock, Eye, EyeOff } from 'lucide-react';
import { cn } from '../utils/cn';


const DEMO_CREDS = [
  { user: 'admin', pass: 'admin123', role: 'admin' as Role },
  { user: 'analyst', pass: 'analyst123', role: 'analyst' as Role },
  { user: 'viewer', pass: 'viewer123', role: 'viewer' as Role },
];

export function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/chat');
  }, [isAuthenticated, navigate]);

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google/login';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      await login(username.trim().toLowerCase(), password);
      // Navigation will happen automatically via useEffect when isAuthenticated changes
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F7F8FA]">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] bg-brand-dark p-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-coral rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">NexaVerse</span>
        </div>

        <div>
          <h2 className="text-3xl font-extrabold text-white leading-tight mb-4">
            NexaVerse<br />Knowledge Platform
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Securely query your organisation's documents with AI-powered retrieval,
            role-based access control, and a complete audit trail.
          </p>
        </div>

        {/* Feature mini-cards */}
        <div className="grid grid-cols-2 gap-3 mt-8">
          {[
            { label: 'Search', value: 'AI-Powered', color: 'bg-brand-blue', text: 'text-white' },
            { label: 'Access', value: 'Role-Based', color: 'bg-brand-teal', text: 'text-white' },
            { label: 'Security', value: 'Enterprise', color: 'bg-brand-coral', text: 'text-white' },
            { label: 'Tracking', value: 'Audit Logs', color: 'bg-brand-lime', text: 'text-brand-dark' },
          ].map(s => (
            <div key={s.label} className={cn("rounded-xl p-4 flex flex-col gap-1", s.color)}>
              <p className={cn("text-xs font-semibold opacity-75", s.text)}>{s.label}</p>
              <p className={cn("text-lg font-extrabold tracking-tight", s.text)}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-9 h-9 bg-brand-coral rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-brand-dark">NexaVerse</span>
          </div>

          <h1 className="text-2xl font-bold text-brand-dark mb-1">Welcome back</h1>
          <p className="text-sm text-slate-700 mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 animate-fade-in">
                {error}
              </div>
            )}

            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                Username
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. admin"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="form-input pl-10"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="form-input pl-10 pr-10"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-brand-teal hover:bg-opacity-90 text-white font-semibold rounded-xl transition-all shadow-md disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : 'Sign In'}
            </button>
          </form>

          {/* OAuth Providers */}
          <div className="mt-6 space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full py-2.5 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 font-medium text-slate-700 shadow-sm hover:shadow-md"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
          </div>

          {/* Demo credentials */}
          <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Demo Credentials</p>
            <div className="space-y-2">
              {DEMO_CREDS.map(c => (
                <button
                  key={c.role}
                  type="button"
                  onClick={() => { setUsername(c.user); setPassword(c.pass); }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-all group"
                >
                  <span className="text-xs font-medium text-slate-800 capitalize">{c.role}</span>
                  <span className="text-xs text-slate-600 font-mono group-hover:text-brand-blue transition-colors">
                    {c.user} / {c.pass}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
