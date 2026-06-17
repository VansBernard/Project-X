import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { apiClient } from '../lib/api';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await apiClient.forgotPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <AuthLayout>
        <div className="space-y-4 text-center">
          <Card className="bg-green-50 border border-green-200">
            <p className="text-green-800">
              If an account exists with this email address, password reset instructions will be sent.
            </p>
          </Card>

          <div className="pt-4">
            <p className="text-gray-600 text-sm mb-4">
              Check your email for further instructions.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="w-full mb-2"
              onClick={() => navigate('/login')}
            >
              Back to Login
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Reset Your Password</h2>
          <p className="text-sm text-gray-500 mt-1">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {error && (
          <Card className="bg-red-50 border border-red-200">
            <p className="text-red-800 text-sm">{error}</p>
          </Card>
        )}

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

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            loading={loading}
            className="flex-1"
          >
            Send Reset Link
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => navigate('/login')}
            disabled={loading}
          >
            Back
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}
