import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { apiClient } from '../lib/api';

export function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    companyName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpNotice, setOtpNotice] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');

  const otpCode = otpDigits.join('');

  const update = (values: Partial<typeof form>) => setForm((current) => ({ ...current, ...values }));

  const validateBasic = () => {
    const next: Record<string, string> = {};
    if (!form.companyName.trim()) next.companyName = 'Company name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email address';
    if (!form.phone.trim()) next.phone = 'Phone number is required';
    if (form.password.length < 8) next.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) next.confirmPassword = 'Passwords do not match';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const focusOtpInput = (index: number) => {
    const target = otpRefs.current[index];
    if (target) target.focus();
  };

  const handleOtpValue = (index: number, value: string) => {
    const nextValue = value.replace(/\D/g, '').slice(-1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = nextValue;
    setOtpDigits(nextDigits);

    if (nextValue && index < 5) {
      focusOtpInput(index + 1);
    }

    if (errors.otpCode) {
      setErrors((current) => ({ ...current, otpCode: '' }));
    }

    if (nextDigits.every(Boolean)) {
      void verifyOtp(nextDigits.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
      focusOtpInput(index - 1);
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      focusOtpInput(index - 1);
    }
    if (event.key === 'ArrowRight' && index < 5) {
      focusOtpInput(index + 1);
    }
  };

  const handleOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const nextDigits = Array(6).fill('');
    for (let index = 0; index < pasted.length; index += 1) {
      nextDigits[index] = pasted[index];
    }
    setOtpDigits(nextDigits);
    const nextIndex = Math.min(pasted.length, 5);
    focusOtpInput(nextIndex);
  };

  const requestOtp = async () => {
    if (!validateBasic()) return;
    setLoading(true);
    setErrors({});
    try {
      const slug = form.companyName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'dealer';
      await apiClient.requestSignupOtp({
        dealer: {
          name: form.companyName.trim(),
          legalName: form.companyName.trim(),
          slug,
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          metadata: {},
        },
        owner: {
          email: form.email.trim().toLowerCase(),
          password: form.password,
          firstName: form.companyName.trim().split(/\s+/)[0] || 'Dealer',
          phone: form.phone.trim(),
        },
      });

      setOtpDigits(Array(6).fill(''));
      setOtpSent(true);
      setOtpNotice('A 6-digit verification code was sent to your email. It expires in 10 minutes.');
      localStorage.setItem('dealerSlug', slug);
    } catch (error) {
      setErrors({ form: (error as { message?: string }).message || 'Could not send verification code.' });
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setLoading(true);
    setErrors({});
    setOtpNotice('Sending a fresh verification code...');
    try {
      await requestOtp();
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (code = otpCode) => {
    if (!/^\d{6}$/.test(code.trim())) {
      setErrors({ otpCode: 'Enter the 6-digit verification code.' });
      return;
    }

    setVerifying(true);
    setErrors({});
    try {
      const response = await apiClient.verifySignupOtp(form.email.trim().toLowerCase(), code.trim());
      if (response.data.auth) {
        localStorage.setItem('dealerOnboardingPending', 'true');
        setSuccess('Account verified. Redirecting to your dashboard...');
        window.setTimeout(() => navigate('/dashboard', { replace: true }), 600);
        return;
      }

      setSuccess('Account verified successfully. You can now sign in.');
    } catch (error) {
      setErrors({ otpCode: (error as { message?: string }).message || 'The verification code is invalid or expired.' });
    } finally {
      setVerifying(false);
    }
  };

  return <AuthLayout eyebrow="Open a workspace" title="Create your dealer account" description="Set up your basic account details and verify in-app." mode="signup">
    {success ? (
      <Card className="border border-emerald-200 bg-emerald-50">
        <p className="text-sm text-emerald-800">{success}</p>
        <Button type="button" className="mt-4 w-full" onClick={() => navigate('/login')}>Go to sign in</Button>
      </Card>
    ) : (
      <form onSubmit={(event) => { event.preventDefault(); if (!otpSent) void requestOtp(); }} className="relative space-y-4">
        {errors.form && <Card className="border border-red-200 bg-red-50"><p className="text-sm text-red-800">{errors.form}</p></Card>}
        {otpNotice && <Card className="border border-emerald-200 bg-emerald-50"><p className="text-sm text-emerald-800">{otpNotice}</p></Card>}

        {!otpSent ? (
          <>
            <Input label="Company name" placeholder="Acme Dealer" value={form.companyName} onChange={(event) => { update({ companyName: event.target.value }); if (errors.companyName) setErrors({ ...errors, companyName: '' }); }} error={errors.companyName} />
            <Input label="Email address" type="email" placeholder="you@example.com" value={form.email} onChange={(event) => { update({ email: event.target.value }); if (errors.email) setErrors({ ...errors, email: '' }); }} error={errors.email} />
            <Input label="Phone number" placeholder="+233 20 000 0000" value={form.phone} onChange={(event) => { update({ phone: event.target.value }); if (errors.phone) setErrors({ ...errors, phone: '' }); }} error={errors.phone} />
            <Input label="Password" type="password" placeholder="••••••••" value={form.password} onChange={(event) => { update({ password: event.target.value }); if (errors.password) setErrors({ ...errors, password: '' }); }} error={errors.password} />
            <Input label="Confirm password" type="password" placeholder="••••••••" value={form.confirmPassword} onChange={(event) => { update({ confirmPassword: event.target.value }); if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' }); }} error={errors.confirmPassword} />
            <Button type="submit" loading={loading} className="w-full">Send verification code</Button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => { setOtpSent(false); setOtpNotice(''); setOtpDigits(Array(6).fill('')); setErrors({}); }} className="absolute -top-2 left-0 text-sm font-semibold text-primary-600 hover:text-primary-700">
              Back
            </button>
            <div className="h-5" aria-hidden="true" />
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Verification code</label>
              <div className="grid grid-cols-6 gap-2">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      otpRefs.current[index] = element;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(event) => handleOtpValue(index, event.target.value)}
                    onKeyDown={(event) => handleOtpKeyDown(index, event)}
                    onPaste={handleOtpPaste}
                    disabled={verifying}
                    aria-busy={verifying}
                    className="h-12 rounded-md border border-slate-200 bg-white text-center text-lg font-semibold text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:cursor-wait disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-70"
                    aria-label={`Digit ${index + 1}`}
                  />
                ))}
              </div>
              {errors.otpCode && <p className="mt-2 text-sm text-red-500">{errors.otpCode}</p>}
            </div>
            <div className="flex justify-center">
              <Button type="button" variant="secondary" onClick={() => { void resendOtp(); }}>
                Resend code
              </Button>
            </div>
          </>
        )}

        <div className="text-center pt-2">
          <button type="button" onClick={() => navigate('/login')} className="text-sm font-medium text-primary-600 hover:text-primary-700">Already have an account? Sign in</button>
        </div>
      </form>
    )}
  </AuthLayout>;
}

