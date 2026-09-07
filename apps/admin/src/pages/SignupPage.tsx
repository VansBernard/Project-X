import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { apiClient } from '../lib/api';

const countries = [{ code: 'NG', name: 'Nigeria', currency: 'NGN' }, { code: 'GH', name: 'Ghana', currency: 'GHS' }, { code: 'KE', name: 'Kenya', currency: 'KES' }, { code: 'ZA', name: 'South Africa', currency: 'ZAR' }];
const stageLabels = ['Business', 'Payout', 'Security'];

export function SignupPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState(1);
  const [form, setForm] = useState({ companyName: '', workspaceSlug: '', contactName: '', email: '', phone: '', country: '', payoutMethod: 'bank', bankCode: '', payoutAccountNumber: '', accountHolderName: '', mobileMoneyProvider: '', password: '', confirmPassword: '' });
  const [banks, setBanks] = useState<Array<{ name: string; code: string }>>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [resolvedName, setResolvedName] = useState('');
  const [resolving, setResolving] = useState(false);
  const [useContactPhone, setUseContactPhone] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const [resendNotice, setResendNotice] = useState('');

  useEffect(() => {
    if (!form.country) { setBanks([]); return; }
    let cancelled = false;
    setBanksLoading(true);
    apiClient.listPayoutBanks(form.country as 'NG' | 'GH' | 'KE' | 'ZA')
      .then((response) => { if (!cancelled) setBanks(response.data); })
      .catch(() => { if (!cancelled) setBanks([]); })
      .finally(() => { if (!cancelled) setBanksLoading(false); });
    return () => { cancelled = true; };
  }, [form.country]);

  const update = (values: Partial<typeof form>) => setForm((current) => ({ ...current, ...values }));
  const payoutNumber = () => form.payoutMethod === 'mobile_money' && useContactPhone ? form.phone : form.payoutAccountNumber;

  const validate = (target: number) => {
    const next: Record<string, string> = {};
    if (target === 1) {
      if (!form.companyName.trim()) next.companyName = 'Company name is required';
      if (!/^[a-z0-9-]{2,120}$/.test(form.workspaceSlug.trim())) next.workspaceSlug = 'Use lowercase letters, numbers, or hyphens';
      if (!form.contactName.trim()) next.contactName = 'Contact name is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email address';
      if (!form.phone.trim()) next.phone = 'Phone number is required';
      if (!form.country) next.country = 'Country is required';
    }
    if (target === 2) {
      if (!payoutNumber().trim()) next.payoutAccountNumber = 'Payout account or mobile number is required';
      if (form.payoutMethod === 'bank') {
        if (!form.bankCode) next.bankCode = 'Select your bank';
        if (['NG', 'GH'].includes(form.country) && !resolvedName) next.accountHolderName = 'Verify the bank account before continuing';
      } else if (!form.mobileMoneyProvider) next.mobileMoneyProvider = 'Select a mobile money provider';
    }
    if (target === 3) {
      if (form.password.length < 8) next.password = 'Password must be at least 8 characters';
      if (form.password !== form.confirmPassword) next.confirmPassword = 'Passwords do not match';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const next = () => { if (validate(stage)) setStage((current) => Math.min(3, current + 1)); };
  const verifyBank = async () => {
    if (!['NG', 'GH'].includes(form.country) || !form.bankCode || !form.payoutAccountNumber.trim()) { setErrors({ accountHolderName: 'Select a bank and enter the account number first.' }); return; }
    setResolving(true);
    try {
      const response = await apiClient.resolvePayoutAccount({ country: form.country as 'NG' | 'GH', bankCode: form.bankCode, accountNumber: form.payoutAccountNumber.trim() });
      setResolvedName(response.data.accountName); update({ accountHolderName: response.data.accountName }); setErrors({});
    } catch (error) { setResolvedName(''); setErrors({ accountHolderName: (error as { message?: string }).message || 'This bank account could not be verified.' }); }
    finally { setResolving(false); }
  };

  const submit = async () => {
    if (!validate(3)) return;
    setLoading(true); setErrors({});
    try {
      const country = countries.find((entry) => entry.code === form.country)!;
      const nameParts = form.contactName.trim().split(/\s+/);
      const response = await apiClient.signupDealer({
        dealer: { name: form.companyName.trim(), legalName: form.companyName.trim(), slug: form.workspaceSlug.trim(), email: form.email.trim().toLowerCase(), phone: form.phone.trim(), country: country.code, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', metadata: form.payoutMethod === 'bank' ? { payoutMethod: 'bank', settlementBank: form.bankCode, settlementAccountNumber: payoutNumber().trim(), accountHolderName: form.accountHolderName, currency: country.currency } : { payoutMethod: 'mobile_money', mobileMoneyProvider: form.mobileMoneyProvider, mobileMoneyNumber: payoutNumber().trim(), currency: country.currency } },
        owner: { email: form.email.trim().toLowerCase(), password: form.password, firstName: nameParts[0], ...(nameParts.length > 1 ? { lastName: nameParts.slice(1).join(' ') } : {}), phone: form.phone.trim() },
      });
      if (response.data.dealer?.slug) localStorage.setItem('dealerSlug', response.data.dealer.slug);
      setSuccess(response.data.verificationEmailSent
        ? 'Check your email to confirm your registration. Your dealer account will be created after confirmation.'
        : 'Your registration could not be submitted because the confirmation email could not be sent.');
    } catch (error) { setErrors({ form: (error as { message?: string }).message || 'Registration failed' }); }
    finally { setLoading(false); }
  };

  const resendConfirmation = async () => {
    setResendingConfirmation(true);
    setResendNotice('');
    try {
      await apiClient.resendVerification(form.workspaceSlug.trim(), form.email.trim().toLowerCase());
      setResendNotice('A fresh confirmation link has been sent. Check your inbox and spam folder.');
    } catch (error) {
      setResendNotice((error as { message?: string }).message || 'The confirmation email could not be resent yet.');
    } finally {
      setResendingConfirmation(false);
    }
  };

  return <AuthLayout eyebrow="Open a workspace" title="Start your dealer account" description="Set up the essentials in a few minutes." mode="signup">
    <ol className="mb-7 grid grid-cols-3 gap-2" aria-label="Registration stages">{stageLabels.map((label, index) => { const number = index + 1; const tone = number === stage ? 'border-primary-600 text-primary-700' : number < stage ? 'border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-400'; return <li key={label} className={`border-b-2 pb-2 ${tone}`}><span className="block text-xs font-semibold">Step {number}</span><span className="block text-xs">{label}</span></li>; })}</ol>
    {success ? <Card className="border border-emerald-200 bg-emerald-50"><p className="text-sm text-emerald-800">{success}</p>{resendNotice && <p className="mt-3 text-sm text-emerald-800">{resendNotice}</p>}<Button type="button" variant="secondary" loading={resendingConfirmation} className="mt-4 w-full" onClick={() => void resendConfirmation()}>Resend confirmation email</Button><Button type="button" className="mt-3 w-full" onClick={() => navigate('/login')}>Go to sign in</Button></Card> : <form onSubmit={(event) => { event.preventDefault(); stage === 3 ? void submit() : next(); }} className="space-y-4">
      {errors.form && <Card className="border border-red-200 bg-red-50"><p className="text-sm text-red-800">{errors.form}</p></Card>}
      {stage === 1 && <>
        <Input label="Company name" placeholder="Acme Dealer" value={form.companyName} onChange={(event) => { const value = event.target.value; update({ companyName: value, workspaceSlug: form.workspaceSlug || value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }); }} error={errors.companyName} />
        <Input label="Workspace address" placeholder="acme-dealer" value={form.workspaceSlug} onChange={(event) => update({ workspaceSlug: event.target.value.toLowerCase() })} error={errors.workspaceSlug} />
        <Input label="Contact name" placeholder="Jane Doe" value={form.contactName} onChange={(event) => update({ contactName: event.target.value })} error={errors.contactName} />
        <Input label="Email address" type="email" placeholder="you@example.com" value={form.email} onChange={(event) => update({ email: event.target.value })} error={errors.email} />
        <Input label="Phone number" placeholder="+233 20 000 0000" value={form.phone} onChange={(event) => update({ phone: event.target.value })} error={errors.phone} />
        <Select label="Country" value={form.country} error={errors.country} onChange={(country) => { setResolvedName(''); update({ country, payoutMethod: country === 'GH' || country === 'KE' ? form.payoutMethod : 'bank', bankCode: '', accountHolderName: '' }); }} options={countries.map((country) => ({ value: country.code, label: country.name }))} />
      </>}
      {stage === 2 && <>
        <Select label="Payout method" value={form.payoutMethod} onChange={(payoutMethod) => { setResolvedName(''); update({ payoutMethod, accountHolderName: '' }); }} options={[{ value: 'bank', label: 'Bank account' }, ...(form.country === 'GH' || form.country === 'KE' ? [{ value: 'mobile_money', label: 'Mobile money' }] : [])]} />
        {form.payoutMethod === 'bank' ? <>
          <Select label="Bank" value={form.bankCode} error={errors.bankCode} disabled={banksLoading} onChange={(bankCode) => { setResolvedName(''); update({ bankCode, accountHolderName: '' }); }} options={banks.map((bank) => ({ value: bank.code, label: bank.name }))} placeholder={banksLoading ? 'Loading supported banks...' : 'Select your bank'} />
          <Input label="Bank account number" value={form.payoutAccountNumber} onChange={(event) => { setResolvedName(''); update({ payoutAccountNumber: event.target.value, accountHolderName: '' }); }} error={errors.payoutAccountNumber} />
          {['NG', 'GH'].includes(form.country) && <><Button type="button" variant="secondary" loading={resolving} onClick={() => void verifyBank()}>Verify bank account</Button><Input label="Account-holder name" value={form.accountHolderName} readOnly placeholder="Filled after verification" error={errors.accountHolderName} />{resolvedName && <Card className="border border-emerald-200 bg-emerald-50"><p className="text-sm text-emerald-800">Verified account: {resolvedName}</p></Card>}</>}
        </> : <><Select label="Mobile money provider" value={form.mobileMoneyProvider} error={errors.mobileMoneyProvider} onChange={(mobileMoneyProvider) => update({ mobileMoneyProvider })} options={form.country === 'GH' ? [{ value: 'MTN', label: 'MTN MoMo' }, { value: 'ATL', label: 'AirtelTigo Money' }, { value: 'VOD', label: 'Telecel Cash' }] : [{ value: 'MPESA', label: 'Safaricom M-Pesa' }, { value: 'ATL', label: 'Airtel Money' }]} /><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={useContactPhone} onChange={(event) => setUseContactPhone(event.target.checked)} /> Use the owner phone number for payouts</label>{!useContactPhone && <Input label="Mobile money number" value={form.payoutAccountNumber} onChange={(event) => update({ payoutAccountNumber: event.target.value })} error={errors.payoutAccountNumber} />}</>}
      </>}
      {stage === 3 && <><Input label="Password" type="password" value={form.password} onChange={(event) => update({ password: event.target.value })} error={errors.password} /><Input label="Confirm password" type="password" value={form.confirmPassword} onChange={(event) => update({ confirmPassword: event.target.value })} error={errors.confirmPassword} /></>}
      <div className="flex gap-3 pt-2">{stage > 1 && <Button type="button" variant="secondary" onClick={() => setStage((current) => current - 1)}>Back</Button>}<Button type="submit" loading={loading} className="flex-1">{stage === 3 ? 'Create dealer account' : 'Continue'}</Button></div>
      <div className="text-center"><button type="button" onClick={() => navigate('/login')} className="text-sm font-medium text-primary-600 hover:text-primary-700">Already have an account? Sign in</button></div>
    </form>}
  </AuthLayout>;
}

function Select({ label, value, onChange, options, error, placeholder = 'Select an option', disabled = false }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; error?: string; placeholder?: string; disabled?: boolean }) {
  return <div><label className="mb-2 block text-sm font-medium text-gray-700">{label}</label><select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="w-full border border-slate-100 px-4 py-2 text-gray-900"><option value="">{placeholder}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{error && <p className="mt-1 text-sm text-red-500">{error}</p>}</div>;
}
