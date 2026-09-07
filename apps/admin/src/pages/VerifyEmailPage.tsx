import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { apiClient } from '../lib/api';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<'verifying' | 'verified' | 'failed'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = params.get('token');
    const signupToken = params.get('signupToken');
    if (!token && !signupToken) {
      setErrorMessage('This confirmation link is missing a valid token.');
      setState('failed');
      return;
    }

    const handleConfirmation = async () => {
      try {
        if (signupToken) {
          const response = await apiClient.confirmDealerSignup(signupToken);
          // If auth tokens were returned, auto-login and redirect to dashboard
          if (response?.auth) {
            // Redirect to dashboard after a brief moment to show the success message
            setTimeout(() => {
              navigate('/dashboard', { replace: true });
            }, 1000);
          }
          setState('verified');
        } else if (token) {
          await apiClient.verifyEmail(token);
          setState('verified');
        }
      } catch (error: unknown) {
        const message = typeof error === 'object' && error && 'message' in error
          ? String((error as { message?: string }).message)
          : 'This confirmation link is invalid or has expired. Request a new link from the sign-in page.';
        setErrorMessage(message);
        setState('failed');
      }
    };

    handleConfirmation();
  }, [params, navigate]);

  return (
    <AuthLayout eyebrow="Account confirmation" title={state === 'verified' ? 'Email confirmed' : 'Confirming your email'} description={state === 'verified' ? 'Your dealer workspace is ready to use.' : 'Please keep this page open for a moment.'} mode="login">
      <Card className={state === 'failed' ? 'border border-red-200 bg-red-50' : 'border border-emerald-200 bg-emerald-50'}>
        <p className={state === 'failed' ? 'text-sm text-red-800' : 'text-sm text-emerald-800'}>
          {state === 'verifying' ? 'Confirming your email address...' : state === 'verified' ? 'Your email has been confirmed. Redirecting to your dashboard...' : errorMessage || 'This confirmation link is invalid or has expired. Request a new link from the sign-in page.'}
        </p>
      </Card>
      <Button type="button" className="mt-5 w-full" onClick={() => navigate('/login')} disabled={state === 'verifying'}>
        Go to sign in
      </Button>
    </AuthLayout>
  );
}
