import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../layouts/AuthLayout';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { apiClient } from '../lib/api';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, error: authError, clearError } = useAuth();
  // Default test credentials: dealerSlug='test-dealer', email='admin@test.com', password='password123'
  const [dealerSlug, setDealerSlug] = useState(() => localStorage.getItem('dealerSlug') ?? 'test-dealer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationNotice, setVerificationNotice] = useState('');

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!dealerSlug.trim()) {
      newErrors.dealerSlug = 'Dealer slug is required';
    }

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resendVerification = async () => {
    if (!dealerSlug.trim() || !email.trim()) return;
    setResendingVerification(true);
    try {
      await apiClient.resendVerification(dealerSlug.trim().toLowerCase(), email.trim().toLowerCase());
      setVerificationNotice('A new confirmation link has been sent if this account exists.');
    } finally {
      setResendingVerification(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const normalizedDealerSlug = dealerSlug.trim().toLowerCase();
      await login(email, password, normalizedDealerSlug);
      localStorage.setItem('dealerSlug', normalizedDealerSlug);
      navigate('/dashboard');
    } catch (err) {
      // Error is already stored in auth context
      console.error('Login failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout eyebrow="Dealer workspace" title="Welcome back" description="Sign in to your workspace." mode="login">
      <form onSubmit={handleSubmit} className="space-y-4">
        {authError && (
          <Card className="bg-red-50 border border-red-200">
            <p className="text-red-800 text-sm">{authError}</p>
          </Card>
        )}
        {verificationNotice && <Card className="bg-emerald-50 border border-emerald-200"><p className="text-emerald-800 text-sm">{verificationNotice}</p></Card>}

        <Input
          label="Dealer slug"
          placeholder="e.g. apex-finnish"
          value={dealerSlug}
          onChange={(e) => {
            setDealerSlug(e.target.value);
            if (errors.dealerSlug) setErrors({ ...errors, dealerSlug: '' });
          }}
          error={errors.dealerSlug}
          disabled={loading}
        />

        <Input
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) {
              setErrors({ ...errors, email: '' });
            }
          }}
          error={errors.email}
          disabled={loading}
        />

        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) {
              setErrors({ ...errors, password: '' });
            }
          }}
          error={errors.password}
          disabled={loading}
        />

        <div className="text-right">
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Forgot password?
          </button>
        </div>

        {authError?.includes('Confirm your email') && (
          <Button type="button" variant="secondary" className="w-full" loading={resendingVerification} onClick={() => void resendVerification()}>
            Send a new confirmation link
          </Button>
        )}

        <Button
          type="submit"
          loading={loading}
          className="w-full mt-6"
        >
          Sign In
        </Button>

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => navigate('/signup')}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            New dealer? Create an account
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
