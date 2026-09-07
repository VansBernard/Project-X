import { useEffect, useState } from 'react';
import { apiClient } from '../lib/api';
import { RouterIcon } from './Icons';

interface DeviceAccessDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function DeviceAccessDrawer({ open, onClose }: DeviceAccessDrawerProps) {
  const [recoveryId, setRecoveryId] = useState('');
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [recoveryExpiresAt, setRecoveryExpiresAt] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [copyLabel, setCopyLabel] = useState('Copy code');
  const isRecoveryId = /^PX-[A-F0-9]{12}$/i.test(recoveryId.trim());

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleRecovery = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRecoveryError(null);
    setRecoveryCode(null);
    setRecoveryExpiresAt(null);

    if (!isRecoveryId) {
      setRecoveryError('Enter a valid Recovery ID, for example PX-8F4A2C91D0B7.');
      return;
    }

    setRecoveryLoading(true);
    try {
      const result = await apiClient.issueRecoveryAuthorization({ recoveryId: recoveryId.trim().toUpperCase() });
      setRecoveryCode(result.data.authorization);
      setRecoveryExpiresAt(result.data.expiresAt);
    } catch (error) {
      setRecoveryError((error as Error)?.message || 'Unable to generate a recovery authorization.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const copyRecoveryCode = async () => {
    if (!recoveryCode) return;
    await navigator.clipboard.writeText(recoveryCode);
    setCopyLabel('Copied');
    window.setTimeout(() => setCopyLabel('Copy code'), 1800);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close device access drawer"
        onClick={onClose}
        className={`fixed inset-0 z-[60] bg-slate-950/40 transition-opacity ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="device-access-title"
        className={`fixed bottom-0 right-0 z-[70] w-full max-w-md rounded-t-[2rem] bg-slate-950 text-white shadow-2xl transition-transform duration-300 sm:bottom-5 sm:right-5 sm:rounded-3xl ${open ? 'translate-y-0' : 'pointer-events-none translate-y-full'}`}
      >
        <div className="relative flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-amber-300">Device access</p>
            <h2 id="device-access-title" className="mt-2 text-xl font-semibold">Recovery console</h2>
            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-300">Generate a signed offline authorization for a registered device.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-2xl bg-amber-300 p-3 text-slate-950 shadow-lg shadow-amber-300/20"><RouterIcon size={20} /></div>
            <button type="button" onClick={onClose} className="rounded-full px-2 py-1 text-2xl leading-none text-slate-400 hover:text-white" aria-label="Close">×</button>
          </div>
        </div>
        <div className="relative max-h-[70vh] overflow-y-auto p-5">
          <form onSubmit={handleRecovery} className="space-y-4">
            <label className="block text-sm font-medium text-slate-200" htmlFor="recovery-id">Recovery ID</label>
            <div className="flex gap-2">
              <input id="recovery-id" value={recoveryId} onChange={(event) => setRecoveryId(event.target.value.toUpperCase())} placeholder="PX-8F4A2C91D0B7" className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30" aria-invalid={recoveryId.length > 0 && !isRecoveryId} />
              <button type="submit" disabled={recoveryLoading} className="rounded-xl bg-amber-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60">{recoveryLoading ? 'Working...' : 'Generate'}</button>
            </div>
            {recoveryId.length > 0 && !isRecoveryId && <p className="text-xs text-amber-200">Use the short Recovery ID shown on the locked device.</p>}
            {recoveryError && <p className="rounded-xl border border-red-300/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">{recoveryError}</p>}
          </form>
          {recoveryCode && <div className="mt-5 rounded-2xl border border-amber-300/40 bg-amber-300/10 p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">Recovery authorization</p><button type="button" onClick={copyRecoveryCode} className="text-xs font-semibold text-amber-200 hover:text-white">{copyLabel}</button></div><p className="mt-3 max-h-28 overflow-y-auto break-all rounded-xl bg-black/30 p-3 font-mono text-xs leading-5 text-amber-50">{recoveryCode}</p><p className="mt-3 text-xs text-slate-300">Valid for 30 minutes to accept. Device access lasts 36 hours after acceptance{recoveryExpiresAt ? `, until ${new Date(recoveryExpiresAt).toLocaleString()}` : ''}.</p></div>}
        </div>
      </aside>
    </>
  );
}