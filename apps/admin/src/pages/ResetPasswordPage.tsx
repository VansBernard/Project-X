import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { apiClient } from '../lib/api';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!token) {
      newErrors.token = 'Invalid reset link. Please request a new password reset.';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      await apiClient.resetPassword(token, password);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout>
        <div className="space-y-4 text-center">
          <Card className="bg-red-50 border border-red-200">
            <p className="text-red-800">
              Invalid reset link. Please request a new password reset.
            </p>
          </Card>

          <Button
            type="button"
            className="w-full"
            onClick={() => navigate('/forgot-password')}
          >
            Request New Reset Link
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (submitted) {
    return (
      <AuthLayout>
        <div className="space-y-4 text-center">
          <Card className="bg-green-50 border border-green-200">
            <p className="text-green-800 font-medium">
              Your password has been successfully reset!
            </p>
          </Card>

          <div className="pt-4">
            <p className="text-gray-600 text-sm mb-4">
              You can now log in with your new password.
            </p>
            <Button
              type="button"
              className="w-full"
              onClick={() => navigate('/login')}
            >
              Go to Login
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
          <h2 className="text-lg font-semibold text-gray-900">Set New Password</h2>
          <p className="text-sm text-gray-500 mt-1">
            Enter your new password below.
          </p>
        </div>

        {error && (
          <Card className="bg-red-50 border border-red-200">
            <p className="text-red-800 text-sm">{error}</p>
          </Card>
        )}

        <Input
          label="New Password"
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

        <Input
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (errors.confirmPassword) {
              setErrors({ ...errors, confirmPassword: '' });
            }
          }}
          error={errors.confirmPassword}
          disabled={loading}
        />

        <Button
          type="submit"
          loading={loading}
          className="w-full mt-6"
        >
          Reset Password
        </Button>

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => navigate('/forgot-password')}
          disabled={loading}
        >
          Back to Forgot Password
        </Button>
      </form>
    </AuthLayout>
  );
}
