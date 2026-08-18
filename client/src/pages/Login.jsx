import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Button } from '../components/ui/Button.jsx';
import SocialLoginButtons from '../components/auth/SocialLoginButtons.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const [form, setForm] = useState({ identifier: '', password: '', rememberMe: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.identifier || !form.password) {
      setError('Enter your email or phone number and password.');
      return;
    }
    setLoading(true);
    try {
      const loggedIn = await login(form);
      navigate(loggedIn.role === 'driver' ? '/driver' : loggedIn.role === 'admin' ? '/admin' : from, {
        replace: true,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const quick = [
    { label: 'Passenger', email: 'passenger@ridetaxi.com', password: 'pass123' },
    { label: 'Driver', email: 'alex@ridetaxi.com', password: 'driver123' },
    { label: 'Admin', email: 'admin@ridetaxi.com', password: 'admin123' },
  ];

  const quickFill = (q) => {
    setForm((f) => ({ ...f, identifier: q.email }));
    setError('');
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Sign in to book and manage your rides.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Input
            label="Email or phone number"
            type="text"
            required
            autoComplete="username"
            placeholder="you@example.com or (410) 365-5556"
            value={form.identifier}
            onChange={(e) => setForm({ ...form, identifier: e.target.value })}
          />
          <Input
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={form.rememberMe}
                onChange={(e) => setForm({ ...form, rememberMe: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 accent-brand-600"
              />
              Remember me
            </label>
            <Link to="/forgot-password" className="text-sm font-medium text-brand-700 hover:underline">
              Forgot password?
            </Link>
          </div>

          {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
          <Button type="submit" size="lg" loading={loading} className="w-full">
            Sign in
          </Button>
        </form>

        <SocialLoginButtons />

        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Quick demo accounts
          </p>
          <div className="grid grid-cols-3 gap-2">
            {quick.map((q) => (
              <button
                key={q.label}
                onClick={() => quickFill(q)}
                className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium transition-colors hover:border-brand-400 hover:text-brand-700"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          New to Ellicott City Airport Taxi?{' '}
          <Link to="/register" className="font-semibold text-brand-700 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}